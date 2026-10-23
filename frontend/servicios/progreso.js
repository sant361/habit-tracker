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
