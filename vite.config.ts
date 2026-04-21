import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/ace-builds')) {
            return 'ace-editor';
          }

          if (id.includes('node_modules/@fortawesome')) {
            return 'fontawesome';
          }

          if (id.includes('node_modules/react-github-btn')) {
            return 'github-button';
          }

          if (id.includes('node_modules/zustand')) {
            return 'state';
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
