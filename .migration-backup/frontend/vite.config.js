import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
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
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
        allowedHosts: [
            'localhost',
            '192.168.1.61',
            '192.168.1.64',
            '192.168.88.7',
            '.ngrok-free.dev',
            '.ngrok-free.app',
            '.ngrok.io',
        ],
    }
});
