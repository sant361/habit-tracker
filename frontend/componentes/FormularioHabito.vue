<template>
    <form class="formulario-habito" @submit.prevent="enviar">
        <label class="campo">
            Nombre
            <input v-model="datos.nombre" type="text" maxlength="60" placeholder="Ej: Leer 20 minutos" required>
        </label>

        <label class="campo">
            Categoría (opcional)
            <input v-model="datos.categoria" type="text" maxlength="30" placeholder="Salud, estudio...">
        </label>

        <div class="fila-campos">
            <label class="campo">
                Color
                <input v-model="datos.color" type="color">
            </label>
            <label class="campo">
                Impacto (1-5)
                <select v-model.number="datos.peso">
                    <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                </select>
            </label>
        </div>

        <div class="campo">
            Días que toca
            <div class="dias-semana">
                <button
                    v-for="(nombre, i) in NOMBRES_DIAS"
                    :key="i"
                    type="button"
                    :class="['dia-boton', { activo: datos.dias.includes(i) }]"
                    @click="alternarDia(i)">
                    {{ nombre }}
                </button>
            </div>
        </div>

        <p v-if="error" class="error-form">{{ error }}</p>

        <div class="acciones-form">
            <button type="submit" class="boton">{{ habito ? 'Guardar cambios' : 'Crear hábito' }}</button>
            <button type="button" class="boton secundario" @click="$emit('cancelar')">Cancelar</button>
        </div>
    </form>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { NOMBRES_DIAS } from '../servicios/fechas.js';

const props = defineProps({
    habito: Object // si viene, se está editando
});

const emit = defineEmits(['guardar', 'cancelar']);

const error = ref('');
const datos = reactive({
    nombre: props.habito ? props.habito.nombre : '',
    categoria: props.habito ? props.habito.categoria || '' : '',
    color: props.habito ? props.habito.color : '#38bdf8',
    peso: props.habito ? props.habito.peso : 3,
    dias: props.habito ? [...props.habito.dias] : [0, 1, 2, 3, 4, 5, 6]
});

function alternarDia(i) {
    const pos = datos.dias.indexOf(i);
    if (pos >= 0) datos.dias.splice(pos, 1);
    else datos.dias.push(i);
}

function enviar() {
    if (!datos.nombre.trim()) {
        error.value = 'El nombre es obligatorio';
        return;
    }
    if (!datos.dias.length) {
        error.value = 'Elige al menos un día';
        return;
    }
    error.value = '';
    emit('guardar', { ...datos, dias: [...datos.dias].sort() });
}
</script>
