<template>
    <div class="matriz-scroll">
        <table class="matriz">
            <thead>
                <tr>
                    <th class="col-habito">Hábito</th>
                    <th
                        v-for="fecha in matriz.dias"
                        :key="fecha"
                        :class="['col-dia', { 'es-hoy': fecha === hoyISO }]">
                        <span>{{ etiquetaDia(fecha).letra }}</span>
                        <b>{{ etiquetaDia(fecha).numero }}</b>
                    </th>
                    <th class="col-dato">Cumpl.</th>
                    <th class="col-dato">Racha</th>
                </tr>
            </thead>

            <tbody>
                <tr v-for="fila in matriz.filas" :key="fila.habitoId">
                    <th class="col-habito">
                        <i class="punto" :style="{ background: fila.color }"></i>
                        {{ fila.nombre }}
                    </th>
                    <td v-for="celda in fila.celdas" :key="celda.fecha">
                        <button
                            :class="['celda', 'celda-' + celda.estado]"
                            :style="celda.estado === 'hecho' ? { background: fila.color } : null"
                            :disabled="celda.estado === 'futuro'"
                            :title="celda.fecha + ' · ' + textoEstado[celda.estado]"
                            @click="$emit('alternar', fila.habitoId, celda.fecha)"></button>
                    </td>
                    <td class="col-dato">
                        <span class="etiqueta-tasa">{{ porcentaje(fila.tasa) }}</span>
                    </td>
                    <td class="col-dato">
                        <b>{{ fila.rachaActual }}</b>
                        <small>mejor {{ fila.mejorRacha }}</small>
                    </td>
                </tr>
            </tbody>

            <tfoot>
                <tr>
                    <th class="col-habito">Puntaje diario</th>
                    <td v-for="(puntaje, i) in matriz.puntajeDiario" :key="i">
                        <span class="calor" :style="estiloCalor(puntaje)">
                            {{ puntaje === null ? '' : Math.round(puntaje * 100) }}
                        </span>
                    </td>
                    <td class="col-dato">
                        <span class="etiqueta-tasa">{{ porcentaje(matriz.tasaGlobal) }}</span>
                    </td>
                    <td class="col-dato"></td>
                </tr>
            </tfoot>
        </table>
    </div>
</template>

<script setup>
import { hoy, etiquetaDia } from '../servicios/fechas.js';

defineProps({
    matriz: Object
});

defineEmits(['alternar']);

const hoyISO = hoy();

const textoEstado = {
    hecho: 'Hecho',
    fallado: 'Fallado',
    pendiente: 'Pendiente',
    'no-toca': 'No tocaba',
    futuro: 'Futuro'
};

const porcentaje = (valor) => (valor === null ? '—' : Math.round(valor * 100) + '%');

// Mapa de calor: más cumplimiento = verde más intenso
function estiloCalor(puntaje) {
    if (puntaje === null) return { background: 'transparent' };
    return {
        background: `color-mix(in srgb, var(--acento) ${Math.round(12 + puntaje * 88)}%, transparent)`,
        color: puntaje > 0.6 ? 'var(--acento-texto)' : 'var(--texto-suave)'
    };
}
</script>
