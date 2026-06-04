import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ENTITY_ID = "550e8400-e29b-41d4-a716-446655440001";

describe("getStudioEntityDetail (RSC direct load)", () => {
  /** @type {typeof import('../lib/studio.ts')} */
  let studio;

  before(async () => {
    studio = await import(pathToFileURL(join(webRoot, "lib/studio.ts")).href);
  });

  after(() => {
    delete process.env.ZEREF_BFF_FIXTURE;
    delete process.env.DATABASE_URL;
  });

  it("throws StudioEntityNotFoundError for unknown entity in fixture mode", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";

    await assert.rejects(
      () =>
        studio.getStudioEntityDetail("00000000-0000-4000-8000-000000009999"),
      (err) => {
        assert.equal(err.name, "StudioEntityNotFoundError");
        return true;
      },
    );
  });

  it("returns validated entity detail from fixture mode", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";

    const detail = await studio.getStudioEntityDetail(FIXTURE_ENTITY_ID);
    assert.equal(detail.entityId, FIXTURE_ENTITY_ID);
    assert.ok(detail.title);
    assert.ok(detail.payload);
    assert.ok(detail.draft);
    assert.equal(detail.draft.caption, "Night ride recap — draft caption");
  });
});
