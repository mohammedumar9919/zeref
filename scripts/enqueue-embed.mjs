#!/usr/bin/env node
/**
 * CLI enqueue for embed jobs (Phase 3).
 *
 * Usage:
 *   node scripts/enqueue-embed.mjs [--file path/to/job.json]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PgBoss from "pg-boss";
import { EmbedJobInputSchema } from "@zeref/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const JOB_NAME = "embed";

function parseArgs(argv) {
  let file = join(repoRoot, "fixtures/phase-3/embed-job-input.valid.json");
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--file" && argv[i + 1]) {
      file = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`Usage: node scripts/enqueue-embed.mjs [--file job.json]`);
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
  const job = EmbedJobInputSchema.parse(raw);

  const boss = new PgBoss(connectionString);
  await boss.start();

  const jobId = await boss.send(JOB_NAME, job, {
    retryLimit: 3,
    retryDelay: 30,
  });

  await boss.stop();

  console.log(JSON.stringify({ queue: JOB_NAME, jobId, input: job }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
