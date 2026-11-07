import db from '../db.js';
import { rangoDias, diaSemana } from '../utils/fechas.js';
import { calcularRachas } from './racha.js';
import { lunesDe, evaluarSemana, calcularRachasSemanales } from './semanal.js';
import { pausasPorHabito } from './pausas.js';
import { crearEnPausa } from '../utils/pausas.js';

const redondear = (n) => Math.round(n * 100) / 100;

/**
 * Matriz hábitos x días.
 * Estados de celda: hecho | fallado | pendiente (hoy sin marcar) | pausado | no-toca | futuro
 * Los hábitos con meta semanal tienen además "libre": un día sin marcar que todavía no es un fallo.
 * Un día en pausa (solo si el hábito tocaba ese día) no cuenta para el porcentaje ni rompe la racha.
 * Porcentajes ponderados por el peso (1-5) de cada hábito.
 * Si se indica una categoría, solo se incluyen los hábitos de esa categoría
 * (y todos los totales se calculan solo con ellos).
 */
export async function construirMatriz(usuarioId, desde, hasta, hoy, categoria = null) {
    const dias = rangoDias(desde, hasta);

    const todos = await db.todos('SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 0 ORDER BY orden, id', [usuarioId]);
    const habitos = categoria ? todos.filter((h) => h.categoria === categoria) : todos;

    const registros = await db.todos(
        `SELECT r.habito_id, r.fecha, r.nota FROM registros r
         JOIN habitos h ON h.id = r.habito_id
         WHERE h.usuario_id = ? AND h.archivado = 0`,
        [usuarioId]
    );

    const pausas = await pausasPorHabito(usuarioId);

    const hechosPorHabito = new Map();
    const notas = new Map();
    for (const r of registros) {
        if (r.nota) notas.set(`${r.habito_id}|${r.fecha}`, r.nota);
        if (!hechosPorHabito.has(r.habito_id)) hechosPorHabito.set(r.habito_id, new Set());
        hechosPorHabito.get(r.habito_id).add(r.fecha);
    }

    const diarioOk = dias.map(() => 0);
    const diarioTotal = dias.map(() => 0);
    let globalOk = 0;
    let globalTotal = 0;

    const filas = habitos.map((h) => {
        const programados = new Set(JSON.parse(h.dias));
        const hechos = hechosPorHabito.get(h.id) || new Set();
        const enPausa = crearEnPausa(pausas.get(h.id) || []);
        const meta = h.meta_semanal || null; // veces por semana, o null si tiene días fijos
        let ok = 0;
        let total = 0;

        // Las semanas de un hábito con meta se evalúan una sola vez y se reutilizan para sus 7 días
        const semanas = new Map();
        const semanaDe = (fecha) => {
            const lunes = lunesDe(fecha);
            if (!semanas.has(lunes)) semanas.set(lunes, evaluarSemana({ lunes, creadoEn: h.creado_en, meta, hechos, enPausa, hoy }));
            return semanas.get(lunes);
        };

        const celdas = dias.map((fecha, i) => {
            let programado;
            let estado;

            if (meta) {
                // Con meta semanal cualquier día sirve: "libre" es un día sin marcar que todavía no es un fallo.
                // Solo cuentan para el porcentaje los cumplimientos de la meta y los que faltaron al cerrar la semana.
                const semana = semanaDe(fecha);
                if (fecha > hoy) [estado, programado] = ['futuro', false];
                else if (hechos.has(fecha)) [estado, programado] = ['hecho', semana.contadas.has(fecha)];
                else if (fecha < h.creado_en) [estado, programado] = ['no-toca', false];
                else if (enPausa(fecha)) [estado, programado] = ['pausado', true];
                else if (semana.fallidos.has(fecha)) [estado, programado] = ['fallado', true];
                else if (fecha === hoy && !semana.cumplida) [estado, programado] = ['pendiente', true];
                else [estado, programado] = ['libre', false];
            } else {
                programado = fecha >= h.creado_en && programados.has(diaSemana(fecha));
                const hecho = hechos.has(fecha);
                if (fecha > hoy) estado = 'futuro';
                else if (hecho) estado = 'hecho';
                else if (!programado) estado = 'no-toca';
                else if (enPausa(fecha)) estado = 'pausado';
                else if (fecha === hoy) estado = 'pendiente';
                else estado = 'fallado';
            }

            // Solo cuenta para el porcentaje lo que tocaba y ya se puede juzgar
            if (programado && (estado === 'hecho' || estado === 'fallado')) {
                total += h.peso;
                diarioTotal[i] += h.peso;
                if (estado === 'hecho') {
                    ok += h.peso;
                    diarioOk[i] += h.peso;
                }
            }
            return { fecha, estado, programado, nota: notas.get(`${h.id}|${fecha}`) || null };
        });

        globalOk += ok;
        globalTotal += total;

        const rachas = meta ? calcularRachasSemanales(h.creado_en, meta, hechos, hoy, enPausa) : calcularRachas(h.creado_en, programados, hechos, hoy, enPausa);
        const semanaActual = meta ? semanaDe(hoy) : null;
        return {
            habitoId: h.id,
            nombre: h.nombre,
            categoria: h.categoria,
            color: h.color,
            peso: h.peso,
            celdas,
            tasa: total ? redondear(ok / total) : null,
            rachaActual: rachas.actual,
            mejorRacha: rachas.mejor,
            metaSemanal: meta,
            unidadRacha: meta ? 'semanas' : 'días',
            // Avance de la semana en curso, para mostrar "2 de 3 esta semana"
            semanaActual: semanaActual ? { hechas: semanaActual.hechas, meta: semanaActual.metaEfectiva } : null
        };
    });

    return {
        dias,
        filas,
        puntajeDiario: dias.map((_, i) => (diarioTotal[i] ? redondear(diarioOk[i] / diarioTotal[i]) : null)),
        tasaGlobal: globalTotal ? redondear(globalOk / globalTotal) : null
    };
}
