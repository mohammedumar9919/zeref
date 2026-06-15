export type ToolExecutionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  auditMeta?: Record<string, unknown>;
};

/** Tool execution port (C144) — core never calls Zeref APIs directly. */
export type ToolExecutorPort = {
  execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult>;
};
