import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { requerirAuth } from './middleware/auth.js';
import rutasAuth from './rutas/auth.js';
import rutasHabitos from './rutas/habitos.js';
import rutasRegistros from './rutas/registros.js';
import rutasEstadisticas from './rutas/estadisticas.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rutasAuth);
app.use('/api/habitos', requerirAuth, rutasHabitos);
app.use('/api/registros', requerirAuth, rutasRegistros);
app.use('/api/estadisticas', requerirAuth, rutasEstadisticas);

// En producción el mismo servidor entrega la página ya compilada (frontend/dist),
// así que todo vive bajo una sola dirección y no hace falta configurar CORS.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
