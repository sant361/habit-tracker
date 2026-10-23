import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrizACsv } from '../src/servicios/csv.js';

const celda = (estado, nota = null) => ({ estado, nota, programado: true });

function matriz(filas) {
    return { dias: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], filas };
}

test('incluye encabezado y solo los días hecho, fallado y pendiente', () => {
    const csv = matrizACsv(matriz([
        {
            nombre: 'Leer',
            categoria: 'Estudio',
            peso: 3,
            celdas: [celda('hecho'), celda('fallado'), celda('pendiente'), celda('futuro')]
        }
    ]));
    assert.equal(
        csv,
        'fecha;habito;categoria;impacto;estado;nota\r\n' +
            '2026-10-01;Leer;Estudio;3;hecho;\r\n' +
            '2026-10-02;Leer;Estudio;3;fallado;\r\n' +
            '2026-10-03;Leer;Estudio;3;pendiente;\r\n'
    );
});

test('los días que no tocaba no generan fila', () => {
    const csv = matrizACsv(matriz([
        { nombre: 'Correr', categoria: null, peso: 1, celdas: [celda('no-toca'), celda('hecho'), celda('no-toca'), celda('futuro')] }
    ]));
    assert.equal(csv.trim().split('\r\n').length, 2); // encabezado + una fila
});

test('escapa separadores, comillas y saltos de línea', () => {
    const csv = matrizACsv(matriz([
        { nombre: 'Leer; y "escribir"', categoria: 'A', peso: 1, celdas: [celda('hecho', 'línea 1\nlínea 2'), celda('futuro'), celda('futuro'), celda('futuro')] }
    ]));
    assert.ok(csv.includes('"Leer; y ""escribir"""'));
    assert.ok(csv.includes('"línea 1\nlínea 2"'));
});

test('evita que Excel interprete una nota como fórmula', () => {
    const csv = matrizACsv(matriz([
        { nombre: 'Prueba', categoria: 'A', peso: 1, celdas: [celda('hecho', '=1+1'), celda('futuro'), celda('futuro'), celda('futuro')] }
    ]));
    assert.ok(csv.includes(";'=1+1\r\n"));
});
