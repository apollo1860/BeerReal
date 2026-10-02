import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative Pfade, damit die App auch unter /BeerReal/ (GitHub Pages) läuft
  base: './',
  plugins: [react()],
  server: { host: true },
});
