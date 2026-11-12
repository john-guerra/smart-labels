// Re-rendering into the same svg must not keep x / y / dy from the side a label had before
// (e.g. a label that was on top, with y, and is now on the right, with x, kept its old y).
// jsdom has no layout, so getBoundingClientRect is stubbed with a simple text-box model.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels;
const W = 40, H = 10; // every label's box

function box(el) {
  if (el.tagName !== "text") return { x: 0, y: 0, width: 0, height: 0 };
  const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(el.getAttribute("transform") || "") || [0, 0, 0];
  const ax = +m[1] + +(el.getAttribute("x") || 0), ay = +m[2] + +(el.getAttribute("y") || 0);
  const anchor = el.getAttribute("text-anchor") || "start";
  const dy = el.getAttribute("dy");
  const x = anchor === "end" ? ax - W : anchor === "middle" ? ax - W / 2 : ax;
  const y = dy === "0.35em" ? ay - H / 2 : dy === "0.71em" ? ay : ay - H; // middle / hanging / baseline
  return { x, y, width: W, height: H };
}

before(async () => {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  for (const key of ["window", "document", "SVGElement", "HTMLCanvasElement", "MutationObserver", "MouseEvent",
    "requestAnimationFrame"]) {
    globalThis[key] = window[key];
  }
  window.Element.prototype.getBoundingClientRect = function () { return box(this); };
  ({ default: smartLabels } = await import("../src/index.js"));
});

const tight = [[100, 100], [125, 100], [150, 100], [175, 100], [100, 160], [175, 40]];
const spread = [[20, 20], [280, 20], [150, 100], [20, 180], [280, 180], [150, 180]];
const tick = () => new Promise((r) => setTimeout(r, 50));

// Each side sets exactly these attributes (see orient in src/index.js).
const EXPECTED = {
  right: { x: "6", y: null, dy: "0.35em" },
  left: { x: "-6", y: null, dy: "0.35em" },
  top: { x: null, y: "-6", dy: null },
  bottom: { x: null, y: "6", dy: "0.71em" },
};
const sideOf = (t) =>
  t.getAttribute("text-anchor") === "start" ? "right"
    : t.getAttribute("text-anchor") === "end" ? "left"
      : t.getAttribute("dy") === "0.71em" ? "bottom" : "top";

for (const tryOtherPositions of [false, true]) {
  test(`second render with new data leaves no stale attributes (tryOtherPositions: ${tryOtherPositions})`,
    async () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      document.body.appendChild(svg);
      const options = { target: svg, width: 300, height: 200, threshold: 0, labelsInCentroids: false,
        tryOtherPositions };
      smartLabels(tight, options);
      await tick();
      smartLabels(spread, options);
      await tick();
      for (const t of svg.querySelectorAll("g.labels > text")) {
        const got = { x: t.getAttribute("x"), y: t.getAttribute("y"), dy: t.getAttribute("dy") };
        assert.deepEqual(got, EXPECTED[sideOf(t)]);
      }
    });
}
