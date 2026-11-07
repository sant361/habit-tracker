import { diaSemana, sumarDias } from '../utils/fechas.js';

// Hábitos con meta semanal ("3 veces por semana"): en vez de días fijos, se puede cumplir cualquier día
// y lo que se juzga es la semana completa (de lunes a domingo).

/** El lunes de la semana a la que pertenece una fecha. */
export const lunesDe = (fecha) => sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));

/**
 * Evalúa una semana de un hábito con meta semanal.
 *  - metaEfectiva: la meta, o menos si no hubo días suficientes (el hábito se creó a mitad de semana
 *    o estuvo en pausa). Los días en pausa no se pueden cumplir, así que no se exigen.
 *  - hechas: días cumplidos de la semana hasta hoy.
 *  - contadas: las primeras "metaEfectiva" fechas cumplidas; las demás son de más y no suman al porcentaje.
 *  - juzgada: la semana ya terminó (el domingo quedó atrás). Solo entonces puede fallar.
 *  - fallidos: si la semana se juzgó sin llegar a la meta, los últimos días libres, uno por cada cumplimiento
 *    que faltó, para que cada día fallado represente un cumplimiento perdido.
 */
export function evaluarSemana({ lunes, creadoEn, meta, hechos, enPausa = () => false, hoy }) {
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const disponibles = dias.filter((f) => f >= creadoEn && (!enPausa(f) || hechos.has(f)));
    const hechosSemana = dias.filter((f) => hechos.has(f) && f <= hoy);
    const metaEfectiva = Math.min(meta, disponibles.length);
    const juzgada = sumarDias(lunes, 6) < hoy;
    const faltan = Math.max(0, metaEfectiva - hechosSemana.length);

    const fallidos = new Set();
    if (juzgada && faltan > 0) {
        for (const f of disponibles.filter((d) => !hechos.has(d)).slice(-faltan)) fallidos.add(f);
    }
    return {
        metaEfectiva,
        hechas: hechosSemana.length,
        contadas: new Set(hechosSemana.slice(0, metaEfectiva)),
        juzgada,
        fallidos,
        cumplida: metaEfectiva > 0 && hechosSemana.length >= metaEfectiva
    };
}

/**
 * Racha en semanas seguidas cumpliendo la meta. La semana en curso suma en cuanto se alcanza la meta,
 * pero no rompe la racha mientras no se alcance. Una semana sin días disponibles (todo en pausa) se salta.
 */
export function calcularRachasSemanales(creadoEn, meta, hechos, hoy, enPausa = () => false) {
    let actual = 0;
    let mejor = 0;
    for (let lunes = lunesDe(creadoEn); lunes <= hoy; lunes = sumarDias(lunes, 7)) {
        const s = evaluarSemana({ lunes, creadoEn, meta, hechos, enPausa, hoy });
        if (s.metaEfectiva === 0) continue;
        if (s.cumplida) {
            actual++;
            mejor = Math.max(mejor, actual);
        } else if (s.juzgada) {
            actual = 0;
        }
    }
    return { actual, mejor };
}
