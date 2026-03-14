import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rendererHost = process.env.CHRONOS_RENDERER_HOST ?? "127.0.0.1";
const rendererPort = Number(process.env.CHRONOS_RENDERER_PORT ?? "5183");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: rendererHost,
    port: rendererPort,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});