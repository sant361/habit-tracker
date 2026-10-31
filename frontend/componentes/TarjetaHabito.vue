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

        <p v-if="habito.pausa" :class="['aviso-pausa', { activa: habito.pausa.activa }]">{{ textoPausa(habito.pausa) }}</p>

        <ul class="datos-personaje">
            <li><strong>Impacto:</strong> {{ habito.peso }} / 5</li>
            <li><strong>Desde:</strong> {{ habito.creadoEn }}</li>
        </ul>

        <form v-if="pausando" class="form-pausa" @submit.prevent="confirmarPausa">
            <label class="campo">
                Pausar hasta (opcional)
                <input v-model="hasta" type="date" :min="hoyISO">
            </label>
            <small>Sin fecha, queda en pausa hasta que la reanudes. Mientras tanto no cuenta para tu porcentaje ni rompe la racha.</small>
            <div class="acciones-form">
                <button type="submit" class="boton">Pausar</button>
                <button type="button" class="boton secundario" @click="cancelarPausa">Cancelar</button>
            </div>
        </form>

        <div class="acciones-tarjeta">
            <button class="boton secundario" @click="$emit('editar', habito)">Editar</button>
            <button v-if="habito.pausa" class="boton secundario" @click="$emit('reanudar', habito)">
                {{ habito.pausa.activa ? 'Reanudar' : 'Cancelar pausa' }}
            </button>
            <button v-else class="boton secundario" @click="pausando = !pausando">Pausar</button>
            <button class="boton peligro" @click="$emit('archivar', habito)">Archivar</button>
        </div>
    </article>
</template>

<script setup>
import { ref } from 'vue';
import { NOMBRES_DIAS, hoy } from '../servicios/fechas.js';
import { textoPausa } from '../servicios/pausas.js';

defineProps({
    habito: Object
});

const emit = defineEmits(['editar', 'archivar', 'pausar', 'reanudar']);

const hoyISO = hoy();
const pausando = ref(false);
const hasta = ref('');

function confirmarPausa() {
    emit('pausar', hasta.value || null);
    cancelarPausa();
}

function cancelarPausa() {
    pausando.value = false;
    hasta.value = '';
}
</script>
