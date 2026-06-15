/** Read adapter callbacks — implemented in apps/web/lib/jarvis/zeref-context.ts (C153). */
export type ZerefReadContext = {
  /** True when fixture or live DB can serve reads (C158). */
  canRead(): boolean;
  unavailableMessage(toolName: string): string;
  loadCockpitSummary(): Promise<unknown>;
  getLatestReportHeadline(): Promise<unknown>;
  getPipelineStatus(): Promise<unknown>;
  getReportArtifact(artifactId: string): Promise<unknown>;
  getWorkerHealth(): Promise<unknown>;
  memorySearch(query: string, limit?: number): Promise<unknown>;
  memorySave(
    content: string,
    opts?: { turnId?: string; tags?: string[] },
  ): Promise<unknown>;
};

/** Write adapter callbacks — implemented in apps/web BFF layer (C154). */
export type ZerefWriteContext = {
  enqueueJob(body: unknown, idempotencyKey?: string): Promise<unknown>;
  createCalendarEvent(body: unknown, idempotencyKey?: string): Promise<unknown>;
  updateStudioDraft(
    entityId: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<unknown>;
  createResearchTopic(body: unknown, idempotencyKey?: string): Promise<unknown>;
};

export type ZerefContext = {
  read: ZerefReadContext;
  write: ZerefWriteContext;
};
