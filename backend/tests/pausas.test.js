import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubre, hayChoque, crearEnPausa, pausaVigente } from '../src/utils/pausas.js';

test('cubre incluye los dos extremos y respeta las pausas abiertas', () => {
    const p = { desde: '2026-10-05', hasta: '2026-10-08' };
    assert.deepEqual(['2026-10-04', '2026-10-05', '2026-10-08', '2026-10-09'].map((f) => cubre(p, f)), [false, true, true, false]);
    const abierta = { desde: '2026-10-05', hasta: null };
    assert.equal(cubre(abierta, '2027-01-01'), true);
    assert.equal(cubre(abierta, '2026-10-04'), false);
});

test('hayChoque detecta rangos que se cruzan, incluso si se tocan en un día', () => {
    const existentes = [{ desde: '2026-10-10', hasta: '2026-10-15' }];
    assert.equal(hayChoque(existentes, '2026-10-01', '2026-10-09'), false);
    assert.equal(hayChoque(existentes, '2026-10-01', '2026-10-10'), true);
    assert.equal(hayChoque(existentes, '2026-10-15', '2026-10-20'), true);
    assert.equal(hayChoque(existentes, '2026-10-16', null), false);
    assert.equal(hayChoque(existentes, '2026-10-12', null), true); // abierta que empieza dentro
    assert.equal(hayChoque([{ desde: '2026-10-10', hasta: null }], '2026-12-01', '2026-12-05'), true);
});

test('crearEnPausa responde para varias pausas', () => {
    const enPausa = crearEnPausa([{ desde: '2026-10-01', hasta: '2026-10-02' }, { desde: '2026-10-10', hasta: null }]);
    assert.deepEqual(['2026-10-01', '2026-10-05', '2026-10-10', '2026-11-01'].map(enPausa), [true, false, true, true]);
});

test('pausaVigente: en curso, próxima o ninguna', () => {
    const pausas = [{ desde: '2026-09-01', hasta: '2026-09-05' }, { desde: '2026-10-20', hasta: '2026-10-25' }];
    assert.equal(pausaVigente(pausas, '2026-10-30'), null); // ya terminaron todas
    assert.deepEqual(pausaVigente(pausas, '2026-10-10'), { desde: '2026-10-20', hasta: '2026-10-25', activa: false }); // próxima
    assert.deepEqual(pausaVigente(pausas, '2026-10-22'), { desde: '2026-10-20', hasta: '2026-10-25', activa: true }); // en curso
    assert.deepEqual(pausaVigente([{ desde: '2026-10-01', hasta: null }], '2026-12-01'), { desde: '2026-10-01', hasta: null, activa: true });
});
