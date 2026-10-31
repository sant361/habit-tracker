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

test('nivelDeDia reparte el cumplimiento en niveles', async () => {
    const { nivelDeDia } = await import('../servicios/dia.js');
    assert.equal(nivelDeDia(null), 'sin');
    assert.equal(nivelDeDia(0), 0);
    assert.equal(nivelDeDia(0.4), 1);
    assert.equal(nivelDeDia(0.5), 2);
    assert.equal(nivelDeDia(0.75), 3);
    assert.equal(nivelDeDia(1), 4);
});

test('tiraSemana toma los últimos 7 días con su letra, nivel y distancia a hoy', async () => {
    const { tiraSemana } = await import('../servicios/dia.js');
    const dias = ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    const puntajeDiario = [1, 1, 0.5, 0, null, 1, 0.8, 1, 0.25];
    const tira = tiraSemana({ dias, puntajeDiario }, '2026-10-31');
    assert.equal(tira.length, 7);
    assert.equal(tira[0].fecha, '2026-10-25');
    assert.deepEqual(tira.map((d) => d.letra), ['D', 'L', 'M', 'M', 'J', 'V', 'S']);
    assert.deepEqual(tira.map((d) => d.nivel), [2, 0, 'sin', 4, 3, 4, 1]);
    assert.equal(tira[6].atras, 0);
    assert.equal(tira[0].atras, 6);
    assert.equal(tira[6].numero, 31);
});

test('tiraSemana funciona con menos de 7 días', async () => {
    const { tiraSemana } = await import('../servicios/dia.js');
    const tira = tiraSemana({ dias: ['2026-10-30', '2026-10-31'], puntajeDiario: [1, null] }, '2026-10-31');
    assert.equal(tira.length, 2);
    assert.equal(tira[1].nivel, 'sin');
});
