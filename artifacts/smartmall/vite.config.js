import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
if (!rawPort) {
    throw new Error('PORT environment variable is required but was not provided.');
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;
if (!basePath) {
    throw new Error('BASE_PATH environment variable is required but was not provided.');
}

export default defineConfig({
    base: basePath,
    plugins: [
        react(),
        tailwindcss(),
        runtimeErrorOverlay(),
        ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
            ? [
                await import('@replit/vite-plugin-cartographer').then((m) =>
                    m.cartographer({ root: import.meta.dirname }),
                ),
                await import('@replit/vite-plugin-dev-banner').then((m) =>
                    m.devBanner(),
                ),
            ]
            : []),
    ],
    build: {
        chunkSizeWarningLimit: 800,
        modulePreloadOptions: {
          exclude: [
            /charts-/,
            /motion-/,
            /scanner-/,
            /query-/
          ]
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
                    if (id.includes('node_modules/@tanstack/react-query')) return 'query';
                    if (id.includes('node_modules/framer-motion')) return 'motion';
                    if (id.includes('node_modules/@zxing') || id.includes('node_modules/html5-qrcode')) return 'scanner';
                    if (id.includes('node_modules/recharts')) return 'charts';
                    if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2pdf') || id.includes('node_modules/dom-to-image')) return 'pdf';
                },
            },
        },
    },
    server: {
        host: '0.0.0.0',
        port,
        strictPort: true,
        proxy: {
            '/smartmall-api-proxy': {
                target: 'https://samrtmall.cloud',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/smartmall-api-proxy/, ''),
            },
            '/storage': {
                target: 'https://samrtmall.cloud',
                changeOrigin: true,
                secure: true,
            },
        },
        allowedHosts: true,
    },
    preview: {
        host: '0.0.0.0',
        port,
        allowedHosts: true,
    },
});
