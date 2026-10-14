import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const motion = await import(
  pathToFileURL(join(webRoot, "lib/motion/use-reduced-motion.ts")).href
);

const {
  REDUCED_MOTION_QUERY,
  getReducedMotionSnapshot,
  getReducedMotionServerSnapshot,
  subscribeReducedMotion,
  useReducedMotion,
} = motion;

function fakeHost(initial) {
  const listeners = new Set();
  const queries = [];
  const mql = {
    matches: initial,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  };
  return {
    queries,
    listeners,
    host: {
      matchMedia: (query) => {
        queries.push(query);
        return mql;
      },
    },
    set(value) {
      mql.matches = value;
      for (const fn of listeners) fn();
    },
  };
}

describe("C17b useReducedMotion", () => {
  it("queries prefers-reduced-motion: reduce", () => {
    assert.equal(REDUCED_MOTION_QUERY, "(prefers-reduced-motion: reduce)");
    const fake = fakeHost(true);
    assert.equal(getReducedMotionSnapshot(fake.host), true);
    assert.deepEqual(fake.queries, [REDUCED_MOTION_QUERY]);
  });

  it("returns false when the user allows motion", () => {
    assert.equal(getReducedMotionSnapshot(fakeHost(false).host), false);
  });

  it("returns false without matchMedia (SSR / old runtimes)", () => {
    assert.equal(getReducedMotionSnapshot(undefined), false);
    assert.equal(getReducedMotionSnapshot({}), false);
    assert.equal(getReducedMotionServerSnapshot(), false);
  });

  it("subscribe notifies on preference change and unsubscribes cleanly", () => {
    const fake = fakeHost(false);
    let calls = 0;
    const unsubscribe = subscribeReducedMotion(() => {
      calls += 1;
    }, fake.host);
    fake.set(true);
    assert.equal(calls, 1);
    assert.equal(getReducedMotionSnapshot(fake.host), true);
    unsubscribe();
    assert.equal(fake.listeners.size, 0);
    fake.set(false);
    assert.equal(calls, 1);
  });

  it("subscribe is a no-op without matchMedia", () => {
    const unsubscribe = subscribeReducedMotion(() => {}, undefined);
    assert.equal(typeof unsubscribe, "function");
    unsubscribe();
  });

  it("hook renders the server snapshot (full motion) during SSR", () => {
    function Probe() {
      return createElement("span", null, String(useReducedMotion()));
    }
    assert.equal(renderToString(createElement(Probe)), "<span>false</span>");
  });
});
