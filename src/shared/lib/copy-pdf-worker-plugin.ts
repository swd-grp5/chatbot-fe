import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

/** Copy pdf.js worker to public/ as .js so hosts serve application/javascript by default. */
export function copyPdfWorkerPlugin(): Plugin {
  return {
    name: "copy-pdf-worker",
    buildStart() {
      const from = resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
      const to = resolve("public/pdf.worker.min.js");
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    },
  };
}
