export const SIZE = 128;
export const ROUND_SECONDS = 30;
export const ORDERS = [
  { id: 'heart', name: 'A little heart', level: 'The classic', tip: 'Build two soft lobes. Bring them together into a point.', difficulty: 1 },
  { id: 'tulip', name: 'Three-leaf tulip', level: 'A little flourish', tip: 'Stack three pairs of petals. Finish with a thin stem.', difficulty: 2 },
  { id: 'rosetta', name: 'The rosetta', level: 'Your signature pour', tip: 'Wiggle side to side, getting narrower as you go. Add a stem.', difficulty: 3 },
];

export function secondsLeft(deadline, now) {
  return Math.max(0, Math.min(ROUND_SECONDS, (deadline - now) / 1000));
}

export function inCup(x, y) {
  return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.48 ** 2;
}

function ellipse(x, y, cx, cy, rx, ry, angle = 0) {
  const dx = x - cx, dy = y - cy;
  const u = dx * Math.cos(angle) + dy * Math.sin(angle);
  const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
}

export function targetMask(id) {
  if (!ORDERS.some(order => order.id === id)) throw new Error('Unknown latte pattern');
  const mask = new Float32Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = (i + 0.5) / SIZE, y = (j + 0.5) / SIZE;
      let filled = false;
      if (id === 'heart') {
        const u = (x - 0.5) / 0.245, v = (0.49 - y) / 0.245;
        filled = (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0;
      } else {
        const count = id === 'tulip' ? 3 : 7;
        for (let k = 0; k < count; k++) {
          const t = k / (count - 1), cy = 0.30 + t * 0.38;
          const rx = id === 'tulip' ? 0.085 + t * 0.065 : 0.045 + t * 0.105;
          const ry = id === 'tulip' ? 0.052 : 0.022;
          for (const side of [-1, 1]) {
            filled ||= ellipse(x, y, 0.5 + side * rx * 0.74, cy, rx, ry, side * -0.40);
          }
        }
        filled ||= ellipse(x, y, 0.5, 0.53, 0.014, 0.27);
        filled ||= ellipse(x, y, 0.5, 0.26, 0.038, 0.05);
      }
      mask[j * SIZE + i] = filled && inCup(x, y) ? 1 : 0;
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
