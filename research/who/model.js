// The curtain call as plain data and arithmetic, so the tests can drive it without a browser.
// One pass, then everything holds still. Nothing loops. Paced by build/research/PACING.md.
import { CAST } from './data.js';

// PACING.md version 2 (the middle ground). The curtain call (the four turns and the close) is about 11.7 s,
// after a 2.7 s arrival.
export const PACE = {
  fadeUp: 1.2,    // the scene fades up; nothing moves
  firstHold: 1.5, // then holds still, captions readable, before the first action
  lead: 0.3,      // a figure starts to step forward; the light follows in about 0.7 s, overlapping the action
  action: 1.1,    // its take-in, work and hand-out, at about 0.8x the original speed
  hold: 1.2,      // the result held before the next figure steps forward
  closing: 1.3,   // the light leaves the figures and the name and contacts come up
};
export const TURN = Math.round((PACE.lead + PACE.action + PACE.hold) * 10) / 10;
export const CURTAIN_CALL = Math.round((4 * TURN + PACE.closing) * 10) / 10;

// Reading time for a card by the version 2 rule (words ÷ 3.5 + 1 s, main line only). The 11–12 s target set
// for this station is shorter than that, so the card stays readable by pausing or with the step dots.
export function readingTime(card) {
  const words = card.what.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return words / 3.5 + 1;
}

export const STEPS = [
  { id: 'arrive', dur: PACE.fadeUp + PACE.firstHold }, // fade up, then hold with the captions readable
  ...CAST.map((c) => ({ id: c.id, dur: TURN })),
  { id: 'you', dur: PACE.closing }, // the light leaves them and settles on the name
];

export const TOTAL = STEPS.reduce((s, x) => s + x.dur, 0);
export const CAST_IDS = ['tome', 'adsp', 'followthrough', 'finding'];

export function startOf(i) {
  let t = 0;
  for (let k = 0; k < i; k++) t += STEPS[k].dur;
  return t;
}

// Where the sequence is at time t (seconds): which step, how far through it (0..1), and whether it has settled.
export function at(t) {
  if (!(t > 0)) return { index: 0, id: STEPS[0].id, f: 0, settled: false, t: 0 };
  if (t >= TOTAL) return { index: STEPS.length - 1, id: 'you', f: 1, settled: true, t: TOTAL };
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const d = STEPS[i].dur;
    if (t < acc + d) return { index: i, id: STEPS[i].id, f: (t - acc) / d, settled: false, t };
    acc += d;
  }
  return { index: STEPS.length - 1, id: 'you', f: 1, settled: true, t: TOTAL };
}

// How far the figure's action has gone (0..1), for actors.frame. Before the action starts it stands ready; after
// it, the result is held (0.9 is the last pose with the result held out, before any hand is lowered).
export function actionProgress(pos) {
  if (!CAST_IDS.includes(pos.id)) return 0;
  const dur = STEPS[pos.index].dur; const t = pos.f * dur;
  return Math.min(0.9, Math.max(0, (t - PACE.lead) / PACE.action) * 0.9);
}
// The card shows from the moment the action starts, never before.
export function cardShown(pos) {
  if (!CAST_IDS.includes(pos.id)) return false;
  return pos.f * STEPS[pos.index].dur >= PACE.lead;
}

// The figure under the light, or null when nobody is (arrival, and from the moment the light moves to the name).
export function activeFigure(pos) {
  return CAST_IDS.includes(pos.id) ? pos.id : null;
}

// How far the closing move has gone: 0 during the curtain call, 1 once the light rests on the name.
export function closing(pos) {
  if (pos.settled) return 1;
  return pos.id === 'you' ? pos.f : 0;
}

// What a `go(step)` call means: a step index or id. 'you' and 'settled' both land on the still final state.
export function timeForStep(step) {
  if (step === 'settled' || step === 'end') return TOTAL;
  const i = typeof step === 'number' ? step : STEPS.findIndex((s) => s.id === step);
  if (i < 0 || i >= STEPS.length) return null;
  if (STEPS[i].id === 'you') return TOTAL;
  return startOf(i);
}

// Taps on links and buttons act at once; a tap anywhere else pauses. `el` is the tapped element's chain of
// tag names and roles, innermost first, so this stays testable without a DOM.
export function tapPauses(chain) {
  return !chain.some((n) => ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(n.tag) || n.role === 'button' || n.role === 'link' || n.selectable);
}

// Counts the words a visitor can read in the settled state.
export function wordCount(texts) {
  return texts.join(' ').replace(/[→×·]/g, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}
