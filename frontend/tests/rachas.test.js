import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rachasEnRiesgo, textoRiesgo } from '../servicios/rachas.js';

const fila = (habitoId, nombre, rachaActual, estado) => ({ habitoId, nombre, rachaActual, celdas: [{ estado }] });

test('solo cuenta lo pendiente de hoy con una racha de al menos 3 días', () => {
    const filas = [
        fila(1, 'Leer', 12, 'pendiente'),
        fila(2, 'Correr', 5, 'hecho'), // ya marcado
        fila(3, 'Meditar', 2, 'pendiente'), // racha corta
        fila(4, 'Estudiar', 3, 'pendiente'),
        fila(5, 'Pausado', 9, 'pausado'),
        fila(6, 'No toca', 9, 'no-toca')
    ];
    assert.deepEqual(rachasEnRiesgo(filas), [
        { habitoId: 1, nombre: 'Leer', racha: 12, unidad: 'días' },
        { habitoId: 4, nombre: 'Estudiar', racha: 3, unidad: 'días' }
    ]);
});

test('el mínimo se puede cambiar y el orden desempata por nombre', () => {
    const filas = [fila(1, 'B', 4, 'pendiente'), fila(2, 'A', 4, 'pendiente'), fila(3, 'C', 2, 'pendiente')];
    assert.deepEqual(rachasEnRiesgo(filas, 2).map((r) => r.nombre), ['A', 'B', 'C']);
});

test('textoRiesgo cambia según cuántas rachas hay', () => {
    assert.equal(textoRiesgo([]), '');
    assert.equal(textoRiesgo([{ nombre: 'Leer', racha: 12 }]), 'Tu racha de 12 días en "Leer" está en juego hoy. ¡No la pierdas!');
    const dos = [{ nombre: 'Leer', racha: 12 }, { nombre: 'Correr', racha: 3 }];
    assert.equal(textoRiesgo(dos), 'Tienes 2 rachas en juego hoy: "Leer" (12 días), "Correr" (3 días).');
    const cinco = ['a', 'b', 'c', 'd', 'e'].map((nombre) => ({ nombre, racha: 4 }));
    assert.match(textoRiesgo(cinco), /5 rachas.*"c" \(4 días\) y 2 más\.$/);
});

test('la racha de un hábito semanal se cuenta en semanas', () => {
    const f = { ...fila(1, 'Correr', 4, 'pendiente'), unidadRacha: 'semanas' };
    const lista = rachasEnRiesgo([f]);
    assert.equal(lista[0].unidad, 'semanas');
    assert.equal(textoRiesgo(lista), 'Tu racha de 4 semanas en "Correr" está en juego hoy. ¡No la pierdas!');
});
