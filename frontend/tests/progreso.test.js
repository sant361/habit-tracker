import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparSemanas, ordenarPorCumplimiento, clasificarCuadrantes, compararPeriodos, rendimientoPorDia, extremosDia } from '../servicios/progreso.js';

const fila = (habitoId, nombre, peso, tasa, celdas = []) => ({ habitoId, nombre, peso, tasa, celdas });

test('ordenarPorCumplimiento ordena de mayor a menor y descarta los que no tienen tasa', () => {
    const filas = [fila(1, 'a', 1, 0.5), fila(2, 'b', 1, null), fila(3, 'c', 1, 0.9)];
    assert.deepEqual(ordenarPorCumplimiento(filas).map((f) => f.nombre), ['c', 'a']);
});

test('agruparSemanas calcula cada bloque de 7 días ponderado por el peso', () => {
    const dias = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    // Primera semana: 1 hecho y 1 fallado con peso 2 -> 50 %. Segunda: ningún día programado -> null.
    const celdas = dias.map((_, i) => ({
        programado: i < 2,
        estado: i === 0 ? 'hecho' : i === 1 ? 'fallado' : 'no-toca'
    }));
    const semanas = agruparSemanas({ dias, filas: [fila(1, 'a', 2, 0.5, celdas)] });
    assert.equal(semanas.length, 2);
    assert.equal(semanas[0].valor, 0.5);
    assert.equal(semanas[0].desde, '2026-10-01');
    assert.equal(semanas[1].valor, null);
});

test('clasificarCuadrantes reparte por constancia (70 %) e impacto (peso 4)', () => {
    const filas = [
        fila(1, 'mantener', 5, 0.9),
        fila(2, 'reforzar', 4, 0.3),
        fila(3, 'facil', 2, 0.8),
        fila(4, 'revisar', 1, 0.1),
        fila(5, 'sin-datos', 5, null)
    ];
    const q = clasificarCuadrantes(filas);
    assert.deepEqual(q.mantener.map((f) => f.nombre), ['mantener']);
    assert.deepEqual(q.reforzar.map((f) => f.nombre), ['reforzar']);
    assert.deepEqual(q.facil.map((f) => f.nombre), ['facil']);
    assert.deepEqual(q.revisar.map((f) => f.nombre), ['revisar']);
});

test('los umbrales son inclusivos: 70 % y peso 4 ya cuentan como alto', () => {
    const q = clasificarCuadrantes([fila(1, 'justo', 4, 0.7)]);
    assert.equal(q.mantener.length, 1);
});

test('dentro de un cuadrante va primero el de más impacto y luego el menos constante', () => {
    const q = clasificarCuadrantes([fila(1, 'a', 4, 0.5), fila(2, 'b', 5, 0.6), fila(3, 'c', 5, 0.2)]);
    assert.deepEqual(q.reforzar.map((f) => f.nombre), ['c', 'b', 'a']);
});

// ---- compararPeriodos ----
// Arma una fila con un estado por día; 'x' = hecho, 'o' = fallado, '-' = no toca
function filaDe(habitoId, nombre, peso, patron) {
    const celdas = [...patron].map((c) => ({
        programado: c !== '-',
        estado: c === 'x' ? 'hecho' : c === 'o' ? 'fallado' : 'no-toca'
    }));
    return { habitoId, nombre, color: '#000', peso, tasa: null, celdas };
}
const matrizDe = (...filas) => ({ dias: Array.from({ length: filas[0].celdas.length }, (_, i) => `d${i}`), filas });

test('compararPeriodos: compara los últimos n días con los n anteriores', () => {
    // 4 días anteriores: 1 de 4 (25 %); 4 días actuales: 3 de 4 (75 %)
    const m = matrizDe(filaDe(1, 'a', 1, 'xooo' + 'xxxo'));
    const r = compararPeriodos(m, 4);
    assert.equal(r.anterior, 0.25);
    assert.equal(r.actual, 0.75);
    assert.equal(r.cambio, 50);
});

test('compararPeriodos: pondera por el peso del hábito', () => {
    // actual: hábito de peso 3 cumplido y hábito de peso 1 fallado -> 3 de 4
    const m = matrizDe(filaDe(1, 'a', 3, 'xx'), filaDe(2, 'b', 1, 'xo'));
    const r = compararPeriodos(m, 1);
    assert.equal(r.actual, 0.75);
    assert.equal(r.anterior, 1);
    assert.equal(r.cambio, -25);
});

test('compararPeriodos: sin suficientes días no hay periodo anterior', () => {
    const r = compararPeriodos(matrizDe(filaDe(1, 'a', 1, 'xxx')), 3);
    assert.equal(r.actual, 1);
    assert.equal(r.anterior, null);
    assert.equal(r.cambio, null);
    assert.deepEqual(r.porHabito, []);
});

test('compararPeriodos: ordena los hábitos del que más mejoró al que más bajó y omite los sin datos', () => {
    const m = matrizDe(
        filaDe(1, 'mejora', 1, 'oooo' + 'xxxx'),
        filaDe(2, 'baja', 1, 'xxxx' + 'oooo'),
        filaDe(3, 'igual', 1, 'xoxo' + 'xoxo'),
        filaDe(4, 'nuevo', 1, '----' + 'xxxx')
    );
    const { porHabito } = compararPeriodos(m, 4);
    assert.deepEqual(porHabito.map((h) => h.nombre), ['mejora', 'igual', 'baja']);
    assert.equal(porHabito[0].cambio, 100);
    assert.equal(porHabito[2].cambio, -100);
});

test('compararPeriodos: los días pendientes y futuros no cuentan', () => {
    const fila = filaDe(1, 'a', 1, 'xx');
    fila.celdas[1] = { programado: true, estado: 'pendiente' };
    const r = compararPeriodos(matrizDe(fila), 1);
    assert.equal(r.actual, null);
});

// ---- rendimientoPorDia / extremosDia ----
// 2026-10-05 es lunes. Cada día de la semana tiene su propio patrón en 2 semanas (14 días).
function diasDesde(inicio, n) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(inicio + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + i);
        return d.toISOString().slice(0, 10);
    });
}

test('rendimientoPorDia: agrupa por día de la semana y empieza en lunes', () => {
    const dias = diasDesde('2026-10-05', 14);
    // lunes siempre hecho; martes siempre fallado; el resto, no toca
    const patron = dias.map((_, i) => (i % 7 === 0 ? 'x' : i % 7 === 1 ? 'o' : '-')).join('');
    const m = { dias, filas: [filaDe(1, 'a', 1, patron)] };
    const r = rendimientoPorDia(m);
    assert.deepEqual(r.map((d) => d.nombre), ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
    assert.equal(r[0].tasa, 1);
    assert.equal(r[1].tasa, 0);
    assert.equal(r[2].tasa, null);
});

test('rendimientoPorDia: pondera por el peso del hábito', () => {
    const dias = diasDesde('2026-10-05', 1); // un lunes
    const m = { dias, filas: [filaDe(1, 'a', 3, 'x'), filaDe(2, 'b', 1, 'o')] };
    assert.equal(rendimientoPorDia(m)[0].tasa, 0.75);
});

test('extremosDia: devuelve el mejor y el peor día', () => {
    const lista = [
        { dia: 1, nombre: 'Lun', tasa: 0.9 },
        { dia: 2, nombre: 'Mar', tasa: 0.2 },
        { dia: 3, nombre: 'Mié', tasa: null },
        { dia: 4, nombre: 'Jue', tasa: 0.5 }
    ];
    const r = extremosDia(lista);
    assert.equal(r.mejor.nombre, 'Lun');
    assert.equal(r.peor.nombre, 'Mar');
});

test('extremosDia: sin datos suficientes o todos iguales no destaca nada', () => {
    assert.equal(extremosDia([{ dia: 1, nombre: 'Lun', tasa: 0.5 }]), null);
    assert.equal(extremosDia([{ dia: 1, nombre: 'Lun', tasa: 0.5 }, { dia: 2, nombre: 'Mar', tasa: 0.5 }]), null);
});
