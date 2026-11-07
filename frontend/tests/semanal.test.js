import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esSemanal, textoMeta, textoProgresoSemana, textoRacha, unidadDeRacha, semanalEnLista, datosDeMeta } from '../servicios/semanal.js';

const fila = (estado, hechas, meta, metaSemanal = 3) => ({ metaSemanal, semanaActual: { hechas, meta }, celdas: [{ estado }] });

test('textoMeta usa singular y plural', () => {
    assert.equal(textoMeta(1), '1 vez por semana');
    assert.equal(textoMeta(3), '3 veces por semana');
});

test('esSemanal distingue los hábitos con meta', () => {
    assert.equal(esSemanal({ metaSemanal: 3 }), true);
    assert.equal(esSemanal({ metaSemanal: null }), false);
    assert.equal(esSemanal(undefined), false);
});

test('textoProgresoSemana muestra el avance, la meta cumplida y la semana en pausa', () => {
    assert.equal(textoProgresoSemana(fila('libre', 2, 3)), '2 de 3 esta semana');
    assert.equal(textoProgresoSemana(fila('libre', 3, 3)), '¡Meta cumplida! (3 de 3)');
    assert.equal(textoProgresoSemana(fila('pausado', 0, 0)), 'Semana en pausa');
    assert.equal(textoProgresoSemana({ metaSemanal: null, celdas: [] }), '');
});

test('textoRacha y unidadDeRacha según la unidad', () => {
    assert.equal(textoRacha(1), '1 día');
    assert.equal(textoRacha(5, 'días'), '5 días');
    assert.equal(textoRacha(1, 'semanas'), '1 semana');
    assert.equal(textoRacha(3, 'semanas'), '3 semanas');
    assert.equal(unidadDeRacha(1), 'día');
    assert.equal(unidadDeRacha(2, 'semanas'), 'semanas');
});

test('semanalEnLista: entra si se puede marcar y sale cuando la semana ya cumplió', () => {
    assert.equal(semanalEnLista(fila('libre', 1, 3), true), true);
    assert.equal(semanalEnLista(fila('pendiente', 2, 3), true), true);
    assert.equal(semanalEnLista(fila('libre', 3, 3), true), false); // meta cumplida y hoy sin marcar
    assert.equal(semanalEnLista(fila('hecho', 3, 3), true), true); // el que se marcó sigue visible
    assert.equal(semanalEnLista(fila('libre', 3, 3), false), true); // al ver un día pasado se puede marcar
    assert.equal(semanalEnLista(fila('pausado', 0, 0), true), false);
    assert.equal(semanalEnLista(fila('no-toca', 0, 3), true), false);
    assert.equal(semanalEnLista({ metaSemanal: null, celdas: [{ estado: 'libre' }] }, true), false);
});

test('datosDeMeta manda la meta o la quita al volver a días fijos', () => {
    assert.deepEqual(datosDeMeta('semanal', '4'), { metaSemanal: 4 });
    assert.deepEqual(datosDeMeta('dias', 4), { metaSemanal: null });
});
