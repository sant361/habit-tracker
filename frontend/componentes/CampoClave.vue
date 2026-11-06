<template>
    <div class="campo-clave">
        <input
            :value="modelValue"
            :type="visible ? 'text' : 'password'"
            :autocomplete="autocomplete"
            :minlength="minlength"
            :maxlength="maxlength"
            :required="required"
            @input="$emit('update:modelValue', $event.target.value)">
        <button type="button" class="ver-clave" :aria-pressed="visible" :title="visible ? 'Ocultar la clave' : 'Mostrar la clave'" @click="visible = !visible">
            {{ visible ? 'Ocultar' : 'Mostrar' }}
        </button>
    </div>
</template>

<script setup>
import { ref } from 'vue';

// Campo de clave con un botón para verla mientras se escribe (útil en el celular)
defineProps({
    modelValue: String,
    autocomplete: { type: String, default: 'current-password' },
    minlength: Number,
    maxlength: Number,
    required: Boolean
});

defineEmits(['update:modelValue']);

const visible = ref(false);
</script>
