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

test('errorDePausa acepta pausas con fechas pasadas y rechaza las inválidas', async () => {
    const { errorDePausa } = await import('../servicios/pausas.js');
    const hoy = '2026-10-31';
    assert.equal(errorDePausa({ desde: '2026-10-31', hasta: '' }, hoy, '2026-10-01'), '');
    assert.equal(errorDePausa({ desde: '2026-10-05', hasta: '2026-10-09' }, hoy, '2026-10-01'), '');
    assert.match(errorDePausa({ desde: '', hasta: '' }, hoy, '2026-10-01'), /Elige/);
    assert.match(errorDePausa({ desde: '2026-11-02', hasta: '' }, hoy, '2026-10-01'), /futuro/);
    assert.match(errorDePausa({ desde: '2026-09-30', hasta: '' }, hoy, '2026-10-01'), /antes de que existiera/);
    assert.match(errorDePausa({ desde: '2026-10-09', hasta: '2026-10-05' }, hoy, '2026-10-01'), /anterior al inicio/);
});

test('textoPausaPasada y esPausaPasada', async () => {
    const { textoPausaPasada, esPausaPasada } = await import('../servicios/pausas.js');
    assert.equal(textoPausaPasada({ desde: '2026-10-05', hasta: '2026-10-09' }, formato), 'Del [2026-10-05] al [2026-10-09]');
    assert.equal(esPausaPasada({ hasta: '2026-10-09' }, '2026-10-31'), true);
    assert.equal(esPausaPasada({ hasta: '2026-10-31' }, '2026-10-31'), false);
    assert.equal(esPausaPasada({ hasta: null }, '2026-10-31'), false);
});
