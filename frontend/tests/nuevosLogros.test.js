import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectarNuevos, clavesObtenidas, textoAviso } from '../servicios/nuevosLogros.js';

const logro = (clave, obtenido, titulo = clave) => ({ clave, obtenido, titulo, icono: '*' });

test('la primera revisión (sin vistos) no avisa de nada', () => {
    assert.deepEqual(detectarNuevos([logro('a', true)], null), []);
});

test('avisa solo de los logros obtenidos que no se habían visto', () => {
    const logros = [logro('a', true), logro('b', true), logro('c', false)];
    assert.deepEqual(detectarNuevos(logros, ['a']).map((l) => l.clave), ['b']);
});

test('con la lista de vistos vacía avisa de todos los obtenidos', () => {
    assert.equal(detectarNuevos([logro('a', true), logro('b', false)], []).length, 1);
});

test('clavesObtenidas devuelve solo las de los logros ganados', () => {
    assert.deepEqual(clavesObtenidas([logro('a', true), logro('b', false)]), ['a']);
});

test('textoAviso distingue uno de varios', () => {
    assert.equal(textoAviso([logro('a', true, 'Primer paso')]), '* Logro desbloqueado: Primer paso');
    assert.equal(textoAviso([logro('a', true, 'A'), logro('b', true, 'B')]), '🏆 2 logros nuevos: A, B');
});
