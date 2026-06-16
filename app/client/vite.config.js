import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "Arena Papan",
        short_name: "ArenaPapan",
        description:
          "Kumpulan board game: Ular Tangga, Ludo, Halma. Main online atau lawan bot.",
        lang: "id",
        theme_color: "#143b30",
        background_color: "#f7f1e3",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { "src": "pwa-192.png", "sizes": "192x192", "type": "image/png" },
          { "src": "pwa-512.png", "sizes": "512x512", "type": "image/png" },
          { "src": "pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Jangan layani index.html (fallback SPA) untuk berkas khusus crawler.
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/_redirects$/]
      }
    })
  ],
  server: { port: 5173 }
});
