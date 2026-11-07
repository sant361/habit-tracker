<template>
    <section class="vista tema-login">
        <div class="login-hero">
            <div class="marca">
                <span class="marca-icono">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12l5 5L20 6" />
                    </svg>
                </span>
                Habit Tracker
            </div>

            <h1>Constancia que se ve.</h1>
            <p>Marca tus hábitos cada día y mira tu rendimiento en una matriz de cumplimiento, rachas y mapa de calor.</p>

            <div class="mini-matriz">
                <i v-for="(c, i) in decoracion" :key="i" :class="'nivel-' + c"></i>
            </div>
        </div>

        <div class="login-panel">
            <form v-if="restableciendo" class="caja-login" @submit.prevent="restablecer">
                <h2>Elige tu clave nueva</h2>
                <label class="campo">
                    Clave nueva
                    <CampoClave v-model="claveNueva" :minlength="6" :maxlength="72" autocomplete="new-password" required />
                </label>
                <label class="campo">
                    Repite la clave
                    <CampoClave v-model="claveRepetida" :minlength="6" :maxlength="72" autocomplete="new-password" required />
                </label>

                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">Cambiar clave</button>
                <button type="button" class="boton secundario" @click="salirDeRestablecer">Volver</button>
            </form>

            <form v-else-if="olvidando" class="caja-login" @submit.prevent="pedirEnlace">
                <h2>Recuperar tu clave</h2>
                <p class="ayuda-recuperar">
                    Escribe tu correo y te enviamos un enlace para elegir una clave nueva. El enlace vence en 30 minutos.
                </p>

                <label class="campo">
                    Email
                    <input v-model="email" type="email" required>
                </label>

                <p v-if="enlaceEnviado" class="ok-form">Si ese correo está registrado, te enviamos el enlace. Revisa también la carpeta de spam.</p>
                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">{{ enlaceEnviado ? 'Enviar otra vez' : 'Enviar enlace' }}</button>
                <button type="button" class="boton secundario" @click="cerrarOlvido">Volver</button>
                <button type="button" class="enlace-recuperar" @click="usarCodigo">Tengo un código de recuperación</button>
            </form>

            <form v-else-if="!recuperando" class="caja-login" @submit.prevent="enviar">
                <h2>{{ modoRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo' }}</h2>

                <label v-if="modoRegistro" class="campo">
                    Nombre
                    <input v-model="nombre" type="text" required>
                </label>
                <label class="campo">
                    Email
                    <input v-model="email" type="email" required>
                </label>
                <label class="campo">
                    Clave
                    <CampoClave v-model="clave" :minlength="6" :maxlength="72" :autocomplete="modoRegistro ? 'new-password' : 'current-password'" required />
                </label>

                <p v-if="aviso" class="ok-form">{{ aviso }}</p>
                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">
                    {{ modoRegistro ? 'Crear cuenta' : 'Entrar' }}
                </button>
                <button type="button" class="boton secundario" @click="cambiarModo">
                    {{ modoRegistro ? 'Ya tengo cuenta' : 'Crear una cuenta' }}
                </button>
                <button v-if="!modoRegistro" type="button" class="enlace-recuperar" @click="abrirRecuperar">
                    ¿Olvidaste tu clave?
                </button>
            </form>

            <form v-else class="caja-login" @submit.prevent="recuperar">
                <h2>Recuperar tu clave</h2>
                <p class="ayuda-recuperar">
                    Escribe tu correo y el código de recuperación que generaste en Mi perfil. Si nunca generaste uno, no se puede recuperar.
                </p>

                <label class="campo">
                    Email
                    <input v-model="email" type="email" required>
                </label>
                <label class="campo">
                    Código de recuperación
                    <input v-model="codigo" type="text" placeholder="XXXX-XXXX-XXXX" autocomplete="off" required>
                </label>
                <label class="campo">
                    Clave nueva
                    <CampoClave v-model="claveNueva" :minlength="6" :maxlength="72" autocomplete="new-password" required />
                </label>

                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">Cambiar clave</button>
                <button type="button" class="boton secundario" @click="cerrarRecuperar">Volver</button>
                <button v-if="correoActivo" type="button" class="enlace-recuperar" @click="usarCorreo">Prefiero recibir un enlace por correo</button>
            </form>
        </div>
    </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';
import CampoClave from '../componentes/CampoClave.vue';
import { tokenDeUrl, traeEnlace, direccionSinToken, errorDeClave } from '../servicios/restablecer.js';

const modoRegistro = ref(false);
const nombre = ref('');
const email = ref('');
const clave = ref('');
const error = ref('');
const cargando = ref(false);

// Recuperar la clave con el código de recuperación
const recuperando = ref(false);
const codigo = ref('');
const claveNueva = ref('');
const aviso = ref('');

// Recuperar la clave por correo: pedir el enlace y, al abrirlo, elegir la clave nueva
const correoActivo = ref(false); // el servidor tiene Gmail configurado
const olvidando = ref(false);
const enlaceEnviado = ref(false);
const token = ref(tokenDeUrl(window.location.search));
const restableciendo = ref(Boolean(token.value));
const claveRepetida = ref('');

// Quita el token de la dirección para que no quede a la vista ni en el historial
function limpiarDireccion() {
    const { pathname, search, hash } = window.location;
    window.history.replaceState(null, '', direccionSinToken(pathname, search, hash));
}

onMounted(async () => {
    if (traeEnlace(window.location.search)) {
        if (!token.value) aviso.value = 'El enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu clave?".';
        limpiarDireccion();
    }
    try {
        const { data } = await api.get('/auth/correo-activo');
        correoActivo.value = Boolean(data.activo);
    } catch {
        correoActivo.value = false; // sin servidor no hay nada que ofrecer: queda el código de recuperación
    }
});

function cerrarOlvido() {
    error.value = '';
    enlaceEnviado.value = false;
    olvidando.value = false;
}

function usarCodigo() {
    cerrarOlvido();
    recuperando.value = true;
}

function usarCorreo() {
    cerrarRecuperar();
    olvidando.value = true;
}

async function pedirEnlace() {
    error.value = '';
    cargando.value = true;
    try {
        await api.post('/auth/olvide', { email: email.value });
        enlaceEnviado.value = true;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo conectar con el servidor');
    } finally {
        cargando.value = false;
    }
}

async function restablecer() {
    const problema = errorDeClave(claveNueva.value, claveRepetida.value);
    if (problema) {
        error.value = problema;
        return;
    }
    error.value = '';
    cargando.value = true;
    try {
        await api.post('/auth/restablecer', { token: token.value, claveNueva: claveNueva.value });
        salirDeRestablecer();
        aviso.value = 'Clave cambiada. Ya puedes entrar con la nueva.';
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo conectar con el servidor');
    } finally {
        cargando.value = false;
    }
}

function salirDeRestablecer() {
    token.value = '';
    claveNueva.value = '';
    claveRepetida.value = '';
    error.value = '';
    restableciendo.value = false;
}

// Cuadrícula decorativa (7 columnas x 5 filas) con niveles 0-3
const decoracion = Array.from({ length: 35 }, (_, i) => (i * 7 + (i >> 2) * 3) % 4);

// Al pasar de entrar a crear cuenta (y al revés) se quitan los mensajes del intento anterior
function cambiarModo() {
    modoRegistro.value = !modoRegistro.value;
    error.value = '';
    aviso.value = '';
}

function abrirRecuperar() {
    error.value = '';
    aviso.value = '';
    if (correoActivo.value) olvidando.value = true;
    else recuperando.value = true;
}

function cerrarRecuperar() {
    error.value = '';
    codigo.value = '';
    claveNueva.value = '';
    recuperando.value = false;
}

async function recuperar() {
    error.value = '';
    cargando.value = true;
    try {
        await api.post('/auth/recuperar', { email: email.value, codigo: codigo.value, claveNueva: claveNueva.value });
        cerrarRecuperar();
        clave.value = '';
        aviso.value = 'Clave cambiada. Ya puedes entrar con la nueva. Genera un código nuevo en Mi perfil.';
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo conectar con el servidor');
    } finally {
        cargando.value = false;
    }
}

async function enviar() {
    error.value = '';
    cargando.value = true;
    try {
        const ruta = modoRegistro.value ? '/auth/registro' : '/auth/login';
        const cuerpo = modoRegistro.value
            ? { nombre: nombre.value, email: email.value, clave: clave.value }
            : { email: email.value, clave: clave.value };
        const respuesta = await api.post(ruta, cuerpo);
        sesion.iniciar(respuesta.data.token, respuesta.data.usuario);
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo conectar con el servidor');
    } finally {
        cargando.value = false;
    }
}
</script>
