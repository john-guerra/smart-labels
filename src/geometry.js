// Does a circle {x, y, r} overlap a box {x, y, width, height}? Contact within 0.5px doesn't count, since
// labels sit r + padding away from their own point.
export function rectIntersectsCircle(rect, c) {
  const nx = Math.max(rect.x, Math.min(c.x, rect.x + rect.width));
  const ny = Math.max(rect.y, Math.min(c.y, rect.y + rect.height));
  return Math.hypot(c.x - nx, c.y - ny) < c.r - 0.5;
}
