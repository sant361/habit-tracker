// Lógica pura de pausas. Una pausa es un rango de fechas { desde, hasta } con ambos extremos
// incluidos. Si "hasta" es null, la pausa sigue abierta hasta que el hábito se reanude.
const SIN_FIN = '9999-12-31';

export const finDe = (pausa) => pausa.hasta || SIN_FIN;
export const cubre = (pausa, fecha) => pausa.desde <= fecha && fecha <= finDe(pausa);

/** Dice si un rango nuevo se cruza con alguna pausa que ya existe. */
export const hayChoque = (pausas, desde, hasta) => pausas.some((p) => p.desde <= (hasta || SIN_FIN) && finDe(p) >= desde);

/** Devuelve una función fecha -> boolean que dice si el hábito está en pausa ese día. */
export const crearEnPausa = (pausas) => (fecha) => pausas.some((p) => cubre(p, fecha));

/**
 * La pausa que importa hoy: la que está en curso o, si no hay, la próxima por empezar.
 * Devuelve { desde, hasta, activa } o null si no hay ninguna vigente.
 */
export function pausaVigente(pausas, hoy) {
    const vigentes = pausas.filter((p) => finDe(p) >= hoy).sort((a, b) => (a.desde < b.desde ? -1 : 1));
    const p = vigentes[0];
    return p ? { desde: p.desde, hasta: p.hasta || null, activa: p.desde <= hoy } : null;
}
