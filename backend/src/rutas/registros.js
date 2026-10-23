import { Router } from 'express';
import db from '../db.js';
import { esFecha } from '../utils/fechas.js';

const router = Router();
const MAX_NOTA = 280;

// Marca o desmarca un hábito en una fecha
router.post('/alternar', (req, res) => {
    const { habitoId, fecha } = req.body || {};
    if (!habitoId || !esFecha(fecha || '')) {
        return res.status(400).json({ error: 'habitoId y fecha (YYYY-MM-DD) son obligatorios' });
    }

    const habito = db
        .prepare('SELECT id FROM habitos WHERE id = ? AND usuario_id = ? AND archivado = 0')
        .get(habitoId, req.usuarioId);
    if (!habito) return res.status(404).json({ error: 'Hábito no encontrado' });

    const existente = db.prepare('SELECT id FROM registros WHERE habito_id = ? AND fecha = ?').get(habitoId, fecha);
    if (existente) {
        db.prepare('DELETE FROM registros WHERE id = ?').run(existente.id);
        return res.json({ hecho: false });
    }
    db.prepare('INSERT INTO registros (habito_id, fecha) VALUES (?, ?)').run(habitoId, fecha);
    res.json({ hecho: true });
});

// Guarda la nota de un hábito ya marcado en una fecha (si viene vacía, la borra)
router.put('/nota', (req, res) => {
    const { habitoId, fecha, nota } = req.body || {};
    const notaValida = nota === undefined || nota === null || typeof nota === 'string';
    if (!habitoId || !esFecha(fecha || '') || !notaValida) {
        return res.status(400).json({ error: 'habitoId, fecha (YYYY-MM-DD) y nota (texto) son obligatorios' });
    }
    const texto = (nota || '').trim();
    if (texto.length > MAX_NOTA) {
        return res.status(400).json({ error: `La nota no puede pasar de ${MAX_NOTA} caracteres` });
    }

    const info = db
        .prepare(`UPDATE registros SET nota = ?
                  WHERE fecha = ? AND habito_id = ?
                    AND habito_id IN (SELECT id FROM habitos WHERE usuario_id = ? AND archivado = 0)`)
        .run(texto || null, fecha, habitoId, req.usuarioId);
    if (!info.changes) {
        return res.status(404).json({ error: 'Primero marca el hábito en esa fecha para añadir una nota' });
    }
    res.json({ nota: texto || null });
});

export default router;
