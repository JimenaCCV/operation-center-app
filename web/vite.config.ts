import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, /api se reenvía al back (npm run dev en la raíz del repo, puerto 3000).
// Así el navegador ve un solo origen y no hace falta configurar CORS.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": API_TARGET } },
  preview: { port: 5173, proxy: { "/api": API_TARGET } },
});
