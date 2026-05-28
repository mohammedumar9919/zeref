/**
 * OpenAPI generation stub (ADR-003).
 *
 * Phase 1: documents the derivation plan. Full @asteasolutions/zod-to-openapi
 * registry ships when HTTP routes exist (Phase 2+).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(repoRoot, "packages/contracts/openapi");
const outFile = join(outDir, "zeref-phase1.stub.json");

const stub = {
  openapi: "3.1.0",
  info: {
    title: "Zeref API (Phase 1 stub)",
    version: "1.0.0",
    description:
      "Stub artifact from scripts/generate-openapi.mjs. Replace with zod-to-openapi output when routes land.",
  },
  paths: {},
  components: {
    schemas: {
      Note: {
        type: "string",
        description: "Register Zod schemas from @zeref/contracts via ADR-003.",
      },
    },
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(stub, null, 2)}\n`, "utf8");
console.log(`[generate-openapi] Wrote stub: ${outFile}`);
