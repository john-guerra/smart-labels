// Occlusion must also run when labels are drawn into an svg that is already on the page
// (it used to wait for some later, unrelated DOM change, e.g. a tooltip on hover).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels, window;

before(async () => {
  ({ window } = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true }));
  for (const key of ["window", "document", "SVGElement", "HTMLCanvasElement", "MutationObserver", "MouseEvent",
    "requestAnimationFrame"]) {
    globalThis[key] = window[key];
  }
  ({ default: smartLabels } = await import("../src/index.js"));
});

const data = [[20, 20], [180, 20], [100, 100], [20, 180], [180, 180]];
const tick = () => new Promise((r) => setTimeout(r, 50));

test("occlusion runs for a target that is already in the document", async () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  document.body.appendChild(svg);
  smartLabels(data, { target: svg, width: 200, height: 200, threshold: 0 });
  await tick(); // nothing else changes in the page
  // jsdom has no layout: every label measures 0x0 at (0, 0), so all but the first overlap
  const occluded = svg.querySelectorAll("g.labels > text.occluded");
  assert.equal(occluded.length, data.length - 1);
});
