import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { SECRETO, requerirAuth } from '../middleware/auth.js';
import { asincrono } from '../utils/asincrono.js';
import { crearLimitador } from '../utils/limitador.js';
import { generarCodigo, normalizarCodigo } from '../servicios/recuperacion.js';
import { construirRespaldo } from '../servicios/respaldo.js';

const router = Router();

const firmar = (usuario) => jwt.sign({ id: usuario.id }, SECRETO, { expiresIn: '7d' });
const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });

router.post('/registro', asincrono(async (req, res) => {
    const { nombre, email, clave } = req.body || {};
    if (!nombre || !email || !clave || clave.length < 6) {
        return res.status(400).json({ error: 'Nombre, email y clave (mínimo 6 caracteres) son obligatorios' });
    }
    const existe = await db.uno('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase()]);
    if (existe) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const id = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', [
        nombre.trim(),
        email.toLowerCase(),
        bcrypt.hashSync(clave, 10)
    ]);
    const usuario = { id, nombre: nombre.trim(), email: email.toLowerCase() };
    res.status(201).json({ token: firmar(usuario), usuario: publico(usuario) });
}));

router.post('/login', asincrono(async (req, res) => {
    const { email, clave } = req.body || {};
    const usuario = await db.uno('SELECT * FROM usuarios WHERE email = ?', [(email || '').toLowerCase()]);
    if (!usuario || !bcrypt.compareSync(clave || '', usuario.clave_hash)) {
        return res.status(401).json({ error: 'Email o clave incorrectos' });
    }
    res.json({ token: firmar(usuario), usuario: publico(usuario) });
}));

const MAX_NOMBRE = 60;
const MIN_CLAVE = 6;
const MAX_CLAVE = 72; // bcrypt solo considera los primeros 72 caracteres

// Máximo de intentos de recuperación por correo cada 15 minutos (frena adivinar códigos)
const limiteRecuperar = crearLimitador({ max: 5, ventanaMs: 15 * 60 * 1000 });

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
    await db.ejecutar('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [bcrypt.hashSync(claveNueva, 10), req.usuarioId]);
    res.json({ ok: true });
}));

// Descarga todos los datos de la persona (hábitos, pausas, registros y notas) como JSON
router.get('/respaldo', requerirAuth, asincrono(async (req, res) => {
    const respaldo = await construirRespaldo(req.usuarioId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="habit-tracker_respaldo.json"');
    res.send(JSON.stringify(respaldo, null, 2));
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

    const correo = email.trim().toLowerCase();
    if (!limiteRecuperar.intentar(correo)) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo' });
    }

    const usuario = await db.uno('SELECT id, codigo_hash FROM usuarios WHERE email = ?', [correo]);
    const valido = usuario && usuario.codigo_hash && bcrypt.compareSync(normalizarCodigo(codigo), usuario.codigo_hash);
    // El mismo mensaje para "no existe" y "código malo": no revela qué correos están registrados
    if (!valido) return res.status(403).json({ error: 'Correo o código incorrecto' });

    await db.ejecutar('UPDATE usuarios SET clave_hash = ?, codigo_hash = NULL WHERE id = ?', [bcrypt.hashSync(claveNueva, 10), usuario.id]);
    limiteRecuperar.reiniciar(correo);
    res.json({ ok: true });
}));

export default router;
