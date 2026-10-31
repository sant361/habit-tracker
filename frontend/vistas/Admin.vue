<template>
    <section class="vista tema-admin">
        <div class="cabecera-vista">
            <div>
                <h1>Administración</h1>
                <p class="subtitulo">Cifras generales y cuentas. No se ven los hábitos ni las notas de nadie.</p>
            </div>
        </div>

        <p v-if="error" class="estado">{{ error }}</p>
        <p v-else-if="cargando && !resumen" class="estado">Cargando...</p>

        <template v-else-if="resumen">
            <div class="resumen">
                <div class="dato-resumen">
                    <small>Cuentas</small>
                    <b>{{ resumen.usuarios }}</b>
                </div>
                <div class="dato-resumen">
                    <small>Activas en 7 días</small>
                    <b>{{ resumen.activos }}</b>
                </div>
                <div class="dato-resumen">
                    <small>Hábitos activos</small>
                    <b>{{ resumen.habitos }}</b>
                </div>
                <div class="dato-resumen">
                    <small>Registros</small>
                    <b>{{ resumen.registros }}</b>
                </div>
            </div>

            <div v-if="claveNueva" class="codigo-nuevo caja-clave">
                <p>Clave temporal para <strong>{{ claveNueva.email }}</strong>:</p>
                <code>{{ claveNueva.clave }}</code>
                <small>Pásasela por un canal seguro. No se vuelve a mostrar y debería cambiarla al entrar, en Mi perfil.</small>
                <button class="boton secundario" @click="claveNueva = null">Listo, ya la copié</button>
            </div>

            <input v-model="busqueda" type="search" class="admin-busqueda" placeholder="Buscar por nombre o correo..." aria-label="Buscar cuenta">

            <div class="admin-tabla-caja">
                <table class="admin-tabla">
                    <thead>
                        <tr>
                            <th>Cuenta</th>
                            <th class="num">Hábitos</th>
                            <th class="num">Registros</th>
                            <th>Última actividad</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in visibles" :key="u.id">
                            <td>
                                <strong>{{ u.nombre }}</strong>
                                <span v-if="u.esAdmin" class="insignia-admin">admin</span>
                                <small>{{ u.email }}</small>
                            </td>
                            <td class="num">{{ u.habitos }}</td>
                            <td class="num">{{ u.registros }}</td>
                            <td>{{ textoActividad(u.ultimaActividad, hoyISO) }}</td>
                            <td>
                                <div v-if="!u.esAdmin" class="acciones-admin">
                                    <button class="boton secundario" :disabled="ocupado === u.id" @click="restablecer(u)">Nueva clave</button>
                                    <button class="boton peligro" :disabled="ocupado === u.id" @click="eliminar(u)">Eliminar</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-if="!visibles.length" class="estado">Ninguna cuenta coincide con la búsqueda.</p>
        </template>
    </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { hoy } from '../servicios/fechas.js';
import { textoActividad, filtrarUsuarios } from '../servicios/admin.js';
import { avisar } from '../servicios/avisos.js';

const hoyISO = hoy();
const resumen = ref(null);
const usuarios = ref([]);
const cargando = ref(false);
const error = ref('');
const busqueda = ref('');
const ocupado = ref(null); // id de la cuenta sobre la que se está actuando
const claveNueva = ref(null); // { email, clave } recién generada

const visibles = computed(() => filtrarUsuarios(usuarios.value, busqueda.value));

async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
        const [r, u] = await Promise.all([
            api.get('/admin/resumen', { params: { hoy: hoyISO } }),
            api.get('/admin/usuarios')
        ]);
        resumen.value = r.data;
        usuarios.value = u.data;
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo cargar el panel.');
    } finally {
        cargando.value = false;
    }
}

async function eliminar(u) {
    if (!confirm(`¿Eliminar la cuenta de ${u.nombre} (${u.email})? Se borran todos sus hábitos y su historial. No se puede deshacer.`)) return;
    ocupado.value = u.id;
    try {
        await api.delete('/admin/usuarios/' + u.id);
        avisar(`Se eliminó la cuenta de ${u.nombre}.`);
        await cargar();
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo eliminar la cuenta.');
    } finally {
        ocupado.value = null;
    }
}

async function restablecer(u) {
    if (!confirm(`¿Poner una clave temporal a ${u.nombre}? Su clave actual dejará de funcionar.`)) return;
    ocupado.value = u.id;
    try {
        const { data } = await api.post(`/admin/usuarios/${u.id}/clave`);
        claveNueva.value = { email: u.email, clave: data.clave };
    } catch (err) {
        error.value = mensajeError(err, 'No se pudo cambiar la clave.');
    } finally {
        ocupado.value = null;
    }
}

onMounted(cargar);
</script>
