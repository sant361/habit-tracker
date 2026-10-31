import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoActividad, filtrarUsuarios } from '../servicios/admin.js';

test('textoActividad dice hace cuánto fue la última actividad', () => {
    assert.equal(textoActividad(null, '2026-10-31'), 'Sin actividad');
    assert.equal(textoActividad('2026-10-31', '2026-10-31'), 'Hoy');
    assert.equal(textoActividad('2026-10-30', '2026-10-31'), 'Ayer');
    assert.equal(textoActividad('2026-10-26', '2026-10-31'), 'Hace 5 días');
});

test('filtrarUsuarios busca por nombre o correo sin importar tildes', () => {
    const lista = [
        { id: 1, nombre: 'María Pérez', email: 'maria@x.com' },
        { id: 2, nombre: 'Luis', email: 'luis@gmail.com' }
    ];
    assert.deepEqual(filtrarUsuarios(lista, '').map((u) => u.id), [1, 2]);
    assert.deepEqual(filtrarUsuarios(lista, 'MARIA').map((u) => u.id), [1]);
    assert.deepEqual(filtrarUsuarios(lista, 'gmail').map((u) => u.id), [2]);
    assert.deepEqual(filtrarUsuarios(lista, 'zzz'), []);
});
