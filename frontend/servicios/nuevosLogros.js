// Lógica pura para decidir qué logros avisar. Sin dependencias, para poder probarla sola.

/**
 * Devuelve los logros obtenidos que la persona todavía no ha visto.
 * vistos === null significa que es la primera vez que se revisa: se toma como punto de partida
 * y no se avisa de nada (así no llega una avalancha de avisos por logros que ya tenía).
 */
export function detectarNuevos(logros, vistos) {
    if (vistos === null) return [];
    const conocidos = new Set(vistos);
    return logros.filter((l) => l.obtenido && !conocidos.has(l.clave));
}

export const clavesObtenidas = (logros) => logros.filter((l) => l.obtenido).map((l) => l.clave);

export function textoAviso(nuevos) {
    if (nuevos.length === 1) return `${nuevos[0].icono} Logro desbloqueado: ${nuevos[0].titulo}`;
    return `🏆 ${nuevos.length} logros nuevos: ${nuevos.map((l) => l.titulo).join(', ')}`;
}
