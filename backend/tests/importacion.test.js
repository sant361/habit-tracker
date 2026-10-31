// Importación de respaldos con SQLite en memoria.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { validarRespaldo, importarRespaldo } = await import('../src/servicios/importacion.js');
const { construirRespaldo } = await import('../src/servicios/respaldo.js');
const { construirMatriz } = await import('../src/servicios/matriz.js');

let origen, destino, otro;

const habito = (extra = {}) => ({
    nombre: 'Leer', categoria: 'Mente', color: '#112233', dias: [1, 3], peso: 3, creadoEn: '2026-10-01',
    archivado: false, archivadoEn: null,
    pausas: [{ desde: '2026-10-10', hasta: null }],
    registros: [{ fecha: '2026-10-05', nota: 'Bien' }, { fecha: '2026-10-07', nota: null }],
    ...extra
});
const respaldo = (...habitos) => ({ version: 1, habitos });

before(async () => {
    origen = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['A', 'a@x.com', 'h']);
    destino = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['B', 'b@x.com', 'h']);
    otro = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['C', 'c@x.com', 'h']);
});

test('rechaza archivos que no son un respaldo', () => {
    for (const malo of [null, 'texto', {}, { version: 2, habitos: [] }, { version: 1 }, { version: 1, habitos: {} }]) {
        assert.ok(validarRespaldo(malo).error, JSON.stringify(malo));
    }
});

test('rechaza datos de hábitos inválidos diciendo cuál', () => {
    const casos = [
        [habito({ nombre: '  ' }), /nombre/],
        [habito({ dias: [] }), /días/],
        [habito({ dias: [9] }), /días/],
        [habito({ peso: 9 }), /impacto/],
        [habito({ creadoEn: '2026-13-45' }), /creación/],
        [habito({ pausas: [{ desde: '2026-10-10', hasta: '2026-10-01' }] }), /pausa/],
        [habito({ registros: [{ fecha: 'ayer' }] }), /fecha inválida/],
        [habito({ registros: [{ fecha: '2026-10-01', nota: 'x'.repeat(281) }] }), /nota/]
    ];
    for (const [h, patron] of casos) assert.match(validarRespaldo(respaldo(h)).error, patron);
});

test('limpia valores opcionales: color inválido, registros repetidos', () => {
    const { habitos } = validarRespaldo(respaldo(habito({ color: 'rojo', registros: [{ fecha: '2026-10-05' }, { fecha: '2026-10-05', nota: 'otra' }] })));
    assert.equal(habitos[0].color, '#38bdf8');
    assert.equal(habitos[0].registros.length, 1);
});

test('importa hábitos con sus pausas y registros, al final de la lista', async () => {
    await db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, orden) VALUES (?, ?, 1, ?, ?, 4)', [destino, 'Existente', '2026-10-01', '[1]']);
    const r = await importarRespaldo(destino, respaldo(habito(), habito({ nombre: 'Correr', pausas: [], registros: [] })));
    assert.deepEqual(r, { importados: 2, omitidos: [], registros: 2 });

    const m = await construirMatriz(destino, '2026-10-05', '2026-10-12', '2026-10-12');
    assert.deepEqual(m.filas.map((f) => f.nombre), ['Existente', 'Leer', 'Correr']);
    const leer = m.filas.find((f) => f.nombre === 'Leer');
    assert.equal(leer.celdas[0].estado, 'hecho');
    assert.equal(leer.celdas[0].nota, 'Bien');
    assert.equal(leer.celdas[7].estado, 'pausado');
});

test('omite los que ya existen, sin importar mayúsculas, y no duplica', async () => {
    const r = await importarRespaldo(destino, respaldo(habito({ nombre: 'LEER' }), habito({ nombre: 'Nuevo', registros: [] })));
    assert.deepEqual(r, { importados: 1, omitidos: ['LEER'], registros: 0 });
    assert.equal((await db.todos('SELECT id FROM habitos WHERE usuario_id = ?', [destino])).length, 4);
});

test('un archivado se importa archivado, sin ocupar lugar en el orden', async () => {
    await importarRespaldo(otro, respaldo(habito({ nombre: 'Viejo', archivado: true, archivadoEn: '2026-10-03', pausas: [] })));
    const h = await db.uno('SELECT archivado, archivado_en, orden FROM habitos WHERE usuario_id = ?', [otro]);
    assert.equal(h.archivado, 1);
    assert.equal(h.archivado_en, '2026-10-03');
    assert.equal(h.orden, 0);
});

test('un respaldo exportado se puede volver a importar en otra cuenta', async () => {
    await importarRespaldo(origen, respaldo(habito({ nombre: 'Ida y vuelta' })));
    const exportado = JSON.parse(JSON.stringify(await construirRespaldo(origen)));
    const nueva = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['D', 'd@x.com', 'h']);
    const r = await importarRespaldo(nueva, exportado);
    assert.equal(r.importados, 1);
    const otraVez = JSON.parse(JSON.stringify(await construirRespaldo(nueva)));
    assert.deepEqual(otraVez.habitos, exportado.habitos);
});
