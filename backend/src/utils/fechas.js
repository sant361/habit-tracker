// Todas las fechas viajan como texto 'YYYY-MM-DD' para evitar problemas de zona horaria.
const aFecha = (texto) => new Date(texto + 'T12:00:00Z');

export const esFecha = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto) && !isNaN(aFecha(texto));
export const diaSemana = (texto) => aFecha(texto).getUTCDay(); // 0 = domingo

export function sumarDias(texto, n) {
    const d = aFecha(texto);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export function rangoDias(desde, hasta) {
    const lista = [];
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) lista.push(f);
    return lista;
}

export const hoyLocal = () => new Date().toLocaleDateString('en-CA');
