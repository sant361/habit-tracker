import { reactive } from 'vue';

const CLAVE = 'habit-tracker-sesion';

function leer() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE)) || {};
    } catch {
        return {};
    }
}

const guardada = leer();

export const sesion = reactive({
    token: guardada.token || null,
    usuario: guardada.usuario || null,

    iniciar(token, usuario) {
        this.token = token;
        this.usuario = usuario;
        localStorage.setItem(CLAVE, JSON.stringify({ token, usuario }));
    },

    cerrar() {
        this.token = null;
        this.usuario = null;
        localStorage.removeItem(CLAVE);
    }
});
