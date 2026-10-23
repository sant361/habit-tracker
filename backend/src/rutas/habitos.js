import { Router } from 'express';
import db from '../db.js';
import { esFecha, hoyLocal } from '../utils/fechas.js';
import { asincrono } from '../utils/asincrono.js';

const router = Router();

const aSalida = (h) => ({
    id: h.id,
    nombre: h.nombre,
    categoria: h.categoria,
    color: h.color,
    dias: JSON.parse(h.dias),
    peso: h.peso,
    creadoEn: h.creado_en
});

function validar(body) {
    const { nombre, dias, peso } = body || {};
    if (!nombre || !nombre.trim()) return 'El nombre es obligatorio';
    if (!Array.isArray(dias) || !dias.length || dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
        return 'Elige al menos un día de la semana (0-6)';
    }
    if (!Number.isInteger(peso) || peso < 1 || peso > 5) return 'El peso debe estar entre 1 y 5';
    return null;
}

// El id de la URL debe ser un entero; si no, el hábito simplemente no existe
const leerId = (valor) => (/^\d+$/.test(valor) ? Number(valor) : null);

router.get('/', asincrono(async (req, res) => {
    const filas = await db.todos('SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 0 ORDER BY id', [req.usuarioId]);
    res.json(filas.map(aSalida));
}));

router.post('/', asincrono(async (req, res) => {
    const error = validar(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, categoria, color, dias, peso, creadoEn } = req.body;
    const id = await db.insertar(
        `INSERT INTO habitos (usuario_id, nombre, categoria, color, dias, peso, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            req.usuarioId,
            nombre.trim(),
            categoria || null,
            color || '#38bdf8',
            JSON.stringify(dias),
            peso,
            esFecha(creadoEn || '') ? creadoEn : hoyLocal()
        ]
    );
    const creado = await db.uno('SELECT * FROM habitos WHERE id = ?', [id]);
    res.status(201).json(aSalida(creado));
}));

router.put('/:id', asincrono(async (req, res) => {
    const error = validar(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, categoria, color, dias, peso } = req.body;
    const id = leerId(req.params.id);
    const info = id === null ? { cambios: 0 } : await db.ejecutar(
        `UPDATE habitos SET nombre = ?, categoria = ?, color = ?, dias = ?, peso = ?
         WHERE id = ? AND usuario_id = ? AND archivado = 0`,
        [nombre.trim(), categoria || null, color || '#38bdf8', JSON.stringify(dias), peso, id, req.usuarioId]
    );
    if (!info.cambios) return res.status(404).json({ error: 'Hábito no encontrado' });

    res.json(aSalida(await db.uno('SELECT * FROM habitos WHERE id = ?', [id])));
}));

// "Eliminar" archiva el hábito para no perder el historial
router.delete('/:id', asincrono(async (req, res) => {
    const id = leerId(req.params.id);
    const info = id === null ? { cambios: 0 } : await db.ejecutar(
        'UPDATE habitos SET archivado = 1 WHERE id = ? AND usuario_id = ?',
        [id, req.usuarioId]
    );
    if (!info.cambios) return res.status(404).json({ error: 'Hábito no encontrado' });
    res.status(204).end();
}));

export default router;
