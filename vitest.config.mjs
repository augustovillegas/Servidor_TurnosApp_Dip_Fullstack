import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 45000,
    testTimeout: 45000,
  },
});
