// Pure logic for the Tome block: projectile flight, the angle sweep, and
// marking the practice answers. No DOM here, so tests can run it directly.

const rad = (deg) => (deg * Math.PI) / 180;

// Level-ground launch from the origin, no air resistance.
export function flight(speed, angleDeg, g) {
  const vx = speed * Math.cos(rad(angleDeg));
  const vy = speed * Math.sin(rad(angleDeg));
  const time = (2 * vy) / g;
  return {
    angleDeg,
    vx,
    vy,
    time,
    range: vx * time,
    height: (vy * vy) / (2 * g),
    at(t) {
      const tt = Math.max(0, Math.min(t, time));
      return { x: vx * tt, y: vy * tt - 0.5 * g * tt * tt };
    },
  };
}

// Points along the arc, for drawing.
export function arcPoints(f, steps = 60) {
  return Array.from({ length: steps + 1 }, (_, i) => f.at((f.time * i) / steps));
}

// The self-running sweep at "Your turn": the page's five table angles, with a
// longer hold where something happens (the 30°/60° tie, and 45° the farthest).
export const SWEEP = [
  { angle: 15, hold: 900 },
  { angle: 30, hold: 1400 },
  { angle: 45, hold: 2000 },
  { angle: 60, hold: 2500 },
  { angle: 75, hold: 900 },
];

// One decimal, the way the page's table prints it.
export const metres = (x) => `${x.toFixed(1)} m`;
export const seconds = (x) => `${x.toFixed(2)} s`;

// Which row of the page's table matches an angle, or -1 between rows.
export function tableRowFor(angleDeg, rows) {
  return rows.findIndex((r) => Number.parseFloat(r[0]) === Math.round(angleDeg));
}

// Marking a number answer. Accepts "40", "40 m", "40.0"; a blank or non-number
// never passes; the tolerance is tight enough that 40.8 (the g = 9.8 answer)
// is marked wrong for the g = 10 question.
export function markNumber(input, answer, tolerance = 0.05) {
  const text = String(input ?? '').trim().replace(/,/g, '');
  if (!text) return { state: 'blank' };
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*(m|metres|meters)?$/i);
  if (!m) return { state: 'unreadable' };
  const value = Number.parseFloat(m[1]);
  return { state: Math.abs(value - answer) <= tolerance ? 'right' : 'wrong', value };
}

export function markChoice(choice, answer) {
  if (!choice) return { state: 'blank' };
  return { state: choice === answer ? 'right' : 'wrong' };
}
