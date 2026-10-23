<template>
    <div v-if="sesion.token" class="app">
        <aside class="barra-lateral">
            <div class="marca">
                <span class="marca-icono">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12l5 5L20 6" />
                    </svg>
                </span>
                Habit Tracker
            </div>

            <nav class="menu-principal">
                <button
                    v-for="v in vistas"
                    :key="v.id"
                    :class="['botonmenu', { activo: vistaActiva === v.id }]"
                    @click="vistaActiva = v.id">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="v.icono"></svg>
                    {{ v.texto }}
                </button>
            </nav>

            <div class="usuario-lateral">
                <strong>{{ sesion.usuario ? sesion.usuario.nombre : '' }}</strong>
                <small>{{ sesion.usuario ? sesion.usuario.email : '' }}</small>
            </div>
        </aside>

        <div class="contenido">
            <main id="datosprincipal">
                <Hoy v-if="vistaActiva === 'hoy'" />
                <Matriz v-if="vistaActiva === 'matriz'" />
                <Habitos v-if="vistaActiva === 'habitos'" />
                <Perfil v-if="vistaActiva === 'perfil'" />
            </main>
            <footer>
                <p>&copy; 2026 Habit Tracker. Todos los derechos reservados.</p>
            </footer>
        </div>
    </div>

    <Login v-else />
</template>

<script setup>
import { ref, watch } from 'vue';
import { sesion } from '../servicios/sesion.js';
import Login from '../vistas/Login.vue';
import Hoy from '../vistas/Hoy.vue';
import Matriz from '../vistas/Matriz.vue';
import Habitos from '../vistas/Habitos.vue';
import Perfil from '../vistas/Perfil.vue';

const vistas = [
    {
        id: 'hoy',
        texto: 'Hoy',
        icono: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'
    },
    {
        id: 'matriz',
        texto: 'Matriz',
        icono: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
    },
    {
        id: 'habitos',
        texto: 'Mis hábitos',
        icono: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
    },
    {
        id: 'perfil',
        texto: 'Mi perfil',
        icono: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
    }
];

const vistaActiva = ref('hoy');

// Al cerrar sesión, la próxima vez se entra a Hoy
watch(() => sesion.token, (token) => {
    if (!token) vistaActiva.value = 'hoy';
});
</script>
