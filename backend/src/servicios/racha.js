import { diaSemana, sumarDias } from '../utils/fechas.js';

// Recorre el historial completo del hábito (desde que se creó hasta hoy).
// Solo cuentan los días que tocaba. El día de hoy sin marcar no rompe la racha.
// Los días en pausa (enPausa(fecha) === true) tampoco la rompen ni suman: es como si no tocaran.
export function calcularRachas(creadoEn, diasProgramados, hechos, hoy, enPausa = () => false) {
    let actual = 0;
    let mejor = 0;
    for (let f = creadoEn; f <= hoy; f = sumarDias(f, 1)) {
        if (!diasProgramados.has(diaSemana(f))) continue;
        if (hechos.has(f)) {
            actual++;
            mejor = Math.max(mejor, actual);
        } else if (enPausa(f)) {
            continue;
        } else if (f !== hoy) {
            actual = 0;
        }
    }
    return { actual, mejor };
}
