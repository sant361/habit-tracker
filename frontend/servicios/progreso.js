// Funciones puras para armar los datos de los gráficos de progreso.
// Trabajan sobre la respuesta de /api/estadisticas/matriz.

const DIAS_SEMANA = 7;

function etiquetaFecha(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/**
 * Agrupa los días de la matriz en bloques de 7 y calcula el cumplimiento de cada semana,
 * ponderado por el impacto (peso) de cada hábito, igual que el cumplimiento del backend.
 * Devuelve [{ etiqueta, desde, valor }] con valor entre 0 y 1, o null si esa semana no tuvo
 * ningún hábito que juzgar (por ejemplo, antes de crear el primero).
 */
export function agruparSemanas(matriz) {
    const semanas = [];
    for (let inicio = 0; inicio < matriz.dias.length; inicio += DIAS_SEMANA) {
        let ok = 0;
        let total = 0;
        for (const fila of matriz.filas) {
            for (const celda of fila.celdas.slice(inicio, inicio + DIAS_SEMANA)) {
                if (!celda.programado) continue;
                if (celda.estado === 'hecho') {
                    ok += fila.peso;
                    total += fila.peso;
                } else if (celda.estado === 'fallado') {
                    total += fila.peso;
                }
            }
        }
        const desde = matriz.dias[inicio];
        semanas.push({ etiqueta: etiquetaFecha(desde), desde, valor: total ? ok / total : null });
    }
    return semanas;
}

/** Hábitos con cumplimiento calculado, del mejor al peor. */
export function ordenarPorCumplimiento(filas) {
    return filas.filter((f) => f.tasa !== null).sort((a, b) => b.tasa - a.tasa);
}

// ---- Cuadrante de impacto ----
// Cruza la constancia (cumplimiento) con el impacto (peso 1-5) de cada hábito.
export const UMBRAL_CONSTANCIA = 0.7; // desde 70 % se considera constante
export const UMBRAL_IMPACTO = 4; // peso 4 o 5 se considera de alto impacto

/**
 * Reparte los hábitos en 4 cuadrantes:
 *  - mantener:  alto impacto y constante      -> sigue así
 *  - reforzar:  alto impacto y poco constante -> la prioridad
 *  - facil:     bajo impacto y constante      -> va solo
 *  - revisar:   bajo impacto y poco constante -> ¿vale la pena?
 * Los hábitos sin cumplimiento calculado (aún no tocaba) quedan fuera.
 * Dentro de cada cuadrante, primero el de mayor impacto y luego el menos constante.
 */
export function clasificarCuadrantes(filas) {
    const cuadrantes = { mantener: [], reforzar: [], facil: [], revisar: [] };
    for (const f of filas) {
        if (f.tasa === null) continue;
        const constante = f.tasa >= UMBRAL_CONSTANCIA;
        const alto = f.peso >= UMBRAL_IMPACTO;
        const clave = alto ? (constante ? 'mantener' : 'reforzar') : constante ? 'facil' : 'revisar';
        cuadrantes[clave].push(f);
    }
    for (const lista of Object.values(cuadrantes)) {
        lista.sort((a, b) => b.peso - a.peso || a.tasa - b.tasa);
    }
    return cuadrantes;
}

// ---- Comparar periodos ----
// Cumplimiento ponderado de los días [desde, hasta) de la matriz, o null si no hubo nada que juzgar.
function acumular(filas, desde, hasta) {
    let ok = 0;
    let total = 0;
    for (const fila of filas) {
        for (let i = Math.max(desde, 0); i < hasta; i++) {
            const celda = fila.celdas[i];
            if (!celda.programado) continue;
            if (celda.estado === 'hecho') {
                ok += fila.peso;
                total += fila.peso;
            } else if (celda.estado === 'fallado') {
                total += fila.peso;
            }
        }
    }
    return total ? ok / total : null;
}

const aPuntos = (actual, anterior) => (actual === null || anterior === null ? null : Math.round((actual - anterior) * 100));

/**
 * Compara los últimos "n" días de la matriz con los "n" anteriores.
 * Devuelve { actual, anterior, cambio, porHabito }:
 *  - actual y anterior van de 0 a 1 (o null si no hay datos);
 *  - cambio es la diferencia en puntos porcentuales (null si falta alguno);
 *  - porHabito lista los hábitos con datos en ambos periodos, del que más mejoró al que más bajó.
 */
export function compararPeriodos(matriz, n) {
    const total = matriz.dias.length;
    const finActual = total;
    const iniActual = total - n;
    const iniAnterior = total - 2 * n;
    const hayAnterior = iniAnterior >= 0;

    const actual = acumular(matriz.filas, iniActual, finActual);
    const anterior = hayAnterior ? acumular(matriz.filas, iniAnterior, iniActual) : null;

    const porHabito = [];
    if (hayAnterior) {
        for (const fila of matriz.filas) {
            const a = acumular([fila], iniActual, finActual);
            const b = acumular([fila], iniAnterior, iniActual);
            if (a === null || b === null) continue;
            porHabito.push({ habitoId: fila.habitoId, nombre: fila.nombre, color: fila.color, actual: a, anterior: b, cambio: aPuntos(a, b) });
        }
        porHabito.sort((x, y) => y.cambio - x.cambio);
    }

    return { actual, anterior, cambio: aPuntos(actual, anterior), porHabito };
}

// ---- Rendimiento por día de la semana ----
const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // de lunes a domingo

/**
 * Cumplimiento ponderado de cada día de la semana en todo el periodo de la matriz.
 * Devuelve 7 elementos, de lunes a domingo: { dia, nombre, tasa } con tasa de 0 a 1 o null si
 * ese día no tuvo nada que juzgar.
 */
export function rendimientoPorDia(matriz) {
    const acumulado = Array.from({ length: 7 }, () => ({ ok: 0, total: 0 }));
    matriz.dias.forEach((fecha, i) => {
        const dia = new Date(fecha + 'T12:00:00').getDay();
        for (const fila of matriz.filas) {
            const celda = fila.celdas[i];
            if (!celda.programado) continue;
            if (celda.estado === 'hecho') {
                acumulado[dia].ok += fila.peso;
                acumulado[dia].total += fila.peso;
            } else if (celda.estado === 'fallado') {
                acumulado[dia].total += fila.peso;
            }
        }
    });
    return ORDEN_SEMANA.map((dia) => ({
        dia,
        nombre: NOMBRES_DIA[dia],
        tasa: acumulado[dia].total ? acumulado[dia].ok / acumulado[dia].total : null
    }));
}

/**
 * El mejor y el peor día. Devuelve null si hay menos de dos días con datos
 * o si todos rinden igual, porque entonces no hay nada que destacar.
 */
export function extremosDia(dias) {
    const conDatos = dias.filter((d) => d.tasa !== null);
    if (conDatos.length < 2) return null;
    const ordenados = [...conDatos].sort((a, b) => b.tasa - a.tasa);
    const mejor = ordenados[0];
    const peor = ordenados[ordenados.length - 1];
    return mejor.tasa === peor.tasa ? null : { mejor, peor };
}

// ---- Mapa de calor anual ----
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Intensidad de un día según su cumplimiento: 'sin' (nada que juzgar), 0 (no cumplió nada)
 * y de 1 (poco) a 4 (todo cumplido).
 */
export function nivelDia(valor) {
    if (valor === null || valor === undefined) return 'sin';
    if (valor <= 0) return 0;
    if (valor < 0.5) return 1;
    if (valor < 0.75) return 2;
    if (valor < 1) return 3;
    return 4;
}

/**
 * Ordena los días de la matriz en columnas de semana (lunes a domingo) para dibujar el mapa.
 * Devuelve { semanas, meses, diasConDatos, diasPerfectos }:
 *  - semanas: lista de columnas; cada una tiene 7 casillas { fecha, valor, nivel } o null donde
 *    el día queda fuera del periodo (antes del primer día de la matriz);
 *  - meses: etiquetas { columna, etiqueta } en la primera columna de cada mes;
 *  - diasPerfectos: días en que se cumplió todo lo que tocaba.
 */
export function construirMapaCalor(matriz) {
    const semanas = [];
    let columna = null;
    let diasConDatos = 0;
    let diasPerfectos = 0;

    matriz.dias.forEach((fecha, i) => {
        const dia = new Date(fecha + 'T12:00:00').getDay();
        const posicion = (dia + 6) % 7; // lunes = 0 ... domingo = 6
        if (!columna || posicion === 0) {
            columna = Array(7).fill(null);
            semanas.push(columna);
        }
        const valor = matriz.puntajeDiario[i];
        if (valor !== null) diasConDatos++;
        if (valor === 1) diasPerfectos++;
        columna[posicion] = { fecha, valor, nivel: nivelDia(valor) };
    });

    const meses = [];
    let mesAnterior = null;
    semanas.forEach((semana, indice) => {
        const primera = semana.find((c) => c);
        const mes = Number(primera.fecha.slice(5, 7)) - 1;
        if (mes !== mesAnterior) meses.push({ columna: indice, etiqueta: MESES_CORTOS[mes] });
        mesAnterior = mes;
    });

    return { semanas, meses, diasConDatos, diasPerfectos };
}
