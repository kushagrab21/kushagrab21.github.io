import { stepIds, pieces, finding, closing } from './data.js';

export const pacing = Object.freeze({ fadeUp: 1200, openingHold: 1500, speed: .8, cardFlight: 750, captionFade: 300, lightMove: 700, resultHold: 1200, turn: 4000 });
export const wordCount = text => text.trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
export const readingTime = text => (wordCount(text) / 3.5 + 1) * 1000;
// Only the question and main answer set the pace; paused visitors can read the small print.
export const captions = Object.fromEntries(pieces.map(piece => [piece.id, [piece.question, piece.body].join(' ')]));
captions.finding = `${finding.question} The next study was made alongside these papers.`;
captions.overview = closing;
// Shorten gaps between composite actions, not the movements themselves.
export const motion = Object.freeze({ drawing: 6000 / pacing.speed, tradeScenario: 2250, tradeSwitch: 600 / pacing.speed, sparMove: 3600 / pacing.speed, sparGap: 750 });
const pieceSegment = id => {
  const readDuration = readingTime(captions[id]);
  // Trade is complete when the fourth switch lands, not at the end of its idle slot.
  const actionDuration = id === 'trade' ? motion.tradeScenario * 3 + motion.tradeSwitch : id === 'spar' ? motion.sparMove * 2 + motion.sparGap : motion.drawing;
  // The unchanged caption stays readable during the action and result hold.
  // Preserve its full reading budget without adding another idle reading period.
  return { id, phase: 'piece', readDuration, actionDuration, duration: Math.max(4500, readDuration, actionDuration + pacing.resultHold) };
};
export const timeline = [
  { id: 'covid', phase: 'opening', duration: pacing.fadeUp + pacing.openingHold, actionDuration: 0 },
  pieceSegment('covid'),
  pieceSegment('wireless'),
  pieceSegment('trade'),
  { id: 'replay', phase: 'turn', duration: pacing.turn, actionDuration: 0 },
  pieceSegment('replay'),
  { id: 'finding', phase: 'bridge', duration: 4000, actionDuration: pacing.cardFlight },
  pieceSegment('spar'),
  { id: 'overview', phase: 'hold', duration: 7000, actionDuration: pacing.cardFlight },
];
// Keep both estimate movements at the shared speed, with a short pause between them.
function actionProgress(id, elapsed, duration) {
  if (elapsed >= duration) return 1;
  if (id === 'trade') return elapsed / (motion.tradeScenario * 4);
  if (id !== 'spar') return clamp(elapsed / duration);
  if (elapsed <= motion.sparMove) return .05 + .3 * elapsed / motion.sparMove;
  if (elapsed <= motion.sparMove + motion.sparGap) return .35 + .2 * (elapsed - motion.sparMove) / motion.sparGap;
  return .55 + .3 * (elapsed - motion.sparMove - motion.sparGap) / motion.sparMove;
}
export const cycleDuration = timeline.reduce((total, step) => total + step.duration, 0);
export const clamp = value => Math.max(0, Math.min(1, value));
export const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
export function frameAt(time) {
  let remaining = ((time % cycleDuration) + cycleDuration) % cycleDuration, segmentStart = 0;
  for (const segment of timeline) {
    if (remaining < segment.duration) return {
      ...segment, segmentStart, segmentElapsed: remaining, step: stepIds.indexOf(segment.id),
      // Action time is independent of the longer reading/result hold.
      progress: segment.phase === 'piece' ? actionProgress(segment.id, remaining, segment.actionDuration) : segment.phase === 'turn' || segment.phase === 'opening' ? 0 : remaining / segment.duration,
      settled: segment.phase === 'piece' && remaining >= segment.actionDuration,
    };
    remaining -= segment.duration; segmentStart += segment.duration;
  }
}
export function startOf(id) {
  if (!stepIds.includes(id)) throw new RangeError(`Unknown step: ${id}`);
  let time = 0;
  for (const segment of timeline) {
    if (segment.id === id && !['opening', 'turn'].includes(segment.phase)) return time;
    time += segment.duration;
  }
}
export function actionMoment(id, progress) {
  const segment = timeline.find(segment => segment.id === id && segment.phase === 'piece');
  if (id === 'trade') return startOf(id) + Math.min(segment.actionDuration, motion.tradeScenario * 4 * progress);
  if (id !== 'spar') return startOf(id) + segment.actionDuration * progress;
  const elapsed = progress <= .05 ? 0 : progress <= .35 ? (progress - .05) / .3 * motion.sparMove
    : progress <= .55 ? motion.sparMove + (progress - .35) / .2 * motion.sparGap
    : progress < .85 ? motion.sparMove + motion.sparGap + (progress - .55) / .3 * motion.sparMove : segment.actionDuration;
  return startOf(id) + elapsed;
}
// Every visual is derived from the same clock: a pause or seek cannot leave a fade running.
export function sceneAt(state, immediate = false) {
  const opening = state.phase === 'opening', t = state.segmentElapsed;
  const entry = state.phase === 'piece' && ['covid','replay'].includes(state.id) ? 1 : ease(t / pacing.cardFlight);
  const turnStart = startOf('replay') - pacing.turn;
  return {
    room: immediate ? 1 : opening ? ease(t / (pacing.fadeUp * .4)) : 1,
    figures: immediate ? 1 : opening ? ease((t - pacing.fadeUp * .2) / (pacing.fadeUp * .5)) : 1,
    card: immediate ? 1 : opening ? ease((t - pacing.fadeUp * .5) / (pacing.fadeUp * .5)) : 1,
    caption: immediate ? 1 : opening ? ease((t - pacing.fadeUp + pacing.captionFade) / pacing.captionFade) : ['covid','replay'].includes(state.id) && state.phase === 'piece' ? 1 : ease(t / pacing.captionFade),
    // The opening only fades; nothing translates, scales or changes the figure until 2.7 s.
    flight: immediate || opening ? 1 : entry,
    light: state.step < 3 ? 35 : 35 + 30 * (immediate ? 1 : ease((state.segmentStart + t - turnStart) / pacing.lightMove)),
  };
}
export function createController({ still = false, reducedMotion = false } = {}) {
  let elapsed = still || reducedMotion ? startOf('overview') : 0;
  let playing = !(still || reducedMotion);
  const getState = () => ({ ...frameAt(elapsed), elapsed, playing, still: still || reducedMotion });
  return {
    get state() { return getState(); },
    tick(delta) { if (playing) elapsed = (elapsed + Math.max(0, delta)) % cycleDuration; return getState(); },
    pause() { playing = false; return getState(); },
    play() { if (!(still || reducedMotion)) playing = true; return getState(); },
    go(step) {
      const id = typeof step === 'number' ? stepIds[step] : step;
      const start = startOf(id);
      const duration = timeline.find(segment => segment.id === id && !['opening', 'turn'].includes(segment.phase)).duration;
      elapsed = start + (still || reducedMotion ? duration - 1 : 0); playing = false; return getState();
    },
    reduce(value) { reducedMotion = value; if (value) { playing = false; elapsed = startOf('overview'); } return getState(); },
    seek(time) { if (!Number.isFinite(time)) throw new TypeError('Time must be finite'); elapsed = Math.max(0, time); playing = false; return getState(); },
  };
}
