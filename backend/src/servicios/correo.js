// Envío de correos por SMTP (Gmail por defecto) sin instalar paquetes: usa solo módulos de Node.
// Para Gmail hay que crear una "contraseña de aplicación" (la clave normal no sirve).
import tls from 'node:tls';
import net from 'node:net';
import { randomBytes } from 'node:crypto';

/** ¿Están las variables para enviar correos? (GMAIL_USER y GMAIL_APP_PASSWORD) */
export const correoConfigurado = (env = process.env) => Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);

/** Ajustes de conexión tomados del entorno. Las claves de aplicación de Google se muestran con espacios: se quitan. */
export function ajustesDeEnv(env = process.env) {
    const puerto = Number(env.SMTP_PORT) || 465;
    return {
        usuario: env.GMAIL_USER,
        clave: String(env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
        host: env.SMTP_HOST || 'smtp.gmail.com',
        puerto,
        seguro: env.SMTP_SEGURO ? env.SMTP_SEGURO !== 'false' : puerto === 465
    };
}

const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');

/** Mensaje completo (cabeceras + cuerpo en UTF-8 codificado en base64). */
export function construirMensaje({ de, para, asunto, texto, fecha = new Date() }) {
    const cuerpo = base64(texto).replace(/.{1,76}/g, '$&\r\n').trimEnd();
    return [
        `From: "Habit Tracker" <${de}>`,
        `To: <${para}>`,
        `Subject: =?UTF-8?B?${base64(asunto)}?=`,
        `Date: ${fecha.toUTCString()}`,
        `Message-ID: <${randomBytes(12).toString('hex')}@habit-tracker>`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        cuerpo
    ].join('\r\n');
}

// Lee las respuestas del servidor (una respuesta puede venir en varias líneas "250-..." y termina en "250 ...")
function crearLector(socket) {
    let buffer = '';
    let lineas = [];
    let fallo = null;
    const listas = [];
    let esperando = null;

    const entregar = () => {
        while (esperando && listas.length) {
            const { resolver } = esperando;
            esperando = null;
            resolver(listas.shift());
        }
        if (esperando && fallo) {
            const { rechazar } = esperando;
            esperando = null;
            rechazar(fallo);
        }
    };

    socket.on('data', (datos) => {
        buffer += datos.toString('utf8');
        let i;
        while ((i = buffer.indexOf('\r\n')) >= 0) {
            const linea = buffer.slice(0, i);
            buffer = buffer.slice(i + 2);
            lineas.push(linea);
            if (/^\d{3}( |$)/.test(linea)) {
                listas.push({ codigo: Number(linea.slice(0, 3)), texto: lineas.join('\n') });
                lineas = [];
            }
        }
        entregar();
    });
    const caer = (err) => {
        fallo = err || new Error('El servidor de correo cerró la conexión');
        entregar();
    };
    socket.on('error', caer);
    socket.on('close', () => caer());

    return {
        siguiente: () =>
            new Promise((resolver, rechazar) => {
                esperando = { resolver, rechazar };
                entregar();
            })
    };
}

function conectar({ host, puerto, seguro, timeoutMs }) {
    return new Promise((resolver, rechazar) => {
        const socket = seguro ? tls.connect({ host, port: puerto, servername: host }) : net.connect({ host, port: puerto });
        socket.setTimeout(timeoutMs, () => socket.destroy(new Error('Se agotó el tiempo esperando al servidor de correo')));
        socket.once('error', rechazar);
        socket.once(seguro ? 'secureConnect' : 'connect', () => {
            socket.removeListener('error', rechazar);
            resolver(socket);
        });
    });
}

/**
 * Envía un correo de texto. Lanza un Error si el servidor lo rechaza.
 * Los ajustes salen del entorno (ajustesDeEnv); se pueden reemplazar para probar.
 */
export async function enviarCorreo({ para, asunto, texto }, ajustes = ajustesDeEnv(), timeoutMs = 15000) {
    const socket = await conectar({ ...ajustes, timeoutMs });
    const lector = crearLector(socket);

    const paso = async (comando, esperados) => {
        if (comando !== null) socket.write(comando + '\r\n');
        const r = await lector.siguiente();
        if (!esperados.includes(r.codigo)) throw new Error(`El servidor de correo respondió ${r.codigo}`);
        return r;
    };

    try {
        await paso(null, [220]);
        await paso('EHLO habit-tracker', [250]);
        await paso('AUTH PLAIN ' + base64(`\0${ajustes.usuario}\0${ajustes.clave}`), [235]);
        await paso(`MAIL FROM:<${ajustes.usuario}>`, [250]);
        await paso(`RCPT TO:<${para}>`, [250, 251]);
        await paso('DATA', [354]);
        const mensaje = construirMensaje({ de: ajustes.usuario, para, asunto, texto }).replace(/^\./gm, '..');
        await paso(mensaje + '\r\n.', [250]);
        socket.write('QUIT\r\n');
    } finally {
        socket.end();
    }
}
