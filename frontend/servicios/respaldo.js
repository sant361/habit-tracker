// Textos y lectura del archivo para importar un respaldo (sin dependencias, para poder probarlos).
export const MAX_BYTES = 5 * 1024 * 1024; // igual que el límite del servidor

/** Resumen de lo que pasó al importar: { importados, omitidos, registros }. */
export function textoImportacion({ importados, omitidos = [], registros = 0 }) {
    const partes = [];
    if (importados === 0) partes.push('No se importó ningún hábito nuevo.');
    else partes.push(`Se importaron ${importados} ${importados === 1 ? 'hábito' : 'hábitos'} con ${registros} ${registros === 1 ? 'registro' : 'registros'}.`);
    if (omitidos.length) {
        const lista = omitidos.slice(0, 5).map((n) => `"${n}"`).join(', ') + (omitidos.length > 5 ? ` y ${omitidos.length - 5} más` : '');
        partes.push(`Se omitieron por tener ya uno con el mismo nombre: ${lista}.`);
    }
    return partes.join(' ');
}

/** Convierte el texto de un archivo en el respaldo (objeto) o lanza un Error con un mensaje claro. */
export function leerRespaldo(texto) {
    try {
        return JSON.parse(texto);
    } catch {
        throw new Error('El archivo no es un JSON válido');
    }
}
