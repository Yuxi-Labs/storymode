import { defineConfig } from 'vite';
import path from 'path';

const mainEntry = path.resolve(__dirname, 'main/electron-main.ts');
const outDir = path.resolve(__dirname, '../../../dist/apps/desktop-editor/main');

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: false,
    target: 'node18',
    rollupOptions: {
      input: { main: mainEntry },
      external: ['electron', 'path', 'url', 'fs', 'os'],
      output: {
        entryFileNames: () => 'electron-main.js',
        format: 'es'
      }
    }
  }
});