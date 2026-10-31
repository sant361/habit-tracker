// Limita cuántas veces se puede intentar algo en una ventana de tiempo (por ejemplo, por correo).
// Vive en la memoria del servidor: se reinicia al reiniciarlo, y basta para frenar adivinanzas.
export function crearLimitador({ max, ventanaMs }) {
    const intentos = new Map();

    return {
        /** Cuenta un intento y dice si todavía se permite (true) o ya se pasó del máximo (false). */
        intentar(clave, ahora = Date.now()) {
            if (intentos.size > 5000) {
                // Evita que la memoria crezca sin límite con claves inventadas
                for (const [k, lista] of intentos) if (lista.every((t) => ahora - t >= ventanaMs)) intentos.delete(k);
            }
            const recientes = (intentos.get(clave) || []).filter((t) => ahora - t < ventanaMs);
            if (recientes.length >= max) {
                intentos.set(clave, recientes);
                return false;
            }
            recientes.push(ahora);
            intentos.set(clave, recientes);
            return true;
        },
        reiniciar(clave) {
            intentos.delete(clave);
        }
    };
}
