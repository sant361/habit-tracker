// Fechas como texto 'YYYY-MM-DD' (igual que el backend)
export const aISO = (fecha) => fecha.toLocaleDateString('en-CA');
export const hoy = () => aISO(new Date());

export function sumarDias(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return aISO(d);
}

export function etiquetaDia(iso) {
    const d = new Date(iso + 'T12:00:00');
    return {
        numero: d.getDate(),
        letra: d.toLocaleDateString('es-CO', { weekday: 'narrow' }).toUpperCase()
    };
}

export const NOMBRES_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
