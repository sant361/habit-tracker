// Textos para la lista de hábitos archivados (sin dependencias, para poder probarlos).
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const corta = (iso) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]}`;

/** "Archivado el 5 oct", o "Archivado" si no se sabe la fecha (hábitos archivados hace tiempo). */
export const textoArchivado = (habito) => (habito.archivadoEn ? `Archivado el ${corta(habito.archivadoEn)}` : 'Archivado');

/**
 * Aviso tras restaurar. Si el servidor pausó los días que estuvo archivado, lo explica;
 * si esa pausa sigue abierta, el hábito queda en pausa hasta que se reanude.
 */
export function textoRestaurado(nombre, pausa) {
    const base = `"${nombre}" volvió a tus hábitos.`;
    if (!pausa) return base;
    if (!pausa.hasta) return `${base} Sigue en pausa: reanúdalo cuando quieras retomarlo.`;
    return pausa.desde === pausa.hasta
        ? `${base} El ${corta(pausa.desde)} quedó en pausa para que no cuente como fallado.`
        : `${base} Del ${corta(pausa.desde)} al ${corta(pausa.hasta)} quedó en pausa para que no cuenten como fallados.`;
}
