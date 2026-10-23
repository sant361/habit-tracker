import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { SECRETO } from '../middleware/auth.js';
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

export default router;
