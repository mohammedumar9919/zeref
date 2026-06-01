export type CockpitEventListener = (eventType: string, data: unknown) => void;

const BUS_KEY = Symbol.for("zeref.cockpitEventBus");

class CockpitEventBus {
  private readonly listeners = new Set<CockpitEventListener>();

  subscribe(listener: CockpitEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(eventType: string, data: unknown): void {
    for (const listener of this.listeners) {
      listener(eventType, data);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

type GlobalWithBus = typeof globalThis & {
  [BUS_KEY]?: CockpitEventBus;
};

/** Unified in-process fan-out for voice.*, memory.*, and pipeline SSE (ADR-027 Amendment A). */
export function getCockpitEventBus(): CockpitEventBus {
  const globalRef = globalThis as GlobalWithBus;
  if (!globalRef[BUS_KEY]) {
    globalRef[BUS_KEY] = new CockpitEventBus();
  }
  return globalRef[BUS_KEY];
}

/** Test isolation — clears subscribers and replaces the singleton. */
export function resetCockpitEventBusForTests(): void {
  const globalRef = globalThis as GlobalWithBus;
  globalRef[BUS_KEY] = new CockpitEventBus();
}
