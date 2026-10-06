// The full-screen viewer. Each flap has one "Open": the scene blurs and the flap's contents
// come forward as one vertical, scrolling document that works the way Tome does.
//   pages:  my three pages at full size, one after another
//   lesson: the six slides, one after another, each playing line by line with Tome's recorded
//           narration and the objects each line places on its 12 × 8 grid; the simulation with
//           play and a time scrubber; then the practice questions, marked in your browser
//   topics: the 7 topics Tome found (from the lit card)
//
// The lesson has one player. It decides which slide and line are current and moves forward
// in three ways that never fight: by itself (each line, then the next slide), with ‹ › (a line
// at a time), and by scrolling (the slide you settle on starts playing).
import { flight, arcPoints, metres, seconds, markNumber } from './model.js';

let L, hooks, root, sheet, body, where, kind = null, from = null;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function initViewer(lesson, h) {
  L = lesson; hooks = h;
  root = document.createElement('div');
  root.className = 'viewer'; root.hidden = true;
  root.innerHTML = `<div class="v-back"></div>
    <div class="v-sheet" role="dialog" aria-modal="true" aria-labelledby="v-where">
      <header class="v-head"><p class="v-where" id="v-where"></p><div class="v-nav"><button type="button" class="v-btn" data-go="-1">‹ <span>Back</span></button><button type="button" class="v-btn" data-go="1"><span>Next</span> ›</button></div><button type="button" class="v-close">Close</button></header>
      <div class="v-body"></div>
    </div>`;
  document.body.append(root);
  sheet = $('.v-sheet', root); body = $('.v-body', root); where = $('.v-where', root);
  $('.v-back', root).onclick = close;
  $('.v-close', root).onclick = close;
  root.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => arrow(+b.dataset.go); });
  addEventListener('keydown', (e) => {
    if (root.hidden || e.target.closest('input')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { e.preventDefault(); arrow(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); arrow(-1); }
  });
  body.addEventListener('scroll', onScroll, { passive: true });
}

const secs = () => [...body.querySelectorAll('.v-sec')];
// layout positions, not screen positions: the opening animation scales the sheet for a moment
const secTop = (sec) => sec.offsetTop - body.offsetTop;

// kind: 'pages' | 'lesson' | 'topics'; target: which section to start at
export function openViewer(k, target = 0, fromEl = null) {
  hooks.onOpen();
  from = fromEl; kind = k;
  root.dataset.kind = k;
  root.hidden = false;
  render();
  document.documentElement.classList.add('viewing');
  const r = fromEl?.getBoundingClientRect(), s = sheet.getBoundingClientRect();
  if (r && !hooks.reduce) {
    const dx = r.left + r.width / 2 - (s.left + s.width / 2), dy = r.top + r.height / 2 - (s.top + s.height / 2);
    sheet.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${r.width / s.width}, ${r.height / s.height})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  root.querySelector('.v-back').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  $('.v-close', root).focus({ preventScroll: true });
  if (kind === 'lesson') {
    if (target >= L.slides_full.length) { scrollToSec(target, false); setCurrent('q'); }
    else go(target, 0, { scroll: true, smooth: false });
  } else {
    const sec = secs()[target]; body.scrollTop = sec ? secTop(sec) - 8 : 0;
  }
}

function close() {
  if (root.hidden) return;
  stopSound(); cancelAnimationFrame(simRAF);
  root.hidden = true;
  document.documentElement.classList.remove('viewing');
  hooks.onClose();
  from?.focus?.({ preventScroll: true });
}

function render() {
  root.querySelector('.v-nav').hidden = kind === 'topics';
  if (kind === 'pages') {
    where.innerHTML = '<b>What went in</b> · my 3 pages, as I wrote them';
    body.innerHTML = [1, 2, 3].map((n) => `<section class="v-sec v-page"><p class="v-label">page ${n} of 3</p><img src="img/page-${n}-1100.jpg" alt="Page ${n} of my three pages" width="1100" height="1424" loading="lazy"></section>`).join('');
  }
  if (kind === 'topics') {
    where.innerHTML = '<b>Step 2</b> · the topics Tome found, one per heading';
    body.innerHTML = `<ol class="v-sec v-topics">${L.topics.map((t, k) => `<li class="${k + 1 === L.chosen_topic ? 'on' : ''}"><span>Topic ${k + 1}</span>${esc(t.title.replace(/^\d+\.\s*/, ''))}${k + 1 === L.chosen_topic ? '<em>this lesson is built from this one</em>' : ''}</li>`).join('')}</ol>`;
  }
  if (kind === 'lesson') {
    where.innerHTML = `<b>What came out</b> · the lesson Tome built: ${L.slides_full.length} slides, then ${L.practice.length} practice questions`;
    body.innerHTML = L.slides_full.map((sl, k) => buildSlide(k)).join('') + '<section class="v-sec v-qsec"></section>';
    L.slides_full.forEach((sl, k) => { line[k] = 0; wireSlide(k); });
    renderQuestions($('.v-qsec', body));
    cur = null; paused = false;
  }
}

// ── the lesson's one player ─────────────────────────────
const line = [];                     // the line each slide shows
let cur = null;                      // the current slide index, or 'q' for the questions
let paused = false;                  // the visitor pressed ❚❚
let audio = null, lineTimer = 0, guard = 0, programmatic = 0, settleTimer = 0;

function go(k, j, { scroll = false, smooth = true, play = true } = {}) {
  const n = L.slides_full[k].beats.length;
  line[k] = Math.max(0, Math.min(n - 1, j));
  setCurrent(k);
  drawSlide(k);
  if (scroll) scrollToSec(k, smooth);
  if (play && !paused) speak(k, line[k]); else stopSound();
}
function setCurrent(k) {
  if (cur !== k) { stopSound(); if (cur !== 'q' && cur != null) drawSlide(cur, false); }
  cur = k;
  secs().forEach((s, i) => s.classList.toggle('current', i === (k === 'q' ? L.slides_full.length : k)));
  updateArrows();
}
// what plays next by itself: the next line, then the next slide, then the questions
function advance() {
  if (cur === 'q' || cur == null) return;
  const k = cur, n = L.slides_full[k].beats.length;
  if (line[k] + 1 < n) go(k, line[k] + 1);
  else if (k + 1 < L.slides_full.length) go(k + 1, 0, { scroll: true });
  else { stopSound(); scrollToSec(L.slides_full.length, true); setCurrent('q'); }
}
// ‹ › : one line back or forward; past a slide's end into the next slide; into the questions
function arrow(d) {
  if (kind !== 'lesson') {
    const all = secs(), y = body.scrollTop + 20;
    let i = all.findIndex((s) => secTop(s) > y); i = i === -1 ? all.length : i;
    const next = Math.max(0, Math.min(all.length - 1, i - 1 + d));
    return scrollToSec(next, true);
  }
  paused = false;
  if (cur === 'q') { if (d < 0) { const k = L.slides_full.length - 1; go(k, L.slides_full[k].beats.length - 1, { scroll: true }); } return; }
  const k = cur ?? 0, j = line[k] + d, n = L.slides_full[k].beats.length;
  if (j >= 0 && j < n) return go(k, j);
  if (d > 0 && k + 1 < L.slides_full.length) return go(k + 1, 0, { scroll: true });
  if (d > 0) { stopSound(); scrollToSec(L.slides_full.length, true); return setCurrent('q'); }
  if (d < 0 && k > 0) return go(k - 1, L.slides_full[k - 1].beats.length - 1, { scroll: true });
}
function updateArrows() {
  const [back, next] = root.querySelectorAll('[data-go]');
  if (kind !== 'lesson') { back.disabled = false; next.disabled = false; return; }
  back.disabled = cur === 0 && line[0] === 0;
  next.disabled = cur === 'q';
}

// sound: the recorded line; if it won't load or play, the same length of quiet, then on
function speak(k, j) {
  stopSound();
  const sl = L.slides_full[k], b = sl.beats[j];
  if (j === 0 && sl.kind === 'simulation') body.querySelector(`.v-slide[data-k="${k}"] .sim-play`)?.click();
  const len = Math.max(3, b.seconds || 6);
  const onwards = () => { if (cur === k && line[k] === j && !paused) advance(); };
  const quiet = () => { clearTimeout(lineTimer); lineTimer = setTimeout(onwards, len * 1000); };
  markPlaying(k, true);
  if (!b.audio) return quiet();
  const a = new Audio(b.audio); audio = a;
  a.onended = () => { if (audio === a) { clearTimeout(guard); onwards(); } };
  a.onerror = () => { if (audio === a) { audio = null; quiet(); } };
  // a guard in case the sound stalls: never wait much longer than the line itself
  guard = setTimeout(() => { if (audio === a) { a.pause(); audio = null; onwards(); } }, (len + 4) * 1000);
  a.play().catch(() => { if (audio === a) { clearTimeout(guard); audio = null; quiet(); } });
}
function stopSound() {
  clearTimeout(lineTimer); clearTimeout(guard);
  if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); audio = null; }
  body.querySelectorAll('.v-slide.playing').forEach((s) => markPlaying(+s.dataset.k, false));
}
function markPlaying(k, on) {
  const sec = body.querySelector(`.v-slide[data-k="${k}"]`); if (!sec) return;
  sec.classList.toggle('playing', on);
  const p = $('.v-play', sec); p.textContent = on ? '❚❚' : '▶'; p.setAttribute('aria-label', on ? 'Pause' : 'Play');
}

// scrolling: the slide that settles in the middle of the view becomes current and plays
function scrollToSec(i, smooth) {
  const sec = secs()[i]; if (!sec) return;
  programmatic = performance.now() + (smooth ? 900 : 120);
  body.scrollTo({ top: secTop(sec) - 8, behavior: smooth && !hooks.reduce ? 'smooth' : 'auto' });
}
function onScroll() {
  if (kind !== 'lesson' || root.hidden || performance.now() < programmatic) return;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    if (performance.now() < programmatic) return;
    const mid = body.getBoundingClientRect().top + body.clientHeight * 0.4;
    const i = secs().findIndex((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    if (i < 0) return;
    const k = i >= L.slides_full.length ? 'q' : i;
    if (k === cur) return;
    paused = false;
    if (k === 'q') { setCurrent('q'); return; }
    const n = L.slides_full[k].beats.length;
    go(k, line[k] >= n - 1 ? 0 : line[k]);
  }, 220);
}

// ── one slide: built once, then updated in place (its size never changes) ──
function buildSlide(k) {
  const sl = L.slides_full[k];
  return `<section class="v-sec v-slide" data-k="${k}">
    <p class="v-label">Slide ${k + 1} of ${L.slides_full.length} · ${esc(sl.name)}</p>
    <div class="v-stage ${sl.kind}">${sl.kind === 'simulation' ? simStageHTML() : ''}</div>
    <div class="v-caption">
      <div class="v-ctl"><button type="button" class="v-play" aria-label="Play">▶</button><span class="v-count"></span>
        <span class="v-dots">${sl.beats.map((_, i) => `<button type="button" data-line="${i}" aria-label="Line ${i + 1}"></button>`).join('')}</span></div>
      <p class="v-say"></p>
    </div></section>`;
}
function wireSlide(k) {
  const sec = body.querySelector(`.v-slide[data-k="${k}"]`);
  sec.querySelectorAll('[data-line]').forEach((d) => { d.onclick = () => { paused = false; go(k, +d.dataset.line); }; });
  $('.v-play', sec).onclick = () => {
    if (cur === k && sec.classList.contains('playing')) { paused = true; stopSound(); }
    else { paused = false; go(k, line[k] >= L.slides_full[k].beats.length - 1 && cur !== k ? 0 : line[k]); }
  };
  if (L.slides_full[k].kind === 'simulation') wireSim(sec);
  drawSlide(k, false);
}
function drawSlide(k, fresh = true) {
  const sec = body.querySelector(`.v-slide[data-k="${k}"]`), sl = L.slides_full[k], j = line[k];
  if (sl.kind !== 'simulation') $('.v-stage', sec).innerHTML = gridStageHTML(sl, j, fresh);
  $('.v-count', sec).textContent = `line ${j + 1} of ${sl.beats.length}`;
  sec.querySelectorAll('[data-line]').forEach((d, i) => d.classList.toggle('on', i === j));
  $('.v-say', sec).textContent = sl.beats[j].text;
  $('.v-say', sec).scrollTop = 0;
}
function gridStageHTML(sl, upto, fresh) {
  const objs = new Map(), order = [], lit = new Set();
  sl.beats.slice(0, upto + 1).forEach((b, j) => b.actions.forEach((a) => {
    if (a.kind === 'place') { objs.set(a.object.id, { ...a.object, paras: a.object.initial_body ? [{ text: a.object.initial_body }] : [], fresh: fresh && j === upto }); order.push(a.object.id); }
    if (a.kind === 'append_text' && objs.has(a.target_id)) objs.get(a.target_id).paras.push({ text: a.body, fresh: fresh && j === upto });
    if (a.kind === 'highlight' && j === upto) lit.add(a.target_id);
  }));
  if (!order.length) return `<div class="obj text_column" style="grid-column:1/span 12;grid-row:1/span 8"><h3>${esc(sl.title)}</h3><p>${esc(sl.beats[upto].text)}</p></div>`;
  return [...new Set(order)].map((id) => {
    const o = objs.get(id), c = o.cell || { col: 0, row: 0, w: 12, h: 8 };
    const pos = `grid-column:${c.col + 1} / span ${c.w};grid-row:${c.row + 1} / span ${c.h}`;
    const cls = `obj ${o.kind} ${o.style || ''} ${lit.has(id) ? 'lit' : ''} ${o.fresh ? 'fresh' : ''}`;
    if (o.kind === 'equation') return `<div class="${cls}" style="${pos}"><div class="eq">${esc(o.latex)}</div>${o.caption ? `<p class="cap">${esc(o.caption)}</p>` : ''}</div>`;
    if (o.kind === 'box') return `<div class="${cls}" style="${pos}"><h4>${esc(o.title)}</h4><p>${esc(o.body)}</p></div>`;
    return `<div class="${cls}" style="${pos}">${o.title ? `<h3>${esc(o.title)}</h3>` : ''}${o.paras.map((p) => `<p class="${p.fresh ? 'fresh' : ''}">${esc(p.text)}</p>`).join('')}</div>`;
  }).join('');
}

// ── the simulation slide: play and a time scrubber, at Tome's settings ──
let simRAF = 0;
const SIM = { W: 900, H: 320, xMax: 46, yMax: 13.5 };
function simStageHTML() {
  return `<svg class="v-sim" viewBox="0 0 ${SIM.W} ${SIM.H}" aria-label="The projectile at 20 metres per second and 45 degrees"></svg>
    <div class="v-simctl"><button type="button" class="v-btn sim-play">Play the throw</button><input type="range" min="0" max="1000" value="1000" aria-label="Time" class="sim-t"><output class="sim-out mono"></output></div>
    <p class="v-simnote">Speed 20 m/s, angle 45°, g = 9.81 m/s² (Tome's settings), drawn here from the recorded settings.</p>`;
}
function wireSim(sec) {
  const f = flight(L.simulation.speed, L.simulation.angle_deg, L.simulation.g), svgEl = $('.v-sim', sec), range = $('.sim-t', sec), out = $('.sim-out', sec);
  const pad = 40, sx = (x) => pad + (x / SIM.xMax) * (SIM.W - pad * 1.6), sy = (y) => SIM.H - pad - (y / SIM.yMax) * (SIM.H - pad * 1.7);
  const path = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ');
  const draw = (tt) => {
    const p = f.at(tt), done = arcPoints(f, 90).filter((q, i) => (f.time * i) / 90 <= tt + 1e-9).concat([p]);
    svgEl.innerHTML = `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(45)}" y2="${sy(0)}" stroke="#a48a9f"/>${[0, 10, 20, 30, 40].map((m) => `<line x1="${sx(m)}" y1="${sy(0)}" x2="${sx(m)}" y2="${sy(0) + 6}" stroke="#a48a9f"/><text x="${sx(m)}" y="${sy(0) + 24}" text-anchor="middle" font-size="16" fill="#4a4453" font-family="Source Code Pro, monospace">${m} m</text>`).join('')}
      <path d="${path(arcPoints(f, 90))}" fill="none" stroke="#6c265c" stroke-opacity=".18" stroke-width="2" stroke-dasharray="6 6"/>
      <path d="${path(done)}" fill="none" stroke="#6c265c" stroke-width="3.5"/><circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="10" fill="#6c265c"/>
      ${tt >= f.time - 1e-6 ? `<text x="${sx(f.range)}" y="${sy(0) - 18}" text-anchor="middle" font-size="18" font-weight="700" fill="#4f1a43" font-family="Source Sans 3, sans-serif">lands ${metres(f.range)} away</text>` : ''}`;
    out.textContent = `t = ${seconds(tt)} of ${seconds(f.time)} · x = ${metres(p.x)} · height = ${metres(p.y)}`;
  };
  range.oninput = () => { cancelAnimationFrame(simRAF); draw((range.value / 1000) * f.time); };
  $('.sim-play', sec).onclick = () => {
    cancelAnimationFrame(simRAF);
    const t0 = performance.now();
    const tick = () => { const tt = Math.min(f.time, (performance.now() - t0) / 1000); range.value = Math.round((tt / f.time) * 1000); draw(tt); if (tt < f.time) simRAF = requestAnimationFrame(tick); };
    simRAF = requestAnimationFrame(tick);
  };
  draw(f.time);
}

// ── the practice questions, marked in your browser ──────
function renderQuestions(sec) {
  const P = L.practice, plain = (s) => s.replace(/v0\^2/g, 'v₀²').replace(/v0/g, 'v₀').replace(/m\/s\^2/g, 'm/s²');
  sec.innerHTML = `<p class="v-label">The ${P.length} practice questions · marked here in your browser</p><div class="v-qs">
    <section class="v-q"><p class="n">Question 1</p><p class="qp">${esc(plain(P[0].prompt))}</p>
      <div class="v-answer"><input type="text" inputmode="decimal" autocomplete="off" aria-label="Your answer in metres"><span>m</span><button type="button" class="v-btn solid">Check</button></div><p class="v-mark" aria-live="polite"></p></section>
    <section class="v-q"><p class="n">Question 2</p><p class="qp">${esc(plain(P[1].prompt))}</p>
      <div class="v-choices">${P[1].options.map((o) => `<button type="button" class="v-btn">${esc(o)}</button>`).join('')}</div><p class="v-mark" aria-live="polite"></p></section>
    <section class="v-q"><p class="n">Question 3</p><p class="qp">${esc(plain(P[2].prompt))}</p>
      <button type="button" class="v-btn reveal">Show Tome's stored answer</button><p class="v-mark" aria-live="polite"></p></section></div>`;
  const [q1, q2, q3] = sec.querySelectorAll('.v-q'), input = $('input', q1);
  const check = () => {
    const r = markNumber(input.value, P[0].answer), m = $('.v-mark', q1);
    m.className = `v-mark ${r.state}`;
    m.textContent = r.state === 'right' ? '40 m. Right.' : r.state === 'wrong' ? (Math.abs(r.value - 40.8) < 0.05 ? "40.8 m is the answer with my page's g = 9.8. This question uses g = 10, so it's 40 m." : "Not this time. Tome's stored answer is 40 m.") : 'Type a number of metres first.';
  };
  $('.solid', q1).onclick = check; input.onkeydown = (e) => { if (e.key === 'Enter') check(); };
  q2.querySelectorAll('.v-choices .v-btn').forEach((b) => { b.onclick = () => { const ok = b.textContent === P[1].answer, m = $('.v-mark', q2); m.className = `v-mark ${ok ? 'right' : 'wrong'}`; m.textContent = ok ? `${P[1].answer}. Right.` : `Not this time. Tome's stored answer is "${P[1].answer}".`; }; });
  $('.reveal', q3).onclick = () => { const m = $('.v-mark', q3); m.className = 'v-mark right'; m.textContent = `Tome's stored answer: ${P[2].answer}.`; };
}
