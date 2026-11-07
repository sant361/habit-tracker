// Enlace para restablecer la clave que llega por correo (sin dependencias, para poder probarlo).
const FORMATO_TOKEN = /^[a-f0-9]{64}$/;

/** Token que viene en la dirección (?restablecer=...), o '' si no hay o no tiene la forma correcta. */
export function tokenDeUrl(busqueda) {
    const valor = new URLSearchParams(busqueda || '').get('restablecer');
    return valor && FORMATO_TOKEN.test(valor) ? valor : '';
}

/** Hay parámetro "restablecer" aunque esté mal formado (para avisar que el enlace no sirve). */
export const traeEnlace = (busqueda) => new URLSearchParams(busqueda || '').has('restablecer');

/** La misma dirección sin el token, para que no se quede a la vista ni en el historial. */
export function direccionSinToken(ruta, busqueda, hash = '') {
    const params = new URLSearchParams(busqueda || '');
    params.delete('restablecer');
    const resto = params.toString();
    return ruta + (resto ? '?' + resto : '') + (hash || '');
}

/** Revisa la clave nueva y su repetición. Devuelve el mensaje de error o '' si está bien. */
export function errorDeClave(clave, repetida, minimo = 6, maximo = 72) {
    if (clave.length < minimo || clave.length > maximo) return `La clave debe tener entre ${minimo} y ${maximo} caracteres`;
    if (clave !== repetida) return 'Las dos claves no coinciden';
    return '';
}
