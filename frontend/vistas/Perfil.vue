<template>
    <section class="vista tema-perfil-ht">
        <div class="cabecera-vista">
            <div>
                <h1>Mi perfil</h1>
                <p class="subtitulo">Tu cuenta</p>
            </div>
        </div>

        <div class="contenedor-card">
            <article class="fila-card">
                <div class="avatar">{{ inicial }}</div>
                <h2>{{ sesion.usuario ? sesion.usuario.nombre : '' }}</h2>
                <ul class="datos-personaje">
                    <li><strong>Email:</strong> {{ sesion.usuario ? sesion.usuario.email : '' }}</li>
                </ul>
                <div class="acciones-tarjeta">
                    <button class="boton peligro" @click="sesion.cerrar()">Cerrar sesión</button>
                </div>
            </article>

            <article class="fila-card">
                <h2>Cambiar nombre</h2>
                <form class="form-perfil" @submit.prevent="guardarNombre">
                    <label class="campo">
                        Nombre
                        <input v-model="nombre" type="text" maxlength="60" required>
                    </label>
                    <p v-if="mensajeNombre.texto" :class="mensajeNombre.ok ? 'ok-form' : 'error-form'">{{ mensajeNombre.texto }}</p>
                    <button type="submit" class="boton" :disabled="guardando === 'nombre'">Guardar nombre</button>
                </form>
            </article>

            <article class="fila-card">
                <h2>Cambiar clave</h2>
                <form class="form-perfil" @submit.prevent="guardarClave">
                    <label class="campo">
                        Clave actual
                        <CampoClave v-model="claveActual" autocomplete="current-password" required />
                    </label>
                    <label class="campo">
                        Clave nueva
                        <CampoClave v-model="claveNueva" :minlength="6" :maxlength="72" autocomplete="new-password" required />
                    </label>
                    <p v-if="mensajeClave.texto" :class="mensajeClave.ok ? 'ok-form' : 'error-form'">{{ mensajeClave.texto }}</p>
                    <button type="submit" class="boton" :disabled="guardando === 'clave'">Cambiar clave</button>
                </form>
            </article>

            <article class="fila-card">
                <h2>Apariencia</h2>
                <p class="ayuda-tema">Automático sigue el tema de tu sistema.</p>
                <div class="selector-tema">
                    <button
                        v-for="opcion in OPCIONES_TEMA"
                        :key="opcion.id"
                        :class="['opcion-tema', { activo: tema === opcion.id }]"
                        @click="cambiarTema(opcion.id)">
                        {{ opcion.texto }}
                    </button>
                </div>
            </article>

            <article class="fila-card">
                <h2>Código de recuperación</h2>
                <p class="ayuda-tema">
                    Sirve para cambiar tu clave si la olvidas. Se muestra una sola vez y cada código nuevo anula el anterior.
                </p>
                <form class="form-perfil" @submit.prevent="generarCodigo">
                    <label class="campo">
                        Tu clave actual
                        <input v-model="claveCodigo" type="password" autocomplete="current-password" required>
                    </label>
                    <p v-if="errorCodigo" class="error-form">{{ errorCodigo }}</p>
                    <div v-if="codigoNuevo" class="codigo-nuevo">
                        <code>{{ codigoNuevo }}</code>
                        <small>Guárdalo ahora en un lugar seguro: no se vuelve a mostrar.</small>
                    </div>
                    <button type="submit" class="boton" :disabled="guardando === 'codigo'">
                        {{ codigoNuevo ? 'Generar otro código' : 'Generar código' }}
                    </button>
                </form>
            </article>

            <article class="fila-card">
                <h2>Mis datos</h2>
                <p class="ayuda-tema">
                    Descarga un respaldo con todos tus hábitos, pausas, registros y notas. Es un archivo JSON, sin claves.
                </p>
                <div class="form-perfil">
                    <p v-if="errorRespaldo" class="error-form">{{ errorRespaldo }}</p>
                    <button type="button" class="boton" :disabled="guardando === 'respaldo'" @click="descargarRespaldo">
                        {{ guardando === 'respaldo' ? 'Preparando...' : 'Descargar mis datos' }}
                    </button>
                </div>

                <p class="ayuda-tema">
                    ¿Tienes un respaldo? Impórtalo para agregar sus hábitos a esta cuenta. Los que ya existan con el mismo nombre no se tocan.
                </p>
                <div class="form-perfil">
                    <p v-if="mensajeImportar.texto" :class="mensajeImportar.ok ? 'ok-form' : 'error-form'">{{ mensajeImportar.texto }}</p>
                    <input ref="archivoRespaldo" type="file" accept=".json,application/json" hidden @change="importarRespaldo">
                    <button type="button" class="boton secundario" :disabled="guardando === 'importar'" @click="archivoRespaldo.click()">
                        {{ guardando === 'importar' ? 'Importando...' : 'Importar respaldo' }}
                    </button>
                </div>
            </article>

            <article class="fila-card zona-peligro">
                <h2>Eliminar cuenta</h2>
                <p class="ayuda-tema">Se borran tu cuenta, tus hábitos y todo tu historial. No se puede deshacer.</p>
                <form v-if="confirmandoBorrado" class="form-perfil" @submit.prevent="eliminarCuenta">
                    <label class="campo">
                        Escribe tu clave para confirmar
                        <input v-model="claveBorrado" type="password" autocomplete="current-password" required>
                    </label>
                    <p v-if="errorBorrado" class="error-form">{{ errorBorrado }}</p>
                    <div class="acciones-perfil">
                        <button type="submit" class="boton peligro" :disabled="guardando === 'borrado'">Sí, eliminar mi cuenta</button>
                        <button type="button" class="boton secundario" @click="cancelarBorrado">Cancelar</button>
                    </div>
                </form>
                <div v-else class="form-perfil">
                    <button type="button" class="boton peligro" @click="confirmandoBorrado = true">Eliminar mi cuenta</button>
                </div>
            </article>
        </div>
    </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import api, { mensajeError } from '../servicios/api.js';
import { sesion } from '../servicios/sesion.js';
import { tema, cambiarTema, OPCIONES_TEMA } from '../servicios/tema.js';
import { hoy } from '../servicios/fechas.js';
import CampoClave from '../componentes/CampoClave.vue';
import { MAX_BYTES, textoImportacion, leerRespaldo } from '../servicios/respaldo.js';

const inicial = computed(() => (sesion.usuario ? sesion.usuario.nombre.charAt(0).toUpperCase() : '?'));

const guardando = ref(''); // qué formulario se está enviando: 'nombre' | 'clave' | 'codigo' | 'respaldo' | 'importar' | 'borrado'

// Cambiar nombre
const nombre = ref(sesion.usuario ? sesion.usuario.nombre : '');
const mensajeNombre = reactive({ texto: '', ok: false });

async function guardarNombre() {
    guardando.value = 'nombre';
    mensajeNombre.texto = '';
    try {
        const { data } = await api.put('/auth/perfil', { nombre: nombre.value });
        sesion.actualizarUsuario(data.usuario);
        nombre.value = data.usuario.nombre;
        Object.assign(mensajeNombre, { texto: 'Nombre actualizado', ok: true });
    } catch (err) {
        Object.assign(mensajeNombre, { texto: mensajeError(err, 'No se pudo guardar el nombre'), ok: false });
    } finally {
        guardando.value = '';
    }
}

// Cambiar clave
const claveActual = ref('');
const claveNueva = ref('');
const mensajeClave = reactive({ texto: '', ok: false });

async function guardarClave() {
    guardando.value = 'clave';
    mensajeClave.texto = '';
    try {
        await api.put('/auth/clave', { claveActual: claveActual.value, claveNueva: claveNueva.value });
        claveActual.value = '';
        claveNueva.value = '';
        Object.assign(mensajeClave, { texto: 'Clave actualizada', ok: true });
    } catch (err) {
        Object.assign(mensajeClave, { texto: mensajeError(err, 'No se pudo cambiar la clave'), ok: false });
    } finally {
        guardando.value = '';
    }
}

// Código de recuperación
const claveCodigo = ref('');
const codigoNuevo = ref('');
const errorCodigo = ref('');

async function generarCodigo() {
    guardando.value = 'codigo';
    errorCodigo.value = '';
    try {
        const { data } = await api.post('/auth/codigo-recuperacion', { clave: claveCodigo.value });
        codigoNuevo.value = data.codigo;
        claveCodigo.value = '';
    } catch (err) {
        errorCodigo.value = mensajeError(err, 'No se pudo generar el código');
    } finally {
        guardando.value = '';
    }
}

// Descargar respaldo
const errorRespaldo = ref('');

async function descargarRespaldo() {
    guardando.value = 'respaldo';
    errorRespaldo.value = '';
    try {
        const respuesta = await api.get('/auth/respaldo', { responseType: 'blob' });
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(respuesta.data);
        enlace.download = `habit-tracker_respaldo_${hoy()}.json`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    } catch (err) {
        errorRespaldo.value = mensajeError(err, 'No se pudo descargar el respaldo');
    } finally {
        guardando.value = '';
    }
}

// Importar respaldo
const archivoRespaldo = ref(null);
const mensajeImportar = reactive({ texto: '', ok: false });

async function importarRespaldo(evento) {
    const archivo = evento.target.files[0];
    evento.target.value = ''; // así se puede elegir el mismo archivo otra vez
    if (!archivo) return;

    guardando.value = 'importar';
    mensajeImportar.texto = '';
    try {
        if (archivo.size > MAX_BYTES) throw new Error('El archivo es demasiado grande (máximo 5 MB)');
        const respaldo = leerRespaldo(await archivo.text());
        const { data } = await api.post('/auth/respaldo/importar', respaldo);
        Object.assign(mensajeImportar, { texto: textoImportacion(data), ok: true });
    } catch (err) {
        // Los errores del servidor traen su mensaje; los del archivo (JSON malo, muy grande) también
        const texto = err.response ? mensajeError(err, 'No se pudo importar el respaldo') : err.message || 'No se pudo importar el respaldo';
        Object.assign(mensajeImportar, { texto, ok: false });
    } finally {
        guardando.value = '';
    }
}

// Eliminar cuenta
const confirmandoBorrado = ref(false);
const claveBorrado = ref('');
const errorBorrado = ref('');

function cancelarBorrado() {
    confirmandoBorrado.value = false;
    claveBorrado.value = '';
    errorBorrado.value = '';
}

async function eliminarCuenta() {
    guardando.value = 'borrado';
    errorBorrado.value = '';
    try {
        await api.post('/auth/cuenta/eliminar', { clave: claveBorrado.value });
        sesion.cerrar();
    } catch (err) {
        errorBorrado.value = mensajeError(err, 'No se pudo eliminar la cuenta');
    } finally {
        guardando.value = '';
    }
}
</script>
