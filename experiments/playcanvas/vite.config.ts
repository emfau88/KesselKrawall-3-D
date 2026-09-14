import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    base: './',
    publicDir: '../../public',
    plugins: [react()],
    server: {
        host: '127.0.0.1',
        port: 5190,
        strictPort: true
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        copyPublicDir: false
    }
});
