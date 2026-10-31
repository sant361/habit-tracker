// Aviso de rachas en riesgo (sin dependencias, para poder probarlo).
export const RACHA_MINIMA = 3; // con menos días no vale la pena avisar

/**
 * Hábitos de hoy que aún no se marcaron y cuya racha se perdería si el día termina así.
 * Recibe las filas de la matriz de un solo día. Devuelve [{ habitoId, nombre, racha }],
 * de la racha más larga a la más corta.
 */
export function rachasEnRiesgo(filas, minimo = RACHA_MINIMA) {
    return filas
        .filter((f) => f.celdas[0].estado === 'pendiente' && f.rachaActual >= minimo)
        .map((f) => ({ habitoId: f.habitoId, nombre: f.nombre, racha: f.rachaActual }))
        .sort((a, b) => b.racha - a.racha || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Texto del aviso, o '' si no hay nada en riesgo. */
export function textoRiesgo(lista) {
    if (!lista.length) return '';
    const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
    if (lista.length === 1) return `Tu racha de ${dias(lista[0].racha)} en "${lista[0].nombre}" está en juego hoy. ¡No la pierdas!`;
    const principales = lista.slice(0, 3).map((r) => `"${r.nombre}" (${dias(r.racha)})`).join(', ');
    const resto = lista.length > 3 ? ` y ${lista.length - 3} más` : '';
    return `Tienes ${lista.length} rachas en juego hoy: ${principales}${resto}.`;
}
