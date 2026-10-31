import db from '../db.js';
import { esFecha } from '../utils/fechas.js';

const MAX_HABITOS = 200;
const MAX_REGISTROS = 5000; // por hábito
const MAX_PAUSAS = 500; // por hábito
const MAX_NOMBRE = 80;
const MAX_NOTA = 280;

const texto = (v) => typeof v === 'string';
const fecha = (v) => texto(v) && esFecha(v);

/**
 * Revisa un respaldo (el JSON que genera /api/auth/respaldo) y lo deja limpio.
 * Devuelve { habitos } o { error } con un mensaje que dice qué falló.
 */
export function validarRespaldo(datos) {
    if (!datos || typeof datos !== 'object' || datos.version !== 1 || !Array.isArray(datos.habitos)) {
        return { error: 'El archivo no es un respaldo válido de Habit Tracker' };
    }
    if (datos.habitos.length > MAX_HABITOS) return { error: `El respaldo tiene demasiados hábitos (máximo ${MAX_HABITOS})` };

    const habitos = [];
    for (const [i, h] of datos.habitos.entries()) {
        const donde = `Hábito ${i + 1}`;
        if (!h || typeof h !== 'object') return { error: `${donde}: datos inválidos` };
        if (!texto(h.nombre) || !h.nombre.trim() || h.nombre.trim().length > MAX_NOMBRE) return { error: `${donde}: el nombre no es válido` };
        const nombre = h.nombre.trim();
        const en = `"${nombre}"`;

        if (!Array.isArray(h.dias) || !h.dias.length || h.dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return { error: `${en}: los días no son válidos` };
        if (!Number.isInteger(h.peso) || h.peso < 1 || h.peso > 5) return { error: `${en}: el impacto debe estar entre 1 y 5` };
        if (!fecha(h.creadoEn)) return { error: `${en}: la fecha de creación no es válida` };
        if (h.categoria != null && (!texto(h.categoria) || h.categoria.length > MAX_NOMBRE)) return { error: `${en}: la categoría no es válida` };

        const archivado = h.archivado === true;
        if (archivado && h.archivadoEn != null && !fecha(h.archivadoEn)) return { error: `${en}: la fecha de archivado no es válida` };

        const pausas = h.pausas ?? [];
        if (!Array.isArray(pausas) || pausas.length > MAX_PAUSAS) return { error: `${en}: las pausas no son válidas` };
        for (const p of pausas) {
            if (!p || !fecha(p.desde) || (p.hasta != null && (!fecha(p.hasta) || p.hasta < p.desde))) return { error: `${en}: hay una pausa con fechas inválidas` };
        }

        const registros = h.registros ?? [];
        if (!Array.isArray(registros) || registros.length > MAX_REGISTROS) return { error: `${en}: los registros no son válidos` };
        const vistos = new Set();
        const limpios = [];
        for (const r of registros) {
            if (!r || !fecha(r.fecha)) return { error: `${en}: hay un registro con fecha inválida` };
            if (r.nota != null && (!texto(r.nota) || r.nota.length > MAX_NOTA)) return { error: `${en}: hay una nota inválida` };
            if (vistos.has(r.fecha)) continue; // un solo registro por día
            vistos.add(r.fecha);
            limpios.push({ fecha: r.fecha, nota: r.nota ? r.nota.trim() || null : null });
        }

        habitos.push({
            nombre,
            categoria: h.categoria ? h.categoria.trim() || null : null,
            color: texto(h.color) && /^#[0-9a-fA-F]{6}$/.test(h.color) ? h.color : '#38bdf8',
            dias: h.dias,
            peso: h.peso,
            creadoEn: h.creadoEn,
            archivado,
            archivadoEn: archivado && h.archivadoEn ? h.archivadoEn : null,
            pausas: pausas.map((p) => ({ desde: p.desde, hasta: p.hasta ?? null })),
            registros: limpios
        });
    }
    return { habitos };
}

/**
 * Agrega a la cuenta los hábitos de un respaldo. Los que ya existen (mismo nombre, sin importar
 * mayúsculas, ya estén activos o archivados) se omiten para no duplicarlos.
 * Devuelve { importados, omitidos, registros } o { error, estado }.
 */
export async function importarRespaldo(usuarioId, datos) {
    const valido = validarRespaldo(datos);
    if (valido.error) return { error: valido.error, estado: 400 };

    const existentes = await db.todos('SELECT nombre FROM habitos WHERE usuario_id = ?', [usuarioId]);
    const nombres = new Set(existentes.map((h) => h.nombre.toLowerCase()));
    const { ultimo } = await db.uno('SELECT COALESCE(MAX(orden), 0) AS ultimo FROM habitos WHERE usuario_id = ?', [usuarioId]);
    let orden = Number(ultimo);

    let importados = 0;
    let registros = 0;
    const omitidos = [];
    for (const h of valido.habitos) {
        if (nombres.has(h.nombre.toLowerCase())) {
            omitidos.push(h.nombre);
            continue;
        }
        nombres.add(h.nombre.toLowerCase());

        const id = await db.insertar(
            `INSERT INTO habitos (usuario_id, nombre, categoria, color, dias, peso, creado_en, archivado, archivado_en, orden)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, h.nombre, h.categoria, h.color, JSON.stringify(h.dias), h.peso, h.creadoEn, h.archivado ? 1 : 0, h.archivadoEn, h.archivado ? 0 : ++orden]
        );
        for (const p of h.pausas) await db.insertar('INSERT INTO pausas (habito_id, desde, hasta) VALUES (?, ?, ?)', [id, p.desde, p.hasta]);
        for (const r of h.registros) await db.insertar('INSERT INTO registros (habito_id, fecha, nota) VALUES (?, ?, ?)', [id, r.fecha, r.nota]);
        importados++;
        registros += h.registros.length;
    }
    return { importados, omitidos, registros };
}
