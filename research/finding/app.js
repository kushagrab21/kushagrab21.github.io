// The finding: the self-running replay, the hand-over, and the test hook.
import { STEPS, RUN_LENGTH, at, stepStart, captionAt, sceneAt, cornerText } from './timeline.js';
import { JOB, MOMENTS, FIX, CAVEAT, PAPER } from './data.js';
import { createTally } from './tally.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STILL = params.has('still') || reduced;
const root = $('finding');
root.classList.toggle('is-still', STILL);

// ── Static content ─────────────────────────────────────────────────────────
$('modelName').textContent = JOB.modelLabel;
$('caveat').textContent = CAVEAT;
$('source').innerHTML = `Replayed from <a href="${PAPER.repo}" target="_blank" rel="noopener">the public logs&nbsp;↗</a>, job ${JOB.taskId}, ${JOB.date}`;

const codeEl = $('code');
codeEl.innerHTML = JOB.code.map((l, i) => `<span class="ln${l.t.trim() === '…' ? ' gap' : ''}${l.short ? ' optional' : ''}${l.elide ? ' elide' : ''}" data-i="${i}">${esc(l.t)}</span>`).join('');
const codeLines = [...codeEl.querySelectorAll('.ln')];
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

// The three pages of checks. Each has a decorative blurred layer (no text in it) and a sharp layer.
const pagesEl = $('pages');
const PAGE = {};
for (const pg of JOB.pages) {
  const el = document.createElement('div');
  el.className = 'page'; el.dataset.n = pg.n;
  const bars = Array.from({ length: 4 + pg.checks.length }, (_, j) => `<i style="width:${88 - (j % 3) * 18}%"></i>`).join('');
  // on a phone the first page lists one row fewer (its 'and N more' counts it instead)
  const rows = pg.checks.map(([a, b], j) => `<li${pg.more && j === pg.checks.length - 1 ? ' class="wide-only"' : ''}><code>${esc(a)}</code><span class="to">→</span><code>${esc(b)}</code><span class="mark" aria-hidden="true"></span></li>`).join('');
  el.innerHTML = `
    <div class="page-blur" aria-hidden="true"><span class="bh"></span>${bars}</div>
    <div class="page-sharp">
      <p class="page-title">${pg.label}<span class="page-count">${pg.checks.length + pg.more} check${pg.checks.length + pg.more > 1 ? 's' : ''}</span></p>
      <ul class="checks">${rows}${pg.more ? `<li class="more"><span class="wide-only">and ${pg.more} more</span><span class="narrow-only">and ${pg.more + 1} more</span></li>` : ''}</ul>
      ${pg.gave ? `<p class="gave">Its code gave <code>${esc(pg.gave)}</code></p><p class="rule">The rule nobody wrote: a backwards range gives nothing back.</p>` : ''}
    </div>
    <p class="page-summary"><span>${pg.label}<span class="sep"></span>${pg.checks.length + pg.more} check${pg.checks.length + pg.more > 1 ? 's' : ''}</span><span class="mark ok" aria-hidden="true"></span></p>`;
  pagesEl.appendChild(el);
  PAGE[pg.n] = { el, marks: [...el.querySelectorAll('.checks .mark')], more: el.querySelector('.checks .more') };
}

// The fix strip: 12 red dots, then 6.
$('fixWithout').innerHTML = '<i></i>'.repeat(FIX.wrongWithout); $('fixWithoutN').textContent = FIX.wrongWithout;
$('fixWith').innerHTML = '<i></i>'.repeat(FIX.wrongWith); $('fixWithN').textContent = FIX.wrongWith;

// The four signs under the tally
const signsEl = $('signs');
const SIGN = MOMENTS.map((m, i) => {
  const el = document.createElement('div'); el.className = 'sign'; el.dataset.i = i;
  // the pile's label is its size only; the red dots carry the wrong ones (the caption says 73 of the 74)
  const count = m.id === 'failing' ? `<b>0</b> DONEs in ${m.chances} chances` : `<b>${m.said}</b> DONE${m.said === 1 ? '' : 's'}`;
  el.innerHTML = `<p class="sign-count">${count}</p><p class="sign-plate">${m.sign}</p>`;
  signsEl.appendChild(el); return el;
});

// Step dots
const dotsEl = $('dots');
const DOTS = STEPS.map((st, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" aria-label="Step ${i + 1}: ${st.dot}" title="${st.dot}">${i + 1}</button>`;
  li.firstChild.addEventListener('click', () => { go(i); });
  dotsEl.appendChild(li); return li.firstChild;
});

// The step cards on their curved track. On its turn a card leaves the track and comes forward as the centre card.
const trackEl = $('track');
const CARDS = STEPS.map((st, i) => {
  const li = document.createElement('li'); li.className = 'tcard';
  li.innerHTML = `<b>${i + 1}</b><span>${st.dot}</span>`;
  trackEl.appendChild(li); return li;
});
const chipHTML = (i) => `<b>${i + 1}</b>${STEPS[i].dot}`;
let lastStep = -1;
function stepArrives(i) {
  // fly a copy of the track card to the centre card, where it becomes the step chip
  $('deskChip').innerHTML = chipHTML(i); $('tallyChip').innerHTML = chipHTML(i);
  if (STILL || !G || lastStep === -1) return;
  const from = CARDS[i].getBoundingClientRect(); const target = (sceneAt(i, 0.01).desk ? $('desk') : $('tally')).getBoundingClientRect();
  if (!from.width || !target.width) return;
  const ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.innerHTML = CARDS[i].innerHTML;
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(ghost);
  const dx = target.left + target.width / 2 - (from.left + from.width / 2); const dy = target.top + Math.min(60, target.height / 3) - (from.top + from.height / 2);
  const k = Math.min(3.2, target.width / from.width);
  ghost.animate([{ transform: 'none', opacity: 0.95 }, { transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: 0 }], { duration: 820, easing: 'cubic-bezier(.45,.05,.25,1)' }).onfinish = () => ghost.remove();
}

// ── 3D figures (loaded lazily; the page works without them) ──────────────────
let actors = null;
// Without WebGL the figures are drawn once as flat silhouettes in the same places (a still fallback).
function stillFigures() {
  if ($('actors').querySelector('.still-fig')) return;
  root.classList.add('no-3d');
  $('actors').insertAdjacentHTML('beforeend', `
    <svg class="still-fig fig-ai" viewBox="0 0 80 110" aria-hidden="true"><ellipse cx="40" cy="104" rx="30" ry="5" fill="#1b1511" opacity=".6"/><rect x="34" y="78" width="12" height="22" rx="4" fill="#6d5b49"/><rect x="14" y="44" width="52" height="40" rx="12" fill="#e9dfcc"/><rect x="18" y="8" width="44" height="30" rx="11" fill="#e9dfcc"/><rect x="23" y="16" width="34" height="12" rx="5" fill="#1b1511"/><rect x="29" y="20" width="7" height="4" rx="2" fill="#f6c453"/><rect x="44" y="20" width="7" height="4" rx="2" fill="#f6c453"/><rect x="4" y="48" width="9" height="30" rx="4.5" fill="#e9dfcc"/><rect x="67" y="48" width="9" height="30" rx="4.5" fill="#e9dfcc"/></svg>
    <svg class="still-fig fig-checker" viewBox="0 0 80 120" aria-hidden="true"><ellipse cx="40" cy="114" rx="26" ry="5" fill="#1b1511" opacity=".6"/><path d="M26 112 L32 52 L48 52 L54 112 Z" fill="#7d8683"/><rect x="20" y="38" width="40" height="26" rx="9" fill="#7d8683"/><rect x="26" y="8" width="28" height="24" rx="9" fill="#7d8683"/><rect x="30" y="18" width="20" height="3" rx="1.5" fill="#cfd8d4"/><rect x="29" y="44" width="22" height="28" rx="2" fill="#e6dccb" transform="rotate(-6 40 58)"/></svg>`);
}
import('./actors.js').then(({ createActors }) => { actors = createActors($('actors')); if (!actors) stillFigures(); layout(); render(); }).catch(() => { stillFigures(); layout(); render(); });

const tally = createTally($('tallyCanvas'));

// ── Layout: the stage is measured once per resize; pages move between measured spots ──
let G = null;
function layout() {
  // a short phone (inside the site: about 600 px or less) gets a tighter page, and the revealed batch is laid over the desk (7 Oct 2026)
  root.classList.toggle('is-short', innerWidth < 640 && innerHeight < 720);
  const short = root.classList.contains('is-short');
  const st = $('stage').getBoundingClientRect();
  const W = st.width; const H = st.height; const narrow = W < 640;
  root.classList.toggle('is-narrow', narrow);
  // the step-card track has its own band at the top; the figures stand below it, so nothing hides a card
  const trackH = narrow ? 28 : 40;
  // short laptop screens show 7 lines of code (styles.css, 3.1), and that room goes to the figures
  const shortScreen = !narrow && innerHeight <= 760;
  let actorsH = narrow ? Math.round(Math.max(118, Math.min(136, H * 0.17))) : Math.round(Math.max(160, Math.min(266, H * (shortScreen ? 0.4 : 0.32))));
  const capH = narrow ? (short ? 42 : 50) : 40;
  const deskW = narrow ? W - 24 : Math.min(720, Math.round(W * 0.54));
  const deskX = narrow ? 12 : Math.round(W * 0.43 - deskW / 2);
  let deskTop = actorsH + capH;
  // on short screens the slot is only as tall as batch 1 under one finished row needs (it then matches the 7-line code)
  let slotH = narrow ? 129 : shortScreen ? 146 : Math.round(Math.max(150, Math.min(210, (H - deskTop) * 0.5)));
  const s = root.style;
  s.setProperty('--track-h', `${trackH}px`); s.setProperty('--actors-h', `${actorsH}px`); s.setProperty('--desk-x', `${deskX}px`); s.setProperty('--desk-w', `${deskW}px`);
  s.setProperty('--desk-top', `${deskTop}px`); s.setProperty('--slot-h', `${slotH}px`); s.setProperty('--cap-top', `${actorsH + 4}px`);
  // Fit the desk: measure it at its tallest (with the AI's printed line showing). First shrink the slot (on a
  // laptop only down to the code beside it), then, if still needed, give the figures less height.
  {
    const had = root.classList.contains('show-countline'); root.classList.add('show-countline');
    const below = short ? 26 : narrow ? 150 : 10; // phone: room for "Held back…" and the revealed batch under the desk
    const measureOver = () => $('desk').getBoundingClientRect().bottom - st.top + below - H;
    let over = measureOver();
    if (over > 0) {
      const codeH = narrow ? 0 : $('code').getBoundingClientRect().height;
      const floor = short ? 112 : narrow ? 122 : Math.max(132, Math.ceil(codeH));
      const cut = Math.min(over, Math.max(0, slotH - floor));
      slotH -= Math.ceil(cut); s.setProperty('--slot-h', `${slotH}px`);
      over = measureOver();
    }
    if (over > 0) {
      const cut = Math.min(Math.ceil(over), actorsH - (short ? 74 : narrow ? 104 : 138));
      actorsH -= cut; deskTop -= cut;
      s.setProperty('--actors-h', `${actorsH}px`); s.setProperty('--desk-top', `${deskTop}px`); s.setProperty('--cap-top', `${actorsH + 4}px`);
    }
    if (!had) root.classList.remove('show-countline');
  }
  // tally area: where the desk and the fog were
  const tw = narrow ? W - 24 : Math.min(980, W - 120);
  const tx = (W - tw) / 2; const ty = actorsH + capH + (narrow ? 0 : 6);
  const th = Math.max(short ? 170 : 200, (narrow ? H - ty - (short ? 150 : 112) : H - ty - 84));
  s.setProperty('--tally-x', `${tx}px`); s.setProperty('--tally-y', `${ty}px`); s.setProperty('--tally-w', `${tw}px`); s.setProperty('--tally-h', `${th}px`);
  tally.layout(tw, th, narrow);
  placeSigns(narrow, th);
  G = { W, H, narrow, actorsH, trackH, deskX, deskW, deskTop, st };
  measure();
  placeTrack(W, actorsH, narrow);
  // stand the AI over its desk and the checker over (or beside) the pile, then take the AI's sight from its eyes
  if (actors) {
    // the band's height may have just changed: size the camera to it now, before placing the figures by screen position
    actors.resize();
    actors.frame({ pose: 'read', f: 0, still: true, time: 0, checker: 'away' });
    actors.setHome('ai', deskX + deskW / 2, 0.2);
    actors.setHome('checker', narrow ? W * 0.84 : G.pile.x + G.pile.w / 2, narrow ? -1.6 : -0.9);
    actors.snap(); actors.frame({ pose: 'read', f: 0, still: true, time: 0, checker: 'away' });
  }
  const eye0 = actors ? actors.anchors().eye : { x: deskX + deskW / 2, y: (actorsH - trackH) * 0.45 };
  const eye = { x: eye0.x, y: eye0.y + trackH };
  G.eye = eye; G.deskTopY = deskTop; sightNow = null; // the cone is drawn each frame by drawSight()
  const a = actors ? actors.anchors() : null;
  const aiX = a ? a.aiFoot.x : deskX + deskW / 2; const ckX = a ? a.checkerFoot.x : G.pile.x + G.pile.w / 2;
  s.setProperty('--ai-label-x', `${aiX}px`); s.setProperty('--ai-label-y', `${Math.min(actorsH - 24, a ? a.aiFoot.y + trackH + 2 : actorsH)}px`);
  s.setProperty('--ck-label-y', `${Math.min(actorsH - 24, a ? a.checkerFoot.y + trackH + 2 : actorsH)}px`);
  s.setProperty('--fog-x', `${ckX}px`);
  // keep both labels inside the stage
  for (const [id, v, x] of [['labAI', '--ai-label-x', aiX], ['labChecker', '--ck-label-x', ckX]]) {
    const lw = $(id).getBoundingClientRect().width;
    s.setProperty(v, `${Math.max(lw / 2 + 8, Math.min(W - lw / 2 - 8, x))}px`);
  }
  lastScene = null;
}
// The desk's size depends on what it shows (the counter line), so its slot and the pile are re-measured.
function measure() {
  const st = $('stage').getBoundingClientRect(); const { narrow, W, H } = G;
  const dr = $('desk').getBoundingClientRect(); const sr = $('slot').getBoundingClientRect();
  G.slot = { x: sr.left - st.left, y: sr.top - st.top, w: sr.width, h: sr.height };
  const desk = { x: dr.left - st.left, y: dr.top - st.top, w: dr.width, h: dr.height };
  const pageW = narrow ? desk.w - 36 : Math.min(300, Math.round(W * 0.2));
  G.pile = narrow && root.classList.contains('is-short')
    ? { x: desk.x + 14, y: G.slot.y + 6, w: desk.w - 28, h: Math.max(90, Math.min(150, H - (G.slot.y + 6) - 4)) }
    : narrow
    ? { x: desk.x + 18, y: desk.y + desk.h + 22, w: pageW, h: Math.max(90, Math.min(150, H - (desk.y + desk.h + 22) - 4)) }
    : { x: Math.min(W - pageW - 24, desk.x + desk.w + Math.round((W - desk.x - desk.w - pageW) / 2)), y: desk.y + 34, w: pageW, h: Math.min(200, desk.h - 120) };
  const s = root.style;
  s.setProperty('--pile-x', `${G.pile.x}px`); s.setProperty('--pile-y', `${G.pile.y}px`); s.setProperty('--pile-w', `${G.pile.w}px`); s.setProperty('--pile-h', `${G.pile.h}px`);
  s.setProperty('--desk-bottom', `${desk.y + desk.h}px`);
}
// A shallow arc across the back wall: the middle sits furthest back (higher, smaller), the ends nearer.
function placeTrack(W, actorsH, narrow) {
  const n = CARDS.length; const cw = narrow ? 30 : Math.min(124, (W - 80) / n - 10); const ch = narrow ? 22 : 28;
  const left = narrow ? 8 : 30; const span = W - left * 2 - cw;
  CARDS.forEach((c, i) => {
    const u = i / (n - 1); const d = (u - 0.5) * 2; // -1 … 1
    const depth = 1 - d * d; // 1 at the middle
    const x = left + u * span; const y = (narrow ? 2 : 4) + (narrow ? 5 : 10) * (1 - depth);
    const sc = 1 - (narrow ? 0.12 : 0.14) * depth;
    Object.assign(c.style, { left: `${x}px`, top: `${y}px`, width: `${cw}px`, height: `${ch}px`, transform: `perspective(600px) rotateY(${-d * 28}deg) scale(${sc})` });
  });
}
function placeSigns(narrow, th) {
  const regs = tally.regions();
  regs.forEach((R, i) => {
    const el = SIGN[i]; const m = MOMENTS[i];
    el.style.left = `${R.x}px`; el.style.width = `${R.w}px`;
    const rows = Math.ceil(m.said / R.per);
    if (R.row) {
      // phone: one row per moment, the sign on the left and the pile growing to its right
      el.style.left = '0px'; el.style.width = '100%'; el.style.top = '0px'; el.style.height = `${th}px`;
      const cnt = el.querySelector('.sign-count'); const pl = el.querySelector('.sign-plate');
      Object.assign(cnt.style, { top: `${R.base - rows * R.s - 20}px`, left: `${R.x}px`, right: 'auto', textAlign: 'left' });
      Object.assign(pl.style, { top: `${R.mid}px`, left: '0px', right: 'auto', width: `${R.signW}px`, transform: 'translateY(-50%)' });
    } else {
      el.style.top = '0px'; el.style.height = `${th}px`;
      el.querySelector('.sign-count').style.top = `${R.base - rows * R.s - 24}px`;
      el.querySelector('.sign-plate').style.top = `${R.signTop}px`;
    }
  });
}

// ── Applying a scene ─────────────────────────────────────────────────────────
let lastScene = null;
function setClass(el, cls, on) { if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); }
function placePage(n, where, seenIndex) {
  const P = PAGE[n].el; const { slot, pile, narrow } = G;
  const ROW = narrow ? 21 : 27;
  let x; let y; let w; let h;
  if (where === 'active') { x = slot.x; y = slot.y + seenIndex * ROW; w = slot.w; h = slot.h - seenIndex * ROW; }
  else if (where === 'seen') { x = slot.x; y = slot.y + seenIndex * ROW; w = slot.w; h = ROW - 3; }
  else if (where === 'kept0' || where === 'revealed') { x = pile.x; y = pile.y; w = pile.w; h = pile.h; }
  else if (where === 'kept1') { x = pile.x + (narrow ? 10 : 18); y = pile.y + (narrow ? 12 : -14); w = pile.w; h = pile.h; }
  else { x = pile.x; y = pile.y; w = pile.w; h = pile.h; }
  P.style.left = `${x}px`; P.style.top = `${y}px`; P.style.width = `${w}px`; P.style.height = `${h}px`;
  for (const c of ['active', 'seen', 'kept0', 'kept1', 'revealed', 'hidden']) setClass(P, `is-${c}`, c === where);
}

function apply(i, f) {
  const sc = sceneAt(i, f);
  const key = JSON.stringify([sc, i]);
  if (i !== lastStep) { stepArrives(i); lastStep = i; }
  // layout-affecting state only when it changes
  if (key !== lastScene) {
    lastScene = key;
    setClass(root, 'show-desk', sc.desk); setClass(root, 'show-tally', sc.tally);
    setClass(root, 'show-fix', sc.fix); setClass(root, 'show-caveat', sc.caveat);
    setClass(root, 'recede', sc.recede); setClass(root, 'checker-on', sc.checker.state === 'score');
    setClass(root, 'show-countline', sc.countLine);
    const corner = $('corner'); const ct = cornerText(sc);
    if (corner.textContent !== ct) corner.innerHTML = ct.replace('?', '<b class="q">?</b>');
    setClass(corner, 'pulse', sc.q === 'pulse'); setClass(corner, 'lit', sc.countLine);
    measure();
    // pages
    let seen = 0;
    for (const n of [1, 2, 3]) { const w = sc.pages[n]; if (w === 'seen') placePage(n, 'seen', seen++); }
    for (const n of [1, 2, 3]) { const w = sc.pages[n]; if (w !== 'seen') placePage(n, w, seen); }
    // checks
    for (const n of [1, 2]) {
      const v = sc.checks[n]; const marks = PAGE[n].marks; const total = marks.length + (PAGE[n].more ? 1 : 0);
      marks.forEach((m, j) => setClass(m, 'ok', v >= (j + 1) / total));
      if (PAGE[n].more) setClass(PAGE[n].more, 'ok', v >= 1);
    }
    const m3 = PAGE[3].marks[0]; setClass(m3, 'bad', sc.checks[3] === 'red'); setClass(m3, 'ok', sc.checks[3] === 'green');
    setClass(PAGE[3].el, 'is-wrong', sc.checks[3] === 'red'); setClass(PAGE[3].el, 'is-mended', sc.checks[3] === 'green');
    // code
    JOB.code.forEach((l, j) => {
      const el = codeLines[j]; let t = l.t; let changed = false;
      if (l.fix && sc.code.fix >= 0.5) { t = l.fix; changed = sc.id === 'fix'; }
      if (l.fix2 && sc.code.fix2 >= 0.5) { t = l.fix2; changed = true; }
      if (el.textContent !== t) el.textContent = t;
      setClass(el, 'changed', changed);
    });
    // the desk's own words
    setClass($('question'), 'off', !sc.question);
    const mv = $('moves'); mv.dataset.state = sc.moves;
    $('deskTag').textContent = sc.tag === 'line' ? 'Same job, run again with one extra line' : 'One real job, replayed';
    setClass($('deskTag'), 'alt', sc.tag === 'line');
    // kept-back counter (visitor's side)
    setClass($('kept'), 'off', sc.kept === null);
    setClass(root, 'has-kept', !!sc.kept);
    if (sc.kept !== null) { $('keptN').textContent = sc.kept; $('keptUnit').textContent = sc.kept === 1 ? 'batch' : 'batches'; }
    // signs
    SIGN.forEach((el, j) => { setClass(el, 'lit', j === sc.lit); setClass(el, 'landed', sc.tallyP >= 0.97); });
    CARDS.forEach((c, j) => { setClass(c, 'out', j === i); setClass(c, 'past', j < i); });
    DOTS.forEach((d, j) => { setClass(d, 'on', j === i); setClass(d, 'past', j < i); d.setAttribute('aria-current', j === i ? 'step' : 'false'); });
  }
  const cap = captionAt(i, f) ?? '';
  const capEl = $('caption');
  if (capEl.dataset.t !== cap) { capEl.dataset.t = cap; capEl.innerHTML = cap.replace('DONE', '<b>DONE</b>'); capEl.classList.remove('in'); void capEl.offsetWidth; capEl.classList.add('in'); }
  if (sc.tally) tally.draw(sc.tallyP, { lit: sc.lit });
  return sc;
}

// ── The clock ────────────────────────────────────────────────────────────────
const state = { t: 0, playing: !STILL, step: 0, f: 0, ended: false, frozen: false };
let raf = 0; let prev = 0;
// The AI's sight: the spotlight cone narrows onto what it is looking at, and a soft ring marks that spot on the
// desk. It moves over about 0.7 s (PACING.md v2).
const SIGHT_EL = { desk: 'desk', code: 'code', checks: 'slot', corner: 'corner', moves: 'moves' };
let sightNow = null; let sightLast = 0;
function sightRect(name) {
  const el = $(SIGHT_EL[name] || 'desk'); const st = G.st;
  let r = el.getBoundingClientRect();
  if (name === 'moves') { const kids = [...el.children].map((c) => c.getBoundingClientRect()); r = { left: Math.min(...kids.map((k) => k.left)), right: Math.max(...kids.map((k) => k.right)), top: Math.min(...kids.map((k) => k.top)), bottom: Math.max(...kids.map((k) => k.bottom)) }; }
  return { l: r.left - G.st.left, r: r.right - G.st.left, t: r.top - G.st.top, b: r.bottom - G.st.top };
}
function drawSight(name, snap) {
  if (!G || !G.eye) return;
  const want = sightRect(name);
  const now = performance.now(); const dt = Math.min(0.25, (now - sightLast) / 1000); sightLast = now;
  const k = snap || !sightNow ? 1 : 1 - Math.exp(-dt * 4.3);
  sightNow = sightNow ? Object.fromEntries(Object.keys(want).map((key) => [key, sightNow[key] + (want[key] - sightNow[key]) * k])) : want;
  const e = G.eye; const y = G.deskTopY + 4; const pad = 10;
  $('sightCone').setAttribute('points', `${e.x - 8},${e.y + 6} ${e.x + 8},${e.y + 6} ${sightNow.r + pad},${y} ${sightNow.l - pad},${y}`);
  const sp = $('spot').style; const whole = name === 'desk';
  sp.left = `${sightNow.l - 6}px`; sp.top = `${sightNow.t - 6}px`; sp.width = `${sightNow.r - sightNow.l + 12}px`; sp.height = `${sightNow.b - sightNow.t + 12}px`;
  setClass($('spot'), 'on', !whole);
}
function render() {
  const { i, f } = at(state.t);
  state.step = i; state.f = f;
  const sc = apply(i, f);
  if (sc.desk) drawSight(sc.sight, STILL || !state.playing);
  if (actors) actors.frame({ pose: sc.ai.pose === 'idle' ? 'read' : sc.ai.pose, f: sc.ai.f, checker: sc.checker.state, cf: sc.checker.cf, verdict: sc.id === 'line' && sc.ai.pose === 'raise' ? 'right-done' : sc.checker.verdict, recede: sc.recede, pagesHeld: sc.kept ?? 1, still: STILL || !state.playing, time: performance.now() / 1000 });
  updateControls();
}
function loop(now) {
  const dt = Math.min(250, now - prev); prev = now;
  if (state.playing && !state.frozen) {
    state.t += dt;
    if (state.t >= RUN_LENGTH) { state.t = RUN_LENGTH; state.playing = false; state.ended = true; }
  }
  render();
  raf = requestAnimationFrame(loop);
}
function play() {
  if (state.ended || state.t >= RUN_LENGTH) { state.t = 0; state.ended = false; }
  state.playing = true; $('note').hidden = true; render();
}
function pause() { if (!state.playing) return; state.playing = false; render(); }
function go(step) {
  const i = Math.max(0, Math.min(STEPS.length - 1, typeof step === 'string' ? STEPS.findIndex((s) => s.id === step) : step));
  state.playing = false; state.ended = i === STEPS.length - 1;
  // a chosen step is shown settled, at its last frame
  state.t = STEPS[i].dur ? stepStart(i) + STEPS[i].dur - 1 : stepStart(i);
  if (STEPS[i].id === 'tally' || STEPS[i].id === 'line') state.t = stepStart(i) + STEPS[i].dur * 0.99;
  render();
}
function updateControls() {
  const playBtn = $('play');
  const label = state.playing ? 'Pause' : state.ended ? 'Play again' : 'Keep playing';
  if (playBtn.textContent !== label) playBtn.textContent = label;
  setClass(root, 'is-paused', !state.playing);
  const note = $('note');
  const showNote = !state.playing && !STILL ? true : STILL;
  const st = STEPS[state.step];
  if (showNote) {
    if (note.hidden) note.hidden = false;
    if ($('noteText').textContent !== st.note) $('noteText').textContent = st.note;
    $('try').hidden = st.id !== 'choice';
  } else if (!note.hidden) note.hidden = true;
}
$('play').addEventListener('click', () => { state.playing ? pause() : play(); });
$('trySay').addEventListener('click', () => { go('done'); });
$('tryKeep').addEventListener('click', () => { go('line'); });

// A touch anywhere pauses. Buttons and links act at once and are never swallowed as a pause.
const isControl = (el) => el && el.closest && el.closest('button, a, input, select, textarea');
addEventListener('pointerdown', (e) => { if (!isControl(e.target)) pause(); }, { capture: true });
addEventListener('keydown', (e) => { if (!(isControl(e.target) && (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab'))) pause(); });
addEventListener('wheel', () => pause(), { passive: true });

let rt = 0;
addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => { layout(); render(); }); });

// ── Start ────────────────────────────────────────────────────────────────────
const startStep = params.get('step');
document.fonts.ready.then(() => {
  layout();
  // PACING.md v2: on first arrival the room and its light come up, then the figures, then the first card (1.2 s in all)
  if (!STILL && !startStep) {
    root.classList.add('arrive');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('arrive-go')));
    setTimeout(() => root.classList.remove('arrive', 'arrive-go'), 1600);
  }
  if (STILL) { go(STEPS.length - 1); }
  else if (startStep) { go(isNaN(+startStep) ? startStep : +startStep - 1); }
  prev = performance.now(); raf = requestAnimationFrame(loop);
});

window.__station = {
  get state() { return { step: state.step, id: STEPS[state.step].id, t: state.t, f: state.f, playing: state.playing, ended: state.ended, still: STILL, total: RUN_LENGTH }; },
  play, pause, go,
  seek(t) { state.t = Math.max(0, Math.min(RUN_LENGTH, t)); render(); },
  // for headless screenshots: hold the picture at time t as if it were playing
  freeze(t) { state.frozen = true; state.playing = true; state.t = Math.max(0, Math.min(RUN_LENGTH, t)); render(); },
  steps: STEPS.map((s) => s.id),
  durations: STEPS.map((s) => s.dur),
};
