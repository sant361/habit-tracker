<template>
    <svg class="grafico" :viewBox="`0 0 ${ANCHO} ${ALTO}`" role="img" aria-label="Cumplimiento por semana">
        <g v-for="n in [0, 25, 50, 75, 100]" :key="n">
            <line class="grafico-guia" :x1="MARGEN.izq" :x2="ANCHO - MARGEN.der" :y1="y(n / 100)" :y2="y(n / 100)" />
            <text class="grafico-eje" :x="MARGEN.izq - 8" :y="y(n / 100) + 4" text-anchor="end">{{ n }}%</text>
        </g>

        <g v-for="(tramo, i) in tramos" :key="i">
            <path v-if="tramo.length > 1" class="grafico-area" :d="areaDe(tramo)" />
            <path v-if="tramo.length > 1" class="grafico-linea" :d="lineaDe(tramo)" />
        </g>

        <g v-for="(semana, i) in semanas" :key="semana.desde">
            <text class="grafico-eje" :x="x(i)" :y="ALTO - 8" text-anchor="middle">{{ semana.etiqueta }}</text>
            <circle v-if="semana.valor !== null" class="grafico-punto" :cx="x(i)" :cy="y(semana.valor)" r="4">
                <title>Semana del {{ semana.etiqueta }}: {{ Math.round(semana.valor * 100) }}%</title>
            </circle>
        </g>
    </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    semanas: Array // [{ etiqueta, desde, valor }]
});

const ANCHO = 640;
const ALTO = 240;
const MARGEN = { izq: 44, der: 16, arriba: 12, abajo: 32 };

const x = (i) =>
    props.semanas.length < 2
        ? (MARGEN.izq + ANCHO - MARGEN.der) / 2
        : MARGEN.izq + (i * (ANCHO - MARGEN.izq - MARGEN.der)) / (props.semanas.length - 1);

const y = (valor) => MARGEN.arriba + (1 - valor) * (ALTO - MARGEN.arriba - MARGEN.abajo);

// Las semanas sin datos cortan la línea en tramos separados
const tramos = computed(() => {
    const lista = [];
    let actual = [];
    props.semanas.forEach((semana, i) => {
        if (semana.valor === null) {
            if (actual.length) lista.push(actual);
            actual = [];
        } else {
            actual.push({ x: x(i), y: y(semana.valor) });
        }
    });
    if (actual.length) lista.push(actual);
    return lista;
});

const lineaDe = (tramo) => tramo.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

const areaDe = (tramo) => {
    const base = y(0);
    return `${lineaDe(tramo)} L${tramo[tramo.length - 1].x} ${base} L${tramo[0].x} ${base} Z`;
};
</script>
