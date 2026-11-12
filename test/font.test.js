// Regression tests for the `font` / `hoverFont` options (PR #1).
// `font = () => font` used to return the arrow itself, so string fonts were
// silently dropped by the browser and labels inherited the page font.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let smartLabels;

before(async () => {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  // smartLabels and d3 read these as globals, like they would in a browser.
  for (const key of [
    "window",
    "document",
    "SVGElement",
    "HTMLCanvasElement",
    "MutationObserver",
    "MouseEvent",
  ]) {
    globalThis[key] = window[key];
  }
  ({ default: smartLabels } = await import("../src/index.js"));
});

// Spread out points so every label gets a cell big enough to be shown.
const data = [
  [20, 20],
  [180, 20],
  [100, 100],
  [20, 180],
  [180, 180],
];

function draw(options) {
  const svg = smartLabels(data, {
    width: 200,
    height: 200,
    threshold: 0,
    useOcclusion: false, // occlusion needs layout, which jsdom doesn't do
    ...options,
  });
  return { svg, texts: [...svg.querySelectorAll("g.labels > text")] };
}

test("a string font is applied to every label", () => {
  const { texts } = draw({ font: "9px serif" });
  assert.equal(texts.length, data.length);
  for (const text of texts) assert.equal(text.style.font, "9px serif");
});

test("a function font still works", () => {
  const { texts } = draw({ font: (d, i) => `${10 + i}px serif` });
  texts.forEach((text, i) => assert.equal(text.style.font, `${10 + i}px serif`));
});

test("a string hoverFont is applied to the hovered label only", () => {
  const { svg, texts } = draw({ font: "9px serif", hoverFont: "bold 20px serif" });
  // Hover over the center point (index 2). jsdom has no layout, so the
  // svg sits at (0, 0) and client coordinates equal svg coordinates.
  svg
    .querySelector("rect.smartLabels")
    .dispatchEvent(
      new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true })
    );
  texts.forEach((text, i) =>
    assert.equal(text.style.font, i === 2 ? "bold 20px serif" : "9px serif")
  );
});
