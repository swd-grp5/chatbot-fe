// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Cloudflare build emits dist/server/index.js; prerender preview expects dist/server/server.js.
const fixServerBundleForPrerender = (): Plugin => ({
  name: "fix-server-bundle-for-prerender",
  writeBundle(options) {
    if (!options.dir?.replace(/\\/g, "/").endsWith("/server")) return;
    const index = join(options.dir, "index.js");
    const server = join(options.dir, "server.js");
    if (existsSync(index) && !existsSync(server)) copyFileSync(index, server);
  },
});

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      failOnError: false,
    },
  },
  vite: {
    plugins: [fixServerBundleForPrerender()],
  },
});
