// Metas semanales: lógica pura de semanas y rachas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lunesDe, evaluarSemana, calcularRachasSemanales } from '../src/servicios/semanal.js';

const set = (...f) => new Set(f);

test('lunesDe devuelve el lunes de la semana (la semana va de lunes a domingo)', () => {
    assert.equal(lunesDe('2026-10-05'), '2026-10-05'); // lunes
    assert.equal(lunesDe('2026-10-08'), '2026-10-05'); // jueves
    assert.equal(lunesDe('2026-10-11'), '2026-10-05'); // domingo
    assert.equal(lunesDe('2026-10-12'), '2026-10-12');
});

test('evaluarSemana: cumple la meta y las cumplidas de más no cuentan', () => {
    const s = evaluarSemana({ lunes: '2026-10-05', creadoEn: '2026-09-01', meta: 2, hechos: set('2026-10-05', '2026-10-07', '2026-10-09'), hoy: '2026-10-10' });
    assert.equal(s.metaEfectiva, 2);
    assert.equal(s.hechas, 3);
    assert.deepEqual([...s.contadas], ['2026-10-05', '2026-10-07']);
    assert.equal(s.cumplida, true);
    assert.equal(s.juzgada, false);
    assert.equal(s.fallidos.size, 0);
});

test('evaluarSemana: una semana terminada sin llegar a la meta marca los últimos días libres como fallidos', () => {
    const s = evaluarSemana({ lunes: '2026-10-05', creadoEn: '2026-09-01', meta: 3, hechos: set('2026-10-05'), hoy: '2026-10-14' });
    assert.equal(s.juzgada, true);
    assert.equal(s.cumplida, false);
    assert.deepEqual([...s.fallidos].sort(), ['2026-10-10', '2026-10-11']);
});

test('evaluarSemana: la semana en curso nunca falla', () => {
    const s = evaluarSemana({ lunes: '2026-10-12', creadoEn: '2026-09-01', meta: 3, hechos: set(), hoy: '2026-10-18' }); // hoy es domingo
    assert.equal(s.juzgada, false);
    assert.equal(s.fallidos.size, 0);
});

test('evaluarSemana: si el hábito se creó a mitad de semana, la meta baja a los días que hubo', () => {
    const s = evaluarSemana({ lunes: '2026-10-05', creadoEn: '2026-10-09', meta: 5, hechos: set(), hoy: '2026-10-20' });
    assert.equal(s.metaEfectiva, 3); // viernes, sábado y domingo
    assert.deepEqual([...s.fallidos].sort(), ['2026-10-09', '2026-10-10', '2026-10-11']);
});

test('evaluarSemana: los días en pausa no se exigen, y una semana toda en pausa no se juzga', () => {
    const enPausa = (f) => f >= '2026-10-07' && f <= '2026-10-11';
    const parcial = evaluarSemana({ lunes: '2026-10-05', creadoEn: '2026-09-01', meta: 4, hechos: set(), enPausa, hoy: '2026-10-20' });
    assert.equal(parcial.metaEfectiva, 2);
    assert.deepEqual([...parcial.fallidos].sort(), ['2026-10-05', '2026-10-06']);

    const todo = evaluarSemana({ lunes: '2026-10-05', creadoEn: '2026-09-01', meta: 3, hechos: set(), enPausa: () => true, hoy: '2026-10-20' });
    assert.equal(todo.metaEfectiva, 0);
    assert.equal(todo.fallidos.size, 0);
    assert.equal(todo.cumplida, false);
});

test('calcularRachasSemanales cuenta semanas seguidas cumpliendo la meta', () => {
    // meta 2: semanas del 28 sep (ok), 5 oct (ok), 12 oct (falla), 19 oct (ok), 26 oct (en curso, ya cumplida)
    const hechos = set('2026-09-28', '2026-09-29', '2026-10-05', '2026-10-06', '2026-10-12', '2026-10-19', '2026-10-20', '2026-10-26', '2026-10-27');
    assert.deepEqual(calcularRachasSemanales('2026-09-28', 2, hechos, '2026-10-28'), { actual: 2, mejor: 2 });
});

test('calcularRachasSemanales: la semana en curso sin cumplir no rompe la racha', () => {
    const hechos = set('2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13');
    assert.deepEqual(calcularRachasSemanales('2026-10-05', 2, hechos, '2026-10-14'), { actual: 2, mejor: 2 });
    // la semana del 12 sigue en curso con 1 sola: no rompe
    assert.deepEqual(calcularRachasSemanales('2026-10-05', 2, set('2026-10-05', '2026-10-06', '2026-10-12'), '2026-10-14'), { actual: 1, mejor: 1 });
});

test('calcularRachasSemanales: una semana toda en pausa se salta sin romper la racha', () => {
    const enPausa = (f) => f >= '2026-10-05' && f <= '2026-10-11';
    const hechos = set('2026-09-28', '2026-09-29', '2026-10-12', '2026-10-13');
    assert.deepEqual(calcularRachasSemanales('2026-09-28', 2, hechos, '2026-10-14', enPausa), { actual: 2, mejor: 2 });
});
