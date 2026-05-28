import { existsSync } from "node:fs";

if (existsSync("dist/client/index.html")) {
  console.log("Static build OK: dist/client/index.html");
  process.exit(0);
}

console.error("Static build failed: dist/client/index.html not found");
process.exit(1);
