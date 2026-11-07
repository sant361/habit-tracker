import db from '../db.js';
import { calcularLogros } from './logros.js';
import { pausasPorHabito } from './pausas.js';
import { crearEnPausa } from '../utils/pausas.js';

/** Lee el historial completo de una persona y devuelve sus logros con el avance. */
export async function logrosDeUsuario(usuarioId, hoy) {
    // Se incluyen los hábitos archivados: un logro ganado no debe desaparecer al archivar
    const habitos = await db.todos('SELECT id, creado_en, dias, meta_semanal FROM habitos WHERE usuario_id = ?', [usuarioId]);
    const registros = await db.todos(
        `SELECT r.habito_id, r.fecha FROM registros r
         JOIN habitos h ON h.id = r.habito_id
         WHERE h.usuario_id = ?`,
        [usuarioId]
    );

    const pausas = await pausasPorHabito(usuarioId);
    const porHabito = new Map(
        habitos.map((h) => [
            h.id,
            {
                creadoEn: h.creado_en,
                // Un hábito con meta semanal no tiene días fijos: no entra en las rachas de días ni en los días perfectos,
                // pero sus cumplimientos sí suman al total
                dias: h.meta_semanal ? new Set() : new Set(JSON.parse(h.dias)),
                hechos: new Set(),
                enPausa: crearEnPausa(pausas.get(h.id) || [])
            }
        ])
    );
    for (const r of registros) porHabito.get(r.habito_id).hechos.add(r.fecha);

    return calcularLogros([...porHabito.values()], hoy);
}
