<template>
    <section class="vista tema-perfil-ht">
        <div class="cabecera-vista">
            <div>
                <h1>Mi perfil</h1>
                <p class="subtitulo">Tu cuenta</p>
            </div>
        </div>

        <div class="contenedor-card">
            <article class="fila-card">
                <div class="avatar">{{ inicial }}</div>
                <h2>{{ sesion.usuario ? sesion.usuario.nombre : '' }}</h2>
                <ul class="datos-personaje">
                    <li><strong>Email:</strong> {{ sesion.usuario ? sesion.usuario.email : '' }}</li>
                </ul>
                <div class="acciones-tarjeta">
                    <button class="boton peligro" @click="sesion.cerrar()">Cerrar sesión</button>
                </div>
            </article>
        </div>
    </section>
</template>

<script setup>
import { computed } from 'vue';
import { sesion } from '../servicios/sesion.js';

const inicial = computed(() => (sesion.usuario ? sesion.usuario.nombre.charAt(0).toUpperCase() : '?'));
</script>
