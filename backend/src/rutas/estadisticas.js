import { Router } from 'express';
import { construirMatriz } from '../servicios/matriz.js';
import { logrosDeUsuario } from '../servicios/logrosUsuario.js';
import { matrizACsv } from '../servicios/csv.js';
import { asincrono } from '../utils/asincrono.js';
import { esFecha, hoyLocal, sumarDias, rangoDias } from '../utils/fechas.js';

const router = Router();
const MAX_DIAS = 366;

// Lee y valida los parámetros comunes de la matriz y de su exportación.
function leerParametros(req) {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    const hasta = esFecha(req.query.hasta || '') ? req.query.hasta : hoy;
    const desde = esFecha(req.query.desde || '') ? req.query.desde : sumarDias(hasta, -29);

    if (desde > hasta || rangoDias(desde, hasta).length > MAX_DIAS) {
        return { error: `Rango inválido (máximo ${MAX_DIAS} días)` };
    }
    const categoria = typeof req.query.categoria === 'string' && req.query.categoria !== '' ? req.query.categoria : null;
    return { hoy, hasta, desde, categoria };
}

// GET /api/estadisticas/matriz?desde=2026-09-10&hasta=2026-10-09&hoy=2026-10-09&categoria=Salud
// El parámetro categoria es opcional: si no viene, se incluyen todos los hábitos.
router.get('/matriz', asincrono(async (req, res) => {
    const p = leerParametros(req);
    if (p.error) return res.status(400).json({ error: p.error });
    res.json(await construirMatriz(req.usuarioId, p.desde, p.hasta, p.hoy, p.categoria));
}));

// GET /api/estadisticas/exportar?desde=...&hasta=...&categoria=... -> descarga la matriz como CSV
router.get('/exportar', asincrono(async (req, res) => {
    const p = leerParametros(req);
    if (p.error) return res.status(400).json({ error: p.error });

    const matriz = await construirMatriz(req.usuarioId, p.desde, p.hasta, p.hoy, p.categoria);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="habit-tracker_${p.desde}_a_${p.hasta}.csv"`);
    // El BOM (\uFEFF) hace que Excel reconozca las tildes y las ñ
    res.send('\uFEFF' + matrizACsv(matriz));
}));

// GET /api/estadisticas/resumen?hoy=2026-10-09 -> cumplimiento de 7 y 30 días
router.get('/resumen', asincrono(async (req, res) => {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    const semana = await construirMatriz(req.usuarioId, sumarDias(hoy, -6), hoy, hoy);
    const mes = await construirMatriz(req.usuarioId, sumarDias(hoy, -29), hoy, hoy);
    res.json({ semana: semana.tasaGlobal, mes: mes.tasaGlobal });
}));

// GET /api/estadisticas/logros?hoy=2026-10-09 -> logros con su avance, según todo el historial
router.get('/logros', asincrono(async (req, res) => {
    const hoy = esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal();
    res.json(await logrosDeUsuario(req.usuarioId, hoy));
}));

export default router;
