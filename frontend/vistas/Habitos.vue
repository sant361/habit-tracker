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
                :categorias="categorias"
                @guardar="guardar"
                @cancelar="cerrarFormulario" />
        </div>

        <div v-if="habitos.length >= MIN_PARA_BUSCAR" class="busqueda-habitos">
            <input v-model="busqueda" type="search" placeholder="Buscar hábito..." aria-label="Buscar hábito">
            <FiltroCategorias v-if="categorias.length > 1" v-model="categoriaFiltro" :categorias="categorias" />
        </div>

        <p v-if="error" class="estado">{{ error }}</p>

        <div class="contenedor-card">
            <TarjetaHabito
                v-for="(h, i) in visibles"
                :key="h.id"
                :habito="h"
                :primero="filtrando || i === 0"
                :ultimo="filtrando || i === visibles.length - 1"
                @editar="abrirFormulario"
                @duplicar="duplicar"
                @quitar-pausa="quitarPausa"
                @archivar="archivar"
                @pausar="(hasta) => pausar(h, hasta)"
                @reanudar="reanudar"
                @mover="(delta) => mover(h, delta)" />
        </div>

        <p v-if="!habitos.length && !error && !mostrarFormulario" class="estado">
            Aún no tienes hábitos. Pulsa "Nuevo hábito" para crear el primero.
        </p>
        <p v-else-if="habitos.length && !visibles.length" class="estado">Ningún hábito coincide con tu búsqueda.</p>
        <p v-if="filtrando && visibles.length" class="estado">Para cambiar el orden, quita la búsqueda o el filtro.</p>

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
import { ref, computed, watch, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { hoy } from '../servicios/fechas.js';
import TarjetaHabito from '../componentes/TarjetaHabito.vue';
import FormularioHabito from '../componentes/FormularioHabito.vue';
import FiltroCategorias from '../componentes/FiltroCategorias.vue';
import { filtrarHabitos, categoriasDe } from '../servicios/busqueda.js';
import { moverElemento } from '../servicios/orden.js';
import { textoArchivado, textoRestaurado } from '../servicios/archivados.js';
import { avisar } from '../servicios/avisos.js';
import { datosDeCopia } from '../servicios/duplicar.js';
import { esPausaPasada } from '../servicios/pausas.js';

const habitos = ref([]);
const error = ref('');
const mostrarFormulario = ref(false);
const habitoEditando = ref(null);
const archivados = ref([]);

// Búsqueda: solo aparece cuando hay suficientes hábitos como para que valga la pena
const MIN_PARA_BUSCAR = 5;
const busqueda = ref('');
const categoriaFiltro = ref('');
const categorias = computed(() => categoriasDe(habitos.value));
const visibles = computed(() => filtrarHabitos(habitos.value, busqueda.value, categoriaFiltro.value));
const filtrando = computed(() => busqueda.value.trim() !== '' || categoriaFiltro.value !== '');

// Si la categoría elegida ya no existe (se borró o se archivó su último hábito), se quita el filtro
watch(categorias, (lista) => {
    if (categoriaFiltro.value && !lista.includes(categoriaFiltro.value)) categoriaFiltro.value = '';
});
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

// Crea una copia con los mismos ajustes; queda al final de la lista y empieza hoy
async function duplicar(habito) {
    error.value = '';
    try {
        // Los archivados también cuentan para el nombre, por si se restaura después
        const archivadosLista = (await api.get('/habitos/archivados')).data;
        const nombres = [...habitos.value, ...archivadosLista].map((h) => h.nombre);
        const { data } = await api.post('/habitos', datosDeCopia(habito, nombres, hoy()));
        avisar(`Se creó "${data.nombre}".`);
        await cargar();
        if (verArchivados.value) await cargarArchivados();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo duplicar el hábito.');
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

async function pausar(habito, { desde, hasta }) {
    error.value = '';
    try {
        await api.post(`/habitos/${habito.id}/pausar`, { desde, hasta });
        if (esPausaPasada({ hasta }, hoy())) avisar(`Pausa guardada: esos días ya no cuentan como fallados. Puedes quitarla desde la tarjeta.`);
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo pausar el hábito.');
    }
}

// Quita una pausa que ya terminó (por ejemplo si se registró por error): esos días vuelven a contar
async function quitarPausa(habito, pausa) {
    error.value = '';
    try {
        await api.post(`/habitos/${habito.id}/reanudar`, { fecha: pausa.desde });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo quitar la pausa.');
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
