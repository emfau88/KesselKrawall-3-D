import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // Three.js is intentionally isolated, lazy-loaded and cacheable; its single
    // vendor module cannot be split further without duplicating runtime state.
    chunkSizeWarningLimit: 750,
    license: { fileName: "third-party-licenses.md" },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "three-vendor", test: /[\\/]node_modules[\\/]three[\\/]/ },
            { name: "r3f-vendor", test: /[\\/]node_modules[\\/]@react-three[\\/]fiber[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    passWithNoTests: false,
  },
});
