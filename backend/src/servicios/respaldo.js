import db from '../db.js';

/**
 * Todos los datos de una persona en un solo objeto, listo para guardarlo como JSON:
 * sus hábitos (también los archivados) con sus pausas y registros (con notas).
 * No incluye claves, códigos ni ningún dato de otras personas.
 */
export async function construirRespaldo(usuarioId) {
    const usuario = await db.uno('SELECT nombre, email FROM usuarios WHERE id = ?', [usuarioId]);
    const habitos = await db.todos('SELECT * FROM habitos WHERE usuario_id = ? ORDER BY archivado, orden, id', [usuarioId]);
    const pausas = await db.todos(
        `SELECT p.habito_id, p.desde, p.hasta FROM pausas p
         JOIN habitos h ON h.id = p.habito_id WHERE h.usuario_id = ? ORDER BY p.desde`,
        [usuarioId]
    );
    const registros = await db.todos(
        `SELECT r.habito_id, r.fecha, r.nota FROM registros r
         JOIN habitos h ON h.id = r.habito_id WHERE h.usuario_id = ? ORDER BY r.fecha`,
        [usuarioId]
    );

    const agrupar = (filas, mapear) => {
        const mapa = new Map();
        for (const f of filas) {
            if (!mapa.has(f.habito_id)) mapa.set(f.habito_id, []);
            mapa.get(f.habito_id).push(mapear(f));
        }
        return mapa;
    };
    const pausasDe = agrupar(pausas, (p) => ({ desde: p.desde, hasta: p.hasta || null }));
    const registrosDe = agrupar(registros, (r) => ({ fecha: r.fecha, nota: r.nota || null }));

    return {
        version: 1,
        exportadoEn: new Date().toISOString(),
        usuario: { nombre: usuario.nombre, email: usuario.email },
        habitos: habitos.map((h) => ({
            nombre: h.nombre,
            categoria: h.categoria || null,
            color: h.color,
            dias: JSON.parse(h.dias),
            peso: h.peso,
            creadoEn: h.creado_en,
            archivado: h.archivado === 1,
            archivadoEn: h.archivado_en || null,
            pausas: pausasDe.get(h.id) || [],
            registros: registrosDe.get(h.id) || []
        }))
    };
}
