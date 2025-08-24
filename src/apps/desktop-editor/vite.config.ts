import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  // Serve the icons directory as public root so /favicon.* resolves
  publicDir: path.resolve(process.cwd(), 'assets/images/icons'),
  resolve: {
    alias: {
      '@root': path.resolve(process.cwd()),
      '@src': path.resolve(process.cwd(), 'src')
    }
  },
  plugins: [react()],
  build: {
    // Output alongside the main bundle: dist/apps/desktop-editor/renderer
    outDir: path.resolve(__dirname, '../../../dist/apps/desktop-editor/renderer'),
    emptyOutDir: false,
  }
});