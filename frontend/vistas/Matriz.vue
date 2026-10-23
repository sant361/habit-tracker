<template>
    <section class="vista tema-matriz">
        <div class="cabecera-vista">
            <div>
                <h1>Matriz de rendimiento</h1>
                <p class="subtitulo">{{ saludo }} · {{ fechaLarga }}</p>
            </div>
            <SelectorPeriodo v-model="periodo" />
        </div>

        <FiltroCategorias v-if="categorias.length > 1" v-model="categoria" :categorias="categorias" />

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="cargando && !matriz" class="estado">Cargando...</p>

        <template v-else-if="matriz">
            <div class="resumen">
                <div class="dato-resumen dato-anillo">
                    <div class="anillo" :style="{ '--p': porcentajeGlobal }">
                        <span>{{ matriz.tasaGlobal === null ? '—' : porcentajeGlobal + '%' }}</span>
                    </div>
                    <div>
                        <small>Cumplimiento</small>
                        <b>del periodo</b>
                    </div>
                </div>
                <div class="dato-resumen">
                    <small>Hábitos activos</small>
                    <b>{{ matriz.filas.length }}</b>
                </div>
                <div class="dato-resumen">
                    <small>Mejor racha actual</small>
                    <b>{{ mejorRacha }} <em>días</em></b>
                </div>
            </div>

            <p v-if="!matriz.filas.length" class="estado">
                Aún no tienes hábitos. Crea el primero en "Mis hábitos".
            </p>
            <MatrizCuadricula v-else :matriz="matriz" @alternar="alternar" />

            <div class="leyenda">
                <span><i class="celda celda-hecho"></i> Hecho</span>
                <span><i class="celda celda-fallado"></i> Fallado</span>
                <span><i class="celda celda-pendiente"></i> Hoy pendiente</span>
                <span><i class="celda celda-no-toca"></i> No tocaba</span>
            </div>
        </template>
    </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';
import { hoy, sumarDias } from '../servicios/fechas.js';
import SelectorPeriodo from '../componentes/SelectorPeriodo.vue';
import FiltroCategorias from '../componentes/FiltroCategorias.vue';
import MatrizCuadricula from '../componentes/MatrizCuadricula.vue';

const periodo = ref(30);
const categoria = ref('');
const categorias = ref([]);
const matriz = ref(null);
const cargando = ref(false);
const error = ref('');

const saludo = computed(() => {
    const nombre = sesion.usuario ? sesion.usuario.nombre.split(' ')[0] : '';
    return nombre ? `Hola, ${nombre}` : 'Hola';
});

const fechaLarga = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
});

const porcentajeGlobal = computed(() =>
    matriz.value && matriz.value.tasaGlobal !== null ? Math.round(matriz.value.tasaGlobal * 100) : 0
);

const mejorRacha = computed(() =>
    matriz.value && matriz.value.filas.length ? Math.max(...matriz.value.filas.map((f) => f.rachaActual)) : 0
);

async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
        const hasta = hoy();
        const respuesta = await api.get('/estadisticas/matriz', {
            params: {
                desde: sumarDias(hasta, -(periodo.value - 1)),
                hasta,
                hoy: hasta,
                categoria: categoria.value || undefined
            }
        });
        matriz.value = respuesta.data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo cargar la matriz.');
    } finally {
        cargando.value = false;
    }
}

// Las categorías salen de los hábitos del usuario; con menos de dos no se muestra el filtro
async function cargarCategorias() {
    try {
        const lista = (await api.get('/habitos')).data;
        categorias.value = [...new Set(lista.map((h) => h.categoria).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'es')
        );
    } catch {
        // Sin categorías, el filtro simplemente no aparece
    }
}

async function alternar(habitoId, fecha) {
    try {
        await api.post('/registros/alternar', { habitoId, fecha });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo guardar el cambio.');
    }
}

watch([periodo, categoria], cargar);
onMounted(() => {
    cargarCategorias();
    cargar();
});
</script>
