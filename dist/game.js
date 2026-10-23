export const SIZE = 128;
export const ROUND_SECONDS = 30;
export const ORDERS = [
  { id: 'heart', name: 'Heart' },
  { id: 'tulip', name: 'Tulip' },
  { id: 'leaf', name: 'Leaf' },
];

export function secondsLeft(deadline, now) {
  return Math.max(0, Math.min(ROUND_SECONDS, (deadline - now) / 1000));
}

export function inCup(x, y) {
  return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.48 ** 2;
}

export function tiltAim(beta, gamma, origin, angle = 0) {
  const pitch = ((beta - origin[0] + 540) % 360) - 180;
  const roll = gamma - origin[1];
  const radians = angle * Math.PI / 180;
  const x = roll * Math.cos(radians) + pitch * Math.sin(radians);
  const y = pitch * Math.cos(radians) - roll * Math.sin(radians);
  const position = value => Math.max(0, Math.min(1, .5 + Math.sign(value) * Math.max(0, Math.abs(value) - 1) / 36));
  return [position(x), position(y)];
}

export function targetMask(order = 'heart') {
  const mask = new Float32Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = (i + 0.5) / SIZE, y = (j + 0.5) / SIZE;
      const heart = () => {
        const u = (x - 0.5) / .245, v = (.49 - y) / .245;
        return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0;
      };
      const ellipse = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      const tulip = () => ellipse(.43, .44, .1, .11) || ellipse(.57, .44, .1, .11) || ellipse(.5, .53, .13, .1) || (Math.abs(x - .5) < .022 && y > .57 && y < .73);
      const leaf = () => ellipse(.43, .42, .08, .13) || ellipse(.57, .42, .08, .13) || ellipse(.45, .53, .09, .14) || ellipse(.55, .53, .09, .14) || ellipse(.5, .63, .06, .14);
      const shape = order === 'tulip' ? tulip() : order === 'leaf' ? leaf() : heart();
      mask[j * SIZE + i] = shape && inCup(x, y) ? 1 : 0;
    }
  }
  return mask;
}

// shortcut: buoyant foam is a soft brush, not a fluid solver; upgrade if realistic milk physics becomes the goal.
export function pourSegment(mask, from, to, radius, dt) {
  if (mask.length !== SIZE * SIZE || ![...from, ...to, radius, dt].every(Number.isFinite)) return;
  if (radius <= 0 || dt <= 0) return;
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.min(256, Math.max(1, Math.ceil(distance / (radius * 0.4))));
  const opacity = 1 - Math.exp(-18 * Math.min(dt, 0.1));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const cx = from[0] + (to[0] - from[0]) * t;
    const cy = from[1] + (to[1] - from[1]) * t;
    if (!inCup(cx, cy)) continue;
    const x0 = Math.max(0, Math.floor((cx - radius) * SIZE));
    const x1 = Math.min(SIZE - 1, Math.ceil((cx + radius) * SIZE));
    const y0 = Math.max(0, Math.floor((cy - radius) * SIZE));
    const y1 = Math.min(SIZE - 1, Math.ceil((cy + radius) * SIZE));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const u = (x + 0.5) / SIZE, v = (y + 0.5) / SIZE;
        const d = Math.hypot(u - cx, v - cy) / radius;
        if (d >= 1 || !inCup(u, v)) continue;
        const edge = Math.min(1, (1 - d) * 7);
        const index = y * SIZE + x;
        mask[index] += (1 - mask[index]) * opacity * edge;
      }
    }
  }
}

export function scoreMask(actual, target) {
  if (actual.length !== SIZE * SIZE || target.length !== actual.length) throw new Error('Invalid foam mask');
  let best = 0;
  // Small alignment tolerance rewards the shape without requiring pixel-perfect placement.
  for (let dy = -3; dy <= 3; dy += 3) {
    for (let dx = -3; dx <= 3; dx += 3) {
      let overlap = 0, actualMass = 0, targetMass = 0;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const a = actual[y * SIZE + x];
          const tx = x + dx, ty = y + dy;
          const b = tx >= 0 && tx < SIZE && ty >= 0 && ty < SIZE ? target[ty * SIZE + tx] : 0;
          overlap += Math.min(a, b);
          actualMass += a;
          targetMass += b;
        }
      }
      if (actualMass + targetMass > 0) best = Math.max(best, 2 * overlap / (actualMass + targetMass));
    }
  }
  return Math.round(best * 100);
}
