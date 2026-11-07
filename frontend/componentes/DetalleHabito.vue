<template>
    <div class="detalle-fondo" @click.self="$emit('cerrar')" @keydown.esc="$emit('cerrar')">
        <div class="detalle" role="dialog" aria-modal="true" :aria-label="'Detalle de ' + fila.nombre" tabindex="-1" ref="caja">
            <div class="detalle-cabecera">
                <div>
                    <h2><i class="punto" :style="{ background: fila.color }"></i> {{ fila.nombre }}</h2>
                    <small>{{ fila.categoria || 'Sin categoría' }} · Impacto {{ fila.peso }}/5 · Últimos {{ dias }} días</small>
                </div>
                <button class="boton secundario" @click="$emit('cerrar')">Cerrar</button>
            </div>

            <div class="detalle-datos">
                <div>
                    <b>{{ resumen.tasa === null ? '—' : Math.round(resumen.tasa * 100) + '%' }}</b>
                    <small>Cumplimiento</small>
                </div>
                <div>
                    <b>{{ resumen.hechos }}</b>
                    <small>{{ resumen.hechos === 1 ? 'día hecho' : 'días hechos' }}</small>
                </div>
                <div>
                    <b>{{ resumen.fallados }}</b>
                    <small>{{ resumen.fallados === 1 ? 'día fallado' : 'días fallados' }}</small>
                </div>
                <div>
                    <b>{{ fila.rachaActual }}</b>
                    <small>{{ fila.unidadRacha === 'semanas' ? 'semanas de racha' : 'racha actual' }}</small>
                </div>
                <div>
                    <b>{{ fila.mejorRacha }}</b>
                    <small>{{ fila.unidadRacha === 'semanas' ? 'mejor (semanas)' : 'mejor racha' }}</small>
                </div>
                <div v-if="resumen.pausados">
                    <b>{{ resumen.pausados }}</b>
                    <small>en pausa</small>
                </div>
            </div>

            <p class="detalle-ultimo">
                {{ resumen.ultimoHecho ? 'Último día cumplido: ' + fechaCorta(resumen.ultimoHecho) : 'Aún no lo has cumplido en este periodo.' }}
            </p>

            <template v-if="resumen.notas.length">
                <h3>Notas</h3>
                <ul class="detalle-notas">
                    <li v-for="n in resumen.notas" :key="n.fecha">
                        <small>{{ fechaCorta(n.fecha) }}</small>
                        {{ n.nota }}
                    </li>
                </ul>
            </template>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { fechaCorta } from '../servicios/fechas.js';
import { resumenHabito } from '../servicios/detalle.js';

const props = defineProps({
    fila: Object, // una fila de la matriz
    dias: Number // largo del periodo mostrado
});

defineEmits(['cerrar']);

const resumen = computed(() => resumenHabito(props.fila));

// El foco entra al cuadro para que Esc cierre sin tener que hacer clic antes
const caja = ref(null);
onMounted(() => caja.value && caja.value.focus());
</script>
