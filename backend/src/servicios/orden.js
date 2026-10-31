import db from '../db.js';

/**
 * Guarda el orden de los hábitos activos de una persona. "ids" debe traer exactamente sus hábitos
 * activos (sin repetir ni faltar ninguno), del primero al último. Devuelve { ok: true } o { error, estado }.
 * Se hace con una sola sentencia UPDATE para que el cambio sea todo o nada.
 */
export async function guardarOrden(usuarioId, ids) {
    if (!Array.isArray(ids) || !ids.every(Number.isInteger) || new Set(ids).size !== ids.length) {
        return { error: 'La lista de hábitos no es válida', estado: 400 };
    }

    const propios = (await db.todos('SELECT id FROM habitos WHERE usuario_id = ? AND archivado = 0', [usuarioId])).map((h) => h.id);
    const coincide = propios.length === ids.length && propios.every((id) => ids.includes(id));
    if (!coincide) {
        return { error: 'La lista no coincide con tus hábitos. Recarga la página e inténtalo de nuevo', estado: 409 };
    }
    if (!ids.length) return { ok: true };

    const casos = ids.map(() => 'WHEN CAST(? AS INTEGER) THEN CAST(? AS INTEGER)').join(' ');
    const lista = ids.map(() => 'CAST(? AS INTEGER)').join(', ');
    await db.ejecutar(
        `UPDATE habitos SET orden = CASE id ${casos} END WHERE usuario_id = ? AND id IN (${lista})`,
        [...ids.flatMap((id, i) => [id, i + 1]), usuarioId, ...ids]
    );
    return { ok: true };
}
