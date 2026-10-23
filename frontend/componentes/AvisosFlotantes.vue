<template>
    <div class="avisos" aria-live="polite">
        <button v-for="a in avisos.lista" :key="a.id" class="aviso" @click="cerrarAviso(a.id)">
            {{ a.texto }}
        </button>
    </div>
</template>

<script setup>
import { avisos, cerrarAviso } from '../servicios/avisos.js';
</script>
