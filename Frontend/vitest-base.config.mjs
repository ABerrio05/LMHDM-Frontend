import { defineConfig } from 'vitest/config';

// El equipo de desarrollo dispone de recursos limitados. Un único proceso
// aislado evita que Vitest agote el tiempo al crear workers de tipo thread en
// Windows/Docker y hace el resultado reproducible en CI.
export default defineConfig({
  test: {
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
