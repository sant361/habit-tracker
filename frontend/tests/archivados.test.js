import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoArchivado, textoRestaurado } from '../servicios/archivados.js';

test('textoArchivado muestra la fecha si se conoce', () => {
    assert.equal(textoArchivado({ archivadoEn: '2026-10-05' }), 'Archivado el 5 oct');
    assert.equal(textoArchivado({ archivadoEn: null }), 'Archivado');
});

test('textoRestaurado explica la pausa de los días archivados', () => {
    assert.equal(textoRestaurado('Leer', null), '"Leer" volvió a tus hábitos.');
    assert.match(textoRestaurado('Leer', { desde: '2026-10-05', hasta: '2026-10-09' }), /Del 5 oct al 9 oct quedó en pausa/);
    assert.match(textoRestaurado('Leer', { desde: '2026-10-05', hasta: '2026-10-05' }), /El 5 oct quedó en pausa/);
    assert.match(textoRestaurado('Leer', { desde: '2026-10-05', hasta: null }), /Sigue en pausa/);
});
