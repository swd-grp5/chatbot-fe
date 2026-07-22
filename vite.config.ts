// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss, etc.
// Do not add those plugins manually or the app will break with duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { copyPdfWorkerPlugin } from "./src/shared/lib/copy-pdf-worker-plugin";

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
    plugins: [copyPdfWorkerPlugin()],
    optimizeDeps: {
      include: [
        "react-pdf",
        "pdfjs-dist/build/pdf.mjs",
        "pdfjs-dist/build/pdf.worker.min.mjs",
        "docx-preview",
        "jszip",
      ],
    },
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
