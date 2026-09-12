import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");

const elite = JSON.parse(
  readFileSync(join(repoRoot, "fixtures/phase-4/elite/ride-log-elite.golden.json"), "utf8"),
);
const researchSignals = JSON.parse(
  readFileSync(join(repoRoot, "fixtures/phase-9/research-signals.valid.json"), "utf8"),
);

const reportView = await import(
  pathToFileURL(join(webRoot, "components/reports/report-view.ts")).href
);
const studioMedia = await import(
  pathToFileURL(join(webRoot, "components/studio/studio-media.ts")).href
);
const calendarSlot = await import(
  pathToFileURL(join(webRoot, "components/calendar/calendar-content-slot.ts")).href
);
const researchCards = await import(
  pathToFileURL(join(webRoot, "components/research/research-payload-cards.ts")).href
);

describe("A2 report narrative + charts", () => {
  it("formats elite markdown as readable narrative without raw JSON", () => {
    const text = reportView.formatEliteNarrative(elite);
    assert.match(text, /Engagement score is 50\.74/);
    assert.doesNotMatch(text, /\*\*/);
    assert.doesNotMatch(text, /schemaVersion/);
  });

  it("builds three chart series from elite JSON", () => {
    const charts = reportView.buildReportCharts(elite);
    assert.equal(charts.length, 3);
    assert.deepEqual(
      charts.map((c) => c.id),
      ["engagement", "recommendations", "citations"],
    );
    const engagement = charts.find((c) => c.id === "engagement");
    assert.ok(engagement.bars.some((b) => b.label === "score" && b.value > 0));
    const recs = charts.find((c) => c.id === "recommendations");
    assert.equal(recs.bars.find((b) => b.label === "medium")?.value, 1);
  });

  it("suggests caption hooks from headline and recommendations", () => {
    const hooks = reportView.suggestHooksFromReport(elite);
    assert.ok(hooks.includes(elite.headline.text));
    assert.ok(hooks.includes(elite.recommendations[0].text));
  });
});

describe("A2 studio media preview", () => {
  it("prefers payload thumbnailUrl when present", () => {
    const media = studioMedia.resolveStudioMedia({
      thumbnailUrl: "https://example.com/thumb.jpg",
      videoUrl: "https://example.com/reel.mp4",
      carouselUrls: ["https://example.com/c1.jpg"],
      mediaType: "VIDEO",
    });
    assert.equal(media.hasMedia, true);
    assert.equal(media.thumbnailUrl, "https://example.com/thumb.jpg");
    assert.equal(media.videoUrl, "https://example.com/reel.mp4");
    assert.equal(media.carouselUrls.length, 1);
  });

  it("uses fixture media fallback for the demo studio entity", () => {
    const media = studioMedia.resolveStudioMedia({ shortcode: "LOG240" }, studioMedia.FIXTURE_STUDIO_ENTITY_ID);
    assert.equal(media.hasMedia, true);
    assert.ok(media.thumbnailUrl);
    assert.match(media.thumbnailUrl, /LOG240|placehold|svg/i);
  });
});

describe("A2 calendar content slots", () => {
  it("reads caption + media + time from event payload", () => {
    const slot = calendarSlot.readCalendarContentSlot({
      scheduledAt: "2026-06-10T18:00:00.000Z",
      payload: {
        caption: "Night ride recap — scheduled slot",
        mediaUrl: "https://example.com/thumb.jpg",
        normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      },
    });
    assert.equal(slot.caption, "Night ride recap — scheduled slot");
    assert.equal(slot.mediaUrl, "https://example.com/thumb.jpg");
    assert.equal(slot.scheduledAt, "2026-06-10T18:00:00.000Z");
  });

  it("merges content slot fields without dropping job ids", () => {
    const next = calendarSlot.mergeCalendarContentPayload(
      { normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001" },
      { caption: "Hook line", mediaUrl: "https://example.com/m.jpg" },
    );
    assert.equal(next.normalizedEntityId, "550e8400-e29b-41d4-a716-446655440001");
    assert.equal(next.caption, "Hook line");
    assert.equal(next.mediaUrl, "https://example.com/m.jpg");
  });
});

describe("A2 research payload cards", () => {
  it("renders payloadJson keys as readable cards", () => {
    const cards = researchCards.researchPayloadToCards(researchSignals[0].payloadJson);
    assert.ok(cards.length >= 2);
    assert.ok(cards.some((c) => c.label.toLowerCase().includes("engagement")));
    assert.ok(cards.every((c) => typeof c.value === "string" && c.value.length > 0));
    assert.ok(cards.every((c) => !c.value.startsWith("{")));
  });

  it("skips empty payload objects", () => {
    assert.deepEqual(researchCards.researchPayloadToCards({}), []);
  });
});
