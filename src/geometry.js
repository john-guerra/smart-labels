// Does a circle {x, y, r} overlap a box {x, y, width, height}? Touching the edge doesn't count.
export function rectIntersectsCircle(rect, c) {
  const nx = Math.max(rect.x, Math.min(c.x, rect.x + rect.width));
  const ny = Math.max(rect.y, Math.min(c.y, rect.y + rect.height));
  return Math.hypot(c.x - nx, c.y - ny) < c.r;
}
