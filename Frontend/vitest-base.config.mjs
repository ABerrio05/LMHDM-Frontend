import { defineConfig } from 'vitest/config';

// El equipo de desarrollo dispone de recursos limitados. Ejecutar las pruebas
// en un único hilo evita que Vitest agote el tiempo al crear varios workers.
export default defineConfig({
  test: {
    pool: 'threads',
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
