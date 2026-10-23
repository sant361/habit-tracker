import { diaSemana, sumarDias } from '../utils/fechas.js';
import { calcularRachas } from './racha.js';

// Catálogo de logros. "tipo" indica qué número se compara con la "meta":
//  - racha:   la mejor racha de días seguidos de cualquier hábito
//  - total:   cumplimientos marcados en toda la historia
//  - perfecto: días en los que cumpliste todos tus hábitos programados
//  - semana:  días perfectos seguidos
export const CATALOGO = [
    { clave: 'total_1', icono: '🌱', titulo: 'Primer paso', descripcion: 'Marca tu primer hábito', tipo: 'total', meta: 1 },
    { clave: 'total_10', icono: '✅', titulo: 'Tomando ritmo', descripcion: 'Suma 10 cumplimientos', tipo: 'total', meta: 10 },
    { clave: 'total_100', icono: '💯', titulo: 'Cien veces', descripcion: 'Suma 100 cumplimientos', tipo: 'total', meta: 100 },
    { clave: 'total_500', icono: '🏅', titulo: 'Imparable', descripcion: 'Suma 500 cumplimientos', tipo: 'total', meta: 500 },
    { clave: 'racha_7', icono: '🔥', titulo: 'Una semana seguida', descripcion: 'Cumple un hábito 7 días seguidos', tipo: 'racha', meta: 7 },
    { clave: 'racha_21', icono: '⚡', titulo: 'Tres semanas', descripcion: 'Cumple un hábito 21 días seguidos', tipo: 'racha', meta: 21 },
    { clave: 'racha_50', icono: '🚀', titulo: 'Constancia de acero', descripcion: 'Cumple un hábito 50 días seguidos', tipo: 'racha', meta: 50 },
    { clave: 'racha_100', icono: '👑', titulo: 'Leyenda', descripcion: 'Cumple un hábito 100 días seguidos', tipo: 'racha', meta: 100 },
    { clave: 'dia_perfecto', icono: '🌟', titulo: 'Día perfecto', descripcion: 'Cumple todos tus hábitos de un día (mínimo 2)', tipo: 'perfecto', meta: 1 },
    { clave: 'semana_perfecta', icono: '🏆', titulo: 'Semana perfecta', descripcion: '7 días perfectos seguidos', tipo: 'semana', meta: 7 }
];

/**
 * Calcula el avance y el estado de cada logro con todo el historial.
 * habitos: [{ creadoEn: 'YYYY-MM-DD', dias: Set<number>, hechos: Set<'YYYY-MM-DD'> }]
 * Un "día perfecto" necesita al menos 2 hábitos programados ese día y todos cumplidos;
 * los días con menos de 2 hábitos y el día de hoy aún incompleto no rompen la serie.
 */
export function calcularLogros(habitos, hoy) {
    let mejorRacha = 0;
    let total = 0;
    for (const h of habitos) {
        const hechos = new Set([...h.hechos].filter((f) => f <= hoy));
        total += hechos.size;
        mejorRacha = Math.max(mejorRacha, calcularRachas(h.creadoEn, h.dias, hechos, hoy).mejor);
    }

    let diasPerfectos = 0;
    let mejorSemana = 0;
    if (habitos.length) {
        let seguidos = 0;
        const inicio = habitos.map((h) => h.creadoEn).sort()[0];
        for (let fecha = inicio; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
            const dia = diaSemana(fecha);
            const programados = habitos.filter((h) => fecha >= h.creadoEn && h.dias.has(dia));
            if (programados.length < 2) continue;
            if (programados.every((h) => h.hechos.has(fecha))) {
                diasPerfectos++;
                seguidos++;
                mejorSemana = Math.max(mejorSemana, seguidos);
            } else if (fecha !== hoy) {
                seguidos = 0;
            }
        }
    }

    const valores = { racha: mejorRacha, total, perfecto: diasPerfectos, semana: mejorSemana };
    return CATALOGO.map((l) => {
        const actual = valores[l.tipo];
        return { ...l, obtenido: actual >= l.meta, actual: Math.min(actual, l.meta) };
    });
}
