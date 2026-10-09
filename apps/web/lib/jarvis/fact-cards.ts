import {
  FACT_CARD_MAX_FIELDS,
  FactCardSchema,
  type FactCard,
  type FactCardBadge,
  type FactCardField,
} from "@zeref/contracts";

/** Executed tool call as returned by `runJarvisAgent` (failed calls carry `{ error }`). */
export type ExecutedToolCall = {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
};

type CardDraft = { title: string; fields: FactCardField[] };

const VALUE_MAX = 160;
const LOW_CONFIDENCE_SAMPLE = 5;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > VALUE_MAX ? `${trimmed.slice(0, VALUE_MAX - 1)}…` : trimmed;
}

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function contents(list: unknown, limit: number): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  for (const entry of list) {
    const content = text(record(entry)?.content);
    if (content) seen.add(content);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

function describeUsual(vsCohort: unknown): string | undefined {
  switch (vsCohort) {
    case "above":
      return "Above your usual";
    case "inline":
      return "In line with your usual";
    case "below":
      return "Below your usual";
    default:
      return undefined;
  }
}

/** Per-tool field whitelist. Tools not listed here never produce a card. */
const CARD_BUILDERS: Record<string, (data: Record<string, unknown>, args: Record<string, unknown>) => CardDraft | undefined> = {
  get_latest_report_headline(data) {
    const headline = text(data.headline);
    if (!headline) return undefined;
    return { title: "Latest report", fields: [{ label: "Headline", value: headline }] };
  },

  get_report_artifact(data) {
    const report = record(data.report);
    const engagement = record(report?.engagement);
    const score = count(engagement?.score);
    if (score === undefined) return undefined;
    const fields: FactCardField[] = [{ label: "Engagement score", value: score.toFixed(1) }];
    const usual = describeUsual(engagement?.vsCohort);
    if (usual) fields.push({ label: "Compared with usual", value: usual });
    const sampleSize = count(record(report?.cohort)?.sampleSize);
    if (sampleSize !== undefined) {
      fields.push({
        label: "Baseline",
        value: `${sampleSize} ${sampleSize === 1 ? "post" : "posts"}${
          sampleSize < LOW_CONFIDENCE_SAMPLE ? " — low confidence" : ""
        }`,
      });
    }
    return { title: "Last post vs your usual", fields };
  },

  memory_search(data) {
    const items = contents(data.results, 3);
    if (items.length === 0) return undefined;
    return { title: "From your memory", fields: items.map((value) => ({ label: "Saved", value })) };
  },

  vault_list(data) {
    const items = contents(data.items, 5);
    if (items.length === 0) return undefined;
    return { title: "Your vault", fields: items.map((value) => ({ label: "Pinned", value })) };
  },

  vault_pin(data) {
    const content = text(record(data.item)?.content);
    if (!content) return undefined;
    return {
      title: data.alreadyPinned === true ? "Already pinned" : "Pinned",
      fields: [{ label: "Item", value: content }],
    };
  },

  get_cockpit_summary(data) {
    const panels = record(data.panels);
    if (!panels) return undefined;
    const fields: FactCardField[] = [];
    const rows: Array<[string, string]> = [
      ["studio", "Studio posts"],
      ["calendar", "Calendar items"],
      ["reports", "Reports"],
      ["research", "Research topics"],
    ];
    for (const [key, label] of rows) {
      const itemCount = count(record(panels[key])?.itemCount);
      if (itemCount !== undefined) fields.push({ label, value: String(itemCount) });
    }
    return fields.length > 0 ? { title: "Cockpit at a glance", fields } : undefined;
  },

  get_pipeline_status(data) {
    const status = data.status === "active" ? "Active" : data.status === "idle" ? "Idle" : undefined;
    if (!status) return undefined;
    return { title: "Pipeline", fields: [{ label: "Status", value: status }] };
  },

  enqueue_job(data, args) {
    if (data.queued !== true) return undefined;
    const jobType = text(args.jobType);
    return {
      title: jobType === "collect" ? "Collect queued" : "Job queued",
      fields: jobType ? [{ label: "Job", value: jobType }] : [],
    };
  },
};

export const FACT_CARD_TOOLS = Object.keys(CARD_BUILDERS);

function resolveBadge(data: Record<string, unknown>): FactCardBadge {
  if (data.mocked === true || data.simulated === true) return "SIMULATED";
  if (process.env.ZEREF_BFF_FIXTURE === "1") return "FIXTURE";
  return "LIVE";
}

/** Build HUD fact cards from executed tool calls; only whitelisted fields, never invented values. */
export function buildFactCards(
  runId: string,
  toolCalls: ExecutedToolCall[],
  ts: string = new Date().toISOString(),
): FactCard[] {
  const cards: FactCard[] = [];
  toolCalls.forEach((call, index) => {
    const builder = CARD_BUILDERS[call.name];
    const data = record(call.result);
    if (!builder || !data || "error" in data || data.available === false) return;
    const draft = builder(data, call.args ?? {});
    if (!draft) return;
    const parsed = FactCardSchema.safeParse({
      id: `${runId}:${index}`,
      runId,
      toolName: call.name,
      title: draft.title,
      fields: draft.fields.slice(0, FACT_CARD_MAX_FIELDS),
      badge: resolveBadge(data),
      ts,
    });
    if (parsed.success) cards.push(parsed.data);
  });
  return cards;
}
