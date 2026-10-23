import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRachas } from '../src/servicios/racha.js';

const TODOS = new Set([0, 1, 2, 3, 4, 5, 6]);

test('racha de días seguidos hasta hoy', () => {
    const hechos = new Set(['2026-10-07', '2026-10-08', '2026-10-09']);
    assert.deepEqual(calcularRachas('2026-10-07', TODOS, hechos, '2026-10-09'), { actual: 3, mejor: 3 });
});

test('un día fallado reinicia la racha actual pero conserva la mejor', () => {
    const hechos = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05']);
    // el 4 falló: la racha de 3 queda como mejor y la actual es solo el 5
    assert.deepEqual(calcularRachas('2026-10-01', TODOS, hechos, '2026-10-05'), { actual: 1, mejor: 3 });
});

test('hoy sin marcar todavía no rompe la racha', () => {
    const hechos = new Set(['2026-10-07', '2026-10-08']);
    assert.deepEqual(calcularRachas('2026-10-07', TODOS, hechos, '2026-10-09'), { actual: 2, mejor: 2 });
});

test('los días que no tocaba no cuentan ni rompen la racha', () => {
    // solo lunes (1) y miércoles (3): 5, 7 y 12 de octubre de 2026 son lun, mié, lun
    const hechos = new Set(['2026-10-05', '2026-10-07', '2026-10-12']);
    assert.deepEqual(calcularRachas('2026-10-05', new Set([1, 3]), hechos, '2026-10-12'), { actual: 3, mejor: 3 });
});

test('sin ningún registro la racha es cero', () => {
    assert.deepEqual(calcularRachas('2026-10-01', TODOS, new Set(), '2026-10-09'), { actual: 0, mejor: 0 });
});
