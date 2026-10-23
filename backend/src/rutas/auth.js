import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { SECRETO, requerirAuth } from '../middleware/auth.js';
import { asincrono } from '../utils/asincrono.js';

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

export default router;
