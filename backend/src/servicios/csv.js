const SEPARADOR = ';'; // Excel en español usa punto y coma como separador de listas

const TEXTO_ESTADO = {
    hecho: 'hecho',
    fallado: 'fallado',
    pendiente: 'pendiente'
};

// Escapa un campo: comillas dobles duplicadas y entre comillas si lleva separador, comillas o saltos.
// Si empieza con = + - @ lo precede un apóstrofo para que Excel no lo interprete como fórmula.
function campo(valor) {
    let texto = valor === null || valor === undefined ? '' : String(valor);
    if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
    return /[;"\r\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
}

/**
 * Convierte la matriz en un CSV "largo": una fila por hábito y día.
 * Solo incluye los días con algo que informar (hecho, fallado o pendiente);
 * los días que no tocaba o que aún no llegan no generan fila.
 */
export function matrizACsv(matriz) {
    const filas = [['fecha', 'habito', 'categoria', 'impacto', 'estado', 'nota']];
    for (const dia of matriz.dias.keys()) {
        for (const habito of matriz.filas) {
            const estado = TEXTO_ESTADO[habito.celdas[dia].estado];
            if (!estado) continue;
            filas.push([matriz.dias[dia], habito.nombre, habito.categoria, habito.peso, estado, habito.celdas[dia].nota]);
        }
    }
    return filas.map((f) => f.map(campo).join(SEPARADOR)).join('\r\n') + '\r\n';
}
