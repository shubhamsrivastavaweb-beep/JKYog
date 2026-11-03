import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDirectory,
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    fileParallelism: false,
  },
});