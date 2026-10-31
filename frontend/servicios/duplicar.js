// Datos para crear una copia de un hábito (sin dependencias, para poder probarlos).
const MAX_NOMBRE = 60; // el mismo límite del formulario

/**
 * Nombre para la copia: "Leer (copia)", y si ya existe, "Leer (copia 2)", "Leer (copia 3)"...
 * Compara sin importar mayúsculas y recorta el nombre original si hace falta para no pasar del máximo.
 */
export function nombreDeCopia(nombre, existentes) {
    const usados = new Set(existentes.map((n) => n.toLowerCase()));
    for (let n = 1; ; n++) {
        const sufijo = n === 1 ? ' (copia)' : ` (copia ${n})`;
        const candidato = nombre.slice(0, MAX_NOMBRE - sufijo.length).trimEnd() + sufijo;
        if (!usados.has(candidato.toLowerCase())) return candidato;
    }
}

/** Cuerpo para POST /api/habitos con los mismos ajustes del hábito original. */
export function datosDeCopia(habito, existentes, hoyISO) {
    return {
        nombre: nombreDeCopia(habito.nombre, existentes),
        categoria: habito.categoria || '',
        color: habito.color,
        peso: habito.peso,
        dias: [...habito.dias],
        creadoEn: hoyISO // la copia empieza hoy: no hereda días pasados que no vivió
    };
}
