import type { DataMode } from "@/components/hud/DataModeProvider";

/** Server-side: which data the cockpit is showing (fixture sample vs live Instagram). */
export function resolveDataMode(env: NodeJS.ProcessEnv = process.env): DataMode {
  return env.ZEREF_BFF_FIXTURE === "1" ? "fixture" : "live";
}

export function dataModeLabel(mode: DataMode): string {
  return mode === "fixture" ? "Fixture" : "Live";
}
