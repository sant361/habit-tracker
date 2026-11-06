import { reactive } from 'vue';
import api from './api.js';
import { sesion } from './sesion.js';
import { hoy } from './fechas.js';
import { normalizarAjustes, tocaAvisar, contarPendientes, textoRecordatorio } from './recordatorio.js';

// Recordatorio diario con notificaciones del navegador. Solo funciona mientras la página esté
// abierta en alguna pestaña: no hay servidor que avise con la página cerrada.
const CLAVE = 'habit-tracker-recordatorio';

function leer() {
    try {
        return normalizarAjustes(JSON.parse(localStorage.getItem(CLAVE)));
    } catch {
        return normalizarAjustes(null);
    }
}

export const ajustes = reactive(leer());

export function guardarAjustes(cambios) {
    Object.assign(ajustes, normalizarAjustes({ ...ajustes, ...cambios }));
    try {
        localStorage.setItem(CLAVE, JSON.stringify({ ...ajustes }));
    } catch {
        // sin almacenamiento (ventana privada): el ajuste dura mientras la página esté abierta
    }
}

export const soportaNotificaciones = () => typeof window !== 'undefined' && 'Notification' in window;

/** Pide permiso si hace falta. Devuelve 'granted', 'denied' o 'default'. */
export async function pedirPermiso() {
    if (!soportaNotificaciones()) return 'denied';
    if (Notification.permission !== 'default') return Notification.permission;
    return Notification.requestPermission();
}

function mostrar(texto) {
    const n = new Notification('Habit Tracker', { body: texto });
    n.onclick = () => {
        window.focus();
        n.close();
    };
}

/** Muestra una notificación de prueba con el texto del recordatorio. */
export function probar() {
    if (soportaNotificaciones() && Notification.permission === 'granted') mostrar('Así se verá tu recordatorio diario.');
}

async function revisar() {
    if (!sesion.token || !soportaNotificaciones() || Notification.permission !== 'granted') return;
    const dia = hoy();
    if (!tocaAvisar(ajustes, new Date(), dia)) return;

    try {
        const { data } = await api.get('/estadisticas/matriz', { params: { desde: dia, hasta: dia, hoy: dia } });
        guardarAjustes({ ultimoAviso: dia }); // un solo aviso por día, haya o no pendientes
        const pendientes = contarPendientes(data.filas);
        if (pendientes > 0) mostrar(textoRecordatorio(pendientes));
    } catch {
        // sin conexión: se vuelve a intentar en la próxima revisión
    }
}

/** Revisa ahora y luego cada minuto. Devuelve el temporizador para poder detenerlo. */
export function iniciarRecordatorios() {
    revisar();
    return setInterval(revisar, 60 * 1000);
}
