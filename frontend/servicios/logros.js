import api from './api.js';
import { hoy } from './fechas.js';
import { sesion } from './sesion.js';
import { avisar } from './avisos.js';
import { detectarNuevos, clavesObtenidas, textoAviso } from './nuevosLogros.js';

// Los logros que ya se mostraron se recuerdan en este navegador, por usuario
const claveGuardado = () => `habit-tracker-logros-vistos-${sesion.usuario ? sesion.usuario.id : 'anonimo'}`;

function leerVistos() {
    try {
        return JSON.parse(localStorage.getItem(claveGuardado()));
    } catch {
        return null;
    }
}

function guardarVistos(claves) {
    try {
        localStorage.setItem(claveGuardado(), JSON.stringify(claves));
    } catch {
        // sin almacenamiento disponible: solo se perderá el recuerdo de lo ya avisado
    }
}

export async function pedirLogros() {
    const { data } = await api.get('/estadisticas/logros', { params: { hoy: hoy() } });
    return data;
}

let revisando = false;

/** Consulta los logros y avisa de los que se acaban de ganar. Nunca lanza error. */
export async function revisarLogros() {
    if (revisando || !sesion.token) return;
    revisando = true;
    try {
        const logros = await pedirLogros();
        const nuevos = detectarNuevos(logros, leerVistos());
        if (nuevos.length) avisar(textoAviso(nuevos));
        guardarVistos(clavesObtenidas(logros));
    } catch {
        // un fallo de red aquí no debe molestar a la persona
    } finally {
        revisando = false;
    }
}
