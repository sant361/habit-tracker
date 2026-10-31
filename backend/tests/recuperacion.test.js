import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarCodigo, normalizarCodigo } from '../src/servicios/recuperacion.js';
import { crearLimitador } from '../src/utils/limitador.js';

test('generarCodigo tiene la forma XXXX-XXXX-XXXX sin caracteres confusos', () => {
    for (let i = 0; i < 200; i++) {
        const codigo = generarCodigo();
        assert.match(codigo, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
});

test('generarCodigo no repite códigos', () => {
    const codigos = new Set(Array.from({ length: 500 }, generarCodigo));
    assert.equal(codigos.size, 500);
});

test('normalizarCodigo ignora guiones, espacios y mayúsculas', () => {
    assert.equal(normalizarCodigo(' abcd-efgh-2345 '), 'ABCDEFGH2345');
    assert.equal(normalizarCodigo('ABCD EFGH 2345'), 'ABCDEFGH2345');
    assert.equal(normalizarCodigo(undefined), '');
    assert.equal(normalizarCodigo(normalizarCodigo(generarCodigo())).length, 12);
});

test('limitador: permite hasta el máximo y luego bloquea', () => {
    const l = crearLimitador({ max: 3, ventanaMs: 1000 });
    assert.deepEqual([1, 2, 3, 4].map(() => l.intentar('a', 0)), [true, true, true, false]);
});

test('limitador: cada clave cuenta por separado', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    assert.equal(l.intentar('a', 0), true);
    assert.equal(l.intentar('b', 0), true);
    assert.equal(l.intentar('a', 0), false);
});

test('limitador: vuelve a permitir cuando pasa la ventana', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    assert.equal(l.intentar('a', 0), true);
    assert.equal(l.intentar('a', 999), false);
    assert.equal(l.intentar('a', 1000), true);
});

test('limitador: reiniciar borra los intentos', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    l.intentar('a', 0);
    l.reiniciar('a');
    assert.equal(l.intentar('a', 1), true);
});
