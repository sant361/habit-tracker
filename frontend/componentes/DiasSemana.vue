<template>
    <div>
        <div class="dias-barras">
            <div v-for="d in dias" :key="d.dia" class="dia-columna">
                <span class="dia-valor">{{ d.tasa === null ? '—' : Math.round(d.tasa * 100) + '%' }}</span>
                <span class="dia-pista">
                    <span
                        :class="['dia-relleno', { mejor: extremos && d.dia === extremos.mejor.dia, peor: extremos && d.dia === extremos.peor.dia }]"
                        :style="{ height: d.tasa === null ? '0%' : Math.max(Math.round(d.tasa * 100), 4) + '%' }"></span>
                </span>
                <span class="dia-nombre">{{ d.nombre }}</span>
            </div>
        </div>

        <p v-if="extremos" class="dias-resumen">
            Tu mejor día es el <strong>{{ extremos.mejor.nombre }}</strong> ({{ Math.round(extremos.mejor.tasa * 100) }}%) y el más flojo
            es el <strong>{{ extremos.peor.nombre }}</strong> ({{ Math.round(extremos.peor.tasa * 100) }}%).
        </p>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { rendimientoPorDia, extremosDia } from '../servicios/progreso.js';

const props = defineProps({
    matriz: Object // respuesta de /estadisticas/matriz
});

const dias = computed(() => rendimientoPorDia(props.matriz));
const extremos = computed(() => extremosDia(dias.value));
</script>
