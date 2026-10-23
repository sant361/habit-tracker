<template>
    <section class="vista tema-progreso">
        <div class="cabecera-vista">
            <div>
                <h1>Progreso</h1>
                <p class="subtitulo">Tus últimas {{ SEMANAS }} semanas</p>
            </div>
        </div>

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="cargando && !matriz" class="estado">Cargando...</p>

        <template v-else-if="matriz">
            <p v-if="!hayDatos" class="estado">
                Aún no hay datos para mostrar. Marca tus hábitos en "Hoy" o en "Matriz" y vuelve aquí.
            </p>

            <template v-else>
                <div class="resumen">
                    <div class="dato-resumen">
                        <small>Cumplimiento global</small>
                        <b>{{ Math.round(matriz.tasaGlobal * 100) }}%</b>
                    </div>
                    <div class="dato-resumen">
                        <small>Mejor hábito</small>
                        <b class="nombre-habito">{{ mejor.nombre }}</b>
                        <em>{{ Math.round(mejor.tasa * 100) }}%</em>
                    </div>
                    <div v-if="reforzar" class="dato-resumen">
                        <small>A reforzar</small>
                        <b class="nombre-habito">{{ reforzar.nombre }}</b>
                        <em>{{ Math.round(reforzar.tasa * 100) }}%</em>
                    </div>
                </div>

                <div class="tarjeta-grafico">
                    <h2>Cumplimiento por semana</h2>
                    <GraficoSemanal :semanas="semanas" />
                </div>

                <div class="tarjeta-grafico">
                    <h2>Cumplimiento por hábito</h2>
                    <BarrasHabitos :filas="ranking" />
                </div>
            </template>
        </template>
    </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { hoy, sumarDias } from '../servicios/fechas.js';
import { agruparSemanas, ordenarPorCumplimiento } from '../servicios/progreso.js';
import GraficoSemanal from '../componentes/GraficoSemanal.vue';
import BarrasHabitos from '../componentes/BarrasHabitos.vue';

const SEMANAS = 12;

const matriz = ref(null);
const cargando = ref(false);
const error = ref('');

const semanas = computed(() => (matriz.value ? agruparSemanas(matriz.value) : []));
const ranking = computed(() => (matriz.value ? ordenarPorCumplimiento(matriz.value.filas) : []));
const hayDatos = computed(() => matriz.value && matriz.value.tasaGlobal !== null && ranking.value.length > 0);

const mejor = computed(() => ranking.value[0]);
// Solo tiene sentido "a reforzar" si hay al menos dos hábitos que comparar
const reforzar = computed(() => (ranking.value.length > 1 ? ranking.value[ranking.value.length - 1] : null));

async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
        const hasta = hoy();
        const respuesta = await api.get('/estadisticas/matriz', {
            params: { desde: sumarDias(hasta, -(SEMANAS * 7 - 1)), hasta, hoy: hasta }
        });
        matriz.value = respuesta.data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo cargar el progreso.');
    } finally {
        cargando.value = false;
    }
}

onMounted(cargar);
</script>
