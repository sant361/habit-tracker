import axios from 'axios';
import { sesion } from './sesion.js';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
    if (sesion.token) config.headers.Authorization = `Bearer ${sesion.token}`;
    return config;
});

// Si el token expiró o es inválido, se cierra la sesión
api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        if (error.response && error.response.status === 401 && sesion.token) sesion.cerrar();
        return Promise.reject(error);
    }
);

export function mensajeError(error, porDefecto = 'Ocurrió un error') {
    return (error.response && error.response.data && error.response.data.error) || porDefecto;
}

export default api;
