// The r accessor gets the user's datum: labels sit r + padding away from their own point.
// (It used to get the internal {d, cell, show} wrapper, so custom radii gave NaN offsets.)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels;

before(async () => {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of ["window", "document", "SVGElement", "HTMLCanvasElement", "MutationObserver", "MouseEvent"]) {
    globalThis[key] = window[key];
  }
  ({ default: smartLabels } = await import("../src/index.js"));
});

test("labels are offset by each point's own radius plus padding", () => {
  const data = [{ x: 20, y: 20, r: 10 }, { x: 180, y: 20, r: 4 }, { x: 100, y: 100, r: 7 },
    { x: 20, y: 180, r: 12 }, { x: 180, y: 180, r: 2 }];
  const svg = smartLabels(data, {
    x: (d) => d.x, y: (d) => d.y, r: (d) => d.r, padding: 3,
    width: 200, height: 200, threshold: 0, useOcclusion: false, labelsInCentroids: false,
  });
  const texts = [...svg.querySelectorAll("g.labels > text")];
  assert.equal(texts.length, data.length);
  texts.forEach((t, i) => {
    const offset = Math.abs(+(t.getAttribute("x") ?? 0)) + Math.abs(+(t.getAttribute("y") ?? 0));
    assert.equal(offset, data[i].r + 3, `label ${i}`);
  });
});
