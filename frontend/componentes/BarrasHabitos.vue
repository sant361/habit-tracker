<template>
    <ul class="barras">
        <li v-for="fila in filas" :key="fila.habitoId" class="barra-fila">
            <span class="barra-nombre">
                <i class="punto" :style="{ background: fila.color }"></i>
                {{ fila.nombre }}
            </span>
            <span class="barra-pista">
                <span class="barra-relleno" :style="{ width: Math.round(fila.tasa * 100) + '%', background: fila.color }"></span>
            </span>
            <span class="barra-valor">{{ Math.round(fila.tasa * 100) }}%</span>
        </li>
    </ul>
</template>

<script setup>
defineProps({
    filas: Array // hábitos con tasa calculada, ya ordenados
});
</script>
