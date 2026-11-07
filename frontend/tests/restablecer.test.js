import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenDeUrl, traeEnlace, direccionSinToken, errorDeClave } from '../servicios/restablecer.js';

const TOKEN = 'a1'.repeat(32);

test('tokenDeUrl saca el token solo si tiene la forma correcta', () => {
    assert.equal(tokenDeUrl('?restablecer=' + TOKEN), TOKEN);
    assert.equal(tokenDeUrl('?x=1&restablecer=' + TOKEN), TOKEN);
    assert.equal(tokenDeUrl('?restablecer=abc'), '');
    assert.equal(tokenDeUrl('?restablecer=' + TOKEN.toUpperCase()), '');
    assert.equal(tokenDeUrl(''), '');
    assert.equal(tokenDeUrl(undefined), '');
});

test('traeEnlace detecta el parámetro aunque esté roto', () => {
    assert.equal(traeEnlace('?restablecer=abc'), true);
    assert.equal(traeEnlace('?otra=1'), false);
});

test('direccionSinToken quita solo el token', () => {
    assert.equal(direccionSinToken('/', '?restablecer=' + TOKEN), '/');
    assert.equal(direccionSinToken('/', '?a=1&restablecer=' + TOKEN, '#x'), '/?a=1#x');
});

test('errorDeClave pide el largo y que coincidan', () => {
    assert.equal(errorDeClave('123456', '123456'), '');
    assert.match(errorDeClave('123', '123'), /entre 6 y 72/);
    assert.match(errorDeClave('x'.repeat(73), 'x'.repeat(73)), /entre 6 y 72/);
    assert.equal(errorDeClave('123456', '654321'), 'Las dos claves no coinciden');
});
