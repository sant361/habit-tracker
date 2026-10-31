import { fechaCorta } from './fechas.js';

/**
 * Texto que describe la pausa de un hábito (la que devuelve /api/habitos en "pausa").
 * pausa: { desde, hasta, activa } o null. "formato" convierte una fecha ISO en texto corto.
 */
export function textoPausa(pausa, formato = fechaCorta) {
    if (!pausa) return '';
    const hasta = pausa.hasta ? formato(pausa.hasta) : null;
    if (pausa.activa) return hasta ? `En pausa hasta el ${hasta}` : 'En pausa hasta que la reanudes';
    return hasta ? `Pausa programada del ${formato(pausa.desde)} al ${hasta}` : `Pausa programada desde el ${formato(pausa.desde)}`;
}
