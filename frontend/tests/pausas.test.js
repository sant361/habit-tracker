import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoPausa } from '../servicios/pausas.js';

const formato = (iso) => `[${iso}]`; // sin depender del idioma del sistema

test('textoPausa: sin pausa no dice nada', () => {
    assert.equal(textoPausa(null, formato), '');
});

test('textoPausa: pausa en curso con y sin fecha final', () => {
    assert.equal(textoPausa({ desde: '2026-10-01', hasta: '2026-10-12', activa: true }, formato), 'En pausa hasta el [2026-10-12]');
    assert.equal(textoPausa({ desde: '2026-10-01', hasta: null, activa: true }, formato), 'En pausa hasta que la reanudes');
});

test('textoPausa: pausa programada que aún no empieza', () => {
    assert.equal(
        textoPausa({ desde: '2026-10-20', hasta: '2026-10-25', activa: false }, formato),
        'Pausa programada del [2026-10-20] al [2026-10-25]'
    );
    assert.equal(textoPausa({ desde: '2026-10-20', hasta: null, activa: false }, formato), 'Pausa programada desde el [2026-10-20]');
});
