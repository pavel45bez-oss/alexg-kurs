import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "cursor/canvas": fileURLToPath(new URL("./src/canvas-shim.tsx", import.meta.url)) },
  },
});
