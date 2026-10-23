<template>
    <section class="vista tema-hoy">
        <div class="cabecera-vista">
            <div>
                <h1>Hoy</h1>
                <p class="subtitulo">{{ saludo }} · {{ fechaLarga }}</p>
            </div>
        </div>

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="cargando && !datos" class="estado">Cargando...</p>

        <template v-else-if="datos">
            <p v-if="!datos.filas.length" class="estado">
                Aún no tienes hábitos. Crea el primero en "Mis hábitos".
            </p>
            <p v-else-if="!programados.length" class="estado">Hoy no te toca ningún hábito.</p>

            <template v-else>
                <div class="hoy-resumen">
                    <div class="anillo" :style="{ '--p': porcentaje }">
                        <span>{{ hechos }}/{{ programados.length }}</span>
                    </div>
                    <div>
                        <b>{{ mensaje }}</b>
                        <small>{{ hechos }} de {{ programados.length }} hábitos completados hoy</small>
                    </div>
                </div>

                <ul class="hoy-lista">
                    <li v-for="fila in programados" :key="fila.habitoId">
                        <button :class="['hoy-item', { hecho: estaHecho(fila) }]" @click="alternar(fila)">
                            <span
                                class="hoy-check"
                                :style="{
                                    borderColor: fila.color,
                                    background: estaHecho(fila) ? fila.color : 'transparent'
                                }">
                                <svg v-if="estaHecho(fila)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 12l5 5L20 7" />
                                </svg>
                            </span>
                            <span class="hoy-nombre">
                                <strong>{{ fila.nombre }}</strong>
                                <small>{{ fila.categoria || 'Sin categoría' }}</small>
                            </span>
                            <span class="hoy-racha">
                                <b>{{ fila.rachaActual }}</b>
                                <small>{{ fila.rachaActual === 1 ? 'día' : 'días' }} de racha</small>
                            </span>
                        </button>
                    </li>
                </ul>
            </template>

            <details v-if="resto.length" class="hoy-resto">
                <summary>No tocan hoy ({{ resto.length }})</summary>
                <ul>
                    <li v-for="fila in resto" :key="fila.habitoId">
                        <i class="punto" :style="{ background: fila.color }"></i>
                        {{ fila.nombre }}
                    </li>
                </ul>
            </details>
        </template>
    </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';
import { hoy } from '../servicios/fechas.js';

const datos = ref(null);
const cargando = ref(false);
const error = ref('');
const fecha = ref(hoy());

const saludo = computed(() => {
    const nombre = sesion.usuario ? sesion.usuario.nombre.split(' ')[0] : '';
    return nombre ? `Hola, ${nombre}` : 'Hola';
});

const fechaLarga = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
});

// La matriz de un solo día (desde = hasta = hoy) ya trae el estado de hoy y la racha.
const estaHecho = (fila) => fila.celdas[0].estado === 'hecho';

// Los que tocan hoy, más cualquiera que ya se marcó aunque no tocara
const programados = computed(() =>
    datos.value ? datos.value.filas.filter((f) => f.celdas[0].programado || estaHecho(f)) : []
);

const resto = computed(() =>
    datos.value ? datos.value.filas.filter((f) => !programados.value.includes(f)) : []
);

const hechos = computed(() => programados.value.filter(estaHecho).length);

const porcentaje = computed(() =>
    programados.value.length ? Math.round((hechos.value / programados.value.length) * 100) : 0
);

const mensaje = computed(() => {
    if (porcentaje.value === 100) return '¡Día completo!';
    if (porcentaje.value >= 50) return 'Vas muy bien';
    if (porcentaje.value > 0) return 'Buen comienzo';
    return 'Empieza con uno';
});

async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
        fecha.value = hoy();
        const respuesta = await api.get('/estadisticas/matriz', {
            params: { desde: fecha.value, hasta: fecha.value, hoy: fecha.value }
        });
        datos.value = respuesta.data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudieron cargar los hábitos de hoy.');
    } finally {
        cargando.value = false;
    }
}

async function alternar(fila) {
    try {
        await api.post('/registros/alternar', { habitoId: fila.habitoId, fecha: fecha.value });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo guardar el cambio.');
    }
}

onMounted(cargar);
</script>
