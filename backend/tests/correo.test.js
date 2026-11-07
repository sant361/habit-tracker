import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { correoConfigurado, ajustesDeEnv, construirMensaje, enviarCorreo } from '../src/servicios/correo.js';

test('correoConfigurado pide el usuario y la clave de aplicación', () => {
    assert.equal(correoConfigurado({}), false);
    assert.equal(correoConfigurado({ GMAIL_USER: 'a@gmail.com' }), false);
    assert.equal(correoConfigurado({ GMAIL_USER: 'a@gmail.com', GMAIL_APP_PASSWORD: 'x' }), true);
});

test('ajustesDeEnv usa Gmail por defecto y quita los espacios de la clave', () => {
    const a = ajustesDeEnv({ GMAIL_USER: 'a@gmail.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' });
    assert.deepEqual(a, { usuario: 'a@gmail.com', clave: 'abcdefghijklmnop', host: 'smtp.gmail.com', puerto: 465, seguro: true });
    const b = ajustesDeEnv({ GMAIL_USER: 'a', GMAIL_APP_PASSWORD: 'b', SMTP_HOST: 'h', SMTP_PORT: '587' });
    assert.equal(b.seguro, false);
    assert.equal(b.puerto, 587);
});

test('construirMensaje codifica el asunto y el cuerpo en UTF-8', () => {
    const m = construirMensaje({ de: 'a@gmail.com', para: 'b@x.com', asunto: 'Clave ñ', texto: 'Hola ñandú\nsegunda línea', fecha: new Date('2026-11-06T12:00:00Z') });
    assert.match(m, /^From: "Habit Tracker" <a@gmail\.com>\r\nTo: <b@x\.com>\r\n/);
    assert.ok(m.includes(`Subject: =?UTF-8?B?${Buffer.from('Clave ñ').toString('base64')}?=`));
    const cuerpo = m.split('\r\n\r\n')[1];
    assert.equal(Buffer.from(cuerpo.replace(/\r\n/g, ''), 'base64').toString('utf8'), 'Hola ñandú\nsegunda línea');
});

// Servidor SMTP de mentira (sin cifrado) que guarda lo que recibe
function servidorFalso({ rechazarClave = false } = {}) {
    const recibido = { comandos: [], datos: '' };
    const servidor = net.createServer((socket) => {
        let modoDatos = false;
        let buffer = '';
        socket.write('220 listo\r\n');
        socket.on('data', (d) => {
            buffer += d.toString('utf8');
            let i;
            while (modoDatos ? buffer.includes('\r\n.\r\n') : (i = buffer.indexOf('\r\n')) >= 0) {
                if (modoDatos) {
                    const fin = buffer.indexOf('\r\n.\r\n');
                    recibido.datos = buffer.slice(0, fin);
                    buffer = buffer.slice(fin + 5);
                    modoDatos = false;
                    socket.write('250 recibido\r\n');
                    continue;
                }
                const linea = buffer.slice(0, i);
                buffer = buffer.slice(i + 2);
                recibido.comandos.push(linea);
                if (linea.startsWith('EHLO')) socket.write('250-hola\r\n250 AUTH PLAIN\r\n');
                else if (linea.startsWith('AUTH')) socket.write(rechazarClave ? '535 clave mala\r\n' : '235 ok\r\n');
                else if (linea.startsWith('MAIL') || linea.startsWith('RCPT')) socket.write('250 ok\r\n');
                else if (linea === 'DATA') {
                    socket.write('354 sigue\r\n');
                    modoDatos = true;
                } else if (linea === 'QUIT') socket.end('221 chao\r\n');
            }
        });
    });
    return new Promise((resolver) => servidor.listen(0, '127.0.0.1', () => resolver({ servidor, recibido, puerto: servidor.address().port })));
}

test('enviarCorreo sigue el diálogo SMTP completo', async () => {
    const { servidor, recibido, puerto } = await servidorFalso();
    try {
        const ajustes = { usuario: 'yo@gmail.com', clave: 'secreta', host: '127.0.0.1', puerto, seguro: false };
        await enviarCorreo({ para: 'ana@x.com', asunto: 'Hola', texto: 'Cuerpo' }, ajustes, 3000);
        assert.deepEqual(recibido.comandos.slice(0, 2), ['EHLO habit-tracker', 'AUTH PLAIN ' + Buffer.from('\0yo@gmail.com\0secreta').toString('base64')]);
        assert.ok(recibido.comandos.includes('MAIL FROM:<yo@gmail.com>'));
        assert.ok(recibido.comandos.includes('RCPT TO:<ana@x.com>'));
        assert.match(recibido.datos, /^From: "Habit Tracker" <yo@gmail\.com>/);
        assert.match(recibido.datos, /To: <ana@x\.com>/);
    } finally {
        servidor.close();
    }
});

test('enviarCorreo falla con un mensaje claro si el servidor rechaza la clave', async () => {
    const { servidor, puerto } = await servidorFalso({ rechazarClave: true });
    try {
        const ajustes = { usuario: 'yo@gmail.com', clave: 'mala', host: '127.0.0.1', puerto, seguro: false };
        await assert.rejects(() => enviarCorreo({ para: 'ana@x.com', asunto: 'Hola', texto: 'x' }, ajustes, 3000), /respondió 535/);
    } finally {
        servidor.close();
    }
});

test('enviarCorreo falla si no hay servidor', async () => {
    const ajustes = { usuario: 'a', clave: 'b', host: '127.0.0.1', puerto: 1, seguro: false };
    await assert.rejects(() => enviarCorreo({ para: 'a@x.com', asunto: 'x', texto: 'y' }, ajustes, 1000));
});
