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
            <form v-if="!recuperando" class="caja-login" @submit.prevent="enviar">
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
                    <input v-model="clave" type="password" minlength="6" required>
                </label>

                <p v-if="aviso" class="ok-form">{{ aviso }}</p>
                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">
                    {{ modoRegistro ? 'Crear cuenta' : 'Entrar' }}
                </button>
                <button type="button" class="boton secundario" @click="modoRegistro = !modoRegistro">
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
                    <input v-model="claveNueva" type="password" minlength="6" maxlength="72" autocomplete="new-password" required>
                </label>

                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">Cambiar clave</button>
                <button type="button" class="boton secundario" @click="cerrarRecuperar">Volver</button>
            </form>
        </div>
    </section>
</template>

<script setup>
import { ref } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';

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

// Cuadrícula decorativa (7 columnas x 5 filas) con niveles 0-3
const decoracion = Array.from({ length: 35 }, (_, i) => (i * 7 + (i >> 2) * 3) % 4);

function abrirRecuperar() {
    error.value = '';
    aviso.value = '';
    recuperando.value = true;
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
