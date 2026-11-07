// Metas semanales dentro de la matriz, los logros y los respaldos (SQLite en memoria).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');
const { logrosDeUsuario } = await import('../src/servicios/logrosUsuario.js');
const { construirRespaldo } = await import('../src/servicios/respaldo.js');
const { importarRespaldo } = await import('../src/servicios/importacion.js');

let uid, a, b, fija;
const HOY = '2026-10-14'; // miércoles

const habito = (nombre, creadoEn, meta, dias = '[0,1,2,3,4,5,6]') =>
    db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, meta_semanal) VALUES (?, ?, 1, ?, ?, ?)', [uid, nombre, creadoEn, dias, meta]);
const hechos = async (id, ...fechas) => {
    for (const f of fechas) await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [id, f]);
};
const fila = (m, id) => m.filas.find((f) => f.habitoId === id);
const estados = (f) => f.celdas.map((c) => c.estado).join(',');

before(async () => {
    uid = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['Ana', 'ana@x.com', 'h']);
    a = await habito('A (3 por semana)', '2026-09-28', 3);
    await hechos(a, '2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-12', '2026-10-13');
    b = await habito('B (1 por semana)', '2026-09-28', 1);
    await hechos(b, '2026-10-12', '2026-10-13');
    fija = await habito('Fijo lunes', '2026-09-28', null, '[1]');
});

test('la matriz muestra los días libres, los cumplimientos y los fallos de cada semana', async () => {
    const m = await construirMatriz(uid, '2026-10-05', HOY, HOY);
    // del 5 al 14: 5 hecho, 6-9 libres, 10-11 fallados (faltaron 2), 12 y 13 hechos, 14 pendiente
    assert.equal(estados(fila(m, a)), 'hecho,libre,libre,libre,libre,fallado,fallado,hecho,hecho,pendiente');
    assert.equal(fila(m, a).tasa, 0.6); // 3 cumplidos de 5 (3 hechos + 2 que faltaron)
    assert.deepEqual(fila(m, a).semanaActual, { hechas: 2, meta: 3 });
    assert.equal(fila(m, a).metaSemanal, 3);
    assert.equal(fila(m, a).unidadRacha, 'semanas');
});

test('un cumplimiento de más es "hecho" pero no cuenta, y con la meta lograda hoy ya no queda pendiente', async () => {
    const m = await construirMatriz(uid, '2026-10-12', HOY, HOY);
    assert.equal(estados(fila(m, b)), 'hecho,hecho,libre');
    assert.deepEqual(fila(m, b).celdas.map((c) => c.programado), [true, false, false]);
    assert.equal(fila(m, b).tasa, 1);
});

test('la racha de un hábito con meta se cuenta en semanas', async () => {
    const m = await construirMatriz(uid, '2026-10-12', HOY, HOY);
    // A: semana del 28 sep cumplida, la del 5 oct falló y la del 12 sigue en curso sin cumplir
    assert.equal(fila(m, a).rachaActual, 0);
    assert.equal(fila(m, a).mejorRacha, 1);
    // B: semana del 28 sep no tuvo nada (falla), la del 5 oct tampoco, la del 12 ya cumplió
    assert.equal(fila(m, b).rachaActual, 1);
    assert.equal(fila(m, b).unidadRacha, 'semanas');
});

test('los hábitos con días fijos siguen igual', async () => {
    const m = await construirMatriz(uid, '2026-10-12', HOY, HOY);
    const f = fila(m, fija);
    assert.equal(estados(f), 'fallado,no-toca,no-toca');
    assert.equal(f.metaSemanal, null);
    assert.equal(f.unidadRacha, 'días');
    assert.equal(f.semanaActual, null);
});

test('los cumplimientos de un hábito con meta suman a los logros, pero no a las rachas de días', async () => {
    const otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['Luis', 'l@x.com', 'h']);
    const id = await db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, meta_semanal) VALUES (?, ?, 1, ?, ?, ?)', [otro, 'Meta', '2026-09-01', '[0,1,2,3,4,5,6]', 7]);
    for (let d = 1; d <= 10; d++) await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [id, `2026-09-${String(d).padStart(2, '0')}`]);
    const logros = await logrosDeUsuario(otro, HOY);
    const por = Object.fromEntries(logros.map((l) => [l.clave, l.obtenido]));
    assert.equal(por.total_10, true);
    assert.equal(por.racha_7, false); // diez días seguidos, pero la racha de días no aplica a las metas semanales
});

test('el respaldo guarda la meta semanal y se puede importar', async () => {
    const respaldo = JSON.parse(JSON.stringify(await construirRespaldo(uid)));
    assert.equal(respaldo.habitos.find((h) => h.nombre.startsWith('A')).metaSemanal, 3);
    assert.equal(respaldo.habitos.find((h) => h.nombre === 'Fijo lunes').metaSemanal, null);

    const nuevo = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['Eva', 'e@x.com', 'h']);
    assert.equal((await importarRespaldo(nuevo, respaldo)).importados, 3);
    const importado = await db.uno('SELECT meta_semanal FROM habitos WHERE usuario_id = ? AND nombre LIKE ?', [nuevo, 'A%']);
    assert.equal(importado.meta_semanal, 3);
});

test('importar rechaza una meta semanal fuera de 1 a 7', async () => {
    const respaldo = { version: 1, habitos: [{ nombre: 'X', dias: [1], peso: 1, creadoEn: '2026-10-01', metaSemanal: 9 }] };
    assert.match((await importarRespaldo(uid, respaldo)).error, /meta semanal/);
});
