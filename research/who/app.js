// "Who made this": the ride's last stop. A curtain call of about 9 seconds, then everything holds still.
import { STEPS, TOTAL, at, activeFigure, closing, timeForStep, tapPauses, actionProgress, cardShown, PACE, startOf } from './model.js';
import { HEAD, PERSON, CONTACT, CAST, UI, madeLine } from './data.js?v=20261006-who-copy';

const q = new URLSearchParams(location.search);
// ?nogl forces the still fallback that WebGL-less browsers get (used by the tests).
const noGL = q.has('nogl');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const still = q.has('still') || reduce;
const $ = (id) => document.getElementById(id);
const body = document.body;
if (still) body.classList.add('is-still');

// ---- Words, all from data.js ----
$('eyebrow').textContent = HEAD.eyebrow;
$('title').textContent = HEAD.title;
$('name').textContent = PERSON.name;
$('line').textContent = PERSON.line;
$('now').textContent = PERSON.now;
$('before').textContent = PERSON.before;
// Shown only once PERSON.made holds his sentence; until then the line is not rendered at all.
if (madeLine(PERSON)) $('made').textContent = madeLine(PERSON);
else $('made').remove();
$('resume-pdf').href = CONTACT.resumePdf; $('resume-pdf').textContent = UI.resumePdf;
$('resume-page').href = CONTACT.resumePage; $('resume-page').textContent = UI.resumePage;
$('email-link').href = `mailto:${CONTACT.email}`; $('email-link').textContent = UI.email;
$('address').textContent = CONTACT.email;
$('copy').textContent = UI.copy;
$('linkedin').href = CONTACT.linkedin; $('linkedin').innerHTML = `${UI.linkedin} <span aria-hidden="true">↗</span>`;
$('github').href = CONTACT.github; $('github').innerHTML = `${UI.github} <span aria-hidden="true">↗</span>`;
$('skip-name').textContent = PERSON.name; $('skip-text').textContent = UI.skip;
$('again').textContent = UI.again;

// ---- The blurred track: one card per station, each with a rough sketch of what that station produced ----
const SKETCH = {
  tome: '<i class="sk-slide"><b></b><u></u><u></u><u></u><em></em></i>',
  adsp: '<i class="sk-bars"><u style="--h:.35"></u><u style="--h:.7"></u><u style="--h:.5"></u><u style="--h:.9"></u><u style="--h:.6"></u></i>',
  followthrough: '<i class="sk-docs"><s><b></b><u></u><u class="hl"></u><u></u></s><s><b></b><u></u><u class="hl"></u><u></u></s></i>',
  finding: '<i class="sk-list"><u class="ok"></u><u class="ok"></u><u class="ok"></u><u class="q"></u></i>',
};
const track = $('track');
for (const c of CAST) {
  const el = document.createElement('div');
  el.className = 'tcard'; el.dataset.id = c.id;
  el.innerHTML = `${SKETCH[c.id]}<span class="tc-lines"><u></u><u></u></span>`;
  track.append(el);
}

// ---- Without WebGL: still portraits of the same four figures, rendered once from actors.js ----
const fallback = $('fallback');
const figEl = {};
for (const c of CAST) {
  const img = document.createElement('img');
  img.className = 'fig'; img.dataset.id = c.id; img.src = `img/fig-${c.id}.png`; img.alt = '';
  fallback.append(img); figEl[c.id] = img;
}

// ---- Station labels: under each figure; after the curtain call they link back to that station ----
const labels = $('labels');
const labelEl = {};
for (const c of CAST) {
  const a = document.createElement('a');
  a.className = 'label'; a.dataset.id = c.id; a.href = c.href; a.target = '_top';
  a.title = `Back to ${c.name}`;
  a.innerHTML = `<span class="l-name">${c.name}</span><span class="l-gloss">${c.gloss}</span>`;
  labels.append(a); labelEl[c.id] = a;
}

// ---- Step dots ----
const DOTS = [...CAST.map((c) => ({ id: c.id, name: c.name })), { id: 'you', name: UI.maker }];
const dots = $('dots');
for (const d of DOTS) {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" data-step="${d.id}"><span class="dot" aria-hidden="true"></span><span class="d-name">${d.name}</span></button>`;
  dots.append(li);
}

// ---- State and the test hook ----
const state = { t: still ? TOTAL : 0, id: 'arrive', index: 0, f: 0, settled: still, paused: false, still, webgl: false };
let actors = null;
let lastNow = performance.now();
let settledAt = still ? 0 : null;
let raf = 0;
let snap = false; // true for one frame after a restart: the figures jump back to their places instead of walking

function apply() {
  const pos = at(state.t);
  Object.assign(state, { id: pos.id, index: pos.index, f: pos.f, settled: pos.settled });
  const active = activeFigure(pos);
  const close = closing(pos);
  body.dataset.step = pos.id;
  body.classList.toggle('is-closing', close > 0.3);
  body.classList.toggle('is-settled', pos.settled);
  body.classList.toggle('is-paused', state.paused && !pos.settled);
  const shown = cardShown(pos);
  body.classList.toggle('has-active', shown);
  // the first 2 s: the scene fades up and nothing moves
  body.classList.toggle('is-arriving', !still && state.t < PACE.fadeUp && !pos.settled);

  const card = shown ? CAST.find((c) => c.id === active) : null;
  if (card && $('turn').dataset.id !== card.id) {
    $('turn').dataset.id = card.id;
    $('turn-name').textContent = card.name;
    $('turn-what').textContent = card.what;
    $('turn-proof').textContent = card.proof;
    travel(card.id);
  }
  if (!card && !active) delete $('turn').dataset.id;
  for (const el of track.children) el.classList.toggle('is-on', el.dataset.id === active);
  for (const c of CAST) figEl[c.id].classList.toggle('is-on', c.id === active);
  for (const c of CAST) labelEl[c.id].classList.toggle('is-on', c.id === active);
  for (const b of dots.querySelectorAll('button')) {
    const on = b.dataset.step === pos.id;
    b.classList.toggle('is-current', on);
    if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  }
  $('play').textContent = state.paused ? UI.play : UI.pause;

  if (actors) actors.frame({ active, f: actionProgress(pos), close, still: snap || still || state.t < PACE.fadeUp || pos.settled && settledAt !== null && performance.now() - settledAt > 1800, time: state.t });
  snap = false;
  placeLabels();
}

// The card comes forward from its own blurred card on the track: start at that card's place and size, blurred, and
// move to the centre, sharp. Skipped when nothing should move.
let flight = null;
function travel(id) {
  const el = $('turn');
  if (still || !el.animate) return;
  const src = track.querySelector(`[data-id="${id}"]`);
  if (!src) return;
  if (flight) { flight.cancel(); flight = null; } // a new turn replaces a card still in the air
  body.classList.add('has-active'); // measure the card where it will land
  const a = src.getBoundingClientRect(); const b = el.getBoundingClientRect();
  if (!b.width) return;
  const k = Math.max(0.2, a.width / b.width);
  // start where the track card is, kept inside the screen (the outer track cards lean past the edge)
  const half = (k * b.width) / 2 + 8;
  const cx = Math.min(innerWidth - half, Math.max(half, a.left + a.width / 2));
  const dx = cx - (b.left + b.width / 2); const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  // The flight path crosses the row of station labels, so they step out of the way while the card is moving.
  body.classList.add('is-travelling');
  const anim = el.animate([
    { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(${k})`, filter: 'blur(5px)', opacity: 0.55 },
    { transform: 'translate(-50%, 0) scale(1)', filter: 'blur(0px)', opacity: 1 },
  ], { duration: 900, easing: 'cubic-bezier(.45,0,.25,1)' });
  flight = anim;
  const land = () => { if (flight === anim || flight === null) { flight = null; body.classList.remove('is-travelling'); } };
  anim.onfinish = land;
}

// No caption may sit on a figure other than its own, at any moment: while a figure in the light (or one walking
// back to its place) passes over a neighbour's caption, that caption steps out of sight at once and returns
// when the way is clear. Two captions that would touch keep only the nearer figure's.
const hit = (R, F) => R.left < F.right && F.left < R.right && R.top < F.bottom && F.top < R.bottom;
function keepCaptionsClear(an, host) {
  const figs = actors.boxes();
  const rects = {};
  for (const c of CAST) {
    const el = labelEl[c.id]; el.classList.remove('is-covered');
    const r = el.getBoundingClientRect();
    rects[c.id] = { left: r.left - host.left, right: r.right - host.left, top: r.top - host.top, bottom: r.bottom - host.top };
  }
  // the card in the light is an obstacle too
  const turn = $('turn');
  if (parseFloat(getComputedStyle(turn).opacity) > 0.02 && getComputedStyle(turn).visibility !== 'hidden') {
    const t = turn.getBoundingClientRect();
    figs.card = [{ left: t.left - host.left, right: t.right - host.left, top: t.top - host.top, bottom: t.bottom - host.top }];
  }
  for (const c of CAST) {
    if (Object.entries(figs).some(([id, parts]) => id !== c.id && parts.some((F) => hit(rects[c.id], F)))) labelEl[c.id].classList.add('is-covered');
  }
  for (const a of CAST) for (const b of CAST) {
    if (a.id >= b.id || labelEl[a.id].classList.contains('is-covered') || labelEl[b.id].classList.contains('is-covered')) continue;
    if (hit(rects[a.id], rects[b.id])) labelEl[(an[a.id].foot.y < an[b.id].foot.y ? a : b).id].classList.add('is-covered');
  }
}

// Labels sit under each figure's feet: the 3D figure's, or the still portrait's when there is no WebGL.
function placeLabels() {
  if (!actors) {
    for (const c of CAST) {
      const r = figEl[c.id].getBoundingClientRect();
      labelEl[c.id].style.left = `${r.left + r.width / 2}px`;
      labelEl[c.id].style.top = `${r.bottom - r.height * 0.06}px`;
    }
    return;
  }
  const an = actors.anchors();
  const host = $('cast').getBoundingClientRect();
  for (const c of CAST) {
    const p = an[c.id].foot;
    labelEl[c.id].style.left = `${host.left + p.x}px`;
    labelEl[c.id].style.top = `${host.top + p.y}px`;
  }
  // The card sits under the figure in the light, and never higher than the bottom of the other captions,
  // so it doesn't have to hide them.
  if (an.front) {
    const lowest = Math.max(0, ...CAST.map((c) => host.top + an[c.id].homeFoot.y + labelEl[c.id].offsetHeight)); // where the captions rest, so the card never jumps
    $('turn').style.setProperty('--front-y', `${Math.max(host.top + an.front.y, lowest + 8)}px`);
  }
  keepCaptionsClear(an, host);
}

function tick(now) {
  const dt = Math.max(0, Math.min(0.1, (now - lastNow) / 1000)); lastNow = Math.max(lastNow, now); // a frame stamp can predate wake()
  if (!state.paused && !state.settled) state.t = Math.min(TOTAL, state.t + dt * (window.__station.rate || 1));
  if (at(state.t).settled && settledAt === null) settledAt = now;
  apply();
  // Once settled, run a moment longer so the figures finish their last move, then stop drawing: everything holds still.
  const done = state.settled && settledAt !== null && now - settledAt > 2000;
  raf = done ? 0 : requestAnimationFrame(tick);
}
function wake() { if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(tick); } }

function play() {
  if (state.settled) { state.t = 0; settledAt = null; snap = true; }
  state.paused = false; wake(); apply();
}
function pause() { if (!state.settled) { state.paused = true; apply(); } }
function go(step) {
  const t = timeForStep(step);
  if (t === null) return false;
  if (state.settled && t < TOTAL) snap = true;
  state.t = t; settledAt = t >= TOTAL ? performance.now() : null;
  wake(); apply(); return true;
}
window.__station = { state, play, pause, go, steps: STEPS.map((s) => s.id), starts: STEPS.map((s, i) => startOf(i)), total: TOTAL, pace: PACE,
  rate: 1, // test-only playback speed

  // for the overlap check: each figure's solid parts as rectangles in page pixels
  figureBoxes() { if (!actors) return {}; const h = $('cast').getBoundingClientRect(); const b = actors.boxes(); for (const k in b) b[k] = b[k].map((r) => ({ left: r.left + h.left, right: r.right + h.left, top: r.top + h.top, bottom: r.bottom + h.top })); return b; } };

// ---- Touch: a tap anywhere pauses; links and buttons act at once and never count as a pause ----
function chainOf(target) {
  const out = [];
  for (let n = target; n && n.nodeType === 1; n = n.parentElement) out.push({ tag: n.tagName, role: n.getAttribute('role'), selectable: n.classList.contains('address') });
  return out;
}
const touch = (e) => { if (!state.settled && !state.paused && tapPauses(chainOf(e.target))) pause(); };
window.addEventListener('pointerdown', touch, { passive: true });
window.addEventListener('wheel', touch, { passive: true });
window.addEventListener('keydown', touch);

$('play').addEventListener('click', () => (state.paused ? play() : pause()));
$('skip').addEventListener('click', () => { state.paused = false; go('you'); });
$('again').addEventListener('click', () => { state.t = 0; settledAt = null; snap = true; state.paused = false; wake(); apply(); });
dots.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.paused = b.dataset.step !== 'you';
  go(b.dataset.step);
});
$('copy').addEventListener('click', async () => {
  let ok = false;
  try { await navigator.clipboard.writeText(CONTACT.email); ok = true; } catch {
    const r = document.createRange(); r.selectNodeContents($('address'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); ok = document.execCommand && document.execCommand('copy');
  }
  $('copy').textContent = ok ? UI.copied : UI.copy;
  setTimeout(() => { $('copy').textContent = UI.copy; }, 1800);
});

// ---- Start ----
async function start() {
  if (!noGL) {
    try {
      const { createActors } = await import('./actors.js');
      actors = createActors($('cast'));
    } catch (err) { console.warn('3D figures unavailable; showing still portraits', err); }
  }
  state.webgl = !!actors;
  if (!actors) body.classList.add('no-3d');
  window.addEventListener('resize', () => { if (actors) actors.resize(); apply(); });
  if (document.fonts) await document.fonts.ready.catch(() => {});
  apply(); // place the cast before the first paint, so nothing jumps
  body.classList.add('is-ready');
  if (still) { apply(); requestAnimationFrame(() => { if (actors) actors.resize(); apply(); }); return; }
  wake();
}
start();
