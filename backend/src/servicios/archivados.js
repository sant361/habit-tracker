import db from '../db.js';
import { sumarDias } from '../utils/fechas.js';
import { hayChoque } from '../utils/pausas.js';

/** Hábitos archivados de una persona, del que se archivó más recientemente al más antiguo. */
export async function listarArchivados(usuarioId) {
    return db.todos(
        'SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 1 ORDER BY archivado_en DESC, id DESC',
        [usuarioId]
    );
}

/**
 * Los días que el hábito pasó archivado no deben contar como fallados: se cubren con una pausa
 * desde el día en que se archivó hasta ayer. Si ya había pausas que se cruzan con ese hueco,
 * se unen en una sola para no perder ninguna fecha.
 * Devuelve { desde, hasta } de la pausa que cubre el hueco, o null si no hizo falta ninguna.
 */
async function cubrirHueco(habitoId, desde, hasta) {
    if (hasta < desde) return null;
    const existentes = await db.todos('SELECT id, desde, hasta FROM pausas WHERE habito_id = ?', [habitoId]);
    const cruzadas = hayChoque(existentes, desde, hasta) ? existentes.filter((p) => hayChoque([p], desde, hasta)) : [];

    let inicio = desde;
    let fin = hasta;
    let abierta = false;
    for (const p of cruzadas) {
        if (p.desde < inicio) inicio = p.desde;
        if (!p.hasta) abierta = true;
        else if (p.hasta > fin) fin = p.hasta;
        await db.ejecutar('DELETE FROM pausas WHERE id = ?', [p.id]);
    }
    const final = abierta ? null : fin;
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [habitoId, inicio, final]);
    return { desde: inicio, hasta: final };
}

/**
 * Devuelve un hábito archivado a la lista (al final) y pausa los días que estuvo archivado.
 * Devuelve { ok: true, pausa } o { error, estado }.
 */
export async function restaurar(usuarioId, habitoId, hoy) {
    const habito = await db.uno('SELECT id, archivado_en FROM habitos WHERE id = ? AND usuario_id = ? AND archivado = 1', [habitoId, usuarioId]);
    if (!habito) return { error: 'Hábito archivado no encontrado', estado: 404 };

    const { ultimo } = await db.uno('SELECT COALESCE(MAX(orden), 0) AS ultimo FROM habitos WHERE usuario_id = ?', [usuarioId]);
    await db.ejecutar('UPDATE habitos SET archivado = 0, archivado_en = NULL, orden = ? WHERE id = ?', [Number(ultimo) + 1, habito.id]);

    // Los archivados antes de existir esta función no tienen fecha: no hay hueco que cubrir
    const pausa = habito.archivado_en ? await cubrirHueco(habito.id, habito.archivado_en, sumarDias(hoy, -1)) : null;
    return { ok: true, pausa };
}
