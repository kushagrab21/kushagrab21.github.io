import { copy, models } from './data.js';

// Seconds, shared by playback and browser captures. Movement takes 1 / .8
// times as long as before; opacity changes use the same pausable playhead.
export const motionTiming = Object.freeze({
  arrival: 1.2, initialHold: 1.5, captionFade: .3, resultHold: 1.2,
  light: .7, handover: 4, summary: 7,
  prediction: 2 / .8, result: 3.5 / .8,
  firstFlight: 2.6 / .8, secondFlight: 2.5 / .8,
  trackTurn: 1.1 / .8, trackFade: .7,
});
export const timing = Object.freeze({
  prediction: 2.7, result: 9.4,
  firstBridge: 15, firstFlight: 17 - 1 / .8,
  gauntlet: 17, hiddenTests: 17 + 2 / .8,
  secondBridge: 23.775, secondFlight: 25.9 - 1 / .8,
  paper2: 25.9, open: 33.3, summary: 41,
});
export const duration = timing.summary + motionTiming.summary;
export const readingTime = caption => caption.trim().split(/\s+/u).length / 3.5 + 1;
export const steps = Object.freeze([
  { id: 'paper-1', label: 'Paper 1', start: 0, end: timing.gauntlet },
  { id: 'gauntlet', label: 'GAUNTLET', start: timing.gauntlet, end: timing.paper2 },
  { id: 'paper-2', label: 'Paper 2', start: timing.paper2, end: timing.open },
  { id: 'open', label: 'Still open', start: timing.open, end: timing.summary },
].map(Object.freeze));
// Protect the actual fully opaque reading windows, rather than stacking the
// persistent opening question's reading time after the chart's actions again.
// Every main line retains words / 3.5 + 1 seconds, plus a 1.2-second hold.
export const readableCaptions = Object.freeze([
  { id: 'opening', text: copy.opening, start: motionTiming.arrival, end: timing.gauntlet - motionTiming.captionFade },
  { id: 'prediction', text: copy.firstPrediction, start: timing.prediction + motionTiming.captionFade, end: timing.result - motionTiming.captionFade },
  { id: 'result', text: `${copy.firstPrediction} ${copy.firstOutcome}`, start: timing.result + motionTiming.captionFade, end: timing.gauntlet - motionTiming.captionFade },
  ...steps.slice(1).map((step,i)=>({ id: step.id,
    text: [copy.gauntletHeading,copy.secondClaim,copy.openQuestion][i],
    start: step.start + motionTiming.captionFade, end: step.end - motionTiming.captionFade })),
].map(Object.freeze));
export const reviewTimes = Object.freeze([15.3, 22, 29, 37, duration]);

const clamp = value => Math.max(0, Math.min(1, value));
export function ease(value) {
  const p = clamp(value);
  // Zero velocity and acceleration at both ends: a gentler start and landing.
  return p * p * p * (p * (p * 6 - 15) + 10);
}
const progress = (time, start, length) => clamp((time - start) / length);
const fadeIn = (time, start) => ease(progress(time, start, motionTiming.captionFade));
const fadeOut = (time, end) => ease(progress(end - time, 0, motionTiming.captionFade));

// Build the picture inside the existing reading hold. The first 1.2 seconds
// stay motionless, and the complete frame precedes the unchanged prediction.
function chartFrameAt(time) {
  return {
    axis: ease(progress(time, motionTiming.arrival, .6)),
    guide: ease(progress(time, motionTiming.arrival + .1, .6)),
    labels: models.map((_,i)=>fadeIn(time, motionTiming.arrival + .2 + i * .14)),
    lock: fadeIn(time, timing.prediction - motionTiming.captionFade),
  };
}

export function sceneAt(seconds) {
  const time = Math.max(0, Math.min(duration, Number(seconds) || 0));
  const settled = time >= timing.summary;
  const step = settled ? 4 : steps.findIndex(s => time < s.end);
  const current = steps[step];
  const phase = settled ? 'settled' : time < timing.prediction ? 'question'
    : time < timing.result ? 'prediction' : step === 0 ? 'result' : current.id;
  const firstFlight = time >= timing.firstFlight && time < timing.firstFlight + motionTiming.firstFlight;
  const secondFlight = time >= timing.secondFlight && time < timing.secondFlight + motionTiming.secondFlight;
  const flight = firstFlight ? progress(time, timing.firstFlight, motionTiming.firstFlight)
    : secondFlight ? progress(time, timing.secondFlight, motionTiming.secondFlight) : null;
  const bridge = time >= timing.firstBridge && time < timing.firstFlight + motionTiming.firstFlight ? 'first'
    : time >= timing.secondBridge && time < timing.secondFlight + motionTiming.secondFlight ? 'second' : null;
  const bridgeStart = bridge === 'first' ? timing.firstBridge : timing.secondBridge;
  const flightStart = firstFlight ? timing.firstFlight : timing.secondFlight;
  const flightLength = firstFlight ? motionTiming.firstFlight : motionTiming.secondFlight;
  return {
    time, step, settled, phase,
    chartFrame: chartFrameAt(time),
    arrival: {
      room: ease(progress(time, 0, motionTiming.light)),
      backdrop: ease(progress(time, .2, motionTiming.light)),
      card: ease(progress(time, .4, motionTiming.arrival - .4)),
    },
    cardOpacity: current ? (step === 0 ? 1 : fadeIn(time, current.start)) * fadeOut(time, current.end) : 1,
    summaryOpacity: settled ? fadeIn(time, timing.summary) : 0,
    trackProgress: step > 0 && current ? ease(progress(time, current.start, motionTiming.trackTurn)) : 1,
    trackOpacity: step > 0 && current ? ease(progress(time, current.start, motionTiming.trackFade)) : 1,
    predictionProgress: ease(progress(time, timing.prediction, motionTiming.prediction)),
    predictionOpacity: fadeIn(time, timing.prediction),
    resultProgress: progress(time, timing.result, motionTiming.result),
    observedOpacity: fadeIn(time, timing.result + motionTiming.result - motionTiming.captionFade),
    cueOpacity: fadeOut(time, timing.prediction + motionTiming.captionFade),
    captionOpacity: phase === 'question' ? 0 : phase === 'prediction'
      ? fadeIn(time, timing.prediction) * fadeOut(time, timing.result) : fadeIn(time, timing.result),
    resultOpacity: fadeIn(time, timing.result),
    hiddenTests: time >= timing.hiddenTests,
    hiddenOpacity: fadeIn(time, timing.hiddenTests),
    endRuleOpacity: step === 1 ? fadeOut(time, timing.hiddenTests) : 1,
    bridge, flight,
    bridgeOpacity: bridge ? fadeIn(time, bridgeStart) * (flight === null ? 1
      : fadeOut(time, flightStart + flightLength / 2 + motionTiming.captionFade)) : 0,
  };
}

export function createPlayback({ still = false } = {}) {
  let time = still ? duration : 0;
  let playing = !still;
  let silentMotion = still;
  let lastFrame = null;
  return {
    get state() { return { ...sceneAt(time), playing, still: silentMotion }; },
    tick(delta) { if (playing) time = Math.min(duration, time + Math.max(0, Number(delta) || 0)); if (time === duration) playing = false; return this.state; },
    frame(now) {
      // Keep real elapsed time, including slow frames during capture. A 100 ms
      // cap was silently lengthening the pass under load. Pauses reset the clock.
      const delta = lastFrame === null ? 0 : (now - lastFrame) / 1000;
      lastFrame = now;
      return this.tick(delta);
    },
    pause() { playing = false; lastFrame = null; return this.state; },
    play() { silentMotion = false; if (time === duration) time = 0; playing = true; lastFrame = null; return this.state; },
    go(step) {
      if (!Number.isInteger(step) || step < 0 || step > steps.length) throw new RangeError('Step must be 0–4.');
      // Manual selection shows the complete evidence immediately, with no wait for a reveal.
      time = reviewTimes[step]; playing = false; lastFrame = null; return this.state;
    },
    seek(seconds) { time = sceneAt(seconds).time; playing = false; lastFrame = null; return this.state; },
    settle() { time = duration; playing = false; silentMotion = true; lastFrame = null; return this.state; },
  };
}
