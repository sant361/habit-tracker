import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearToken, huella, tokenValido, vigente, urlBase, enlaceDe, mensajeRestablecer, VIGENCIA_MS } from '../src/servicios/enlaceClave.js';

test('crearToken da un token de 64 caracteres, su huella y la hora en que vence', () => {
    const ahora = Date.parse('2026-11-06T12:00:00Z');
    const { token, hash, expira } = crearToken(ahora);
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(hash, huella(token));
    assert.notEqual(hash, token);
    assert.equal(expira, new Date(ahora + VIGENCIA_MS).toISOString());
    assert.notEqual(crearToken().token, crearToken().token);
});

test('tokenValido rechaza lo que no tiene la forma', () => {
    assert.equal(tokenValido(crearToken().token), true);
    for (const malo of ['', 'abc', 'x'.repeat(64), null, 12, undefined, 'a'.repeat(63), 'A'.repeat(64)]) assert.equal(tokenValido(malo), false);
});

test('vigente solo acepta fechas futuras', () => {
    const ahora = Date.parse('2026-11-06T12:00:00Z');
    assert.equal(vigente('2026-11-06T12:00:01Z', ahora), true);
    assert.equal(vigente('2026-11-06T12:00:00Z', ahora), false);
    assert.equal(vigente('2026-11-06T11:59:00Z', ahora), false);
    assert.equal(vigente(null, ahora), false);
    assert.equal(vigente('no es fecha', ahora), false);
});

test('urlBase usa APP_URL o la dirección de la petición', () => {
    assert.equal(urlBase({ APP_URL: ' https://mi.app/ ' }, {}), 'https://mi.app');
    assert.equal(urlBase({}, { host: 'mi.onrender.com', 'x-forwarded-proto': 'https, http' }), 'https://mi.onrender.com');
    assert.equal(urlBase({}, { host: 'localhost:3000' }), 'http://localhost:3000');
    assert.equal(enlaceDe('https://mi.app', 'abc'), 'https://mi.app/?restablecer=abc');
});

test('el correo trae el enlace y la vigencia', () => {
    const { asunto, texto } = mensajeRestablecer({ nombre: 'Ana', enlace: 'https://mi.app/?restablecer=abc' });
    assert.match(asunto, /clave/i);
    assert.match(texto, /^Hola Ana,/);
    assert.match(texto, /https:\/\/mi\.app\/\?restablecer=abc/);
    assert.match(texto, /30 minutos/);
});
