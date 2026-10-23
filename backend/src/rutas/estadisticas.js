import { Router } from 'express';
import { construirMatriz } from '../servicios/matriz.js';
import { esFecha, hoyLocal, sumarDias, rangoDias } from '../utils/fechas.js';

const router = Router();
const MAX_DIAS = 366;

// GET /api/estadisticas/matriz?desde=2026-09-10&hasta=2026-10-09&hoy=2026-10-09&categoria=Salud
// El parámetro categoria es opcional: si no viene, se incluyen todos los hábitos.
router.get('/matriz', (req, res) => {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    const hasta = esFecha(req.query.hasta || '') ? req.query.hasta : hoy;
    const desde = esFecha(req.query.desde || '') ? req.query.desde : sumarDias(hasta, -29);

    if (desde > hasta || rangoDias(desde, hasta).length > MAX_DIAS) {
        return res.status(400).json({ error: `Rango inválido (máximo ${MAX_DIAS} días)` });
    }
    const categoria = typeof req.query.categoria === 'string' && req.query.categoria !== '' ? req.query.categoria : null;
    res.json(construirMatriz(req.usuarioId, desde, hasta, hoy, categoria));
});

// GET /api/estadisticas/resumen?hoy=2026-10-09 -> cumplimiento de 7 y 30 días
router.get('/resumen', (req, res) => {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    const semana = construirMatriz(req.usuarioId, sumarDias(hoy, -6), hoy, hoy);
    const mes = construirMatriz(req.usuarioId, sumarDias(hoy, -29), hoy, hoy);
    res.json({ semana: semana.tasaGlobal, mes: mes.tasaGlobal });
});

export default router;
