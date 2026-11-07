<template>
    <article class="fila-card tarjeta-habito" :style="{ borderLeftColor: habito.color }">
        <div class="cabecera-tarjeta">
            <h2>{{ habito.nombre }}</h2>
            <div class="orden-botones">
                <button class="orden-boton" :disabled="primero" title="Mover antes" aria-label="Mover antes" @click="$emit('mover', -1)">←</button>
                <button class="orden-boton" :disabled="ultimo" title="Mover después" aria-label="Mover después" @click="$emit('mover', 1)">→</button>
            </div>
        </div>
        <p class="categoria">{{ habito.categoria || 'Sin categoría' }}</p>

        <p v-if="habito.metaSemanal" class="meta-semanal-texto">{{ textoMeta(habito.metaSemanal) }}</p>
        <div v-else class="chips-dias">
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
                Desde
                <input v-model="desde" type="date" :min="habito.creadoEn" :max="hoyISO" required>
            </label>
            <label class="campo">
                Hasta (opcional)
                <input v-model="hasta" type="date" :min="desde || habito.creadoEn">
            </label>
            <small>Sin fecha final, queda en pausa hasta que la reanudes. Si eliges días que ya pasaron, dejan de contar como fallados y no rompen la racha.</small>
            <p v-if="errorPausa" class="error-form">{{ errorPausa }}</p>
            <div class="acciones-form">
                <button type="submit" class="boton">Pausar</button>
                <button type="button" class="boton secundario" @click="cancelarPausa">Cancelar</button>
            </div>
        </form>

        <ul v-if="habito.pausasPasadas && habito.pausasPasadas.length" class="pausas-pasadas">
            <li v-for="p in habito.pausasPasadas" :key="p.desde">
                <span>Pausa: {{ textoPausaPasada(p) }}</span>
                <button type="button" class="enlace-quitar" title="Quitar esta pausa: esos días vuelven a contar" @click="$emit('quitar-pausa', habito, p)">Quitar</button>
            </li>
        </ul>

        <div class="acciones-tarjeta">
            <button class="boton secundario" @click="$emit('editar', habito)">Editar</button>
            <button class="boton secundario" title="Crear una copia de este hábito" @click="$emit('duplicar', habito)">Duplicar</button>
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
import { textoMeta } from '../servicios/semanal.js';
import { textoPausa, textoPausaPasada, errorDePausa } from '../servicios/pausas.js';

const props = defineProps({
    habito: Object,
    primero: Boolean, // ya está al principio de la lista
    ultimo: Boolean // ya está al final
});

const emit = defineEmits(['editar', 'archivar', 'pausar', 'reanudar', 'mover', 'duplicar', 'quitar-pausa']);

const hoyISO = hoy();
const pausando = ref(false);
const desde = ref(hoyISO);
const hasta = ref('');
const errorPausa = ref('');

function confirmarPausa() {
    errorPausa.value = errorDePausa({ desde: desde.value, hasta: hasta.value }, hoyISO, props.habito.creadoEn);
    if (errorPausa.value) return;
    emit('pausar', { desde: desde.value, hasta: hasta.value || null });
    cancelarPausa();
}

function cancelarPausa() {
    pausando.value = false;
    desde.value = hoyISO;
    hasta.value = '';
    errorPausa.value = '';
}
</script>
