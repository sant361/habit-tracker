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
                <Progreso v-if="vistaActiva === 'progreso'" />
                <Logros v-if="vistaActiva === 'logros'" />
                <Habitos v-if="vistaActiva === 'habitos'" />
                <Perfil v-if="vistaActiva === 'perfil'" />
            </main>
            <footer>
                <p>&copy; 2026 Habit Tracker. Todos los derechos reservados.</p>
            </footer>
        </div>

        <AvisosFlotantes />
    </div>

    <Login v-else />
</template>

<script setup>
import { ref, watch } from 'vue';
import { sesion } from '../servicios/sesion.js';
import Login from '../vistas/Login.vue';
import Hoy from '../vistas/Hoy.vue';
import Matriz from '../vistas/Matriz.vue';
import Progreso from '../vistas/Progreso.vue';
import Logros from '../vistas/Logros.vue';
import Habitos from '../vistas/Habitos.vue';
import Perfil from '../vistas/Perfil.vue';
import AvisosFlotantes from '../componentes/AvisosFlotantes.vue';
import { revisarLogros } from '../servicios/logros.js';

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
        id: 'progreso',
        texto: 'Progreso',
        icono: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'
    },
    {
        id: 'logros',
        texto: 'Logros',
        icono: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>'
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

// Al entrar y al cambiar de vista se revisa si se ganó algún logro (por ejemplo, tras marcar hábitos)
watch([() => sesion.token, vistaActiva], ([token]) => {
    if (token) revisarLogros();
}, { immediate: true });

// Al cerrar sesión, la próxima vez se entra a Hoy
watch(() => sesion.token, (token) => {
    if (!token) vistaActiva.value = 'hoy';
});
</script>
