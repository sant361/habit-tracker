import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularLogros } from '../src/servicios/logros.js';
import { rangoDias } from '../src/utils/fechas.js';

const TODOS = new Set([0, 1, 2, 3, 4, 5, 6]);
const habito = (creadoEn, fechas) => ({ creadoEn, dias: TODOS, hechos: new Set(fechas) });
const estado = (logros) => Object.fromEntries(logros.map((l) => [l.clave, l.obtenido]));

test('sin hábitos no hay logros y el avance es cero', () => {
    const logros = calcularLogros([], '2026-10-10');
    assert.ok(logros.every((l) => !l.obtenido && l.actual === 0));
});

test('el primer cumplimiento desbloquea "Primer paso"', () => {
    const e = estado(calcularLogros([habito('2026-10-01', ['2026-10-01'])], '2026-10-10'));
    assert.equal(e.total_1, true);
    assert.equal(e.total_10, false);
});

test('una racha de 7 días desbloquea el logro, y 6 no', () => {
    const siete = rangoDias('2026-10-01', '2026-10-07');
    assert.equal(estado(calcularLogros([habito('2026-10-01', siete)], '2026-10-07')).racha_7, true);
    const seis = rangoDias('2026-10-01', '2026-10-06');
    const l = calcularLogros([habito('2026-10-01', seis)], '2026-10-07').find((x) => x.clave === 'racha_7');
    assert.equal(l.obtenido, false);
    assert.equal(l.actual, 6);
});

test('el avance nunca pasa de la meta', () => {
    const muchos = rangoDias('2026-09-01', '2026-10-10');
    const l = calcularLogros([habito('2026-09-01', muchos)], '2026-10-10').find((x) => x.clave === 'racha_7');
    assert.equal(l.actual, 7);
});

test('día perfecto: exige al menos 2 hábitos programados y todos cumplidos', () => {
    const solo = estado(calcularLogros([habito('2026-10-01', ['2026-10-01'])], '2026-10-02'));
    assert.equal(solo.dia_perfecto, false);

    const dos = estado(calcularLogros([habito('2026-10-01', ['2026-10-01']), habito('2026-10-01', ['2026-10-01'])], '2026-10-02'));
    assert.equal(dos.dia_perfecto, true);

    const mitad = estado(calcularLogros([habito('2026-10-01', ['2026-10-01']), habito('2026-10-01', [])], '2026-10-02'));
    assert.equal(mitad.dia_perfecto, false);
});

test('semana perfecta: 7 días perfectos seguidos; un día fallado reinicia', () => {
    const dias = rangoDias('2026-10-01', '2026-10-07');
    assert.equal(estado(calcularLogros([habito('2026-10-01', dias), habito('2026-10-01', dias)], '2026-10-07')).semana_perfecta, true);

    const conHueco = dias.filter((d) => d !== '2026-10-04');
    assert.equal(estado(calcularLogros([habito('2026-10-01', conHueco), habito('2026-10-01', dias)], '2026-10-07')).semana_perfecta, false);
});

test('hoy sin completar todavía no rompe los días perfectos seguidos', () => {
    const dias = rangoDias('2026-10-01', '2026-10-06');
    const l = calcularLogros([habito('2026-10-01', dias), habito('2026-10-01', dias)], '2026-10-07')
        .find((x) => x.clave === 'semana_perfecta');
    assert.equal(l.actual, 6);
});

test('los cumplimientos en fechas futuras no cuentan', () => {
    const e = estado(calcularLogros([habito('2026-10-01', ['2026-10-20'])], '2026-10-10'));
    assert.equal(e.total_1, false);
});
