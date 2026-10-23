import { ref } from 'vue';

// Tema de la app: 'auto' sigue al sistema; 'claro' y 'oscuro' lo fuerzan.
// Se guarda en localStorage y se aplica como atributo data-tema en <html>.
const CLAVE = 'habit-tracker-tema';

export const OPCIONES_TEMA = [
    { id: 'auto', texto: 'Automático' },
    { id: 'claro', texto: 'Claro' },
    { id: 'oscuro', texto: 'Oscuro' }
];

const VALIDOS = OPCIONES_TEMA.map((o) => o.id);

function leer() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        return VALIDOS.includes(guardado) ? guardado : 'auto';
    } catch {
        return 'auto';
    }
}

export const tema = ref(leer());

export function aplicarTema(valor = tema.value) {
    if (valor === 'auto') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', valor);
}

export function cambiarTema(valor) {
    if (!VALIDOS.includes(valor)) return;
    tema.value = valor;
    try {
        localStorage.setItem(CLAVE, valor);
    } catch {
        // Sin almacenamiento disponible: el cambio vale solo mientras la página esté abierta
    }
    aplicarTema(valor);
}
