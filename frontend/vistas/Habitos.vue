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
                v-for="(h, i) in habitos"
                :key="h.id"
                :habito="h"
                :primero="i === 0"
                :ultimo="i === habitos.length - 1"
                @editar="abrirFormulario"
                @archivar="archivar"
                @pausar="(hasta) => pausar(h, hasta)"
                @reanudar="reanudar"
                @mover="(delta) => mover(h, delta)" />
        </div>

        <p v-if="!habitos.length && !error && !mostrarFormulario" class="estado">
            Aún no tienes hábitos. Pulsa "Nuevo hábito" para crear el primero.
        </p>

        <div class="archivados">
            <button class="boton secundario" @click="alternarArchivados">
                {{ verArchivados ? 'Ocultar archivados' : 'Ver archivados' }}
            </button>

            <template v-if="verArchivados">
                <p v-if="!archivados.length" class="estado">No tienes hábitos archivados.</p>
                <ul v-else class="lista-archivados">
                    <li v-for="h in archivados" :key="h.id" :style="{ borderLeftColor: h.color }">
                        <div>
                            <strong>{{ h.nombre }}</strong>
                            <small>{{ h.categoria || 'Sin categoría' }} · {{ textoArchivado(h) }}</small>
                        </div>
                        <button class="boton secundario" @click="restaurar(h)">Restaurar</button>
                    </li>
                </ul>
            </template>
        </div>
    </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { hoy } from '../servicios/fechas.js';
import TarjetaHabito from '../componentes/TarjetaHabito.vue';
import FormularioHabito from '../componentes/FormularioHabito.vue';
import { moverElemento } from '../servicios/orden.js';
import { textoArchivado, textoRestaurado } from '../servicios/archivados.js';
import { avisar } from '../servicios/avisos.js';

const habitos = ref([]);
const error = ref('');
const mostrarFormulario = ref(false);
const habitoEditando = ref(null);
const archivados = ref([]);
const verArchivados = ref(false);

async function cargar() {
    try {
        habitos.value = (await api.get('/habitos', { params: { hoy: hoy() } })).data;
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
        await api.delete('/habitos/' + habito.id, { params: { hoy: hoy() } });
        await cargar();
        if (verArchivados.value) await cargarArchivados();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo archivar el hábito.');
    }
}

async function cargarArchivados() {
    try {
        archivados.value = (await api.get('/habitos/archivados')).data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudieron cargar los hábitos archivados.');
    }
}

async function alternarArchivados() {
    verArchivados.value = !verArchivados.value;
    if (verArchivados.value) await cargarArchivados();
}

async function restaurar(habito) {
    error.value = '';
    try {
        const { data } = await api.post(`/habitos/${habito.id}/restaurar`, null, { params: { hoy: hoy() } });
        avisar(textoRestaurado(habito.nombre, data.pausa));
        await Promise.all([cargar(), cargarArchivados()]);
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo restaurar el hábito.');
    }
}

async function pausar(habito, hasta) {
    error.value = '';
    try {
        await api.post(`/habitos/${habito.id}/pausar`, { desde: hoy(), hasta });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo pausar el hábito.');
    }
}

async function reanudar(habito) {
    error.value = '';
    try {
        await api.post(`/habitos/${habito.id}/reanudar`, { fecha: hoy() });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo reanudar el hábito.');
    }
}

// Cambia el orden al instante y lo guarda; si falla, vuelve a cargar el que tiene el servidor
async function mover(habito, delta) {
    const actual = habitos.value;
    const nueva = moverElemento(actual, actual.findIndex((h) => h.id === habito.id), delta);
    if (nueva === actual) return;

    error.value = '';
    habitos.value = nueva;
    try {
        await api.put('/habitos/orden', { ids: nueva.map((h) => h.id) });
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo guardar el orden.');
        await cargar();
    }
}

onMounted(cargar);
</script>
