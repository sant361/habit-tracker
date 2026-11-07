// Enlace para restablecer la clave por correo (sin dependencias de terceros, para poder probarlo).
// En la base solo se guarda la huella (hash) del token: aunque alguien viera la base, no podría usar el enlace.
import { randomBytes, createHash } from 'node:crypto';

export const VIGENCIA_MIN = 30;
export const VIGENCIA_MS = VIGENCIA_MIN * 60 * 1000;
const FORMATO_TOKEN = /^[a-f0-9]{64}$/;

/** Huella del token (la que se guarda en la base). */
export const huella = (token) => createHash('sha256').update(String(token)).digest('hex');

/** Token nuevo: { token (va en el enlace), hash (se guarda), expira (fecha ISO) }. */
export function crearToken(ahora = Date.now()) {
    const token = randomBytes(32).toString('hex');
    return { token, hash: huella(token), expira: new Date(ahora + VIGENCIA_MS).toISOString() };
}

/** ¿El token tiene la forma correcta? Evita consultar la base con basura. */
export const tokenValido = (token) => typeof token === 'string' && FORMATO_TOKEN.test(token);

/** ¿Todavía no venció? */
export const vigente = (expira, ahora = Date.now()) => typeof expira === 'string' && Date.parse(expira) > ahora;

/**
 * Dirección base de la página: APP_URL si está definida; si no, la que usó quien hizo la petición.
 * Detrás del proxy de Render el protocolo llega en la cabecera x-forwarded-proto.
 */
export function urlBase(env, cabeceras = {}) {
    if (env.APP_URL) return env.APP_URL.trim().replace(/\/+$/, '');
    const proto = String(cabeceras['x-forwarded-proto'] || 'http').split(',')[0].trim();
    return `${proto}://${cabeceras.host || 'localhost'}`;
}

export const enlaceDe = (base, token) => `${base}/?restablecer=${token}`;

/** Asunto y texto del correo. */
export function mensajeRestablecer({ nombre, enlace }) {
    return {
        asunto: 'Restablece tu clave de Habit Tracker',
        texto: [
            `Hola ${nombre},`,
            '',
            'Recibimos una solicitud para cambiar la clave de tu cuenta. Entra a este enlace para elegir una nueva:',
            '',
            enlace,
            '',
            `El enlace sirve una sola vez y vence en ${VIGENCIA_MIN} minutos.`,
            'Si no fuiste tú, ignora este correo: tu clave actual sigue igual.'
        ].join('\n')
    };
}
