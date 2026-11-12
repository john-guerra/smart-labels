// avoidPoints must never hide a label because of its own point, only other points.
// jsdom has no layout: getBoundingClientRect is stubbed with a small box centered on the
// label's translate() (so every label covers its own point), and getScreenCTM with identity.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels;
const S = 4; // every label's box is S x S, centered on its point

function box(el) {
  if (el.tagName !== "text") return { x: 0, y: 0, width: 0, height: 0 };
  const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(el.getAttribute("transform") || "") || [0, 0, 0];
  return { x: +m[1] - S / 2, y: +m[2] - S / 2, width: S, height: S };
}

before(async () => {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  for (const key of ["window", "document", "SVGElement", "HTMLCanvasElement", "MutationObserver", "MouseEvent",
    "requestAnimationFrame"]) {
    globalThis[key] = window[key];
  }
  window.Element.prototype.getBoundingClientRect = function () { return box(this); };
  window.SVGElement.prototype.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  ({ default: smartLabels } = await import("../src/index.js"));
});

async function occluded(data) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  document.body.appendChild(svg);
  smartLabels(data, {
    target: svg, width: 300, height: 300, threshold: 0, r: () => 5,
    labelsInCentroids: false, avoidPoints: true,
  });
  await new Promise((r) => setTimeout(r, 50));
  return [...svg.querySelectorAll("g.labels > text")].map((t) => t.classList.contains("occluded"));
}

test("a label that covers only its own point is not occluded", async () => {
  assert.deepEqual(await occluded([[50, 50], [250, 50], [150, 250]]), [false, false, false]);
});

test("a label that covers another point is occluded", async () => {
  // points 0 and 1 are 6px apart: each label (4px wide) reaches into the other's 5px circle,
  // while the two labels don't overlap each other; point 2 is far away
  assert.deepEqual(await occluded([[100, 100], [106, 100], [150, 250]]), [true, true, false]);
});
