import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenHabito } from '../servicios/detalle.js';

const celda = (fecha, estado, nota = null) => ({ fecha, estado, nota });

test('resumenHabito cuenta hechos, fallados y pausados', () => {
    const fila = {
        tasa: 0.5,
        celdas: [
            celda('2026-10-01', 'hecho'),
            celda('2026-10-02', 'fallado'),
            celda('2026-10-03', 'pausado'),
            celda('2026-10-04', 'no-toca'),
            celda('2026-10-05', 'hecho'),
            celda('2026-10-06', 'pendiente'),
            celda('2026-10-07', 'futuro')
        ]
    };
    assert.deepEqual(resumenHabito(fila), { hechos: 2, fallados: 1, pausados: 1, tasa: 0.5, ultimoHecho: '2026-10-05', notas: [] });
});

test('resumenHabito ordena las notas de la más reciente a la más antigua y limita a 8', () => {
    const celdas = Array.from({ length: 10 }, (_, i) => celda(`2026-10-${String(i + 1).padStart(2, '0')}`, 'hecho', `nota ${i + 1}`));
    const { notas } = resumenHabito({ tasa: 1, celdas });
    assert.equal(notas.length, 8);
    assert.equal(notas[0].nota, 'nota 10');
    assert.equal(notas[7].nota, 'nota 3');
});

test('resumenHabito sin nada hecho deja el último en null', () => {
    const r = resumenHabito({ tasa: null, celdas: [celda('2026-10-01', 'no-toca'), celda('2026-10-02', 'pendiente')] });
    assert.equal(r.ultimoHecho, null);
    assert.equal(r.tasa, null);
    assert.equal(r.hechos, 0);
});
