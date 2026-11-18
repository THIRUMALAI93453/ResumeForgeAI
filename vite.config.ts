import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // When running the Python backend locally (uvicorn on :8000) without `netlify dev`.
    proxy: process.env.VITE_PROXY_PYTHON ? { "/api": "http://localhost:8000" } : undefined,
  },
});
