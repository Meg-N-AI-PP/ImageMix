import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'openai']
            }
          }
        }
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              // The package is "type": "module", so vite-plugin-electron emits
              // ESM. Output the preload as .mjs so Electron 31 loads it as a
              // native ES module preload (.cjs would still contain ESM syntax).
              output: {
                entryFileNames: '[name].mjs'
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});
