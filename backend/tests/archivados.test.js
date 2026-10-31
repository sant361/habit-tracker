// Archivar y restaurar hábitos con SQLite en memoria.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { listarArchivados, restaurar } = await import('../src/servicios/archivados.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');

let uid, otro;
const nuevo = (u, nombre, extra = {}) =>
    db.insertar(
        'INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, archivado, archivado_en, orden) VALUES (?, ?, 1, ?, ?, ?, ?, ?)',
        [u, nombre, '2026-10-01', '[0,1,2,3,4,5,6]', extra.archivado ?? 0, extra.archivadoEn ?? null, extra.orden ?? 0]
    );
const pausas = async (id) => (await db.todos('SELECT desde, hasta FROM pausas WHERE habito_id = ? ORDER BY desde', [id])).map(({ desde, hasta }) => ({ desde, hasta }));

before(async () => {
    uid = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['A', 'a@x.com', 'h']);
    otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['B', 'b@x.com', 'h']);
});

test('listarArchivados trae solo los archivados de la persona, el más reciente primero', async () => {
    await nuevo(uid, 'Activo', { orden: 1 });
    await nuevo(uid, 'Viejo', { archivado: 1, archivadoEn: '2026-10-02' });
    await nuevo(uid, 'Reciente', { archivado: 1, archivadoEn: '2026-10-05' });
    await nuevo(otro, 'Ajeno', { archivado: 1, archivadoEn: '2026-10-03' });
    assert.deepEqual((await listarArchivados(uid)).map((h) => h.nombre), ['Reciente', 'Viejo']);
});

test('restaurar devuelve el hábito al final y pausa los días que estuvo archivado', async () => {
    const id = await nuevo(uid, 'A restaurar', { archivado: 1, archivadoEn: '2026-10-05' });
    const resultado = await restaurar(uid, id, '2026-10-10');
    assert.deepEqual(resultado, { ok: true, pausa: { desde: '2026-10-05', hasta: '2026-10-09' } });
    const h = await db.uno('SELECT archivado, archivado_en, orden FROM habitos WHERE id = ?', [id]);
    assert.equal(h.archivado, 0);
    assert.equal(h.archivado_en, null);
    assert.equal(h.orden, 2);

    // Esos días no cuentan como fallados, pero a partir de hoy sí cuenta
    const fila = (await construirMatriz(uid, '2026-10-04', '2026-10-10', '2026-10-10')).filas.find((f) => f.habitoId === id);
    assert.deepEqual(fila.celdas.map((c) => c.estado), ['fallado', 'pausado', 'pausado', 'pausado', 'pausado', 'pausado', 'pendiente']);
});

test('restaurar el mismo día en que se archivó no crea pausa', async () => {
    const id = await nuevo(uid, 'Mismo día', { archivado: 1, archivadoEn: '2026-10-10' });
    assert.deepEqual(await restaurar(uid, id, '2026-10-10'), { ok: true, pausa: null });
    assert.deepEqual(await pausas(id), []);
});

test('un hábito archivado sin fecha (antiguo) se restaura sin pausa', async () => {
    const id = await nuevo(uid, 'Antiguo', { archivado: 1 });
    assert.deepEqual(await restaurar(uid, id, '2026-10-10'), { ok: true, pausa: null });
});

test('si ya había pausas que se cruzan con el hueco, se unen en una sola', async () => {
    const id = await nuevo(uid, 'Con pausas', { archivado: 1, archivadoEn: '2026-10-05' });
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [id, '2026-10-03', '2026-10-06']);
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [id, '2026-10-08', '2026-10-20']);
    await restaurar(uid, id, '2026-10-10');
    assert.deepEqual(await pausas(id), [{ desde: '2026-10-03', hasta: '2026-10-20' }]);
});

test('si había una pausa abierta, el hábito sigue en pausa', async () => {
    const id = await nuevo(uid, 'Pausa abierta', { archivado: 1, archivadoEn: '2026-10-05' });
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, NULL)', [id, '2026-10-02']);
    const r = await restaurar(uid, id, '2026-10-10');
    assert.deepEqual(r.pausa, { desde: '2026-10-02', hasta: null });
    assert.deepEqual(await pausas(id), [{ desde: '2026-10-02', hasta: null }]);
});

test('no restaura hábitos ajenos ni que no están archivados', async () => {
    const ajeno = await nuevo(otro, 'Ajeno archivado', { archivado: 1, archivadoEn: '2026-10-01' });
    const activo = await nuevo(uid, 'Activo 2');
    assert.equal((await restaurar(uid, ajeno, '2026-10-10')).estado, 404);
    assert.equal((await restaurar(uid, activo, '2026-10-10')).estado, 404);
    assert.equal((await restaurar(uid, 99999, '2026-10-10')).estado, 404);
    assert.equal((await db.uno('SELECT archivado FROM habitos WHERE id = ?', [ajeno])).archivado, 1);
});
