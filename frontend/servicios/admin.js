// Textos del panel de administración (sin dependencias, para poder probarlos).
import { diasAtras } from './dia.js';

/** "Hoy", "Ayer", "Hace 5 días" o "Sin actividad" según la última fecha en que marcó un hábito. */
export function textoActividad(ultima, hoyISO) {
    if (!ultima) return 'Sin actividad';
    const atras = diasAtras(ultima, hoyISO);
    if (atras <= 0) return 'Hoy';
    if (atras === 1) return 'Ayer';
    return `Hace ${atras} días`;
}

/** Filtra las cuentas por nombre o correo (sin importar mayúsculas ni tildes). */
export function filtrarUsuarios(usuarios, texto) {
    const limpiar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const buscado = limpiar(texto);
    if (!buscado) return usuarios;
    return usuarios.filter((u) => limpiar(u.nombre).includes(buscado) || limpiar(u.email).includes(buscado));
}
