<template>
    <section class="vista tema-logros">
        <div class="cabecera-vista">
            <div>
                <h1>Logros</h1>
                <p v-if="logros" class="subtitulo">{{ obtenidos }} de {{ logros.length }} desbloqueados</p>
            </div>
        </div>

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="!logros" class="estado">Cargando...</p>

        <div v-else class="rejilla-logros">
            <article v-for="l in logros" :key="l.clave" :class="['logro', { bloqueado: !l.obtenido }]">
                <span class="logro-icono">{{ l.icono }}</span>
                <h2>{{ l.titulo }}</h2>
                <p>{{ l.descripcion }}</p>
                <template v-if="l.obtenido">
                    <span class="logro-estado">Desbloqueado</span>
                </template>
                <template v-else>
                    <span class="logro-pista">
                        <span class="logro-relleno" :style="{ width: Math.round((l.actual / l.meta) * 100) + '%' }"></span>
                    </span>
                    <span class="logro-progreso">{{ l.actual }} / {{ l.meta }}</span>
                </template>
            </article>
        </div>
    </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { mensajeError } from '../servicios/api.js';
import { pedirLogros, revisarLogros } from '../servicios/logros.js';

const logros = ref(null);
const error = ref('');

const obtenidos = computed(() => (logros.value ? logros.value.filter((l) => l.obtenido).length : 0));

onMounted(async () => {
    try {
        logros.value = await pedirLogros();
        // Si hay alguno nuevo, avisa y lo marca como visto
        revisarLogros();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudieron cargar los logros.');
    }
});
</script>
