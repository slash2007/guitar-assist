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
        name: "Fret Reaction",
        short_name: "Fret Reaction",
        description: "Practice anytime until natural notes take about two seconds",
        theme_color: "#0c0d0f",
        background_color: "#0c0d0f",
        display: "standalone",
        start_url: "/",
        lang: "en",
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
