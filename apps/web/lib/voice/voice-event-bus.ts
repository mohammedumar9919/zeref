export type VoiceEventListener = (eventType: string, data: unknown) => void;

const BUS_KEY = Symbol.for("zeref.voiceEventBus");

class VoiceEventBus {
  private readonly listeners = new Set<VoiceEventListener>();

  subscribe(listener: VoiceEventListener): () => void {
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
  [BUS_KEY]?: VoiceEventBus;
};

export function getVoiceEventBus(): VoiceEventBus {
  const globalRef = globalThis as GlobalWithBus;
  if (!globalRef[BUS_KEY]) {
    globalRef[BUS_KEY] = new VoiceEventBus();
  }
  return globalRef[BUS_KEY];
}

/** Test isolation — clears subscribers and replaces the singleton. */
export function resetVoiceEventBusForTests(): void {
  const globalRef = globalThis as GlobalWithBus;
  globalRef[BUS_KEY] = new VoiceEventBus();
}
