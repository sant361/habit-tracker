import db from '../db.js';
import { sumarDias } from '../utils/fechas.js';
import { cubre, hayChoque } from '../utils/pausas.js';

/** Todas las pausas de los hábitos de una persona: Map(habitoId -> [{ desde, hasta }]). */
export async function pausasPorHabito(usuarioId) {
    const filas = await db.todos(
        `SELECT p.habito_id, p.desde, p.hasta FROM pausas p
         JOIN habitos h ON h.id = p.habito_id
         WHERE h.usuario_id = ?
         ORDER BY p.desde`,
        [usuarioId]
    );
    const mapa = new Map();
    for (const f of filas) {
        if (!mapa.has(f.habito_id)) mapa.set(f.habito_id, []);
        mapa.get(f.habito_id).push({ desde: f.desde, hasta: f.hasta || null });
    }
    return mapa;
}

/** Crea una pausa. Devuelve { ok: true } o { error, estado } si se cruza con otra. */
export async function pausar(habitoId, desde, hasta) {
    const existentes = await db.todos('SELECT desde, hasta FROM pausas WHERE habito_id = ?', [habitoId]);
    if (hayChoque(existentes, desde, hasta)) {
        return { error: 'Ese hábito ya tiene una pausa en esas fechas', estado: 409 };
    }
    await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [habitoId, desde, hasta || null]);
    return { ok: true };
}

/**
 * Reanuda un hábito a partir de "fecha": la pausa en curso termina el día anterior.
 * Si la pausa aún no había empezado (o empieza justo ese día), se cancela por completo.
 */
export async function reanudar(habitoId, fecha) {
    const pausas = await db.todos('SELECT id, desde, hasta FROM pausas WHERE habito_id = ? ORDER BY desde', [habitoId]);

    const enCurso = pausas.find((p) => cubre({ desde: p.desde, hasta: p.hasta || null }, fecha));
    if (enCurso) {
        if (enCurso.desde >= fecha) await db.ejecutar('DELETE FROM pausas WHERE id = ?', [enCurso.id]);
        else await db.ejecutar('UPDATE pausas SET hasta = ? WHERE id = ?', [sumarDias(fecha, -1), enCurso.id]);
        return { ok: true };
    }

    const proxima = pausas.find((p) => p.desde > fecha);
    if (proxima) {
        await db.ejecutar('DELETE FROM pausas WHERE id = ?', [proxima.id]);
        return { ok: true };
    }
    return { error: 'Ese hábito no está en pausa', estado: 404 };
}
