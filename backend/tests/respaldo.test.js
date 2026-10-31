// Respaldo de datos con SQLite en memoria.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { construirRespaldo } = await import('../src/servicios/respaldo.js');

let uid, otro, leer, correr;

before(async () => {
    uid = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash, codigo_hash) VALUES (?, ?, ?, ?)', ['Ana', 'ana@x.com', 'SECRETO1', 'SECRETO2']);
    otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['Luis', 'luis@x.com', 'h']);
    const hab = (u, nombre, extra = {}) =>
        db.insertar(
            'INSERT INTO habitos (usuario_id, nombre, categoria, peso, creado_en, dias, archivado, archivado_en, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [u, nombre, extra.categoria ?? null, extra.peso ?? 2, '2026-10-01', '[1,3,5]', extra.archivado ?? 0, extra.archivadoEn ?? null, extra.orden ?? 0]
        );
    leer = await hab(uid, 'Leer', { categoria: 'Mente', orden: 2 });
    correr = await hab(uid, 'Correr', { orden: 1 });
    const viejo = await hab(uid, 'Viejo', { archivado: 1, archivadoEn: '2026-10-05' });
    const ajeno = await hab(otro, 'Ajeno');

    await db.insertar('INSERT INTO registros (habito_id, fecha, nota) VALUES (?, ?, ?)', [leer, '2026-10-07', 'Capítulo 3']);
    await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [leer, '2026-10-05']);
    await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [ajeno, '2026-10-05']);
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [correr, '2026-10-10', null]);
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [viejo, '2026-10-02', '2026-10-03']);
});

test('el respaldo trae los datos de la persona, con archivados al final', async () => {
    const r = await construirRespaldo(uid);
    assert.equal(r.version, 1);
    assert.deepEqual(r.usuario, { nombre: 'Ana', email: 'ana@x.com' });
    assert.deepEqual(r.habitos.map((h) => h.nombre), ['Correr', 'Leer', 'Viejo']);

    const leerH = r.habitos.find((h) => h.nombre === 'Leer');
    assert.deepEqual(leerH.dias, [1, 3, 5]);
    assert.equal(leerH.categoria, 'Mente');
    assert.equal(leerH.archivado, false);
    assert.deepEqual(leerH.registros.map((x) => ({ ...x })), [
        { fecha: '2026-10-05', nota: null },
        { fecha: '2026-10-07', nota: 'Capítulo 3' }
    ]);
});

test('incluye las pausas y los datos de archivado', async () => {
    const r = await construirRespaldo(uid);
    assert.deepEqual(r.habitos.find((h) => h.nombre === 'Correr').pausas.map((x) => ({ ...x })), [{ desde: '2026-10-10', hasta: null }]);
    const viejo = r.habitos.find((h) => h.nombre === 'Viejo');
    assert.equal(viejo.archivado, true);
    assert.equal(viejo.archivadoEn, '2026-10-05');
    assert.equal(viejo.pausas.length, 1);
});

test('no incluye claves ni datos de otras personas', async () => {
    const texto = JSON.stringify(await construirRespaldo(uid));
    assert.ok(!texto.includes('SECRETO'));
    assert.ok(!texto.includes('Ajeno'));
    assert.ok(!texto.includes('luis@x.com'));
    assert.ok(!/clave|codigo_hash|usuario_id/i.test(texto));
});

test('una cuenta sin hábitos da un respaldo vacío', async () => {
    const nuevo = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['Eva', 'eva@x.com', 'h']);
    assert.deepEqual((await construirRespaldo(nuevo)).habitos, []);
});
