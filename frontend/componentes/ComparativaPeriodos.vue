<template>
    <div class="comparativa">
        <div class="selector-tema comp-selector">
            <button
                v-for="p in PERIODOS"
                :key="p"
                :class="['opcion-tema', { activo: dias === p }]"
                @click="dias = p">
                {{ p }} días
            </button>
        </div>

        <div class="comp-cifras">
            <div class="comp-dato">
                <small>Últimos {{ dias }} días</small>
                <b>{{ porcentaje(comparacion.actual) }}</b>
            </div>
            <div class="comp-dato">
                <small>{{ dias }} días anteriores</small>
                <b>{{ porcentaje(comparacion.anterior) }}</b>
            </div>
            <div :class="['comp-cambio', claseCambio]">{{ textoCambio }}</div>
        </div>

        <ul v-if="mejoro || bajo" class="comp-habitos">
            <li v-if="mejoro">
                <span class="comp-etiqueta sube">Más mejoró</span>
                <i class="punto" :style="{ background: mejoro.color }"></i>
                {{ mejoro.nombre }}
                <em>+{{ mejoro.cambio }} pts</em>
            </li>
            <li v-if="bajo">
                <span class="comp-etiqueta baja">Más bajó</span>
                <i class="punto" :style="{ background: bajo.color }"></i>
                {{ bajo.nombre }}
                <em>{{ bajo.cambio }} pts</em>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { compararPeriodos } from '../servicios/progreso.js';

const props = defineProps({
    matriz: Object // respuesta de /estadisticas/matriz
});

const PERIODOS = [7, 30];
const dias = ref(7);

const comparacion = computed(() => compararPeriodos(props.matriz, dias.value));

const porcentaje = (valor) => (valor === null ? '—' : Math.round(valor * 100) + '%');

const claseCambio = computed(() => {
    const c = comparacion.value.cambio;
    if (c === null || c === 0) return 'igual';
    return c > 0 ? 'sube' : 'baja';
});

const textoCambio = computed(() => {
    const c = comparacion.value.cambio;
    if (c === null) return 'Aún no hay periodo anterior con qué comparar';
    if (c === 0) return '= Igual que el periodo anterior';
    return c > 0 ? `▲ +${c} puntos` : `▼ ${c} puntos`;
});

// Solo se destacan cambios reales (mayor que cero para mejorar, menor que cero para bajar)
const mejoro = computed(() => {
    const primero = comparacion.value.porHabito[0];
    return primero && primero.cambio > 0 ? primero : null;
});
const bajo = computed(() => {
    const lista = comparacion.value.porHabito;
    const ultimo = lista[lista.length - 1];
    return ultimo && ultimo.cambio < 0 ? ultimo : null;
});
</script>
