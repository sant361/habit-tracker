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

/**
 * Revisa las fechas de una pausa nueva. Devuelve el texto del problema, o '' si está bien.
 * "desde" no puede ser futuro ni anterior a que existiera el hábito; "hasta" (opcional) no puede
 * ser anterior a "desde".
 */
export function errorDePausa({ desde, hasta }, hoyISO, creadoEn) {
    if (!desde) return 'Elige desde qué día empieza la pausa';
    if (desde > hoyISO) return 'La pausa no puede empezar en el futuro';
    if (creadoEn && desde < creadoEn) return 'La pausa no puede empezar antes de que existiera el hábito';
    if (hasta && hasta < desde) return 'La fecha final no puede ser anterior al inicio';
    return '';
}

/** "Del 5 oct al 9 oct" para una pausa ya terminada. */
export const textoPausaPasada = (pausa, formato = fechaCorta) => `Del ${formato(pausa.desde)} al ${formato(pausa.hasta)}`;

/** True si la pausa ya terminó del todo (no tiene ningún día de hoy en adelante). */
export const esPausaPasada = ({ hasta }, hoyISO) => Boolean(hasta) && hasta < hoyISO;
