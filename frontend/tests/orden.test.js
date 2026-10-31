import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverElemento } from '../servicios/orden.js';

test('moverElemento intercambia con el vecino', () => {
    assert.deepEqual(moverElemento(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
    assert.deepEqual(moverElemento(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
});

test('moverElemento no mueve más allá de los extremos y devuelve la misma lista', () => {
    const lista = ['a', 'b', 'c'];
    assert.equal(moverElemento(lista, 0, -1), lista);
    assert.equal(moverElemento(lista, 2, 1), lista);
    assert.equal(moverElemento(lista, -1, 1), lista);
    assert.equal(moverElemento(lista, 5, -1), lista);
});

test('moverElemento no modifica la lista original', () => {
    const lista = ['a', 'b', 'c'];
    moverElemento(lista, 0, 1);
    assert.deepEqual(lista, ['a', 'b', 'c']);
});
