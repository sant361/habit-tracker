import { createApp } from 'vue';
import App from './layout/App.vue';
import './layout/style.css';
import './vistas/login.css';
import './vistas/matriz.css';
import './vistas/hoy.css';
import './vistas/progreso.css';
import './vistas/logros.css';
import './vistas/habitos.css';
import './vistas/perfil.css';
import { aplicarTema } from './servicios/tema.js';

// Se aplica antes de montar la app para que no parpadee el tema equivocado
aplicarTema();

createApp(App).mount('#app');
