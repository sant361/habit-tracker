import { Router } from 'express';
import db from '../db.js';
import { esFecha } from '../utils/fechas.js';

const router = Router();

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

export default router;
