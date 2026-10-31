// Resumen de un hábito dentro del periodo de la matriz (sin dependencias, para poder probarlo).
const MAX_NOTAS = 8;

/**
 * Datos de una fila de la matriz para el detalle del hábito:
 * { hechos, fallados, pausados, tasa, ultimoHecho, notas }.
 *  - tasa va de 0 a 1 (o null si no hubo nada que juzgar);
 *  - ultimoHecho es la fecha del último día cumplido (o null);
 *  - notas son las del periodo, de la más reciente a la más antigua (hasta 8).
 */
export function resumenHabito(fila) {
    let hechos = 0;
    let fallados = 0;
    let pausados = 0;
    let ultimoHecho = null;
    const notas = [];

    for (const c of fila.celdas) {
        if (c.estado === 'hecho') {
            hechos++;
            if (!ultimoHecho || c.fecha > ultimoHecho) ultimoHecho = c.fecha;
        } else if (c.estado === 'fallado') {
            fallados++;
        } else if (c.estado === 'pausado') {
            pausados++;
        }
        if (c.nota) notas.push({ fecha: c.fecha, nota: c.nota });
    }
    notas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    return { hechos, fallados, pausados, tasa: fila.tasa, ultimoHecho, notas: notas.slice(0, MAX_NOTAS) };
}
