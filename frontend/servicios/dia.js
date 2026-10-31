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
