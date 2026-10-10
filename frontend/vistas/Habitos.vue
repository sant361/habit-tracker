<template>
    <section class="vista tema-habitos">
        <div class="cabecera-vista">
            <div>
                <h1>Mis hábitos</h1>
                <p class="subtitulo">Define qué quieres construir y qué días te toca</p>
            </div>
            <button v-if="!mostrarFormulario" class="boton" @click="abrirFormulario(null)">+ Nuevo hábito</button>
        </div>

        <div v-if="mostrarFormulario" class="caja-formulario">
            <FormularioHabito
                :key="habitoEditando ? habitoEditando.id : 'nuevo'"
                :habito="habitoEditando"
                @guardar="guardar"
                @cancelar="cerrarFormulario" />
        </div>

        <p v-if="error" class="estado">{{ error }}</p>

        <div class="contenedor-card">
            <TarjetaHabito
                v-for="h in habitos"
                :key="h.id"
                :habito="h"
                @editar="abrirFormulario"
                @archivar="archivar" />
        </div>

        <p v-if="!habitos.length && !error && !mostrarFormulario" class="estado">
            Aún no tienes hábitos. Pulsa "Nuevo hábito" para crear el primero.
        </p>
    </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { hoy } from '../servicios/fechas.js';
import TarjetaHabito from '../componentes/TarjetaHabito.vue';
import FormularioHabito from '../componentes/FormularioHabito.vue';

const habitos = ref([]);
const error = ref('');
const mostrarFormulario = ref(false);
const habitoEditando = ref(null);

async function cargar() {
    try {
        habitos.value = (await api.get('/habitos')).data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudieron cargar los hábitos.');
    }
}

function abrirFormulario(habito) {
    habitoEditando.value = habito;
    mostrarFormulario.value = true;
}

function cerrarFormulario() {
    mostrarFormulario.value = false;
    habitoEditando.value = null;
}

async function guardar(datos) {
    try {
        if (habitoEditando.value) await api.put('/habitos/' + habitoEditando.value.id, datos);
        else await api.post('/habitos', { ...datos, creadoEn: hoy() });
        cerrarFormulario();
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo guardar el hábito.');
    }
}

async function archivar(habito) {
    if (!confirm(`¿Archivar "${habito.nombre}"? Dejará de aparecer en la matriz.`)) return;
    try {
        await api.delete('/habitos/' + habito.id);
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo archivar el hábito.');
    }
}

onMounted(cargar);
</script>
