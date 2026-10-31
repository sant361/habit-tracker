import db from '../db.js';
import { esCorreoAdmin } from '../utils/admin.js';

// Va después de requerirAuth: deja pasar solo a las cuentas cuyo correo está en ADMIN_EMAIL.
export async function requerirAdmin(req, res, next) {
    try {
        const usuario = await db.uno('SELECT email FROM usuarios WHERE id = ?', [req.usuarioId]);
        if (!usuario || !esCorreoAdmin(usuario.email)) return res.status(403).json({ error: 'Solo para administradores' });
        next();
    } catch (error) {
        next(error);
    }
}
