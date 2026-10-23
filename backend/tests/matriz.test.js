// Prueba la matriz con una base de datos SQLite en memoria (no toca habit-tracker.db).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');

const HOY = '2026-10-10';
const DESDE = '2026-10-07';
const HASTA = '2026-10-11';
let usuarioId;

async function crearHabito(uid, nombre, categoria, peso, creadoEn, archivado = 0) {
    return db.insertar(
        'INSERT INTO habitos (usuario_id, nombre, categoria, peso, creado_en, archivado, dias) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uid, nombre, categoria, peso, creadoEn, archivado, '[0,1,2,3,4,5,6]']
    );
}
const marcar = (habitoId, fecha, nota = null) =>
    db.insertar('INSERT INTO registros (habito_id, fecha, nota) VALUES (?, ?, ?)', [habitoId, fecha, nota]);

before(async () => {
    usuarioId = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['A', 'a@x.com', 'h']);
    const otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['B', 'b@x.com', 'h']);

    // Hábito A: peso 2, creado el 8. Hecho el 8 y el 10 (hoy), fallado el 9.
    const a = await crearHabito(usuarioId, 'A', 'Salud', 2, '2026-10-08');
    await marcar(a, '2026-10-08', 'buen día');
    await marcar(a, '2026-10-10');

    // Hábito B: peso 1, creado hoy y sin marcar -> pendiente
    await crearHabito(usuarioId, 'B', 'Estudio', 1, HOY);

    // Archivado y de otro usuario: no deben aparecer
    await crearHabito(usuarioId, 'Archivado', 'Salud', 1, '2026-10-01', 1);
    await crearHabito(otro, 'Ajeno', 'Salud', 1, '2026-10-01');
});

test('estados de cada celda', async () => {
    const m = await construirMatriz(usuarioId, DESDE, HASTA, HOY);
    assert.deepEqual(m.dias, ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
    assert.equal(m.filas.length, 2);

    const a = m.filas.find((f) => f.nombre === 'A');
    assert.deepEqual(a.celdas.map((c) => c.estado), ['no-toca', 'hecho', 'fallado', 'hecho', 'futuro']);
    assert.equal(a.celdas[1].nota, 'buen día');

    const b = m.filas.find((f) => f.nombre === 'B');
    assert.deepEqual(b.celdas.map((c) => c.estado), ['no-toca', 'no-toca', 'no-toca', 'pendiente', 'futuro']);
});

test('el cumplimiento se pondera por el peso y el pendiente no cuenta', async () => {
    const m = await construirMatriz(usuarioId, DESDE, HASTA, HOY);
    const a = m.filas.find((f) => f.nombre === 'A');
    assert.equal(a.tasa, 0.67); // 4 de 6 puntos
    assert.equal(m.filas.find((f) => f.nombre === 'B').tasa, null);
    assert.equal(m.tasaGlobal, 0.67);
    assert.deepEqual(m.puntajeDiario, [null, 1, 0, 1, null]);
});

test('rachas del hábito', async () => {
    const m = await construirMatriz(usuarioId, DESDE, HASTA, HOY);
    const a = m.filas.find((f) => f.nombre === 'A');
    assert.equal(a.rachaActual, 1);
    assert.equal(a.mejorRacha, 1);
});

test('el filtro por categoría deja solo esos hábitos y recalcula los totales', async () => {
    const m = await construirMatriz(usuarioId, DESDE, HASTA, HOY, 'Estudio');
    assert.deepEqual(m.filas.map((f) => f.nombre), ['B']);
    assert.equal(m.tasaGlobal, null);
});

test('no mezcla hábitos de otros usuarios ni archivados', async () => {
    const m = await construirMatriz(usuarioId, DESDE, HASTA, HOY);
    const nombres = m.filas.map((f) => f.nombre);
    assert.ok(!nombres.includes('Ajeno'));
    assert.ok(!nombres.includes('Archivado'));
});
