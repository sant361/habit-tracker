// Lógica del recordatorio diario (sin dependencias, para poder probarla).
export const HORA_POR_DEFECTO = '20:00';

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Deja los ajustes guardados en un estado seguro, aunque vengan vacíos o dañados. */
export function normalizarAjustes(bruto) {
    const b = bruto && typeof bruto === 'object' ? bruto : {};
    return {
        activo: b.activo === true,
        hora: typeof b.hora === 'string' && FORMATO_HORA.test(b.hora) ? b.hora : HORA_POR_DEFECTO,
        ultimoAviso: typeof b.ultimoAviso === 'string' ? b.ultimoAviso : ''
    };
}

/** Minutos desde la medianoche de una hora "HH:MM". */
export const minutosDe = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/** Dice si ya pasó la hora elegida en el reloj de "ahora" (un Date). */
export const horaLlegada = (hora, ahora) => ahora.getHours() * 60 + ahora.getMinutes() >= minutosDe(hora);

/** True si hay que revisar y avisar: está activo, ya llegó la hora y hoy aún no se avisó. */
export const tocaAvisar = (ajustes, ahora, hoyISO) => ajustes.activo && horaLlegada(ajustes.hora, ahora) && ajustes.ultimoAviso !== hoyISO;

/** Cuántos hábitos de hoy siguen sin marcar (filas de la matriz de un solo día). */
export const contarPendientes = (filas) => filas.filter((f) => f.celdas[0].estado === 'pendiente').length;

export function textoRecordatorio(pendientes) {
    return pendientes === 1 ? 'Te falta 1 hábito por marcar hoy.' : `Te faltan ${pendientes} hábitos por marcar hoy.`;
}
