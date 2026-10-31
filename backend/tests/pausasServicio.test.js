// Pausas con SQLite en memoria: las funciones que guardan y la matriz que las usa.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { pausar, reanudar, pausasPorHabito } = await import('../src/servicios/pausas.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');
const { logrosDeUsuario } = await import('../src/servicios/logrosUsuario.js');

let uid, otro, habito, habitoAjeno;

const estados = (m, nombre) => m.filas.find((f) => f.nombre === nombre).celdas.map((c) => c.estado);

before(async () => {
    uid = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['A', 'a@x.com', 'h']);
    otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['B', 'b@x.com', 'h']);
    const nuevo = (u, nombre) =>
        db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias) VALUES (?, ?, 1, ?, ?)', [u, nombre, '2026-10-01', '[0,1,2,3,4,5,6]']);
    habito = await nuevo(uid, 'H');
    habitoAjeno = await nuevo(otro, 'Ajeno');
});

test('pausar guarda el rango y pausasPorHabito solo devuelve las de la persona', async () => {
    assert.deepEqual(await pausar(habito, '2026-10-05', '2026-10-07'), { ok: true });
    await pausar(habitoAjeno, '2026-10-05', null);
    const mapa = await pausasPorHabito(uid);
    assert.deepEqual(mapa.get(habito), [{ desde: '2026-10-05', hasta: '2026-10-07' }]);
    assert.equal(mapa.has(habitoAjeno), false);
});

test('no deja crear una pausa que se cruce con otra', async () => {
    const r = await pausar(habito, '2026-10-07', '2026-10-09');
    assert.equal(r.estado, 409);
    assert.deepEqual(await pausar(habito, '2026-10-08', '2026-10-09'), { ok: true });
});

test('la matriz marca los días en pausa y no los cuenta en el porcentaje', async () => {
    const hoy = '2026-10-10';
    await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [habito, '2026-10-04']);
    await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [habito, '2026-10-06']); // hecho dentro de la pausa
    const m = await construirMatriz(uid, '2026-10-03', '2026-10-10', hoy);
    // 3 fallado | 4 hecho | 5 pausado | 6 hecho (cuenta) | 7 pausado | 8 pausado | 9 pausado | 10 pendiente hoy
    assert.deepEqual(estados(m, 'H'), ['fallado', 'hecho', 'pausado', 'hecho', 'pausado', 'pausado', 'pausado', 'pendiente']);
    // del 3 al 10 solo se juzgan el 3 (fallado), el 4 (hecho) y el 6 (hecho): 2 de 3
    assert.equal(m.filas[0].tasa, 0.67);
});

test('reanudar termina la pausa en curso el día anterior', async () => {
    assert.deepEqual(await reanudar(habito, '2026-10-08'), { ok: true });
    const mapa = await pausasPorHabito(uid);
    const rangos = mapa.get(habito);
    assert.equal(rangos.length, 1); // la segunda pausa empezaba justo ese día: se canceló entera
    assert.deepEqual(rangos[0], { desde: '2026-10-05', hasta: '2026-10-07' });
});

test('reanudar una pausa abierta la cierra el día anterior', async () => {
    await pausar(habito, '2026-10-20', null);
    assert.deepEqual(await reanudar(habito, '2026-10-25'), { ok: true });
    const rangos = (await pausasPorHabito(uid)).get(habito);
    assert.deepEqual(rangos.at(-1), { desde: '2026-10-20', hasta: '2026-10-24' });
});

test('reanudar cancela una pausa que aún no empezó y avisa si no hay ninguna', async () => {
    await pausar(habito, '2026-11-10', '2026-11-12');
    assert.deepEqual(await reanudar(habito, '2026-11-01'), { ok: true });
    const r = await reanudar(habito, '2026-12-01');
    assert.equal(r.estado, 404);
});

test('los logros no cuentan como fallados los días en pausa', async () => {
    // 7 días seguidos de pausa con el hábito sin marcar no rompen la racha de los días cumplidos
    const u = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['C', 'c@x.com', 'h']);
    const h = await db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias) VALUES (?, ?, 1, ?, ?)', [u, 'X', '2026-10-01', '[0,1,2,3,4,5,6]']);
    for (const f of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']) {
        await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [h, f]);
    }
    await pausar(h, '2026-10-04', '2026-10-06');
    const logros = await logrosDeUsuario(u, '2026-10-10');
    assert.equal(logros.find((l) => l.clave === 'racha_7').obtenido, true); // 3 + 4 días, la pausa no rompió
});
