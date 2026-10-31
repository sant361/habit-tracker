import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaLarga, diasAtras, nombreDia, mover, MAX_DIAS_ATRAS } from '../servicios/dia.js';

test('fechaLarga escribe el día de la semana y el mes', () => {
    assert.equal(fechaLarga('2026-10-26'), 'lunes 26 de octubre');
    assert.equal(fechaLarga('2026-01-01'), 'jueves 1 de enero');
});

test('diasAtras cuenta los días de diferencia', () => {
    assert.equal(diasAtras('2026-10-31', '2026-10-31'), 0);
    assert.equal(diasAtras('2026-10-30', '2026-10-31'), 1);
    assert.equal(diasAtras('2026-09-30', '2026-10-31'), 31);
});

test('nombreDia usa Hoy, Ayer o la fecha completa', () => {
    assert.equal(nombreDia('2026-10-31', '2026-10-31'), 'Hoy');
    assert.equal(nombreDia('2026-10-30', '2026-10-31'), 'Ayer');
    assert.equal(nombreDia('2026-10-28', '2026-10-31'), 'Miércoles 28 de octubre');
});

test('mover no pasa de hoy ni del límite hacia atrás', () => {
    assert.equal(mover(0, 1), 0);
    assert.equal(mover(0, -1), -1);
    assert.equal(mover(-3, 1), -2);
    assert.equal(mover(-MAX_DIAS_ATRAS, -1), -MAX_DIAS_ATRAS);
});
