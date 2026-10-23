// Comprueba la lectura del historial desde la base (SQLite en memoria).
import { test } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;
process.env.DB_FILE = ':memory:';

const { default: db } = await import('../src/db.js');
const { logrosDeUsuario } = await import('../src/servicios/logrosUsuario.js');

const usuario = (email) => db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', ['U', email, 'h']);
const habito = (uid, archivado = 0) =>
    db.insertar('INSERT INTO habitos (usuario_id, nombre, creado_en, archivado, dias) VALUES (?, ?, ?, ?, ?)', [uid, 'H', '2026-10-01', archivado, '[0,1,2,3,4,5,6]']);
const marcar = (hid, fecha) => db.insertar('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)', [hid, fecha]);
const obtenido = (logros, clave) => logros.find((l) => l.clave === clave).obtenido;

test('cuenta los cumplimientos del usuario, incluso de hábitos archivados, y no los de otros', async () => {
    const yo = await usuario('yo@x.com');
    const otro = await usuario('otro@x.com');
    const activo = await habito(yo);
    const archivado = await habito(yo, 1);
    const ajeno = await habito(otro);

    for (let d = 1; d <= 7; d++) await marcar(activo, `2026-10-0${d}`);
    for (let d = 1; d <= 3; d++) await marcar(archivado, `2026-10-0${d}`);
    for (let d = 1; d <= 9; d++) await marcar(ajeno, `2026-10-0${d}`);

    const logros = await logrosDeUsuario(yo, '2026-10-09');
    assert.equal(logros.find((l) => l.clave === 'total_10').actual, 10); // 7 + 3, sin los 9 ajenos
    assert.equal(obtenido(logros, 'total_10'), true);
    assert.equal(obtenido(logros, 'racha_7'), true);

    const sinDatos = await logrosDeUsuario(await usuario('nuevo@x.com'), '2026-10-09');
    assert.ok(sinDatos.every((l) => !l.obtenido));
});
