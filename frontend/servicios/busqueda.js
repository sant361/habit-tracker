// Búsqueda y filtro de hábitos por nombre y categoría (sin dependencias, para poder probarlos).

/** Minúsculas y sin tildes, para que "meditacion" encuentre "Meditación". */
export const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Categorías distintas de una lista de hábitos, ordenadas alfabéticamente. */
export const categoriasDe = (habitos) =>
    [...new Set(habitos.map((h) => h.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

/**
 * Hábitos cuyo nombre o categoría contiene el texto, y que son de la categoría elegida
 * ('' = todas). Mantiene el orden original.
 */
export function filtrarHabitos(habitos, texto = '', categoria = '') {
    const buscado = normalizar(texto);
    return habitos.filter((h) => {
        if (categoria && h.categoria !== categoria) return false;
        if (!buscado) return true;
        return normalizar(h.nombre).includes(buscado) || normalizar(h.categoria).includes(buscado);
    });
}

/**
 * Categorías para sugerir al escribir: las que contienen lo escrito (sin importar tildes ni mayúsculas).
 * Si ya se escribió una exactamente igual, no se sugiere de nuevo.
 */
export function sugerirCategorias(categorias, escrito = '') {
    const buscado = normalizar(escrito);
    return categorias.filter((c) => normalizar(c).includes(buscado) && c !== escrito.trim());
}
