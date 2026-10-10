import jwt from 'jsonwebtoken';
import db from '../db.js';

export const SECRETO = process.env.JWT_SECRET || 'cambia-este-secreto';

export function requerirAuth(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try {
        const { id } = jwt.verify(token, SECRETO);

        // El token puede ser válido pero apuntar a un usuario que ya no existe
        // (por ejemplo si se cambió o borró el archivo de la base de datos).
        const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
        if (!usuario) return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });

        req.usuarioId = usuario.id;
        next();
    } catch {
        res.status(401).json({ error: 'No autorizado' });
    }
}
