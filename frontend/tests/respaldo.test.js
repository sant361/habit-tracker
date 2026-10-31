import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoImportacion, leerRespaldo } from '../servicios/respaldo.js';

test('textoImportacion resume lo importado', () => {
    assert.equal(textoImportacion({ importados: 1, omitidos: [], registros: 1 }), 'Se importaron 1 hábito con 1 registro.');
    assert.equal(textoImportacion({ importados: 3, omitidos: [], registros: 40 }), 'Se importaron 3 hábitos con 40 registros.');
});

test('textoImportacion avisa de los omitidos y acorta si son muchos', () => {
    assert.match(textoImportacion({ importados: 0, omitidos: ['Leer'], registros: 0 }), /^No se importó ningún hábito nuevo\. Se omitieron .*: "Leer"\.$/);
    const muchos = textoImportacion({ importados: 1, omitidos: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], registros: 0 });
    assert.match(muchos, /"a", "b", "c", "d", "e" y 2 más/);
});

test('leerRespaldo devuelve el objeto o falla con un mensaje claro', () => {
    assert.deepEqual(leerRespaldo('{"version":1}'), { version: 1 });
    assert.throws(() => leerRespaldo('esto no es json'), /JSON válido/);
});
