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
            <form class="caja-login" @submit.prevent="enviar">
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

                <p v-if="error" class="error-form">{{ error }}</p>

                <button type="submit" class="boton" :disabled="cargando">
                    {{ modoRegistro ? 'Crear cuenta' : 'Entrar' }}
                </button>
                <button type="button" class="boton secundario" @click="modoRegistro = !modoRegistro">
                    {{ modoRegistro ? 'Ya tengo cuenta' : 'Crear una cuenta' }}
                </button>
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

// Cuadrícula decorativa (7 columnas x 5 filas) con niveles 0-3
const decoracion = Array.from({ length: 35 }, (_, i) => (i * 7 + (i >> 2) * 3) % 4);

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
