// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss, etc.
// Do not add those plugins manually or the app will break with duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    router: {
      virtualRouteConfig: "./src/routes.config.ts",
    },
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      failOnError: false,
    },
  },
  vite: {
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 5173,
      strictPort: true,
    },
  },
});
