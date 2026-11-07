// Metas semanales en la pantalla (sin dependencias, para poder probarlas).

/** ¿Es un hábito con meta semanal en vez de días fijos? */
export const esSemanal = (fila) => Boolean(fila && fila.metaSemanal);

/** "1 vez por semana", "3 veces por semana". */
export function textoMeta(meta) {
    return `${meta} ${meta === 1 ? 'vez' : 'veces'} por semana`;
}

/** Avance de la semana en curso: "2 de 3 esta semana", o '' si no es semanal. */
export function textoProgresoSemana(fila) {
    if (!esSemanal(fila) || !fila.semanaActual) return '';
    const { hechas, meta } = fila.semanaActual;
    if (meta === 0) return 'Semana en pausa';
    if (hechas >= meta) return `¡Meta cumplida! (${hechas} de ${meta})`;
    return `${hechas} de ${meta} esta semana`;
}

/** "1 día", "5 días", "1 semana", "3 semanas" según la unidad que trae la matriz. */
export function textoRacha(racha, unidad = 'días') {
    if (unidad === 'semanas') return `${racha} ${racha === 1 ? 'semana' : 'semanas'}`;
    return `${racha} ${racha === 1 ? 'día' : 'días'}`;
}

/** Solo la unidad, en singular o plural: "día de racha" / "semanas de racha". */
export function unidadDeRacha(racha, unidad = 'días') {
    if (unidad === 'semanas') return racha === 1 ? 'semana' : 'semanas';
    return racha === 1 ? 'día' : 'días';
}

/**
 * ¿Entra un hábito semanal en la lista del día? Entra si ya se marcó ese día o si aún se puede marcar.
 * Cuando se ve el día de hoy y la semana ya llegó a la meta, sale de la lista (no hay nada más que hacer).
 */
export function semanalEnLista(fila, esHoy) {
    if (!esSemanal(fila)) return false;
    const estado = fila.celdas[0].estado;
    if (estado === 'hecho') return true;
    if (!['libre', 'pendiente', 'fallado'].includes(estado)) return false;
    if (esHoy && fila.semanaActual && fila.semanaActual.hechas >= fila.semanaActual.meta) return false;
    return true;
}

/** Datos para guardar: con meta se manda metaSemanal y sin ella se vuelve a días fijos (null). */
export function datosDeMeta(modo, meta) {
    return modo === 'semanal' ? { metaSemanal: Number(meta) } : { metaSemanal: null };
}
