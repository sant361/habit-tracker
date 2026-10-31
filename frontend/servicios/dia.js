// Textos para navegar entre días en la vista "Hoy" (sin dependencias, para poder probarlos).
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "lunes 26 de octubre" */
export function fechaLarga(iso) {
    const d = new Date(iso + 'T12:00:00');
    return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** Cuántos días antes de "hoyISO" cae "iso" (0 = hoy, 1 = ayer...). */
export function diasAtras(iso, hoyISO) {
    return Math.round((new Date(hoyISO + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000);
}

/** "Hoy", "Ayer" o la fecha completa. */
export function nombreDia(iso, hoyISO) {
    const atras = diasAtras(iso, hoyISO);
    if (atras === 0) return 'Hoy';
    if (atras === 1) return 'Ayer';
    return fechaLarga(iso).replace(/^./, (c) => c.toUpperCase());
}

/** Hasta cuántos días atrás se puede navegar. */
export const MAX_DIAS_ATRAS = 60;

/** Mueve el desplazamiento (0 = hoy, negativo = pasado) sin salirse de [-MAX_DIAS_ATRAS, 0]. */
export const mover = (desplazamiento, delta) => Math.min(0, Math.max(-MAX_DIAS_ATRAS, desplazamiento + delta));

// ---- Tira de la semana ----
const LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Intensidad de un día: 'sin' (nada que juzgar), 0 (nada cumplido) y de 1 (poco) a 4 (todo). */
export function nivelDeDia(valor) {
    if (valor === null || valor === undefined) return 'sin';
    if (valor <= 0) return 0;
    if (valor < 0.5) return 1;
    if (valor < 0.75) return 2;
    if (valor < 1) return 3;
    return 4;
}

/**
 * Los últimos 7 días de una matriz (la que termina en hoy) para dibujar la tira:
 * [{ fecha, letra, numero, valor, nivel, atras }], del más antiguo a hoy.
 * "atras" es cuántos días antes de hoy cae (0 = hoy), para navegar al tocarlo.
 */
export function tiraSemana(matriz, hoyISO) {
    const inicio = Math.max(0, matriz.dias.length - 7);
    return matriz.dias.slice(inicio).map((fecha, i) => {
        const valor = matriz.puntajeDiario[inicio + i];
        return {
            fecha,
            letra: LETRAS[new Date(fecha + 'T12:00:00').getDay()],
            numero: Number(fecha.slice(8, 10)),
            valor,
            nivel: nivelDeDia(valor),
            atras: diasAtras(fecha, hoyISO)
        };
    });
}
