import { reactive } from 'vue';

// Avisos flotantes que desaparecen solos
export const avisos = reactive({ lista: [] });

let contador = 0;

export function avisar(texto, milisegundos = 6000) {
    const id = ++contador;
    avisos.lista.push({ id, texto });
    setTimeout(() => cerrarAviso(id), milisegundos);
}

export function cerrarAviso(id) {
    const i = avisos.lista.findIndex((a) => a.id === id);
    if (i !== -1) avisos.lista.splice(i, 1);
}
