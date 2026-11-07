import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { SECRETO, requerirAuth } from '../middleware/auth.js';
import { asincrono } from '../utils/asincrono.js';
import { crearLimitador } from '../utils/limitador.js';
import { generarCodigo, normalizarCodigo } from '../servicios/recuperacion.js';
import { validarRegistro, validarLogin, limpiarEmail, MAX_NOMBRE, MIN_CLAVE, MAX_CLAVE } from '../servicios/cuentas.js';
import { esCorreoAdmin } from '../utils/admin.js';
import { construirRespaldo } from '../servicios/respaldo.js';
import { importarRespaldo } from '../servicios/importacion.js';
import { correoConfigurado, enviarCorreo } from '../servicios/correo.js';
import { crearToken, huella, tokenValido, vigente, urlBase, enlaceDe, mensajeRestablecer } from '../servicios/enlaceClave.js';

const router = Router();

const firmar = (usuario) => jwt.sign({ id: usuario.id }, SECRETO, { expiresIn: '7d' });
const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, esAdmin: esCorreoAdmin(u.email) });

// Máximo de intentos de inicio de sesión por correo cada 15 minutos (frena adivinar claves).
// Al entrar bien se reinicia la cuenta, así que usar la app normalmente nunca llega al límite.
const limiteLogin = crearLimitador({ max: 10, ventanaMs: 15 * 60 * 1000 });

router.post('/registro', asincrono(async (req, res) => {
    const datos = validarRegistro(req.body);
    if (datos.error) return res.status(400).json({ error: datos.error });

    const existe = await db.uno('SELECT id FROM usuarios WHERE email = ?', [datos.email]);
    if (existe) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const id = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', [
        datos.nombre,
        datos.email,
        bcrypt.hashSync(datos.clave, 10)
    ]);
    const usuario = { id, nombre: datos.nombre, email: datos.email };
    res.status(201).json({ token: firmar(usuario), usuario: publico(usuario) });
}));

router.post('/login', asincrono(async (req, res) => {
    const datos = validarLogin(req.body);
    if (datos.error) return res.status(400).json({ error: datos.error });

    if (!limiteLogin.intentar(datos.email)) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo' });
    }

    const usuario = await db.uno('SELECT * FROM usuarios WHERE email = ?', [datos.email]);
    if (!usuario || !bcrypt.compareSync(datos.clave, usuario.clave_hash)) {
        return res.status(401).json({ error: 'Email o clave incorrectos' });
    }
    limiteLogin.reiniciar(datos.email);
    res.json({ token: firmar(usuario), usuario: publico(usuario) });
}));

// Datos de la cuenta con la sesión iniciada (incluye si es administrador)
router.get('/yo', requerirAuth, asincrono(async (req, res) => {
    const usuario = await db.uno('SELECT id, nombre, email FROM usuarios WHERE id = ?', [req.usuarioId]);
    res.json({ usuario: publico(usuario) });
}));

// Máximo de intentos de recuperación por correo cada 15 minutos (frena adivinar códigos)
const limiteRecuperar = crearLimitador({ max: 5, ventanaMs: 15 * 60 * 1000 });

// Máximo de correos de recuperación: 3 por cuenta cada 15 minutos y 30 en total por hora (cuida la cuota de Gmail)
const limiteCorreoCuenta = crearLimitador({ max: 3, ventanaMs: 15 * 60 * 1000 });
const limiteCorreoTotal = crearLimitador({ max: 30, ventanaMs: 60 * 60 * 1000 });

// Le dice a la pantalla si se puede ofrecer "recuperar por correo"
router.get('/correo-activo', (req, res) => {
    res.json({ activo: correoConfigurado() });
});

// Envía un enlace para restablecer la clave. Responde igual exista o no el correo,
// así nadie puede averiguar qué correos están registrados.
router.post('/olvide', asincrono(async (req, res) => {
    const correo = limpiarEmail((req.body || {}).email);
    if (!correo) return res.status(400).json({ error: 'Escribe tu correo' });
    if (!correoConfigurado()) {
        return res.status(503).json({ error: 'La recuperación por correo no está disponible. Usa tu código de recuperación.' });
    }
    if (!limiteCorreoCuenta.intentar(correo) || !limiteCorreoTotal.intentar('total')) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo' });
    }

    const usuario = await db.uno('SELECT id, nombre, email FROM usuarios WHERE email = ?', [correo]);
    if (usuario) {
        const { token, hash, expira } = crearToken();
        await db.ejecutar('UPDATE usuarios SET reset_hash = ?, reset_expira = ? WHERE id = ?', [hash, expira, usuario.id]);
        const enlace = enlaceDe(urlBase(process.env, req.headers), token);
        const { asunto, texto } = mensajeRestablecer({ nombre: usuario.nombre, enlace });
        // Sin esperar: la respuesta tarda lo mismo exista o no la cuenta. Si falla, queda en el registro del servidor.
        enviarCorreo({ para: usuario.email, asunto, texto }).catch((err) => console.error('No se pudo enviar el correo de recuperación:', err.message));
    }
    res.json({ ok: true });
}));

// Cambia la clave con el token que llegó por correo. Sirve una sola vez y vence a los 30 minutos.
router.post('/restablecer', asincrono(async (req, res) => {
    const { token, claveNueva } = req.body || {};
    if (!tokenValido(token)) return res.status(400).json({ error: 'El enlace no es válido o ya venció' });
    if (typeof claveNueva !== 'string' || claveNueva.length < MIN_CLAVE || claveNueva.length > MAX_CLAVE) {
        return res.status(400).json({ error: `La clave nueva debe tener entre ${MIN_CLAVE} y ${MAX_CLAVE} caracteres` });
    }
    const usuario = await db.uno('SELECT id, email, reset_expira FROM usuarios WHERE reset_hash = ?', [huella(token)]);
    if (!usuario || !vigente(usuario.reset_expira)) {
        return res.status(400).json({ error: 'El enlace no es válido o ya venció' });
    }
    await db.ejecutar('UPDATE usuarios SET clave_hash = ?, reset_hash = NULL, reset_expira = NULL WHERE id = ?', [bcrypt.hashSync(claveNueva, 10), usuario.id]);
    limiteLogin.reiniciar(usuario.email); // si estaba bloqueado por intentos fallidos, ya puede entrar
    res.json({ ok: true });
}));

// Cambia el nombre que se muestra en la app
router.put('/perfil', requerirAuth, asincrono(async (req, res) => {
    const nombre = typeof (req.body || {}).nombre === 'string' ? req.body.nombre.trim() : '';
    if (!nombre || nombre.length > MAX_NOMBRE) {
        return res.status(400).json({ error: `El nombre es obligatorio (máximo ${MAX_NOMBRE} caracteres)` });
    }
    await db.ejecutar('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, req.usuarioId]);
    const usuario = await db.uno('SELECT id, nombre, email FROM usuarios WHERE id = ?', [req.usuarioId]);
    res.json({ usuario: publico(usuario) });
}));

// Cambia la clave: exige la actual para que nadie con una sesión abierta pueda cambiarla
router.put('/clave', requerirAuth, asincrono(async (req, res) => {
    const { claveActual, claveNueva } = req.body || {};
    if (typeof claveActual !== 'string' || typeof claveNueva !== 'string') {
        return res.status(400).json({ error: 'Escribe tu clave actual y la nueva' });
    }
    if (claveNueva.length < MIN_CLAVE || claveNueva.length > MAX_CLAVE) {
        return res.status(400).json({ error: `La clave nueva debe tener entre ${MIN_CLAVE} y ${MAX_CLAVE} caracteres` });
    }
    const usuario = await db.uno('SELECT clave_hash FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (!bcrypt.compareSync(claveActual, usuario.clave_hash)) {
        return res.status(403).json({ error: 'La clave actual no es correcta' });
    }
    if (claveActual === claveNueva) {
        return res.status(400).json({ error: 'La clave nueva debe ser distinta a la actual' });
    }
    await db.ejecutar('UPDATE usuarios SET clave_hash = ?, reset_hash = NULL, reset_expira = NULL WHERE id = ?', [bcrypt.hashSync(claveNueva, 10), req.usuarioId]);
    res.json({ ok: true });
}));

// Descarga todos los datos de la persona (hábitos, pausas, registros y notas) como JSON
router.get('/respaldo', requerirAuth, asincrono(async (req, res) => {
    const respaldo = await construirRespaldo(req.usuarioId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="habit-tracker_respaldo.json"');
    res.send(JSON.stringify(respaldo, null, 2));
}));

// Agrega los hábitos de un respaldo descargado antes. Los que ya existen (mismo nombre) se omiten.
router.post('/respaldo/importar', requerirAuth, asincrono(async (req, res) => {
    const resultado = await importarRespaldo(req.usuarioId, req.body);
    if (resultado.error) return res.status(resultado.estado).json({ error: resultado.error });
    res.json(resultado);
}));

// Elimina la cuenta con todos sus hábitos y registros (se borran en cascada)
router.post('/cuenta/eliminar', requerirAuth, asincrono(async (req, res) => {
    const { clave } = req.body || {};
    const usuario = await db.uno('SELECT clave_hash FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (typeof clave !== 'string' || !bcrypt.compareSync(clave, usuario.clave_hash)) {
        return res.status(403).json({ error: 'La clave no es correcta' });
    }
    await db.ejecutar('DELETE FROM usuarios WHERE id = ?', [req.usuarioId]);
    res.status(204).end();
}));

// Genera un código de recuperación nuevo (reemplaza al anterior). Se muestra una sola vez:
// en la base solo queda su huella (hash), así que no se puede volver a consultar.
router.post('/codigo-recuperacion', requerirAuth, asincrono(async (req, res) => {
    const { clave } = req.body || {};
    const usuario = await db.uno('SELECT clave_hash FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (typeof clave !== 'string' || !bcrypt.compareSync(clave, usuario.clave_hash)) {
        return res.status(403).json({ error: 'La clave no es correcta' });
    }
    const codigo = generarCodigo();
    await db.ejecutar('UPDATE usuarios SET codigo_hash = ? WHERE id = ?', [bcrypt.hashSync(normalizarCodigo(codigo), 10), req.usuarioId]);
    res.json({ codigo });
}));

// Cambia la clave de quien la olvidó, con el correo y el código de recuperación.
// El código sirve una sola vez: al usarlo hay que generar otro desde el perfil.
router.post('/recuperar', asincrono(async (req, res) => {
    const { email, codigo, claveNueva } = req.body || {};
    if (typeof email !== 'string' || typeof codigo !== 'string' || typeof claveNueva !== 'string') {
        return res.status(400).json({ error: 'Correo, código y clave nueva son obligatorios' });
    }
    if (claveNueva.length < MIN_CLAVE || claveNueva.length > MAX_CLAVE) {
        return res.status(400).json({ error: `La clave nueva debe tener entre ${MIN_CLAVE} y ${MAX_CLAVE} caracteres` });
    }

    const correo = limpiarEmail(email);
    if (!limiteRecuperar.intentar(correo)) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo' });
    }

    const usuario = await db.uno('SELECT id, codigo_hash FROM usuarios WHERE email = ?', [correo]);
    const valido = usuario && usuario.codigo_hash && bcrypt.compareSync(normalizarCodigo(codigo), usuario.codigo_hash);
    // El mismo mensaje para "no existe" y "código malo": no revela qué correos están registrados
    if (!valido) return res.status(403).json({ error: 'Correo o código incorrecto' });

    await db.ejecutar('UPDATE usuarios SET clave_hash = ?, codigo_hash = NULL, reset_hash = NULL, reset_expira = NULL WHERE id = ?', [bcrypt.hashSync(claveNueva, 10), usuario.id]);
    limiteRecuperar.reiniciar(correo);
    res.json({ ok: true });
}));

export default router;
