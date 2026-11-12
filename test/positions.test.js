// tryOtherPositions: an occluded label tries the point's other sides before being hidden.
// jsdom has no layout, so getBoundingClientRect is stubbed with a simple text-box model
// built from the label's translate(), x/y, dy and text-anchor.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels, window;
const W = 40, H = 10; // every label's box

function box(el) {
  if (el.tagName !== "text") return { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 };
  const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(el.getAttribute("transform") || "") || [0, 0, 0];
  const ax = +m[1] + +(el.getAttribute("x") || 0), ay = +m[2] + +(el.getAttribute("y") || 0);
  const anchor = el.getAttribute("text-anchor") || "start";
  const dy = el.getAttribute("dy");
  const x = anchor === "end" ? ax - W : anchor === "middle" ? ax - W / 2 : ax;
  const y = dy === "0.35em" ? ay - H / 2 : dy === "0.71em" ? ay : ay - H; // middle / hanging / baseline
  return { x, y, width: W, height: H, left: x, top: y, right: x + W, bottom: y + H };
}

before(async () => {
  ({ window } = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true }));
  for (const key of ["window", "document", "SVGElement", "HTMLCanvasElement", "MutationObserver", "MouseEvent",
    "requestAnimationFrame"]) {
    globalThis[key] = window[key];
  }
  window.Element.prototype.getBoundingClientRect = function () { return box(this); };
  ({ default: smartLabels } = await import("../src/index.js"));
});

// a tight row: every label wants the same side and runs into its neighbour's
const data = [[100, 100], [125, 100], [150, 100], [175, 100], [100, 160], [175, 40]];
const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

async function draw(options) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  document.body.appendChild(svg);
  smartLabels(data, { target: svg, width: 300, height: 200, threshold: 0, labelsInCentroids: false, ...options });
  await new Promise((r) => setTimeout(r, 50));
  const texts = [...svg.querySelectorAll("g.labels > text")];
  const shown = texts.filter((t) => !t.classList.contains("occluded"));
  return { texts, shown };
}

test("without the option, some labels in the row are hidden", async () => {
  const { shown } = await draw({});
  assert.ok(shown.length < data.length);
});

test("with tryOtherPositions, more labels are shown and none overlap", async () => {
  const plain = (await draw({})).shown.length;
  const { shown } = await draw({ tryOtherPositions: true });
  assert.ok(shown.length > plain, `${shown.length} shown, ${plain} without the option`);
  const boxes = shown.map(box);
  boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => assert.ok(!overlap(a, b))));
});
