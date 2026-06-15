# ADR-039: JARVIS core extraction and MCP-style tools (Phase 11)

**Status:** **PROPOSED** (Lead 2026-06-15)  
**Date:** 2026-06-15  
**Owner:** P11-A + P11-C  
**Related:** [phase-11-contract.md](../phase-11-contract.md) C143–C144 · [ADR-020](./ADR-020-jarvis-voice-bff.md) · Phase 10.5 [ADR-037](./ADR-037-sse-outbox-consolidation.md)

---

## Context

Phase 6 shipped a **single-pass** kernel (`process-turn.ts`) with regex tool routing and fixture JSON reads. Phase 10.5 stabilized the cockpit SSE bus. Phase 11 must deliver a **portable agentic core** — extractable into a future standalone personal partner (master plan Pass-4 §10.5).

Today `@zeref/jarvis-kernel` imports `@zeref/zeref-memory` directly, coupling the kernel to Zeref's memory package and preventing extraction.

---

## Decision

### Module layout (P11-A)

| Path | Responsibility |
|------|----------------|
| `packages/jarvis-kernel/src/core/` | ReAct loop, budgets, persona, permissions, audit shapes |
| `packages/jarvis-kernel/src/core/ports/` | `LlmPort`, `MemoryPort`, `ToolExecutorPort` interfaces |
| `packages/jarvis-kernel/src/zeref/` | Zeref-specific tool implementations + BFF adapters (P11-C) |

**Rule:** `src/core/**` imports only `@zeref/contracts` and Node builtins — **never** `@zeref/zeref-memory`, `@zeref/db`, or `apps/web`.

### MCP-style tool protocol (C143)

Each tool registers a `ToolDescriptor`:

```ts
{
  name: string;
  description: string;
  inputSchema: JSONSchema;      // Zod → JSON Schema export
  riskTier: "read" | "write-low" | "write-high";
  idempotent: boolean;
  costHint?: "cheap" | "moderate" | "expensive";
}
```

Tool execution returns structured `{ ok, data?, error?, auditMeta }` — not raw strings.

### Legacy tools (P11-C migration)

| Legacy | Phase 11 |
|--------|----------|
| `src/tools/registry.ts` regex | Descriptor registry + LLM tool-choice |
| Fixture JSON file reads | Live adapters with fixture fallback (C158) |
| Direct memory calls | `MemoryPort` implementation in `src/zeref/` |

---

## Consequences

- P11-A ships core + fake-port tests before any web wiring
- P11-C owns all Zeref I/O; core stays pure
- Phase 15 streaming TTS consumes `agent.step` events — no kernel rewrite

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Keep regex routing + add loop | Not portable; no MCP interoperability |
| Put agent loop in `apps/web` | Violates extraction goal; untestable without Next |
| Import zeref-memory in core | Blocks standalone partner; test coupling |
