export const WATCH_TRIGGERS = ["schedule", "on_demand", "task_scheduler"] as const;
export type WatchTrigger = (typeof WATCH_TRIGGERS)[number];

export const DEFAULT_WATCH_INTERVAL_HOURS = 4;
export const DEFAULT_GRAPH_DAILY_CAP = 200;
export const WATCH_TOKEN_WARN_DAYS = 7;

type Env = Record<string, string | undefined>;

/** Watch schedule is opt-in: only `ZEREF_WATCH_ENABLED=1` turns it on. */
export function isWatchEnabled(env: Env = process.env): boolean {
  return env.ZEREF_WATCH_ENABLED?.trim() === "1";
}

/** `ZEREF_COLLECT_INTERVAL_HOURS` → whole hours, default 4, clamped to 1–24. */
export function parseCollectIntervalHours(raw: string | undefined): number {
  if (!raw?.trim()) return DEFAULT_WATCH_INTERVAL_HOURS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_WATCH_INTERVAL_HOURS;
  return Math.min(24, Math.max(1, parsed));
}

/** Cron for the recurring watch run; 24 h runs once at 00:00. */
export function collectIntervalCron(hours: number): string {
  const interval = Number.isFinite(hours)
    ? Math.min(24, Math.max(1, Math.floor(hours)))
    : DEFAULT_WATCH_INTERVAL_HOURS;
  return interval >= 24 ? "0 0 * * *" : `0 */${interval} * * *`;
}

/** `ZEREF_GRAPH_DAILY_CAP` → non-negative integer, default 200. */
export function parseGraphDailyCap(raw: string | undefined): number {
  if (!raw?.trim()) return DEFAULT_GRAPH_DAILY_CAP;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_GRAPH_DAILY_CAP;
}

export function parseWatchTrigger(data: unknown): WatchTrigger {
  const raw =
    data && typeof data === "object" ? (data as { trigger?: unknown }).trigger : undefined;
  return typeof raw === "string" && (WATCH_TRIGGERS as readonly string[]).includes(raw)
    ? (raw as WatchTrigger)
    : "schedule";
}

/** UTC midnight of `d` — the daily budget window. */
export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type WatchCliArgs = {
  trigger: WatchTrigger;
  direct: boolean;
  help: boolean;
};

export function parseWatchCliArgs(argv: string[]): WatchCliArgs {
  const out: WatchCliArgs = { trigger: "task_scheduler", direct: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--direct") out.direct = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--trigger") {
      const value = argv[i + 1];
      i += 1;
      if (!value || !(WATCH_TRIGGERS as readonly string[]).includes(value)) {
        throw new Error(`--trigger must be one of ${WATCH_TRIGGERS.join(", ")}`);
      }
      out.trigger = value as WatchTrigger;
    } else {
      throw new Error("unknown argument (values are not echoed; see --help)");
    }
  }
  return out;
}
