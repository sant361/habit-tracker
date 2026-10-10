import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { SECRETO } from '../middleware/auth.js';

const router = Router();

const firmar = (usuario) => jwt.sign({ id: usuario.id }, SECRETO, { expiresIn: '7d' });
const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });

router.post('/registro', (req, res) => {
    const { nombre, email, clave } = req.body || {};
    if (!nombre || !email || !clave || clave.length < 6) {
        return res.status(400).json({ error: 'Nombre, email y clave (mínimo 6 caracteres) son obligatorios' });
    }
    const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase());
    if (existe) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const info = db
        .prepare('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)')
        .run(nombre.trim(), email.toLowerCase(), bcrypt.hashSync(clave, 10));
    const usuario = { id: info.lastInsertRowid, nombre: nombre.trim(), email: email.toLowerCase() };
    res.status(201).json({ token: firmar(usuario), usuario: publico(usuario) });
});

router.post('/login', (req, res) => {
    const { email, clave } = req.body || {};
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get((email || '').toLowerCase());
    if (!usuario || !bcrypt.compareSync(clave || '', usuario.clave_hash)) {
        return res.status(401).json({ error: 'Email o clave incorrectos' });
    }
    res.json({ token: firmar(usuario), usuario: publico(usuario) });
});

export default router;
