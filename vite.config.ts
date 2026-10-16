import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// La versión instalada de MediaPipe fija la URL del WASM en el CDN,
// así el JS empaquetado y el WASM descargado siempre coinciden.
const mediapipePkg = JSON.parse(
  readFileSync(new URL('./node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  // Rutas relativas: el mismo build sirve en Vercel y en un subpath de GitHub Pages.
  base: './',
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipePkg.version),
  },
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
