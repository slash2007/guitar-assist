import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,webmanifest}"],
        globIgnores: ["**/audio/**"],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.wav$/,
            handler: "CacheFirst",
            options: {
              cacheName: "guitar-samples",
              expiration: { maxEntries: 48 },
            },
          },
        ],
      },
      manifest: {
        name: "指板反应",
        short_name: "指板反应",
        description: "随时练几分钟，把指板自然音练到大约 2 秒",
        theme_color: "#0c0d0f",
        background_color: "#0c0d0f",
        display: "standalone",
        start_url: "/",
        lang: "zh-CN",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
