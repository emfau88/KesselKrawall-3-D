import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const workspace = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  root,
  base: "./",
  publicDir: `${workspace}public`,
  server: {
    host: "127.0.0.1",
    port: 5194,
    strictPort: true,
    fs: { allow: [workspace] },
  },
  plugins: [
    {
      name: "include-brasskin-assets",
      closeBundle() {
        mkdirSync(`${root}dist/assets/characters`, { recursive: true });
        cpSync(
          `${workspace}public/assets/characters/brasskin`,
          `${root}dist/assets/characters/brasskin`,
          { recursive: true },
        );
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    copyPublicDir: false,
    chunkSizeWarningLimit: 750,
  },
});
