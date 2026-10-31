import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { asincrono } from '../utils/asincrono.js';
import { esFecha, hoyLocal } from '../utils/fechas.js';
import { resumenGeneral, listarUsuarios, eliminarUsuario, claveTemporal, puedeRestablecer } from '../servicios/admin.js';

const router = Router();

// El id de la URL debe ser un entero; si no, la cuenta simplemente no existe
const leerId = (valor) => (/^\d+$/.test(valor) ? Number(valor) : null);

// GET /api/admin/resumen?hoy=2026-10-31 -> cifras generales de la app
router.get('/resumen', asincrono(async (req, res) => {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    res.json(await resumenGeneral(hoy));
}));

// GET /api/admin/usuarios -> cuentas con sus cifras de uso
router.get('/usuarios', asincrono(async (_req, res) => {
    res.json(await listarUsuarios());
}));

// DELETE /api/admin/usuarios/:id -> elimina una cuenta (nunca la de un administrador)
router.delete('/usuarios/:id', asincrono(async (req, res) => {
    const id = leerId(req.params.id);
    const r = id === null ? { error: 'Usuario no encontrado', estado: 404 } : await eliminarUsuario(id);
    if (r.error) return res.status(r.estado).json({ error: r.error });
    res.status(204).end();
}));

// POST /api/admin/usuarios/:id/clave -> pone una clave temporal (se muestra una sola vez) para quien
// olvidó la suya y no tenía código de recuperación. La persona debe cambiarla al entrar.
router.post('/usuarios/:id/clave', asincrono(async (req, res) => {
    const id = leerId(req.params.id);
    const r = id === null ? { error: 'Usuario no encontrado', estado: 404 } : await puedeRestablecer(id);
    if (r.error) return res.status(r.estado).json({ error: r.error });

    const clave = claveTemporal();
    await db.ejecutar('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [bcrypt.hashSync(clave, 10), id]);
    res.json({ clave });
}));

export default router;
