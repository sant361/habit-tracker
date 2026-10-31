// Panel de administración con SQLite en memoria.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';
process.env.ADMIN_EMAIL = 'admin@x.com, Jefe@X.com';

const { default: db } = await import('../src/db.js');
const { esCorreoAdmin } = await import('../src/utils/admin.js');
const { resumenGeneral, listarUsuarios, eliminarUsuario, claveTemporal, puedeRestablecer } = await import('../src/servicios/admin.js');

let admin, ana, luis;

before(async () => {
    const usuario = (nombre, email) => db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', [nombre, email, 'h']);
    admin = await usuario('Admin', 'admin@x.com');
    ana = await usuario('Ana', 'ana@x.com');
    luis = await usuario('Luis', 'luis@x.com');
    const hab = (u, nombre, archivado = 0) =>
        db.insertar('INSERT INTO habitos (usuario_id, nombre, peso, creado_en, dias, archivado) VALUES (?, ?, 1, ?, ?, ?)', [u, nombre, '2026-10-01', '[1]', archivado]);
    const a1 = await hab(ana, 'Leer');
    await hab(ana, 'Viejo', 1);
    const l1 = await hab(luis, 'Correr');
    for (const f of ['2026-10-05', '2026-10-30']) await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [a1, f]);
    await db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [l1, '2026-10-01']);
});

test('esCorreoAdmin lee la lista de ADMIN_EMAIL sin importar mayúsculas ni espacios', () => {
    assert.equal(esCorreoAdmin('admin@x.com'), true);
    assert.equal(esCorreoAdmin(' JEFE@x.com '), true);
    assert.equal(esCorreoAdmin('ana@x.com'), false);
    assert.equal(esCorreoAdmin(''), false);
    assert.equal(esCorreoAdmin(null), false);
});

test('sin ADMIN_EMAIL nadie es administrador', () => {
    assert.equal(esCorreoAdmin('admin@x.com', null), false);
    assert.equal(esCorreoAdmin('admin@x.com', ''), false);
    assert.equal(esCorreoAdmin('', ''), false);
});

test('resumenGeneral cuenta cuentas, hábitos activos, registros y cuentas activas en 7 días', async () => {
    assert.deepEqual(await resumenGeneral('2026-10-31'), { usuarios: 3, habitos: 2, registros: 3, activos: 1 });
    assert.equal((await resumenGeneral('2026-10-05')).activos, 2); // Ana (día 5) y Luis (día 1) dentro de la ventana
    assert.equal((await resumenGeneral('2026-10-10')).activos, 1); // solo Ana: la ventana va del 4 al 10
    assert.equal((await resumenGeneral('2026-11-30')).activos, 0);
});

test('listarUsuarios da cifras de uso por cuenta, sin contenido', async () => {
    const lista = (await listarUsuarios()).map((u) => ({ ...u }));
    assert.deepEqual(lista.find((u) => u.email === 'ana@x.com'), {
        id: ana, nombre: 'Ana', email: 'ana@x.com', habitos: 1, registros: 2, ultimaActividad: '2026-10-30', esAdmin: false
    });
    assert.equal(lista.find((u) => u.email === 'admin@x.com').esAdmin, true);
    assert.equal(lista.find((u) => u.email === 'admin@x.com').ultimaActividad, null);
    assert.ok(!JSON.stringify(lista).includes('Leer'));
    assert.ok(!JSON.stringify(lista).includes('clave'));
});

test('eliminarUsuario borra la cuenta y sus datos, pero no la de un administrador', async () => {
    assert.deepEqual(await eliminarUsuario(luis), { ok: true });
    assert.equal(await db.uno('SELECT id FROM usuarios WHERE id = ?', [luis]), undefined);
    assert.equal((await db.uno('SELECT COUNT(*) AS n FROM habitos WHERE usuario_id = ?', [luis])).n, 0);
    assert.equal((await eliminarUsuario(admin)).estado, 403);
    assert.equal((await eliminarUsuario(99999)).estado, 404);
    assert.ok(await db.uno('SELECT id FROM usuarios WHERE id = ?', [admin]));
});

test('puedeRestablecer solo acepta cuentas existentes que no son de administrador', async () => {
    assert.equal((await puedeRestablecer(ana)).usuario.id, ana);
    assert.equal((await puedeRestablecer(admin)).estado, 403);
    assert.equal((await puedeRestablecer(99999)).estado, 404);
});

test('claveTemporal da 10 caracteres sin letras confusas y distinta cada vez', () => {
    const claves = new Set(Array.from({ length: 50 }, claveTemporal));
    assert.equal(claves.size, 50);
    for (const c of claves) assert.match(c, /^[A-HJ-NP-Za-km-z2-9]{10}$/);
});
