import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreDeCopia, datosDeCopia } from '../servicios/duplicar.js';

test('nombreDeCopia agrega "(copia)" y numera si ya existe', () => {
    assert.equal(nombreDeCopia('Leer', ['Leer']), 'Leer (copia)');
    assert.equal(nombreDeCopia('Leer', ['Leer', 'Leer (copia)']), 'Leer (copia 2)');
    assert.equal(nombreDeCopia('Leer', ['Leer', 'leer (COPIA)', 'Leer (copia 2)']), 'Leer (copia 3)');
});

test('nombreDeCopia no pasa del máximo de 60 caracteres', () => {
    const largo = 'x'.repeat(60);
    const copia = nombreDeCopia(largo, [largo]);
    assert.equal(copia.length, 60);
    assert.ok(copia.endsWith(' (copia)'));
});

test('datosDeCopia conserva los ajustes y empieza hoy', () => {
    const original = { nombre: 'Leer', categoria: null, color: '#112233', peso: 4, dias: [1, 3], creadoEn: '2026-01-01', id: 9 };
    const copia = datosDeCopia(original, ['Leer'], '2026-10-31');
    assert.deepEqual(copia, { nombre: 'Leer (copia)', categoria: '', color: '#112233', peso: 4, dias: [1, 3], metaSemanal: null, creadoEn: '2026-10-31' });
    copia.dias.push(5);
    assert.deepEqual(original.dias, [1, 3]);
});

test('datosDeCopia conserva la meta semanal', () => {
    const original = { nombre: 'Correr', color: '#112233', peso: 3, dias: [0, 1, 2, 3, 4, 5, 6], metaSemanal: 3 };
    assert.equal(datosDeCopia(original, [], '2026-10-31').metaSemanal, 3);
});
