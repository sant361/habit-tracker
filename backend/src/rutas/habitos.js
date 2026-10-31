import { Router } from 'express';
import db from '../db.js';
import { esFecha, hoyLocal } from '../utils/fechas.js';
import { asincrono } from '../utils/asincrono.js';
import { pausasPorHabito, pausar, reanudar } from '../servicios/pausas.js';
import { pausaVigente } from '../utils/pausas.js';
import { guardarOrden } from '../servicios/orden.js';

const router = Router();

const aSalida = (h, pausa = null) => ({
    id: h.id,
    nombre: h.nombre,
    categoria: h.categoria,
    color: h.color,
    dias: JSON.parse(h.dias),
    peso: h.peso,
    creadoEn: h.creado_en,
    pausa // { desde, hasta, activa } o null
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

// Fecha de "hoy" que manda el navegador (así coincide con la zona horaria de la persona)
const leerHoy = (req) => (esFecha(req.query.hoy || '') ? req.query.hoy : hoyLocal());

router.get('/', asincrono(async (req, res) => {
    const hoy = leerHoy(req);
    const filas = await db.todos('SELECT * FROM habitos WHERE usuario_id = ? AND archivado = 0 ORDER BY orden, id', [req.usuarioId]);
    const pausas = await pausasPorHabito(req.usuarioId);
    res.json(filas.map((h) => aSalida(h, pausaVigente(pausas.get(h.id) || [], hoy))));
}));

router.post('/', asincrono(async (req, res) => {
    const error = validar(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, categoria, color, dias, peso, creadoEn } = req.body;
    // Un hábito nuevo va al final de la lista
    const { ultimo } = await db.uno('SELECT COALESCE(MAX(orden), 0) AS ultimo FROM habitos WHERE usuario_id = ?', [req.usuarioId]);
    const id = await db.insertar(
        `INSERT INTO habitos (usuario_id, nombre, categoria, color, dias, peso, creado_en, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.usuarioId,
            nombre.trim(),
            categoria || null,
            color || '#38bdf8',
            JSON.stringify(dias),
            peso,
            esFecha(creadoEn || '') ? creadoEn : hoyLocal(),
            Number(ultimo) + 1
        ]
    );
    const creado = await db.uno('SELECT * FROM habitos WHERE id = ?', [id]);
    res.status(201).json(aSalida(creado));
}));

// Guarda el orden de los hábitos: { ids: [3, 1, 2] }, del primero al último.
// Va antes de /:id para que "orden" no se tome por un id.
router.put('/orden', asincrono(async (req, res) => {
    const resultado = await guardarOrden(req.usuarioId, (req.body || {}).ids);
    if (resultado.error) return res.status(resultado.estado).json({ error: resultado.error });
    res.json({ ok: true });
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

    const pausas = await pausasPorHabito(req.usuarioId);
    res.json(aSalida(await db.uno('SELECT * FROM habitos WHERE id = ?', [id]), pausaVigente(pausas.get(id) || [], leerHoy(req))));
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

// Busca un hábito de la persona que no esté archivado; devuelve su id o null
async function habitoPropio(req) {
    const id = leerId(req.params.id);
    if (id === null) return null;
    const habito = await db.uno('SELECT id FROM habitos WHERE id = ? AND usuario_id = ? AND archivado = 0', [id, req.usuarioId]);
    return habito ? habito.id : null;
}

// Pausa el hábito desde "desde" (por defecto hoy) hasta "hasta" (opcional: sin fecha, hasta que se reanude).
// Durante la pausa no cuenta para el porcentaje ni rompe la racha.
router.post('/:id/pausar', asincrono(async (req, res) => {
    const id = await habitoPropio(req);
    if (id === null) return res.status(404).json({ error: 'Hábito no encontrado' });

    const { desde: desdeBruto, hasta: hastaBruto } = req.body || {};
    const desde = desdeBruto === undefined || desdeBruto === null ? hoyLocal() : desdeBruto;
    const hasta = hastaBruto === undefined || hastaBruto === null || hastaBruto === '' ? null : hastaBruto;
    if (typeof desde !== 'string' || !esFecha(desde)) return res.status(400).json({ error: 'La fecha de inicio no es válida' });
    if (hasta !== null && (typeof hasta !== 'string' || !esFecha(hasta))) return res.status(400).json({ error: 'La fecha final no es válida' });
    if (hasta !== null && hasta < desde) return res.status(400).json({ error: 'La fecha final no puede ser anterior al inicio' });

    const resultado = await pausar(id, desde, hasta);
    if (resultado.error) return res.status(resultado.estado).json({ error: resultado.error });
    res.status(201).json({ ok: true });
}));

// Reanuda el hábito a partir de "fecha" (por defecto hoy)
router.post('/:id/reanudar', asincrono(async (req, res) => {
    const id = await habitoPropio(req);
    if (id === null) return res.status(404).json({ error: 'Hábito no encontrado' });

    const bruto = (req.body || {}).fecha;
    const fecha = bruto === undefined || bruto === null ? hoyLocal() : bruto;
    if (typeof fecha !== 'string' || !esFecha(fecha)) return res.status(400).json({ error: 'La fecha no es válida' });

    const resultado = await reanudar(id, fecha);
    if (resultado.error) return res.status(resultado.estado).json({ error: resultado.error });
    res.json({ ok: true });
}));

export default router;
