// Orden de los hábitos con SQLite en memoria.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { guardarOrden } = await import('../src/servicios/orden.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');

let uid, otro, a, b, c, ajeno;
const nombres = async () => (await construirMatriz(uid, '2026-10-01', '2026-10-02', '2026-10-02')).filas.map((f) => f.nombre);
const nuevo = (u, nombre, archivado = 0) =>
    db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, archivado) VALUES (?, ?, 1, ?, ?, ?)', [u, nombre, '2026-10-01', '[0,1,2,3,4,5,6]', archivado]);

before(async () => {
    uid = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['A', 'a@x.com', 'h']);
    otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['B', 'b@x.com', 'h']);
    a = await nuevo(uid, 'A');
    b = await nuevo(uid, 'B');
    c = await nuevo(uid, 'C');
    await nuevo(uid, 'Archivado', 1);
    ajeno = await nuevo(otro, 'Ajeno');
});

test('sin orden guardado, los hábitos salen por antigüedad', async () => {
    assert.deepEqual(await nombres(), ['A', 'B', 'C']);
});

test('guardarOrden cambia el orden en la matriz', async () => {
    assert.deepEqual(await guardarOrden(uid, [c, a, b]), { ok: true });
    assert.deepEqual(await nombres(), ['C', 'A', 'B']);
    assert.deepEqual(await guardarOrden(uid, [b, c, a]), { ok: true });
    assert.deepEqual(await nombres(), ['B', 'C', 'A']);
});

test('no toca los hábitos de otra persona', async () => {
    const { orden } = await db.uno('SELECT orden FROM habitos WHERE id = ?', [ajeno]);
    assert.equal(orden, 0);
});

test('rechaza listas incompletas, con sobrantes, repetidas o con ids ajenos o archivados', async () => {
    assert.equal((await guardarOrden(uid, [a, b])).estado, 409); // falta uno
    assert.equal((await guardarOrden(uid, [a, b, c, ajeno])).estado, 409); // sobra uno ajeno
    assert.equal((await guardarOrden(uid, [a, b, ajeno])).estado, 409); // uno ajeno en vez de uno propio
    assert.equal((await guardarOrden(uid, [a, a, b])).estado, 400); // repetido
    assert.equal((await guardarOrden(uid, 'a,b,c')).estado, 400); // no es lista
    assert.equal((await guardarOrden(uid, [a, b, '3'])).estado, 400); // no son enteros
    assert.deepEqual(await nombres(), ['B', 'C', 'A']); // nada cambió
});

test('un hábito archivado no cuenta para la lista', async () => {
    const archivado = (await db.uno("SELECT id FROM habitos WHERE nombre = 'Archivado'")).id;
    assert.equal((await guardarOrden(uid, [a, b, c, archivado])).estado, 409);
});
