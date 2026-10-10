import { Router } from 'express';
import db from '../db.js';
import { esFecha, hoyLocal } from '../utils/fechas.js';

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

router.get('/', (req, res) => {
    const filas = db
        .prepare('SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 0 ORDER BY id')
        .all(req.usuarioId);
    res.json(filas.map(aSalida));
});

router.post('/', (req, res) => {
    const error = validar(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, categoria, color, dias, peso, creadoEn } = req.body;
    const info = db
        .prepare(`INSERT INTO habitos (usuario_id, nombre, categoria, color, dias, peso, creado_en)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(
            req.usuarioId,
            nombre.trim(),
            categoria || null,
            color || '#38bdf8',
            JSON.stringify(dias),
            peso,
            esFecha(creadoEn || '') ? creadoEn : hoyLocal()
        );
    const creado = db.prepare('SELECT * FROM habitos WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(aSalida(creado));
});

router.put('/:id', (req, res) => {
    const error = validar(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, categoria, color, dias, peso } = req.body;
    const info = db
        .prepare(`UPDATE habitos SET nombre = ?, categoria = ?, color = ?, dias = ?, peso = ?
                  WHERE id = ? AND usuario_id = ? AND archivado = 0`)
        .run(nombre.trim(), categoria || null, color || '#38bdf8', JSON.stringify(dias), peso, req.params.id, req.usuarioId);
    if (!info.changes) return res.status(404).json({ error: 'Hábito no encontrado' });

    res.json(aSalida(db.prepare('SELECT * FROM habitos WHERE id = ?').get(req.params.id)));
});

// "Eliminar" archiva el hábito para no perder el historial
router.delete('/:id', (req, res) => {
    const info = db
        .prepare('UPDATE habitos SET archivado = 1 WHERE id = ? AND usuario_id = ?')
        .run(req.params.id, req.usuarioId);
    if (!info.changes) return res.status(404).json({ error: 'Hábito no encontrado' });
    res.status(204).end();
});

export default router;
