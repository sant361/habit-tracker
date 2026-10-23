<template>
    <div class="cuadrante">
        <span class="cuadrante-eje eje-y">Impacto ↑</span>

        <div class="cuadrante-rejilla">
            <div v-for="q in celdas" :key="q.clave" :class="['cuadrante-caja', 'q-' + q.clave]">
                <h3>{{ q.titulo }}</h3>
                <p class="cuadrante-ayuda">{{ q.ayuda }}</p>
                <ul v-if="grupos[q.clave].length" class="cuadrante-lista">
                    <li v-for="h in grupos[q.clave]" :key="h.habitoId">
                        <i class="punto" :style="{ background: h.color }"></i>
                        <span class="cuadrante-nombre">{{ h.nombre }}</span>
                        <span class="cuadrante-dato">{{ Math.round(h.tasa * 100) }}% · peso {{ h.peso }}</span>
                    </li>
                </ul>
                <p v-else class="cuadrante-vacio">Ninguno</p>
            </div>
        </div>

        <span class="cuadrante-eje eje-x">Constancia →</span>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { clasificarCuadrantes, UMBRAL_CONSTANCIA, UMBRAL_IMPACTO } from '../servicios/progreso.js';

const props = defineProps({
    filas: Array // hábitos de la matriz, con tasa y peso
});

const grupos = computed(() => clasificarCuadrantes(props.filas));

const pct = Math.round(UMBRAL_CONSTANCIA * 100);

// Orden de la rejilla: arriba alto impacto, a la derecha más constancia
const celdas = [
    { clave: 'reforzar', titulo: 'Refuérzalos primero', ayuda: `Importan mucho y vas por debajo del ${pct}%.` },
    { clave: 'mantener', titulo: 'Mantén el ritmo', ayuda: `Importan mucho y vas con el ${pct}% o más.` },
    { clave: 'revisar', titulo: 'Revisa si valen la pena', ayuda: `Pesan poco y cuestan constancia.` },
    { clave: 'facil', titulo: 'Van solos', ayuda: `Pesan poco y los cumples bien.` }
];
</script>
