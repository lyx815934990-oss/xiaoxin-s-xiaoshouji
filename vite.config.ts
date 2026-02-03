import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  build: {
    // 优化移动端构建
    target: "es2015",
    minify: "esbuild",
    cssMinify: true,
    // 确保资源路径正确
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // 确保 base 路径正确
  base: "/",
});


