<template>
    <article class="fila-card tarjeta-habito" :style="{ borderLeftColor: habito.color }">
        <h2>{{ habito.nombre }}</h2>
        <p class="categoria">{{ habito.categoria || 'Sin categoría' }}</p>

        <div class="chips-dias">
            <span
                v-for="(nombre, i) in NOMBRES_DIAS"
                :key="i"
                :class="{ activo: habito.dias.includes(i) }">
                {{ nombre.charAt(0) }}
            </span>
        </div>

        <ul class="datos-personaje">
            <li><strong>Impacto:</strong> {{ habito.peso }} / 5</li>
            <li><strong>Desde:</strong> {{ habito.creadoEn }}</li>
        </ul>

        <div class="acciones-tarjeta">
            <button class="boton secundario" @click="$emit('editar', habito)">Editar</button>
            <button class="boton peligro" @click="$emit('archivar', habito)">Archivar</button>
        </div>
    </article>
</template>

<script setup>
import { NOMBRES_DIAS } from '../servicios/fechas.js';

defineProps({
    habito: Object
});

defineEmits(['editar', 'archivar']);
</script>
