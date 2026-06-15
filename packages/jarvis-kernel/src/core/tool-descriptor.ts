import { z } from "zod";
import type { RiskTier } from "./permissions.js";

export type CostHint = "cheap" | "moderate" | "expensive";

/** MCP-style tool descriptor (C143). inputSchema is Zod record until P11-B JSON Schema export. */
export const ToolInputSchema = z.record(z.unknown());

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: typeof ToolInputSchema;
  riskTier: RiskTier;
  idempotent: boolean;
  costHint?: CostHint;
};

export function parseToolArgs(
  descriptor: ToolDescriptor,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  return descriptor.inputSchema.parse(raw);
}
