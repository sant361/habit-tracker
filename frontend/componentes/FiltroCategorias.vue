<template>
    <div class="filtro-categorias">
        <button :class="['chip-categoria', { activo: modelo === '' }]" @click="modelo = ''">Todas</button>
        <button
            v-for="nombre in categorias"
            :key="nombre"
            :class="['chip-categoria', { activo: modelo === nombre }]"
            @click="modelo = nombre">
            {{ nombre }}
        </button>
    </div>
</template>

<script setup>
const modelo = defineModel({ type: String, default: '' });

defineProps({
    categorias: Array
});
</script>
