// `avoidPoints`: occlusion also hides labels that cover another point's circle.
// jsdom has no layout, so this tests the geometry; the browser wiring is in occlusion().
import { test } from "node:test";
import assert from "node:assert/strict";
import { rectIntersectsCircle } from "../src/geometry.js";

const label = { x: 10, y: 10, width: 40, height: 12 }; // client-space box, like getBoundingClientRect()

test("a circle whose center is inside the label overlaps it", () => {
  assert.equal(rectIntersectsCircle(label, { x: 30, y: 16, r: 2 }), true);
});

test("a circle that reaches the label's edge overlaps it", () => {
  assert.equal(rectIntersectsCircle(label, { x: 30, y: 30, r: 9 }), true); // 8px below the bottom edge
});

test("a circle near a corner, but outside it, does not", () => {
  // corner at (50, 22); center 6px right and 6px down: distance 8.5 > r 8
  assert.equal(rectIntersectsCircle(label, { x: 56, y: 28, r: 8 }), false);
});

test("a circle just touching the label (the label's own point) does not count", () => {
  // labels sit r + padding away from their own point; touching within 0.5px is not an overlap
  assert.equal(rectIntersectsCircle(label, { x: 30, y: 27, r: 5 }), false);
});
