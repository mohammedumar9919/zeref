"use client";

import { useEffect, useRef, useState } from "react";

import { FACT_CARD_EVENT, FactCardSchema, type FactCard } from "@zeref/contracts";

import { useVoice } from "@/components/voice/VoiceProvider";

export const FACT_CARD_DISMISS_MS = 12_000;
const MAX_VISIBLE = 3;

const BADGE_COPY: Record<FactCard["badge"], string> = {
  FIXTURE: "Fixture",
  SIMULATED: "Simulated",
  LIVE: "Live",
};

/** HUD fact cards: key values from the tool Jarvis just used (C17a). */
export function FactCards(): React.ReactElement | null {
  const { subscribeStreamEvents } = useVoice();
  const [cards, setCards] = useState<FactCard[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTimers = timers.current;
    const dismiss = (id: string) => {
      setCards((current) => current.filter((c) => c.id !== id));
      const timer = activeTimers.get(id);
      if (timer) clearTimeout(timer);
      activeTimers.delete(id);
    };

    const unsubscribe = subscribeStreamEvents((eventType, data) => {
      if (eventType !== FACT_CARD_EVENT) return;
      const parsed = FactCardSchema.safeParse(data);
      if (!parsed.success) return;
      const card = parsed.data;
      setCards((current) =>
        [card, ...current.filter((c) => c.id !== card.id)].slice(0, MAX_VISIBLE),
      );
      const previous = activeTimers.get(card.id);
      if (previous) clearTimeout(previous);
      activeTimers.set(card.id, setTimeout(() => dismiss(card.id), FACT_CARD_DISMISS_MS));
    });

    return () => {
      unsubscribe();
      for (const timer of activeTimers.values()) clearTimeout(timer);
      activeTimers.clear();
    };
  }, [subscribeStreamEvents]);

  if (cards.length === 0) return null;

  const close = (id: string) => {
    setCards((current) => current.filter((c) => c.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  };

  return (
    <aside
      data-testid="fact-cards"
      aria-label="Facts from Jarvis"
      aria-live="polite"
      className="pointer-events-none fixed right-6 top-24 z-30 flex w-[24rem] max-w-[calc(100vw-3rem)] flex-col gap-3"
    >
      {cards.map((card) => (
        <article
          key={card.id}
          data-testid="fact-card"
          data-tool-name={card.toolName}
          data-badge={card.badge}
          className="pointer-events-auto rounded-panel border border-hud-cyan/50 bg-panel/90 p-4 shadow-hud-glow backdrop-blur-md"
        >
          <header className="flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-medium leading-snug text-hud-primary">{card.title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <span
                data-testid="fact-card-badge"
                className="rounded border border-hud-cyan/40 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-hud-cyan/80"
              >
                {BADGE_COPY[card.badge]}
              </span>
              <button
                type="button"
                aria-label={`Close ${card.title}`}
                onClick={() => close(card.id)}
                className="rounded px-1 font-mono text-[15px] text-hud-muted hover:text-hud-primary"
              >
                ×
              </button>
            </div>
          </header>
          {card.fields.length > 0 ? (
            <dl className="mt-2 space-y-1.5">
              {card.fields.map((field, index) => (
                <div key={`${field.label}-${index}`} className="flex flex-col">
                  <dt className="font-mono text-[12px] uppercase tracking-wider text-hud-muted">
                    {field.label}
                  </dt>
                  <dd className="text-[16px] leading-snug text-hud-primary">
                    {field.value}
                    {field.unit ? <span className="ml-1 text-hud-muted">{field.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </article>
      ))}
    </aside>
  );
}
