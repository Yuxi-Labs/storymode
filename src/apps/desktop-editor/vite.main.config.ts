import { defineConfig } from 'vite';
import path from 'path';

const entry = path.resolve(__dirname, 'main/electron-main.ts');
const outDir = path.resolve(__dirname, '../../../dist/apps/desktop-editor/main');

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: false,
    target: 'node18',
    rollupOptions: {
      input: entry,
      external: ['electron', 'path', 'url'],
      output: {
        entryFileNames: 'electron-main.js',
        inlineDynamicImports: true,
        format: 'es'
      }
    }
  }
});