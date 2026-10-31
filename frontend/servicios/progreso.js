// Funciones puras para armar los datos de los gráficos de progreso.
// Trabajan sobre la respuesta de /api/estadisticas/matriz.

const DIAS_SEMANA = 7;

function etiquetaFecha(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/**
 * Agrupa los días de la matriz en bloques de 7 y calcula el cumplimiento de cada semana,
 * ponderado por el impacto (peso) de cada hábito, igual que el cumplimiento del backend.
 * Devuelve [{ etiqueta, desde, valor }] con valor entre 0 y 1, o null si esa semana no tuvo
 * ningún hábito que juzgar (por ejemplo, antes de crear el primero).
 */
export function agruparSemanas(matriz) {
    const semanas = [];
    for (let inicio = 0; inicio < matriz.dias.length; inicio += DIAS_SEMANA) {
        let ok = 0;
        let total = 0;
        for (const fila of matriz.filas) {
            for (const celda of fila.celdas.slice(inicio, inicio + DIAS_SEMANA)) {
                if (!celda.programado) continue;
                if (celda.estado === 'hecho') {
                    ok += fila.peso;
                    total += fila.peso;
                } else if (celda.estado === 'fallado') {
                    total += fila.peso;
                }
            }
        }
        const desde = matriz.dias[inicio];
        semanas.push({ etiqueta: etiquetaFecha(desde), desde, valor: total ? ok / total : null });
    }
    return semanas;
}

/** Hábitos con cumplimiento calculado, del mejor al peor. */
export function ordenarPorCumplimiento(filas) {
    return filas.filter((f) => f.tasa !== null).sort((a, b) => b.tasa - a.tasa);
}

// ---- Cuadrante de impacto ----
// Cruza la constancia (cumplimiento) con el impacto (peso 1-5) de cada hábito.
export const UMBRAL_CONSTANCIA = 0.7; // desde 70 % se considera constante
export const UMBRAL_IMPACTO = 4; // peso 4 o 5 se considera de alto impacto

/**
 * Reparte los hábitos en 4 cuadrantes:
 *  - mantener:  alto impacto y constante      -> sigue así
 *  - reforzar:  alto impacto y poco constante -> la prioridad
 *  - facil:     bajo impacto y constante      -> va solo
 *  - revisar:   bajo impacto y poco constante -> ¿vale la pena?
 * Los hábitos sin cumplimiento calculado (aún no tocaba) quedan fuera.
 * Dentro de cada cuadrante, primero el de mayor impacto y luego el menos constante.
 */
export function clasificarCuadrantes(filas) {
    const cuadrantes = { mantener: [], reforzar: [], facil: [], revisar: [] };
    for (const f of filas) {
        if (f.tasa === null) continue;
        const constante = f.tasa >= UMBRAL_CONSTANCIA;
        const alto = f.peso >= UMBRAL_IMPACTO;
        const clave = alto ? (constante ? 'mantener' : 'reforzar') : constante ? 'facil' : 'revisar';
        cuadrantes[clave].push(f);
    }
    for (const lista of Object.values(cuadrantes)) {
        lista.sort((a, b) => b.peso - a.peso || a.tasa - b.tasa);
    }
    return cuadrantes;
}

// ---- Comparar periodos ----
// Cumplimiento ponderado de los días [desde, hasta) de la matriz, o null si no hubo nada que juzgar.
function acumular(filas, desde, hasta) {
    let ok = 0;
    let total = 0;
    for (const fila of filas) {
        for (let i = Math.max(desde, 0); i < hasta; i++) {
            const celda = fila.celdas[i];
            if (!celda.programado) continue;
            if (celda.estado === 'hecho') {
                ok += fila.peso;
                total += fila.peso;
            } else if (celda.estado === 'fallado') {
                total += fila.peso;
            }
        }
    }
    return total ? ok / total : null;
}

const aPuntos = (actual, anterior) => (actual === null || anterior === null ? null : Math.round((actual - anterior) * 100));

/**
 * Compara los últimos "n" días de la matriz con los "n" anteriores.
 * Devuelve { actual, anterior, cambio, porHabito }:
 *  - actual y anterior van de 0 a 1 (o null si no hay datos);
 *  - cambio es la diferencia en puntos porcentuales (null si falta alguno);
 *  - porHabito lista los hábitos con datos en ambos periodos, del que más mejoró al que más bajó.
 */
export function compararPeriodos(matriz, n) {
    const total = matriz.dias.length;
    const finActual = total;
    const iniActual = total - n;
    const iniAnterior = total - 2 * n;
    const hayAnterior = iniAnterior >= 0;

    const actual = acumular(matriz.filas, iniActual, finActual);
    const anterior = hayAnterior ? acumular(matriz.filas, iniAnterior, iniActual) : null;

    const porHabito = [];
    if (hayAnterior) {
        for (const fila of matriz.filas) {
            const a = acumular([fila], iniActual, finActual);
            const b = acumular([fila], iniAnterior, iniActual);
            if (a === null || b === null) continue;
            porHabito.push({ habitoId: fila.habitoId, nombre: fila.nombre, color: fila.color, actual: a, anterior: b, cambio: aPuntos(a, b) });
        }
        porHabito.sort((x, y) => y.cambio - x.cambio);
    }

    return { actual, anterior, cambio: aPuntos(actual, anterior), porHabito };
}
