/**
 * Dice si un correo es de administrador. Los administradores se definen con la variable de
 * entorno ADMIN_EMAIL (uno o varios correos separados por comas). Sin esa variable no hay admin.
 */
export function esCorreoAdmin(email, lista = process.env.ADMIN_EMAIL) {
    if (typeof email !== 'string' || typeof lista !== 'string') return false;
    const buscado = email.trim().toLowerCase();
    if (!buscado) return false;
    return lista.split(',').some((c) => c.trim().toLowerCase() === buscado);
}
