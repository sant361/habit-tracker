import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, categoriasDe, filtrarHabitos } from '../servicios/busqueda.js';

const habitos = [
    { id: 1, nombre: 'Meditación', categoria: 'Mente' },
    { id: 2, nombre: 'Correr 5 km', categoria: 'Salud' },
    { id: 3, nombre: 'Leer', categoria: 'Mente' },
    { id: 4, nombre: 'Beber agua', categoria: null }
];
const ids = (lista) => lista.map((h) => h.id);

test('normalizar quita tildes y mayúsculas', () => {
    assert.equal(normalizar('  Meditación  '), 'meditacion');
    assert.equal(normalizar(null), '');
});

test('categoriasDe devuelve las distintas, ordenadas, sin vacías', () => {
    assert.deepEqual(categoriasDe(habitos), ['Mente', 'Salud']);
    assert.deepEqual(categoriasDe([]), []);
});

test('filtrarHabitos sin filtros devuelve todos en el mismo orden', () => {
    assert.deepEqual(ids(filtrarHabitos(habitos)), [1, 2, 3, 4]);
});

test('filtrarHabitos busca en el nombre y la categoría sin importar tildes', () => {
    assert.deepEqual(ids(filtrarHabitos(habitos, 'MEDITACION')), [1]);
    assert.deepEqual(ids(filtrarHabitos(habitos, 'salud')), [2]);
    assert.deepEqual(ids(filtrarHabitos(habitos, 'e')), [1, 2, 3, 4]);
    assert.deepEqual(ids(filtrarHabitos(habitos, 'zzz')), []);
});

test('filtrarHabitos combina el texto con la categoría', () => {
    assert.deepEqual(ids(filtrarHabitos(habitos, '', 'Mente')), [1, 3]);
    assert.deepEqual(ids(filtrarHabitos(habitos, 'leer', 'Mente')), [3]);
    assert.deepEqual(ids(filtrarHabitos(habitos, 'correr', 'Mente')), []);
});
