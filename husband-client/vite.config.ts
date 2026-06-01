import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://127.0.0.1:4173";

  return {
    base: env.VITE_PUBLIC_BASE_PATH || "/",
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: false,
      proxy: {
        "/api": apiBaseUrl,
      },
    },
    preview: {
      port: 4174,
    },
  };
});
