import db from '../db.js';
import { rangoDias, diaSemana } from '../utils/fechas.js';
import { calcularRachas } from './racha.js';

const redondear = (n) => Math.round(n * 100) / 100;

/**
 * Matriz hábitos x días.
 * Estados de celda: hecho | fallado | pendiente (hoy sin marcar) | no-toca | futuro
 * Porcentajes ponderados por el peso (1-5) de cada hábito.
 * Si se indica una categoría, solo se incluyen los hábitos de esa categoría
 * (y todos los totales se calculan solo con ellos).
 */
export function construirMatriz(usuarioId, desde, hasta, hoy, categoria = null) {
    const dias = rangoDias(desde, hasta);

    const todos = db
        .prepare('SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 0 ORDER BY id')
        .all(usuarioId);
    const habitos = categoria ? todos.filter((h) => h.categoria === categoria) : todos;

    const registros = db
        .prepare(`SELECT r.habito_id, r.fecha, r.nota FROM registros r
                  JOIN habitos h ON h.id = r.habito_id
                  WHERE h.usuario_id = ? AND h.archivado = 0`)
        .all(usuarioId);

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
        let ok = 0;
        let total = 0;

        const celdas = dias.map((fecha, i) => {
            const programado = fecha >= h.creado_en && programados.has(diaSemana(fecha));
            const hecho = hechos.has(fecha);

            let estado;
            if (fecha > hoy) estado = 'futuro';
            else if (hecho) estado = 'hecho';
            else if (!programado) estado = 'no-toca';
            else if (fecha === hoy) estado = 'pendiente';
            else estado = 'fallado';

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

        const rachas = calcularRachas(h.creado_en, programados, hechos, hoy);
        return {
            habitoId: h.id,
            nombre: h.nombre,
            categoria: h.categoria,
            color: h.color,
            peso: h.peso,
            celdas,
            tasa: total ? redondear(ok / total) : null,
            rachaActual: rachas.actual,
            mejorRacha: rachas.mejor
        };
    });

    return {
        dias,
        filas,
        puntajeDiario: dias.map((_, i) => (diarioTotal[i] ? redondear(diarioOk[i] / diarioTotal[i]) : null)),
        tasaGlobal: globalTotal ? redondear(globalOk / globalTotal) : null
    };
}
