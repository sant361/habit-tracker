import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esFecha, diaSemana, sumarDias, rangoDias } from '../src/utils/fechas.js';

test('esFecha acepta fechas reales y rechaza texto inválido', () => {
    assert.equal(esFecha('2026-10-09'), true);
    assert.equal(esFecha('2026-13-01'), false);
    assert.equal(esFecha('09/10/2026'), false);
    assert.equal(esFecha(''), false);
});

test('diaSemana devuelve 0 para domingo y 6 para sábado', () => {
    assert.equal(diaSemana('2026-10-25'), 0); // domingo
    assert.equal(diaSemana('2026-10-26'), 1); // lunes
    assert.equal(diaSemana('2026-10-24'), 6); // sábado
});

test('sumarDias cruza fin de mes y de año, hacia adelante y hacia atrás', () => {
    assert.equal(sumarDias('2026-10-31', 1), '2026-11-01');
    assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
    assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
    assert.equal(sumarDias('2028-02-28', 1), '2028-02-29'); // año bisiesto
});

test('rangoDias incluye ambos extremos', () => {
    assert.deepEqual(rangoDias('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    assert.deepEqual(rangoDias('2026-10-05', '2026-10-05'), ['2026-10-05']);
    assert.deepEqual(rangoDias('2026-10-06', '2026-10-05'), []);
});
