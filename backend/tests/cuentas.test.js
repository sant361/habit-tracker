import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRegistro, validarLogin, limpiarEmail } from '../src/servicios/cuentas.js';

const bueno = { nombre: ' Ana ', email: ' ANA@Correo.COM ', clave: 'secreta1' };

test('validarRegistro limpia nombre y correo', () => {
    assert.deepEqual(validarRegistro(bueno), { nombre: 'Ana', email: 'ana@correo.com', clave: 'secreta1' });
});

test('validarRegistro rechaza datos que no son texto en vez de fallar', () => {
    for (const malo of [null, undefined, {}, { ...bueno, email: 123 }, { ...bueno, nombre: ['a'] }, { ...bueno, clave: 123456 }, { ...bueno, email: { a: 1 } }]) {
        assert.ok(validarRegistro(malo).error, JSON.stringify(malo));
    }
});

test('validarRegistro revisa nombre, correo y clave', () => {
    assert.match(validarRegistro({ ...bueno, nombre: '   ' }).error, /nombre/);
    assert.match(validarRegistro({ ...bueno, nombre: 'x'.repeat(61) }).error, /nombre/);
    for (const email of ['sin-arroba', 'a@b', 'a b@c.com', '@c.com', 'a@.com ']) assert.match(validarRegistro({ ...bueno, email }).error, /correo/, email);
    assert.match(validarRegistro({ ...bueno, email: 'a'.repeat(250) + '@x.com' }).error, /correo/);
    assert.match(validarRegistro({ ...bueno, clave: '12345' }).error, /clave/);
    assert.match(validarRegistro({ ...bueno, clave: 'x'.repeat(73) }).error, /clave/);
    assert.equal(validarRegistro({ ...bueno, clave: 'x'.repeat(72) }).error, undefined);
});

test('validarLogin limpia el correo y no acepta vacíos ni tipos raros', () => {
    assert.deepEqual(validarLogin({ email: ' Ana@X.com ', clave: 'abc' }), { email: 'ana@x.com', clave: 'abc' });
    for (const malo of [null, {}, { email: 'a@x.com' }, { email: 'a@x.com', clave: '' }, { email: 5, clave: 'abc' }, { email: 'a@x.com', clave: ['abc'] }]) {
        assert.ok(validarLogin(malo).error, JSON.stringify(malo));
    }
});

test('limpiarEmail devuelve vacío si no es texto', () => {
    assert.equal(limpiarEmail(undefined), '');
    assert.equal(limpiarEmail({}), '');
    assert.equal(limpiarEmail(' A@B.com '), 'a@b.com');
});
