import jwt from 'jsonwebtoken';
import db from '../db.js';

export const SECRETO = process.env.JWT_SECRET || 'cambia-este-secreto';

// Con el secreto por defecto cualquiera podría fabricar tokens: en producción no se permite.
if (process.env.NODE_ENV === 'production' && SECRETO === 'cambia-este-secreto') {
    throw new Error('Define JWT_SECRET en producción');
}

export async function requerirAuth(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    let id;
    try {
        ({ id } = jwt.verify(token, SECRETO));
    } catch {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // El token puede ser válido pero apuntar a un usuario que ya no existe
        // (por ejemplo si se cambió o borró la base de datos).
        const usuario = await db.uno('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });

        req.usuarioId = usuario.id;
        next();
    } catch (error) {
        next(error);
    }
}
