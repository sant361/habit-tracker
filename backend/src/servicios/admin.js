import { randomBytes } from 'node:crypto';
import db from '../db.js';
import { sumarDias } from '../utils/fechas.js';
import { esCorreoAdmin } from '../utils/admin.js';

const num = (v) => Number(v) || 0; // PostgreSQL devuelve los conteos como texto

/**
 * Cifras generales de la app. Solo números: nunca nombres de hábitos ni notas de nadie.
 * "activos" son las cuentas que marcaron algún hábito en los últimos 7 días.
 */
export async function resumenGeneral(hoy) {
    const desde = sumarDias(hoy, -6);
    const [usuarios, habitos, registros, activos] = await Promise.all([
        db.uno('SELECT COUNT(*) AS n FROM usuarios'),
        db.uno('SELECT COUNT(*) AS n FROM habitos WHERE archivado = 0'),
        db.uno('SELECT COUNT(*) AS n FROM registros'),
        db.uno(
            `SELECT COUNT(DISTINCT h.usuario_id) AS n FROM registros r
             JOIN habitos h ON h.id = r.habito_id WHERE r.fecha >= ?`,
            [desde]
        )
    ]);
    return { usuarios: num(usuarios.n), habitos: num(habitos.n), registros: num(registros.n), activos: num(activos.n) };
}

/** Todas las cuentas con sus cifras de uso (sin el contenido de sus hábitos), de la más antigua a la más nueva. */
export async function listarUsuarios() {
    const filas = await db.todos(
        `SELECT u.id, u.nombre, u.email,
            (SELECT COUNT(*) FROM habitos h WHERE h.usuario_id = u.id AND h.archivado = 0) AS habitos,
            (SELECT COUNT(*) FROM registros r JOIN habitos h ON h.id = r.habito_id WHERE h.usuario_id = u.id) AS registros,
            (SELECT MAX(r.fecha) FROM registros r JOIN habitos h ON h.id = r.habito_id WHERE h.usuario_id = u.id) AS ultima_actividad
         FROM usuarios u ORDER BY u.id`
    );
    return filas.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        habitos: num(u.habitos),
        registros: num(u.registros),
        ultimaActividad: u.ultima_actividad || null,
        esAdmin: esCorreoAdmin(u.email)
    }));
}

/** Busca una cuenta que un admin puede tocar: existe y no es de administrador. */
async function cuentaGestionable(id) {
    const usuario = await db.uno('SELECT id, email FROM usuarios WHERE id = ?', [id]);
    if (!usuario) return { error: 'Usuario no encontrado', estado: 404 };
    if (esCorreoAdmin(usuario.email)) return { error: 'No se puede hacer esto con una cuenta de administrador', estado: 403 };
    return { usuario };
}

/** Elimina una cuenta y todos sus datos (se borran en cascada). */
export async function eliminarUsuario(id) {
    const r = await cuentaGestionable(id);
    if (r.error) return r;
    await db.ejecutar('DELETE FROM usuarios WHERE id = ?', [id]);
    return { ok: true };
}

// Sin 0/O ni 1/l/I para que se pueda dictar o copiar sin confundir letras
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Clave temporal aleatoria de 10 caracteres. */
export function claveTemporal() {
    return Array.from(randomBytes(10), (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** Comprueba que se puede restablecer la clave de esa cuenta; devuelve { usuario } o { error, estado }. */
export const puedeRestablecer = cuentaGestionable;
