<template>
    <section class="vista tema-hoy">
        <div class="cabecera-vista">
            <div>
                <h1>Hoy</h1>
                <p class="subtitulo">{{ saludo }} · {{ fechaLarga }}</p>
            </div>
        </div>

        <div class="hoy-navegacion">
            <button class="hoy-flecha" :disabled="desplazamiento <= -MAX_DIAS_ATRAS" title="Día anterior" aria-label="Día anterior" @click="irA(-1)">←</button>
            <div class="hoy-dia">
                <strong>{{ nombreDia(fecha, hoyISO) }}</strong>
                <small v-if="!esHoy">{{ fechaDelDia(fecha) }}</small>
            </div>
            <button class="hoy-flecha" :disabled="esHoy" title="Día siguiente" aria-label="Día siguiente" @click="irA(1)">→</button>
            <button v-if="!esHoy" class="boton secundario" @click="desplazamiento = 0">Volver a hoy</button>
        </div>

        <div v-if="semana.length && datos && datos.filas.length" class="hoy-semana">
            <button
                v-for="d in semana"
                :key="d.fecha"
                :class="['semana-dia', 'semana-n-' + d.nivel, { elegido: d.fecha === fecha, 'es-hoy': d.atras === 0 }]"
                :title="d.valor === null ? 'Sin hábitos que cumplir' : Math.round(d.valor * 100) + '%'"
                @click="desplazamiento = -d.atras">
                <small>{{ d.letra }}</small>
                <b>{{ d.numero }}</b>
            </button>
        </div>

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="cargando && !datos" class="estado">Cargando...</p>

        <template v-else-if="datos">
            <p v-if="!datos.filas.length" class="estado">
                Aún no tienes hábitos. Crea el primero en "Mis hábitos".
            </p>
            <p v-else-if="!programados.length" class="estado">{{ esHoy ? 'Hoy no te toca ningún hábito.' : 'Ese día no tocaba ningún hábito.' }}</p>

            <template v-else>
                <div class="hoy-resumen">
                    <div class="anillo" :style="{ '--p': porcentaje }">
                        <span>{{ hechos }}/{{ programados.length }}</span>
                    </div>
                    <div>
                        <b>{{ mensaje }}</b>
                        <small>{{ hechos }} de {{ programados.length }} hábitos completados {{ cuando }}</small>
                    </div>
                </div>

                <p v-if="avisoRiesgo" class="hoy-riesgo">{{ avisoRiesgo }}</p>

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
                                <small v-if="fila.metaSemanal" class="hoy-semanal">{{ textoProgresoSemana(fila) }}</small>
                                <small v-if="notaDe(fila)" class="hoy-nota-texto">{{ notaDe(fila) }}</small>
                            </span>
                            <span class="hoy-racha">
                                <b>{{ fila.rachaActual }}</b>
                                <small>{{ unidadDeRacha(fila.rachaActual, fila.unidadRacha) }} de racha</small>
                            </span>
                        </button>
                        <button
                            class="hoy-nota-boton"
                            :disabled="!estaHecho(fila)"
                            :title="estaHecho(fila) ? 'Nota del día' : 'Marca el hábito para añadir una nota'"
                            @click="abrirNota(fila)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                        </button>
                        <form
                            v-if="editando === fila.habitoId && estaHecho(fila)"
                            class="hoy-editor"
                            @submit.prevent="guardarNota(fila)">
                            <input v-model="borrador" type="text" maxlength="280" :placeholder="esHoy ? '¿Cómo te fue hoy?' : '¿Cómo te fue ese día?'" autofocus>
                            <button type="submit" class="boton">Guardar</button>
                            <button type="button" class="boton secundario" @click="editando = null">Cancelar</button>
                            <p v-if="errorNota" class="error-form hoy-editor-error">{{ errorNota }}</p>
                        </form>
                    </li>
                </ul>
            </template>

            <details v-if="resto.length" class="hoy-resto">
                <summary>No tocan {{ cuando }} ({{ resto.length }})</summary>
                <ul>
                    <li v-for="fila in resto" :key="fila.habitoId">
                        <i class="punto" :style="{ background: fila.color }"></i>
                        {{ fila.nombre }}
                        <small v-if="fila.metaSemanal" class="hoy-semanal">· {{ textoProgresoSemana(fila) }}</small>
                    </li>
                </ul>
            </details>

            <details v-if="pausados.length" class="hoy-resto">
                <summary>En pausa ({{ pausados.length }})</summary>
                <ul>
                    <li v-for="fila in pausados" :key="fila.habitoId">
                        <i class="punto" :style="{ background: fila.color }"></i>
                        {{ fila.nombre }}
                    </li>
                </ul>
            </details>
        </template>
    </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';
import { hoy, sumarDias } from '../servicios/fechas.js';
import { rachasEnRiesgo, textoRiesgo } from '../servicios/rachas.js';
import { semanalEnLista, textoProgresoSemana, unidadDeRacha } from '../servicios/semanal.js';
import { fechaLarga as fechaDelDia, nombreDia, mover, tiraSemana, MAX_DIAS_ATRAS } from '../servicios/dia.js';

const datos = ref(null);
const cargando = ref(false);
const error = ref('');
const semana = ref([]); // los últimos 7 días, para la tira
const desplazamiento = ref(0); // 0 = hoy, -1 = ayer...
const hoyISO = ref(hoy());
const fecha = ref(hoyISO.value); // el día que se está viendo
const esHoy = computed(() => desplazamiento.value === 0);
const cuando = computed(() => (esHoy.value ? 'hoy' : 'ese día'));
let ultimaCarga = 0;
const editando = ref(null); // id del hábito cuya nota se está escribiendo
const borrador = ref('');
const errorNota = ref('');

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
const notaDe = (fila) => fila.celdas[0].nota;

const estaPausado = (fila) => fila.celdas[0].estado === 'pausado';

// Los que tocan hoy y no están en pausa, más cualquiera que ya se marcó aunque no tocara
const programados = computed(() =>
    datos.value
        ? datos.value.filas.filter((f) =>
              f.metaSemanal
                  ? semanalEnLista(f, esHoy.value)
                  : (f.celdas[0].programado && !estaPausado(f)) || estaHecho(f)
          )
        : []
);

const pausados = computed(() => (datos.value ? datos.value.filas.filter(estaPausado) : []));

const resto = computed(() =>
    datos.value ? datos.value.filas.filter((f) => !programados.value.includes(f) && !estaPausado(f)) : []
);

// Solo hoy tiene sentido: los días pasados ya no se pueden "salvar" con una racha en juego
const avisoRiesgo = computed(() => (esHoy.value && datos.value ? textoRiesgo(rachasEnRiesgo(datos.value.filas)) : ''));

const hechos = computed(() => programados.value.filter(estaHecho).length);

const porcentaje = computed(() =>
    programados.value.length ? Math.round((hechos.value / programados.value.length) * 100) : 0
);

const mensaje = computed(() => {
    if (porcentaje.value === 100) return '¡Día completo!';
    if (!esHoy.value) return porcentaje.value > 0 ? 'Día parcial' : 'Sin hábitos marcados';
    if (porcentaje.value >= 50) return 'Vas muy bien';
    if (porcentaje.value > 0) return 'Buen comienzo';
    return 'Empieza con uno';
});

function irA(delta) {
    desplazamiento.value = mover(desplazamiento.value, delta);
}

async function cargar() {
    const turno = ++ultimaCarga;
    cargando.value = true;
    error.value = '';
    try {
        // "hoy" se recalcula por si la página estuvo abierta pasada la medianoche
        hoyISO.value = hoy();
        const dia = sumarDias(hoyISO.value, desplazamiento.value);
        const respuesta = await api.get('/estadisticas/matriz', {
            params: { desde: dia, hasta: dia, hoy: hoyISO.value }
        });
        // Si mientras tanto se pidió otro día, esta respuesta ya no sirve
        if (turno !== ultimaCarga) return;
        fecha.value = dia;
        datos.value = respuesta.data;
        await cargarSemana(turno);
    } catch (err) {
        if (turno === ultimaCarga) error.value = mensajeError(err, 'No se pudieron cargar los hábitos.');
    } finally {
        if (turno === ultimaCarga) cargando.value = false;
    }
}

// La tira es un complemento: si falla, el día se sigue mostrando sin ella
async function cargarSemana(turno) {
    try {
        const respuesta = await api.get('/estadisticas/matriz', {
            params: { desde: sumarDias(hoyISO.value, -6), hasta: hoyISO.value, hoy: hoyISO.value }
        });
        if (turno === ultimaCarga) semana.value = tiraSemana(respuesta.data, hoyISO.value);
    } catch {
        if (turno === ultimaCarga) semana.value = [];
    }
}

async function alternar(fila) {
    // Desmarcar un hábito borra su nota, así que se pide confirmación
    if (estaHecho(fila) && notaDe(fila) && !confirm('Al desmarcar este hábito se borrará su nota. ¿Continuar?')) return;

    try {
        await api.post('/registros/alternar', { habitoId: fila.habitoId, fecha: fecha.value });
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo guardar el cambio.');
    }
}

function abrirNota(fila) {
    editando.value = fila.habitoId;
    borrador.value = notaDe(fila) || '';
    errorNota.value = '';
}

async function guardarNota(fila) {
    errorNota.value = '';
    try {
        await api.put('/registros/nota', { habitoId: fila.habitoId, fecha: fecha.value, nota: borrador.value });
        editando.value = null;
        await cargar();
    } catch (err) {
        errorNota.value = mensajeError(err, 'No se pudo guardar la nota.');
    }
}

watch(desplazamiento, () => {
    editando.value = null;
    cargar();
});

onMounted(cargar);
</script>
