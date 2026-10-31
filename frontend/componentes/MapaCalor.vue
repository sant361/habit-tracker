<template>
    <div>
        <div ref="contenedor" class="mapa-scroll">
            <div class="mapa">
                <div class="mapa-dias">
                    <span v-for="(n, i) in ETIQUETAS_DIAS" :key="i">{{ n }}</span>
                </div>
                <div class="mapa-semanas">
                    <div v-for="(semana, c) in mapa.semanas" :key="c" class="mapa-columna">
                        <span class="mapa-mes">{{ etiquetaMes(c) }}</span>
                        <template v-for="(celda, f) in semana" :key="f">
                            <span v-if="celda" :class="['mapa-celda', 'nivel-' + celda.nivel]" :title="titulo(celda)"></span>
                            <span v-else class="mapa-celda hueco"></span>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <div class="mapa-pie">
            <p class="mapa-resumen">
                <strong>{{ mapa.diasPerfectos }}</strong> {{ mapa.diasPerfectos === 1 ? 'día perfecto' : 'días perfectos' }}
                de {{ mapa.diasConDatos }} con hábitos que cumplir.
            </p>
            <div class="mapa-leyenda" aria-hidden="true">
                <span>Menos</span>
                <span class="mapa-celda nivel-sin"></span>
                <span class="mapa-celda nivel-1"></span>
                <span class="mapa-celda nivel-2"></span>
                <span class="mapa-celda nivel-3"></span>
                <span class="mapa-celda nivel-4"></span>
                <span>Más</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { construirMapaCalor } from '../servicios/progreso.js';

const props = defineProps({
    matriz: Object // respuesta de /estadisticas/matriz con cerca de un año de días
});

const ETIQUETAS_DIAS = ['L', '', 'M', '', 'V', '', ''];
const contenedor = ref(null);

const mapa = computed(() => construirMapaCalor(props.matriz));

const etiquetaMes = (columna) => mapa.value.meses.find((m) => m.columna === columna)?.etiqueta || '';

function titulo(celda) {
    const fecha = new Date(celda.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return celda.valor === null ? `${fecha}: sin hábitos que cumplir` : `${fecha}: ${Math.round(celda.valor * 100)}%`;
}

// Que se vea primero lo más reciente (el final del año)
onMounted(() => {
    if (contenedor.value) contenedor.value.scrollLeft = contenedor.value.scrollWidth;
});
</script>
