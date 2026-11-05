import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend runs on 5173, backend runs on 5000.
// /api requests are proxied so the frontend code can just call
// fetch("/api/...") without worrying about the backend's port/host.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
