// Validación de los datos al registrarse e iniciar sesión (sin dependencias, para poder probarla).
export const MAX_NOMBRE = 60;
export const MIN_CLAVE = 6;
export const MAX_CLAVE = 72; // bcrypt solo considera los primeros 72 caracteres
export const MAX_EMAIL = 254;

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Correo limpio (sin espacios y en minúsculas), o '' si no es texto. */
export const limpiarEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

/**
 * Revisa los datos de un registro. Devuelve { nombre, email, clave } ya limpios,
 * o { error } con un mensaje claro de lo que falló.
 */
export function validarRegistro(cuerpo) {
    const { nombre, email, clave } = cuerpo || {};
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > MAX_NOMBRE) {
        return { error: `El nombre es obligatorio (máximo ${MAX_NOMBRE} caracteres)` };
    }
    const correo = limpiarEmail(email);
    if (!FORMATO_EMAIL.test(correo) || correo.length > MAX_EMAIL) {
        return { error: 'Escribe un correo válido, por ejemplo nombre@correo.com' };
    }
    if (typeof clave !== 'string' || clave.length < MIN_CLAVE || clave.length > MAX_CLAVE) {
        return { error: `La clave debe tener entre ${MIN_CLAVE} y ${MAX_CLAVE} caracteres` };
    }
    return { nombre: nombre.trim(), email: correo, clave };
}

/** Revisa los datos de un inicio de sesión: { email, clave } o { error }. */
export function validarLogin(cuerpo) {
    const { email, clave } = cuerpo || {};
    const correo = limpiarEmail(email);
    if (!correo || typeof clave !== 'string' || !clave) return { error: 'Escribe tu email y tu clave' };
    return { email: correo, clave };
}
