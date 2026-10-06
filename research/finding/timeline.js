// The self-running pass: the steps, how long each lasts, and the words on each.
// Pure data and arithmetic, so node can test it without a browser.
import { PROGRAMME, MOMENTS, FIX, TOLD_UP_FRONT, JOB, ENDING, PAPER } from './data.js';

const moment = MOMENTS.find((m) => m.id === 'moment');
const shown = MOMENTS.find((m) => m.id === 'shown');
const failing = MOMENTS.find((m) => m.id === 'failing');

// One caption at a time, eight words or fewer (ASSUMPTIONS.md, assumption 4).
// Pacing (research/PACING.md, version 2): each step lasts at least its caption's reading time (words ÷ 3.5 + 1 s)
// plus its action plus a 1.2 s hold, and never under 4.5 s. Step 1 opens with a 1.2 s fade-up, then holds.
// `note` is the step card's longer text, shown only once the visitor has paused.
export const STEPS = [
  { id: 'job', dot: 'The job', dur: 4500, caption: null,
    note: `I give an AI a short piece of broken code to fix. A small script of mine, my checker, then runs checks on it: each row on the card is an input and the answer it should give. Some checks are held back and handed over later, in batches. This piece turns on a rule nobody wrote down: does 1..5 include the 5, and what should a backwards range like 9..2 give? Real systems disagree, so the AI can only guess.` },
  { id: 'fix', dot: 'Its fix', dur: 5000, caption: 'I gave an AI broken code to fix.',
    note: `It changed two lines. All ${JOB.visibleChecks} checks it could see now pass.` },
  { id: 'more', dot: 'More checks', dur: 5500, caption: 'When everything passes, my checker adds more.',
    note: `My checker hands over the next batch only when everything so far passes. Its code already handled these four.` },
  { id: 'green', dot: 'All passing', dur: 4500, caption: 'Everything passes. Is that all? It can’t tell.',
    note: `Nothing it can see is failing. It was told more checks exist, but not how many.` },
  { id: 'choice', dot: 'Two moves', dur: 4500, caption: 'Two moves: say DONE, or check again.',
    note: `DONE ends the job, and the code is then marked against every check, including the ones it never saw. It is never told the result. Checking again costs nothing, and brings the next batch if there is one.` },
  { id: 'done', dot: 'DONE', dur: 6000, caption: 'It wasn’t finished, and it’s never told.',
    note: `Its next reply was the single word DONE. Its code turns 9..2 into the numbers 2 to 9, and the hidden rule wanted nothing back, so ${JOB.fullPassedAtDone} of ${JOB.fullChecks} checks passed. In the four runs of this job before the change I show next, it said DONE here every time, even when I told it up front how many batches were held back.` },
  { id: 'tally', dot: 'Every DONE', dur: 8000, split: 0.48, caption: [`${PROGRAMME.dones} DONEs. ${PROGRAMME.wrong} were wrong.`, `${moment.wrong} of the ${PROGRAMME.wrong} wrong ones came here.`],
    note: `Now every DONE in the whole study, which gave ${PROGRAMME.models} AI models many jobs like this one: ${PROGRAMME.dones} DONEs. Red marks a wrong one. Once every batch had been handed over: ${shown.said} DONEs, never wrong. With a check visibly failing: no DONE at all, in ${failing.chances} chances. One wrong DONE came on the very first reply, before any code ran. At this one moment most DONEs were still right (${moment.said - moment.wrong}), but ${moment.wrong} were wrong.` },
  { id: 'line', dot: 'One extra line', dur: 7500, caption: `One printed line: wrong DONEs ${FIX.wrongWithout} → ${FIX.wrongWith}.`,
    note: `So I tried one change. Each time a batch arrives, the feedback now ends with one line saying how many are still held back (the line itself calls a batch a “stage”). On the ${FIX.jobs} jobs of this experiment, wrong DONEs at this moment fell from ${FIX.wrongWithout} to ${FIX.wrongWith}. But it mostly just said DONE less often, also on jobs where DONE would have been right, so it got more careful, not better at guessing. Telling it how many batches there were, right at the start, had changed nothing.` },
  { id: 'end', dot: 'Why it matters', dur: 0, caption: ENDING,
    note: `Followthrough is a tool I built that updates documents when an email changes a plan. The AI making the edits never gets to say it is finished: plain code collects the evidence, and a second AI accepts the work or sends it back. All of this is from my paper “${PAPER.title}”, ${PAPER.date}. The experiments cost $${PROGRAMME.usd} in AI usage. The job above is ${JOB.taskId} in the public logs, so anyone can check it.` },
];

export const RUN_LENGTH = STEPS.reduce((s, x) => s + x.dur, 0); // ms until the hand-over

export function stepStart(i) { let t = 0; for (let j = 0; j < i; j++) t += STEPS[j].dur; return t; }

// Where the pass is at time t: the step index and how far through it (0..1).
export function at(t) {
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const d = STEPS[i].dur;
    if (d === 0 || t < acc + d) return { i, f: d === 0 ? 1 : Math.max(0, (t - acc) / d) };
    acc += d;
  }
  return { i: STEPS.length - 1, f: 1 };
}

// The caption shown at (i, f): a step can carry two captions, the second taking over halfway.
export function captionAt(i, f) {
  const c = STEPS[i].caption;
  if (Array.isArray(c)) return f < (STEPS[i].split ?? 0.5) ? c[0] : c[1];
  return c;
}

export const wordCount = (s) => (s ? s.replace(/[→]/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length : 0);

// ── What is on screen at (step i, fraction f) ────────────────────────────────
// Pure, so the tests can check rules such as "the caveat is on screen whenever the fix is".
// One counting rule for every frame, the paper's own: the job has K stages kept back at the start;
// R of them have been released to the AI; N = K - R are still withheld. The AI's corner shows R and
// "?" for K (it is never told K), until the count line prints all three. The visitor's counter shows N.
const band = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a)));
export function sceneAt(i, f) {
  const id = STEPS[i].id;
  const s = {
    id, desk: true, tally: false, tallyP: 0, lit: -1, recede: false,
    pages: { 1: 'active', 2: 'kept0', 3: 'kept1' }, released: 0, kept: JOB.k, countLine: false, q: 'plain',
    code: { fix: 0, fix2: 0 }, checks: { 1: 0, 2: 0, 3: null }, moves: 'off', question: true,
    ai: { pose: 'read', f }, checker: { state: 'away', cf: 0, verdict: null },
    fix: false, caveat: false, tag: 'real', sight: 'desk',
  };
  const release = (r) => { s.released = r; s.kept = JOB.k - r; };
  const afterFix = () => { s.code.fix = 1; s.checks[1] = 1; };
  const afterMore = () => { afterFix(); s.pages = { 1: 'seen', 2: 'active', 3: 'kept0' }; release(1); s.checks[2] = 1; };
  switch (id) {
    case 'job': if (f >= 0.6) s.sight = 'code'; break; // after the arrival and a still hold, it starts reading the code
    case 'fix':
      // the change lands early and the green ticks then hold, so the fix is on screen long enough to be seen
      s.code.fix = band(f, 0.18, 0.34); s.checks[1] = band(f, 0.38, 0.62); s.ai.pose = f < 0.14 ? 'read' : 'work'; s.ai.f = band(f, 0.14, 0.42); s.sight = f < 0.38 ? 'code' : 'checks'; break;
    case 'more':
      afterFix();
      s.checker = { state: f >= 0.1 && f < 0.38 ? 'give' : 'away', cf: band(f, 0.1, 0.36), verdict: null };
      if (f >= 0.22) { s.pages = { 1: 'seen', 2: 'active', 3: 'kept0' }; release(1); }
      s.sight = f < 0.22 ? 'desk' : 'checks'; s.checks[2] = band(f, 0.4, 0.74); break;
    case 'green': afterMore(); s.q = 'pulse'; s.sight = f < 0.3 ? 'desk' : 'corner'; break; // looks over everything, then at the count
    case 'choice': afterMore(); s.question = false; s.moves = 'show'; s.sight = 'moves'; break;
    case 'done':
      afterMore(); s.question = false; s.moves = 'done'; s.ai.pose = 'raise'; s.ai.f = band(f, 0.03, 0.3); s.sight = f < 0.24 ? 'moves' : 'desk';
      s.checker = { state: f >= 0.24 ? 'score' : 'away', cf: band(f, 0.24, 0.56), verdict: 'wrong' };
      if (f >= 0.4) { s.pages[3] = 'revealed'; }
      if (f >= 0.56) s.checks[3] = 'red';
      break;
    case 'tally':
      s.desk = false; s.tally = true; s.tallyP = band(f, 0.04, 0.44); s.lit = f >= STEPS[i].split ? 2 : -1; s.recede = true;
      s.pages = { 1: 'hidden', 2: 'hidden', 3: 'hidden' }; s.kept = null; s.ai.pose = 'idle'; break;
    case 'line':
      afterMore(); s.tag = 'line'; s.question = false; s.q = 'lit'; s.countLine = true; s.caveat = true; s.sight = 'corner';
      if (f >= 0.12) s.moves = 'again';
      if (f >= 0.28) {
        s.pages = { 1: 'seen', 2: 'seen', 3: 'active' }; release(2);
        s.checker = { state: f < 0.4 ? 'give' : 'away', cf: band(f, 0.22, 0.38), verdict: null };
      }
      if (f >= 0.28) s.sight = 'checks';
      if (f >= 0.4) { s.ai.pose = 'work'; s.ai.f = band(f, 0.4, 0.55); s.sight = 'code'; }
      if (f >= 0.52) s.sight = 'checks';
      s.code.fix2 = band(f, 0.44, 0.5);
      if (f >= 0.52) s.checks[3] = 'green';
      if (f >= 0.58) { s.ai.pose = 'raise'; s.ai.f = band(f, 0.58, 0.72); s.moves = 'right'; s.sight = 'moves'; }
      s.fix = f >= 0.64; break;
    case 'end':
      s.desk = false; s.tally = true; s.tallyP = 1; s.lit = 2; s.recede = true; s.fix = true; s.caveat = true;
      s.pages = { 1: 'hidden', 2: 'hidden', 3: 'hidden' }; s.kept = null; s.ai.pose = 'idle'; break;
  }
  if (s.fix || s.countLine) s.caveat = true;
  return s;
}

// The AI's corner of the desk: what it knows about the count. Before the line, K is "?".
export function cornerText(s) {
  if (s.countLine) return `Released so far: stage ${s.released} of ${JOB.k}. Stages still withheld: ${JOB.k - s.released}.`;
  return s.released ? `Batches given to it so far: ${s.released} of ?` : 'Batches given to it so far: none yet, out of ?';
}
