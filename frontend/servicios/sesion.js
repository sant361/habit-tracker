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

    // Actualiza los datos del usuario (por ejemplo, tras cambiar el nombre) sin cerrar la sesión
    actualizarUsuario(usuario) {
        this.usuario = usuario;
        localStorage.setItem(CLAVE, JSON.stringify({ token: this.token, usuario }));
    },

    cerrar() {
        this.token = null;
        this.usuario = null;
        localStorage.removeItem(CLAVE);
    }
});
