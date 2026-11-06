import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarAjustes, minutosDe, horaLlegada, tocaAvisar, contarPendientes, textoRecordatorio } from '../servicios/recordatorio.js';

const a = (hora, minuto = 0) => new Date(2026, 9, 31, hora, minuto);

test('normalizarAjustes arregla valores vacíos o dañados', () => {
    assert.deepEqual(normalizarAjustes(null), { activo: false, hora: '20:00', ultimoAviso: '' });
    assert.deepEqual(normalizarAjustes({ activo: 'sí', hora: '25:99', ultimoAviso: 5 }), { activo: false, hora: '20:00', ultimoAviso: '' });
    assert.deepEqual(normalizarAjustes({ activo: true, hora: '07:30', ultimoAviso: '2026-10-30' }), { activo: true, hora: '07:30', ultimoAviso: '2026-10-30' });
});

test('minutosDe y horaLlegada comparan con el reloj', () => {
    assert.equal(minutosDe('20:15'), 1215);
    assert.equal(horaLlegada('20:00', a(19, 59)), false);
    assert.equal(horaLlegada('20:00', a(20, 0)), true);
    assert.equal(horaLlegada('20:00', a(23, 30)), true);
});

test('tocaAvisar exige estar activo, que llegue la hora y no haber avisado hoy', () => {
    const base = { activo: true, hora: '20:00', ultimoAviso: '2026-10-30' };
    assert.equal(tocaAvisar(base, a(20, 5), '2026-10-31'), true);
    assert.equal(tocaAvisar(base, a(19, 0), '2026-10-31'), false);
    assert.equal(tocaAvisar({ ...base, ultimoAviso: '2026-10-31' }, a(21), '2026-10-31'), false);
    assert.equal(tocaAvisar({ ...base, activo: false }, a(21), '2026-10-31'), false);
});

test('contarPendientes y textoRecordatorio', () => {
    const filas = ['hecho', 'pendiente', 'pausado', 'pendiente', 'no-toca'].map((estado) => ({ celdas: [{ estado }] }));
    assert.equal(contarPendientes(filas), 2);
    assert.equal(textoRecordatorio(1), 'Te falta 1 hábito por marcar hoy.');
    assert.equal(textoRecordatorio(3), 'Te faltan 3 hábitos por marcar hoy.');
});
