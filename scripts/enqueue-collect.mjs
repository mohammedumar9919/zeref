#!/usr/bin/env node
/**
 * CLI enqueue for collect jobs (Q4). No HTTP route.
 *
 * Usage:
 *   node scripts/enqueue-collect.mjs [--file path/to/job.json]
 *   DATABASE_URL=postgres://... node scripts/enqueue-collect.mjs
 *
 * Default payload: fixtures/phase-2/collect-job-input.valid.json
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PgBoss from "pg-boss";
import { CollectJobInputSchema } from "@zeref/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const COLLECT_JOB_NAME = "collect";

function parseArgs(argv) {
  let file = join(repoRoot, "fixtures/phase-2/collect-job-input.valid.json");
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--file" && argv[i + 1]) {
      file = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`Usage: node scripts/enqueue-collect.mjs [--file job.json]`);
      process.exit(0);
    }
  }
  return { file };
}

async function main() {
  const { file } = parseArgs(process.argv);
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:35432/zeref";

  const raw = JSON.parse(readFileSync(file, "utf8"));
  const job = CollectJobInputSchema.parse(raw);

  const boss = new PgBoss(connectionString);
  await boss.start();

  const jobId = await boss.send(COLLECT_JOB_NAME, job, {
    retryLimit: 3,
    retryDelay: 30,
  });

  await boss.stop();

  console.log(JSON.stringify({ queue: COLLECT_JOB_NAME, jobId, input: job }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
