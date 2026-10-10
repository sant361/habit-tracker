import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    server: {
        // En desarrollo las llamadas a /api se reenvían al backend
        proxy: { '/api': 'http://localhost:3000' }
    }
});
