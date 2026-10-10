<template>
    <div class="selector-periodo">
        <button
            v-for="opcion in opciones"
            :key="opcion.dias"
            :class="['segmento', { activo: modelo === opcion.dias }]"
            @click="modelo = opcion.dias">
            {{ opcion.texto }}
        </button>
    </div>
</template>

<script setup>
const modelo = defineModel({ type: Number, default: 30 });

const opciones = [
    { dias: 7, texto: '7 días' },
    { dias: 30, texto: '30 días' },
    { dias: 90, texto: '90 días' }
];
</script>
