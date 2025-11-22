import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 45000,
    testTimeout: 45000,
    threads: false,
    fileParallelism: false, // Ejecutar archivos de test uno a uno, no en paralelo
    sequence: {
      concurrent: false,
    },
    setupFiles: ["./tests/setup.mjs"],
  },
});
