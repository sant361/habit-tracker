import { randomBytes } from 'node:crypto';

// Sin I, O, 0 ni 1 para que no se confundan al copiarlo a mano. 32 símbolos x 12 = 60 bits.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código de recuperación al azar con la forma XXXX-XXXX-XXXX. */
export function generarCodigo() {
    let texto = '';
    for (const byte of randomBytes(12)) texto += ALFABETO[byte % ALFABETO.length]; // 256 es múltiplo de 32: sin sesgo
    return texto.match(/.{4}/g).join('-');
}

/** Deja el código sin guiones, espacios ni minúsculas, para compararlo sin importar cómo se escribió. */
export const normalizarCodigo = (texto) => String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
