import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target:
          "https://wxyvchvnwrpmwwyyfrvy6e2d6q0kclvz.lambda-url.ap-south-1.on.aws",
        changeOrigin: true,
      },
    },
  },
});
