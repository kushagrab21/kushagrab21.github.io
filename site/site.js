import { LINES, TOUR, STOPS, PANELS, linesAt } from './data.js?v=20261006-arrival-audio';
import { Ride, runProfile, JUNCTION } from './ride.js?v=20261006k';

const $ = (s, r = document) => r.querySelector(s);
const q = new URLSearchParams(location.search);
const body = document.body;
const phoneMQ = matchMedia('(max-width: 720px)');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || q.has('still');
const sleep = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (n) => `${Math.floor(n / 60)}:${String(Math.max(0, Math.ceil(n % 60))).padStart(2, '0')}`;

const stage = $('#stage'), canvas = $('#ride'), node = $('#node'), block = $('#block'), panel = $('#panel'), poster = $('#poster');
const nameband = $('#nameband'), map = $('#map'), band = $('#band'), flap = $('#flap');

let ride = null;
try { ride = new Ride(canvas); } catch { body.classList.add('no-webgl'); }

// After the products the line splits: left to Research, right to Writing.
const FORK = {
  left: { line: 'research', name: 'Research', gloss: 'when an AI says "done"' },
  right: { line: 'writing', name: 'Writing', gloss: 'posts and articles' },
};
const sideOf = (line) => (line === 'research' ? 'left' : line === 'writing' ? 'right' : null);

const state = {
  line: 'built', stop: 'intro', tour: 0,
  mode: 'ride',          // 'ride' moving · 'platform' stopped at a station · 'node' inside it · 'junction' waiting at the split
  riding: true,          // false once the visitor has touched anything
  left: 0, choiceLeft: 0, ended: false, busy: false, skip: false, target: null, visited: new Set(),
};
window.__site = { state };

let writing = null;
fetch('data/writing.json').then((r) => r.json()).then((d) => { writing = d; if (state.mode === 'node' && STOPS[state.stop].kind === 'panel') fillPanel(); });

/* ================= the line ================= */

const ids = () => LINES[state.line].stops;
const idxOf = (id) => ids().indexOf(id);

function useLine(line) {
  state.line = line;
  if (ride) {
    const opts = line === 'built'
      ? { junction: Object.fromEntries(Object.entries(FORK).map(([k, f]) => [k, { ...f, colour: LINES[f.line].colour }])) }
      : { tunnelAfterFirst: line !== 'built' && LINES[line].stops[0] === 'followthrough' };
    ride.build(ids().map((id) => ({ id, ...STOPS[id] })), LINES[line].colour, opts);
    ride.resize();
  }
  renderMap();
}

function stationU(i) { return ride ? ride.stationU[i] : i / Math.max(1, ids().length - 1); }

/* ================= the map below ================= */

function stopX(i, n) { return n < 2 ? 50 : (state.line === 'built' ? 8 : 10) + (i / (n - 1)) * (state.line === 'built' ? 58 : 82); }

function renderMap() {
  const list = ids(), line = LINES[state.line], n = list.length, phone = phoneMQ.matches;
  const shared = (id) => linesAt(id).filter((l) => l !== state.line && !(state.line === 'built' && id === 'followthrough'));
  const fork = state.line === 'built' ? `<div class="fork">${Object.entries(FORK).map(([side, f]) =>
    `<button type="button" class="fork-${side}" data-choose="${side}" style="--k:${LINES[f.line].colour}"><i></i><b>${side === 'left' ? '↰' : '↳'} ${esc(f.name)}</b><small>${esc(f.gloss)}</small></button>`).join('')}</div>` : '';
  map.innerHTML = `<div class="${phone ? 'vmap' : 'wmap'}${fork ? ' forked' : ''}" style="--c:${line.colour}">
    <div class="mline"></div>
    <div class="mname">${esc(line.name)}<span class="legend"><i></i> the ride passes through<span class="sep"> </span>click any station to go there</span></div>
    ${list.map((id, i) => {
      const s = STOPS[id], other = shared(id);
      const passes = !TOUR.some((t) => t.stop === id && t.line === state.line);
      const cls = [passes ? 'pass' : '', id === state.target ? 'next' : '', id === state.stop && state.mode !== 'ride' ? 'here' : '', state.visited.has(id) && id !== state.target ? 'been' : '', other.length ? 'inter' : ''].join(' ');
      const chg = other.map((l, k) => `<span class="chg${i === 0 ? ' first' : ''}" style="--k:${LINES[l].colour};--row:${k}">Change for ${esc(LINES[l].name)}</span>`).join('');
      return `<button type="button" class="mst ${cls}" data-go="${id}" style="${phone ? 'top' : 'left'}:${stopX(i, n)}%">
        <i class="ring"></i><b>${esc(s.name)}</b><small>${esc(s.gloss)}</small>${chg}</button>`;
    }).join('')}
    ${fork}
    <div class="train" id="train"><span></span></div>
  </div>`;
  placeTrain(ride ? ride.u : stationU(Math.max(0, idxOf(state.stop))));
}

// One clock for both views: the same u places the camera and the train on the map.
function placeTrain(u, stopped = state.mode === 'node' || state.mode === 'platform') {
  const t = $('#train'); if (!t) return;
  const list = ids(), n = list.length, U = list.map((_, i) => stationU(i));
  let x;
  if (n < 2) x = 50;
  else if (u <= U[0]) x = stopX(0, n) - Math.min(6, ((U[0] - u) / (U[1] - U[0])) * (stopX(1, n) - stopX(0, n)));
  else if (u >= U[n - 1]) x = stopX(n - 1, n) + Math.min(state.line === 'built' ? 10 : 6, ((u - U[n - 1]) / (U[n - 1] - U[n - 2])) * (stopX(1, n) - stopX(0, n)) * 2);
  else { let i = 0; while (u > U[i + 1]) i++; x = stopX(i, n) + ((u - U[i]) / (U[i + 1] - U[i])) * (stopX(i + 1, n) - stopX(i, n)); }
  t.style[phoneMQ.matches ? 'top' : 'left'] = `${x}%`;
  t.classList.toggle('stopped', stopped);
}

/* ================= the name band (on the train) ================= */

function renderNameband(phase) {
  if (phase === 'junction') {
    const auto = state.riding ? `<span class="nb-auto">Taking the line to ${FORK.left.name} in ${mmss(state.choiceLeft)}</span>` : '';
    nameband.innerHTML = `<div class="nb-name"><small>Junction</small><b>Choose a line</b></div>
      <div class="choose">
        <button type="button" data-choose="left" style="--k:${LINES.research.colour}"><b>← ${FORK.left.name}</b><span>${esc(FORK.left.gloss)}</span></button>
        <button type="button" data-choose="right" style="--k:${LINES.writing.colour}"><b>${FORK.right.name} →</b><span>${esc(FORK.right.gloss)}</span></button>
      </div>${auto}`;
    return;
  }
  if (phase === 'platform') {
    const s = STOPS[state.stop], next = nextOnRide(), back = prevStop();
    nameband.innerHTML = `<div class="nb-name"><small>At the platform</small><b>${esc(s.name)}</b><span>${esc(s.gloss)}</span></div>
      <div class="ctl">
        ${back ? '<button type="button" data-ctl="back" class="quiet">← Previous station</button>' : ''}
        <button type="button" data-ctl="enter" class="primary">Enter ${esc(s.name)}</button>
        ${next ? '<button type="button" data-ctl="ride" class="quiet">Ride on →</button>' : ''}
      </div>`;
    return;
  }
  const s = phase === 'to-junction' ? { name: 'Junction', gloss: 'choose Research or Writing' } : STOPS[state.target || state.stop];
  const lead = { stopping: 'Now stopping at', approaching: 'Now approaching', entering: 'Entering', 'to-junction': 'Next' }[phase] || 'Next station';
  nameband.innerHTML = `<div class="nb-name"><small>${lead}</small><b>${esc(s.name)}</b><span>${esc(s.gloss)}</span></div>
    <div class="nb-hint">${state.busy && (phase === 'next' || !phase) ? `Click anywhere to go straight to ${esc(s.name)}` : ''}</div>`;
}

/* ================= the band (inside a station, full screen) ================= */

function nextOnRide() {
  const i = TOUR.findIndex((t) => t.stop === state.stop && t.line === state.line) >= 0 ? TOUR.findIndex((t) => t.stop === state.stop) : -1;
  if (i >= 0) return TOUR[i + 1] || null;
  const here = idxOf(state.stop), list = ids();
  const ahead = TOUR.find((t) => t.line === state.line && idxOf(t.stop) > here);
  if (ahead) return ahead;
  if (here >= 0 && here < list.length - 1) return { stop: list[here + 1], line: state.line };
  return state.stop === 'who' ? null : { stop: 'who', line: 'research' };
}
function prevStop() {
  const i = TOUR.findIndex((t) => t.stop === state.stop);
  if (i > 0 && TOUR[i].line === state.line) return TOUR[i - 1];
  const j = idxOf(state.stop);
  return j > 0 ? { stop: ids()[j - 1], line: state.line } : null;
}

function flagHTML(f, i) {
  const c = f.line ? `style="--k:${(LINES[f.line] || { colour: '#cbb89a' }).colour}"` : '';
  const cls = `flag${f.line ? ' change' : ''}`;
  if (f.href) {
    const ext = /^https?:|\.pdf$/i.test(f.href); // outside links and papers open in a new tab, so the ride stays put
    return `<a class="${cls}" ${c} href="${f.href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(f.label)}${ext ? ' <span aria-hidden="true">↗</span>' : ''}</a>`;
  }
  return `<button type="button" class="${cls}" ${c} data-flag="${i}">${esc(f.label)}</button>`;
}

function nextBoxHTML() {
  const next = nextOnRide();
  const toJ = state.stop === 'followthrough' && state.line === 'built';
  const nextName = next ? (toJ ? 'Junction: Research or Writing' : STOPS[next.stop].name) : '';
  const shortName = next ? (toJ ? 'Junction' : STOPS[next.stop].name) : '';
  // the ride skips stations on this line: say so, so the map's in-between stops aren't a puzzle
  const here = idxOf(state.stop), there = next && next.line === state.line ? idxOf(next.stop) : -1;
  const skipped = there > here + 1 ? there - here - 1 : 0;
  const label = skipped ? 'Next on the ride' : 'Next';
  const doors = state.riding && next && !state.ended && state.left <= 8;
  if (state.ended || !next) return `<div class="bx bx-next"><small>End of the line</small><button type="button" class="go" data-ctl="again">Ride again</button></div>`;
  if (doors) return `<div class="bx bx-next doors"><small>Doors closing</small><b>${esc(nextName)}</b><b class="t">${mmss(state.left)}</b><button type="button" class="go" data-ctl="stay">Stay</button></div>`;
  return `<div class="bx bx-next"><small>${label}</small><b>${esc(nextName)}</b>${state.riding ? `<b class="t">${mmss(state.left)}</b>` : ''}
      <button type="button" class="go" data-ctl="ride"><span class="long">Ride on</span><span class="short">${esc(shortName)}</span> →</button></div>`;
}

// only the "next" box changes while you are at a station, so nothing else under the pointer is replaced
function renderNext() { const el = band.querySelector('.bx-next'); if (el) el.outerHTML = nextBoxHTML(); else renderBand(); }

function renderBand() {
  const s = STOPS[state.stop], line = LINES[state.line], next = nextOnRide(), list = ids();
  const nextName = next ? (state.stop === 'followthrough' && state.line === 'built' ? 'Junction' : STOPS[next.stop].name) : '';
  const doors = state.riding && next && !state.ended && state.left <= 8;
  const pos = `${idxOf(state.stop) + 1}/${list.length}`;
  const links = s.flags.map((f, i) => {
    if (f.line) {
      const c = (LINES[f.line] || { colour: '#cbb89a' }).colour;
      const inner = esc(f.label);
      return f.href ? `<a class="cap" style="--c:${c}" href="${f.href}">${inner}</a>` : `<button type="button" class="cap" style="--c:${c}" data-flag="${i}">${inner}</button>`;
    }
    if (f.href) { const ext = /^https?:|\.pdf$/i.test(f.href); return `<a class="lnk" href="${f.href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(f.label)}${ext ? ' ↗' : ''}</a>`; }
    return `<button type="button" class="lnk" data-flag="${i}">${esc(f.label)}</button>`;
  }).join('');
  const nextBox = nextBoxHTML();
  band.innerHTML = `
    <button type="button" data-ctl="train" class="bx bx-back" aria-label="Back to the train">←<span class="long"> Back to the train</span></button>
    <button type="button" class="bx bx-here" data-here style="--line:${line.colour}"><span class="cap line" style="--c:${line.colour}">${esc(line.name)}<span class="sep"> </span>${pos}</span><b>${esc(s.name)}</b><em>${esc(s.gloss)}</em><i class="more" aria-hidden="true">▴</i></button>
    <div class="bx bx-from"><small>From here</small>${links || '<span class="none">—</span>'}</div>
    ${nextBox}
    <button type="button" class="bx bx-lines" data-lines><i class="glyph"><b style="--c:${LINES.built.colour}"></b><b style="--c:${LINES.research.colour}"></b><b style="--c:${LINES.writing.colour}"></b></i>All lines</button>
    <a class="bx bx-resume" href="resume.html"><span class="long">My resume</span><span class="short">CV</span></a>
    <div class="band-panel" hidden>
      <span class="cap line" style="--c:${line.colour}">${esc(line.name)}<span class="sep"> </span>station ${pos}</span>
      <b>${esc(s.name)}</b><em>${esc(s.gloss)}</em>
      <div class="bp-links">${links}</div>
      <div class="bp-row"><button type="button" class="bx" data-lines>All lines</button><button type="button" class="bx" data-ctl="train">← Back to the train</button></div>
    </div>`;
  fitFrom();
}

// On a laptop the "From here" box shows the links that fit, then "+N more", which opens the same panel phones use.
function fitFrom() {
  const box = band.querySelector('.bx-from');
  if (!box || phoneMQ.matches) return;
  box.querySelector('.more-links')?.remove(); box.classList.remove('gone');
  const items = [...box.children].filter((e) => e.matches('.lnk, .cap'));
  items.forEach((e) => { e.hidden = false; });
  if (box.scrollWidth <= box.clientWidth + 1) return;
  const more = document.createElement('button');
  more.type = 'button'; more.className = 'lnk more-links'; more.dataset.here = '';
  box.append(more);
  const label = box.querySelector('small'); if (label) label.hidden = false;
  for (let i = items.length - 1, n = 1; i >= 0; i--, n++) {
    items[i].hidden = true; more.textContent = `+${n} more ▴`;
    if (box.scrollWidth <= box.clientWidth + 1) return;
  }
  // very tight: a compact button, and the "From here" label gives way
  more.textContent = `+${items.length} ▴`; more.setAttribute('aria-label', `${items.length} links from here`);
  if (box.scrollWidth > box.clientWidth + 1 && label) label.hidden = true;
  // no room at all: the box steps aside, and the station's name (which opens the same panel) carries the links
  box.classList.toggle('gone', box.scrollWidth > box.clientWidth + 1);
}

/* ================= inside a station: the whole screen ================= */

// The station fills the screen above the band. A product is laid out at a slightly smaller screen and shown larger,
// so it reads clearly; the zoom backs off on small or browser-zoomed screens so it never falls below a laptop layout.
function nodeRect(id = state.stop) {
  const r = stage.getBoundingClientRect();
  const bandH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-node')) || 56;
  const aw = r.width, h = r.height - bandH;
  const s = STOPS[id];
  if (s.kind !== 'block' || phoneMQ.matches) return { left: 0, top: 0, width: aw, height: h, W: aw, H: h, k: 1 };
  const z = Math.max(1, Math.min(1.22, aw / 1180, h / 620));
  return { left: 0, top: 0, width: aw, height: h, W: aw / z, H: h / z, k: z };
}

function layoutNode(id = state.stop) {
  const R = nodeRect(id);
  Object.assign(node.style, { left: `${R.left}px`, top: `${R.top}px`, width: `${R.width}px`, height: `${R.height}px` });
  Object.assign(block.style, { width: `${R.W}px`, height: `${R.H}px`, transform: R.k === 1 ? 'none' : `scale(${R.k})` });
  return R;
}

function preload(id) {
  const s = STOPS[id];
  if (s.kind === 'block') {
    if (node.hidden) layoutNode(id);
    const source = new URL(s.src, location.href);
    source.searchParams.set('shell', '1');
    const url = source.href;
    if (block.src !== url) { setBlockActive(false); poster.classList.remove('gone'); block.src = url; }
  } else if (block.src && !block.src.startsWith('about:')) block.src = 'about:blank';
}

function setBlockActive(active) {
  block.dataset.active = String(active);
  try { block.contentWindow.__station?.setActive?.(active); } catch { /* another origin */ }
}

// Film metadata may finish loading after the iframe's load event.
addEventListener('message', (e) => {
  if (e.source === block.contentWindow && e.origin === location.origin && e.data?.type === 'cinema-ready') {
    setBlockActive(block.dataset.active === 'true');
  }
});

block.addEventListener('load', () => {
  if (!block.src.startsWith('about:')) setTimeout(() => poster.classList.add('gone'), 500);
  try {
    const w = block.contentWindow;
    ['pointerdown', 'keydown', 'wheel'].forEach((ev) => w.addEventListener(ev, () => takeOver(), { capture: true, passive: true }));
    w.addEventListener('pointermove', () => { if (state.riding && state.left <= 8) takeOver(); }, { passive: true });
    // Followthrough's own "My research" link is the real change of line.
    w.document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href="#research"]');
      if (a) { e.preventDefault(); goTo('finding', { line: 'research' }); }
    }, true);
  } catch { /* a block served from elsewhere stays untouched */ }
});

function fillPanel() {
  const id = state.stop, s = STOPS[id];
  let html;
  if (PANELS[id]) html = PANELS[id]();
  else if (id === 'w-all') html = allWriting();
  else if (id === 'w-articles') html = `<h2>Articles</h2><ol class="list">${(writing?.articles || []).map((a) => `<li><a href="${a.url}" target="_blank" rel="noopener">${esc(a.title)}</a><span>${esc(a.date)}<span class="sep"> </span>LinkedIn</span></li>`).join('')}</ol>`;
  else html = `<h2>${esc(s.name)}</h2>${topicList(s.topic)}`;
  panel.innerHTML = `<div class="sheet">${html}</div>`;
  panel.scrollTop = 0;
  if (id === 'finding') runTests();
}

// The Writing line's list station: both articles first, then every post, grouped by what it is about.
const TOPICS = [['research', 'Agents and my research'], ['ai', 'Notes on working with AI'], ['provable', 'Provable AI'], ['study', 'Study'], ['older', 'Older posts']];
function allWriting() {
  if (!writing) return '<p>Loading…</p>';
  const item = (url, title, meta) => `<li><a href="${url}" target="_blank" rel="noopener">${esc(title)}</a><span>${meta}</span></li>`;
  let html = `<h2>All writing</h2><h3>Articles</h3><ol class="list">${writing.articles.map((a) => item(a.url, a.title, `${esc(a.date)} on LinkedIn`)).join('')}</ol>`;
  for (const [k, name] of TOPICS) {
    const posts = writing.posts.filter((p) => p.topic === k);
    if (posts.length) html += `<h3>${name}</h3><ol class="list posts">${posts.map((p) => item(p.url, p.title, `${esc(p.age)} ago on LinkedIn`)).join('')}</ol>`;
  }
  return html;
}

function topicList(topic) {
  if (!writing) return '<p>Loading…</p>';
  const want = [].concat(topic);
  return `<ol class="list posts">${writing.posts.filter((p) => want.includes(p.topic)).map((p) => `<li><a href="${p.url}" target="_blank" rel="noopener">${esc(p.title)}</a><span>${esc(p.age)} ago on LinkedIn</span></li>`).join('')}</ol>`;
}

let testsTimer = null;
function runTests() {
  clearInterval(testsTimer);
  const fig = panel.querySelector('.tests'); if (!fig) return;
  const seen = [...fig.querySelectorAll('.row:not(.hidden) i')], held = [...fig.querySelectorAll('.row.hidden i')], say = fig.querySelector('.say');
  const at = (k) => {
    seen.forEach((el, j) => { el.className = k > j ? 'pass' : ''; });
    say.className = 'say' + (k >= 5 ? ' on' : '');
    held.forEach((el, j) => { el.className = k >= 7 ? (j === 0 ? 'fail' : 'pass') : ''; });
    fig.classList.toggle('caught', k >= 7);
  };
  if (still) return at(9);
  let k = 0; at(0);
  testsTimer = setInterval(() => { k = (k + 1) % 12; at(k); }, 800);
}

function setInside(on) {
  body.classList.toggle('in-node', on);
  ride?.resize(); ride?.render();
}

// The station grows out of the lit window on the platform to fill the screen, and shrinks back into it when you leave.
function openNode(from) {
  const s = STOPS[state.stop];
  const isBlock = s.kind === 'block';
  block.hidden = !isBlock; panel.hidden = isBlock; poster.hidden = !isBlock;
  if (isBlock) { poster.src = s.poster; block.title = `${s.name}: ${s.gloss}`; } else fillPanel();
  node.hidden = false;
  const R = layoutNode();
  if (from && !still) {
    const sr = stage.getBoundingClientRect();
    node.style.transition = 'none';
    const k = from.width / R.width, dy = (from.height - R.height * k) / 2;
    node.style.transform = `translate(${from.left - sr.left - R.left}px, ${from.top - sr.top - R.top + dy}px) scale(${k})`;
    node.getBoundingClientRect();
    node.style.transition = 'transform .85s cubic-bezier(.3, 0, .12, 1)';
  }
  node.style.transform = 'none';
}

async function closeNode(to) {
  setBlockActive(false);
  if (node.hidden) return;
  const R = nodeRect(), sr = stage.getBoundingClientRect();
  if (to && !still) {
    node.style.transition = 'transform .5s cubic-bezier(.5, 0, .7, .4)';
    const k = to.width / R.width, dy = (to.height - R.height * k) / 2;
    node.style.transform = `translate(${to.left - sr.left - R.left}px, ${to.top - sr.top - R.top + dy}px) scale(${k})`;
    await sleep(500);
  }
  node.hidden = true;
  node.style.transition = 'none';
  node.style.transform = 'none';
}

/* ================= moving ================= */

let raf = 0;
function animate(dur, frame) {
  return new Promise((done) => {
    cancelAnimationFrame(raf);
    if (still || dur <= 0) { frame(1); ride?.render(); return done(); }
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const stop = frame(t) === false;
      ride?.render();
      if (t < 1 && !stop) raf = requestAnimationFrame(tick); else done();
    };
    raf = requestAnimationFrame(tick);
  });
}

async function runLeg(fromU, ti, dur, profile = [0.18, 0.6]) {
  state.target = ids()[ti];
  renderMap();
  const toU = stationU(ti);
  if (!ride) return;
  const span = toU - fromU;
  nameband.dataset.phase = '';
  await animate(dur, (t) => {
    if (state.skip) { ride.place(toU, 0, ti); placeTrain(toU, false); return false; }
    const u = fromU + span * runProfile(t, ...profile);
    ride.place(u, 0, ti);
    placeTrain(u, false);
    const left = (toU - u) * ride.length;
    const phase = left < 25 ? 'stopping' : left < 120 ? 'approaching' : 'next';
    if (phase !== nameband.dataset.phase) { nameband.dataset.phase = phase; renderNameband(phase); }
  });
}

const legDur = (from, to) => (Math.abs(to - from) <= 1 ? 7000 : 6200 + 1300 * Math.abs(to - from));

async function turn(to) {
  if (!ride) return;
  const from = ride.turn, ti = idxOf(state.target || state.stop);
  await animate(650, (t) => { ride.place(ride.u, from + (to - from) * t, ti); });
}

// Stopped: a beat, turn to the platform, the window's light swells, then step inside.
async function arrive(id) {
  state.stop = id;
  const ti = TOUR.findIndex((t) => t.stop === id && t.line === state.line);
  if (ti >= 0) state.tour = ti;
  state.mode = 'platform';
  renderNameband('stopping');
  renderMap();
  await sleep(450);
  await turn(1);
  state.target = null;
  renderNameband('entering');
  const wi = idxOf(id);
  if (ride && !still) await animate(900, (t) => ride.pulse(wi, t));
  await enter();
}

async function enter() {
  const from = ride ? ride.windowRect(idxOf(state.stop)) : null;
  setInside(true);
  state.mode = 'node';
  state.left = STOPS[state.stop].dwell || 0;
  state.ended = !STOPS[state.stop].dwell && !nextOnRide();
  state.visited.add(state.stop);
  renderBand();
  openNode(from);
  restartBlock();
  history.replaceState(null, '', `#${state.stop}`);
}

// Preloaded films stay paused and muted until entry; other stations restart their first step.
function restartBlock() {
  if (STOPS[state.stop].kind !== 'block') return;
  setBlockActive(true);
  const fromTheTop = () => {
    try {
      const st = block.contentWindow.__station;
      if (typeof st?.setActive === 'function') { st.setActive(block.dataset.active === 'true'); return true; }
      if (st && typeof st.go === 'function') { st.go(0); st.play?.(); return true; }
    } catch { /* another origin */ }
    return false;
  };
  if (!fromTheTop()) block.addEventListener('load', fromTheTop, { once: true });
}

async function backToTrain() {
  takeOver();
  if (state.mode !== 'node' || state.busy) return;
  state.busy = true;
  setInside(false);
  ride?.place(ride.u, 1, idxOf(state.stop)); ride?.render();
  await closeNode(ride ? ride.windowRect(idxOf(state.stop)) : null);
  state.mode = 'platform';
  renderMap();
  renderNameband('platform');
  state.busy = false;
}

async function leaveStation() {
  if (state.mode === 'node') {
    setInside(false);
    ride?.place(ride.u, 1, idxOf(state.stop)); ride?.render();
    await closeNode(ride ? ride.windowRect(idxOf(state.stop)) : null);
  }
  state.mode = 'ride';
  renderMap();
  await turn(0);
}

/* ---------- the junction ---------- */

let choose = null;          // resolves the visitor's choice at the split

async function toJunction() {
  const fromU = ride ? ride.u : 0, decU = ride?.junction?.decisionU ?? 1;
  state.target = null;
  renderMap();
  renderNameband('to-junction');
  if (!ride) return;
  const dist = (decU - fromU) * ride.length;
  await animate(Math.max(3800, 2600 + dist * 18), (t) => {
    if (state.skip) { ride.place(decU, 0, null); placeTrain(decU, false); return false; }
    const u = fromU + (decU - fromU) * runProfile(t, 0.2, 0.55);
    ride.place(u, 0, null); placeTrain(u, false);
  });
  state.skip = false;
}

function waitForChoice() {
  state.mode = 'junction';
  state.choiceLeft = 10;
  body.classList.add('at-junction');
  renderNameband('junction');
  return new Promise((res) => { choose = (side) => { choose = null; body.classList.remove('at-junction'); res(side); }; });
}

async function takeBranch(side) {
  if (!ride) return;
  ride.choice = side; ride.setSignal(side);
  renderNameband('to-junction');
  nameband.querySelector('.nb-name small').textContent = 'Taking the line to';
  nameband.querySelector('.nb-name b').textContent = FORK[side].name;
  nameband.querySelector('.nb-name span').textContent = FORK[side].gloss;
  const L = ride.length, d0 = ride.u * L, dist = (L - d0) + JUNCTION.TUNNEL_AT + 40;
  await animate(4600, (t) => {
    const d = d0 + dist * runProfile(t, 0.3, 0.999);
    ride.place(d / L, 0, null);
  });
}

async function goTo(id, { line, byTour = false } = {}) {
  if (!STOPS[id]) return;
  if (state.busy) { state.skip = true; return; }
  if (state.mode === 'junction' && choose) { const side = sideOf(line || linesAt(id).find((l) => l !== 'built')); if (side) choose(side); return; }
  if (!byTour) state.riding = false;
  let toLine = line || (ids().includes(id) ? state.line : linesAt(id)[0]);
  if (id === state.stop && toLine === state.line && state.mode === 'node') return;
  state.busy = true; state.skip = false;
  closeFlap();
  $('#overview').hidden = true;
  if (state.mode === 'node' || state.mode === 'platform') await leaveStation();
  const from = state.stop;

  if (state.line === 'built' && sideOf(toLine) && idxOf(from) >= 0) {
    // forward past the products to the split; the ride lets the visitor choose, a click has already chosen
    preload(id);
    await toJunction();
    let side = sideOf(toLine);
    if (byTour) side = await waitForChoice();
    state.mode = 'ride';
    if (FORK[side].line !== toLine || byTour) { toLine = FORK[side].line; id = LINES[toLine].stops[1]; preload(id); }
    await takeBranch(side);
    useLine(toLine);
    const ti = idxOf(id);
    ride?.place(ride.tunnelU, 0, ti);
    await runLeg(ride ? ride.tunnelU : 0, ti, ti <= 1 ? 5200 : 5200 + 1300 * (ti - 1), [0.01, 0.42]);
  } else {
    preload(id);
    const behind = (ti) => Math.max(0, stationU(ti) - 80 / (ride?.length || 1));
    if (toLine !== state.line) {
      useLine(toLine);
      const si = idxOf(from), ti = idxOf(id);
      if (si >= 0 && si < ti && !(toLine !== 'built' && from === 'followthrough')) { ride?.place(stationU(si), 0, ti); await runLeg(stationU(si), ti, legDur(si, ti)); }
      else { ride?.place(behind(ti), 0, ti); await runLeg(behind(ti), ti, 3400, [0.01, 0.3]); }
    } else {
      const ci = idxOf(from), ti = idxOf(id);
      if (ti > ci) await runLeg(ride ? ride.u : stationU(ci), ti, legDur(ci, ti));
      else { ride?.place(behind(ti), 0, ti); await runLeg(behind(ti), ti, 3400, [0.01, 0.3]); }
    }
  }
  await arrive(id);
  state.busy = false; state.skip = false;
}

function takeOver() {
  if (state.busy) state.skip = true;
  if (!state.riding) return;
  state.riding = false;
  if (state.mode === 'landing') leaveText();
  if (state.mode === 'node') renderNext();
  if (state.mode === 'junction') renderNameband('junction');
}

function rideOn() {
  state.riding = true; state.ended = false;
  const n = nextOnRide();
  if (n) goTo(n.stop, { line: n.line, byTour: true });
}

// The ride's clock: at a station, one replay of the product and then the doors close; at the junction, a short wait.
setInterval(() => {
  if (!state.riding || document.hidden || state.ended) return;
  if (state.mode === 'landing') {
    state.boardLeft -= 0.25;
    if (state.boardLeft <= 0) board('built'); else leaveText();
    return;
  }
  if (state.mode === 'junction' && choose) {
    state.choiceLeft -= 0.25;
    if (state.choiceLeft <= 0) choose('left');
    else if (Math.abs(state.choiceLeft - Math.round(state.choiceLeft)) < 0.01) renderNameband('junction');
    return;
  }
  if (state.mode !== 'node' || state.busy) return;
  if (!STOPS[state.stop].dwell) { state.ended = true; state.riding = false; renderNext(); return; }
  state.left -= 0.25;
  if (state.left <= 0) rideOn();
  else if (Math.abs(state.left - Math.round(state.left)) < 0.01) renderNext();
}, 250);

/* ================= branches, flaps and every line ================= */

function openFlap(key) { flap.innerHTML = `<button type="button" class="close" data-close>Close</button>${PANELS[key]()}`; flap.hidden = false; }
function closeFlap() { flap.hidden = true; }

function openOverview() {
  takeOver();
  const L = (k, d) => `<path d="${d}" fill="none" stroke="${LINES[k].colour}" stroke-width="7" stroke-linecap="round"/>`;
  const S = (id, x, y, ring, dx = 0, dy = 30, anchor = 'middle') => `<g class="ov-stop" data-go="${id}" tabindex="0" role="button"><circle cx="${x}" cy="${y}" r="${ring ? 11 : 7}" fill="${id === state.stop ? 'var(--lamp)' : ring ? '#f4efe8' : '#2a231e'}" stroke="${ring ? '#1a1613' : '#f4efe8'}" stroke-width="3"/><text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}">${esc(STOPS[id].name)}</text></g>`;
  $('#overview').innerHTML = `
    <div class="ov-sheet" role="dialog" aria-label="Every line on this site">
      <button type="button" class="close" data-close-ov>Back to the train</button>
      <h2>Every line on this site</h2>
      <svg viewBox="0 0 900 380" class="ov-map">
        ${L('built', 'M 60 190 L 470 190 L 520 190')}
        ${L('research', 'M 520 190 C 560 190, 570 90, 620 90 L 860 90')}
        ${L('writing', 'M 520 190 C 560 190, 570 290, 620 290 L 860 290')}
        ${S('intro', 70, 190)}${S('tome', 200, 190)}${S('adsp', 330, 190)}${S('followthrough', 460, 190, true)}
        ${S('finding', 640, 90, false, 0, -20)}${S('papers', 720, 90, false, 0, -20)}${S('earlier', 795, 90, false, 0, 30)}${S('who', 860, 90, false, 0, -20)}
        ${S('w-articles', 660, 290)}${S('w-all', 800, 290)}
        <text x="60" y="160" class="ov-line" fill="${LINES.built.colour}">Things I built</text>
        <text x="620" y="135" class="ov-line" fill="${LINES.research.colour}">Research</text>
        <text x="620" y="345" class="ov-line" fill="${LINES.writing.colour}">Writing</text>
        <text x="524" y="214" class="ov-j">junction</text>
      </svg>
      <p class="ov-note">After the products the line splits: left to Research, right to Writing. The ride starts with a short introduction film, then stops at Tome, ADSP, Followthrough, The finding and Who made this. Click any station to go straight there. <a href="resume.html">My resume</a> is one click from every screen.</p>
    </div>`;
  $('#overview').hidden = false;
}

/* ================= input ================= */

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-ctl],[data-flag],[data-choose],[data-close],[data-close-ov],[data-lines],[data-here],[data-depart],#lines-btn');
  if (!t) {
    // at the junction, the left or right half of the view chooses; at a platform, the view enters the station
    if (e.target === canvas && state.mode === 'junction' && choose) choose(e.clientX < innerWidth / 2 ? 'left' : 'right');
    else if (e.target === canvas && state.mode === 'platform' && !state.busy) enter();
    return;
  }
  if (t.dataset.depart) { state.riding = true; board(t.dataset.depart); return; }
  if (t.dataset.go) goTo(t.dataset.go);
  else if (t.dataset.choose) {
    const side = t.dataset.choose;
    if (choose) choose(side); else goTo(LINES[FORK[side].line].stops[1], { line: FORK[side].line });
  }
  else if (t.dataset.ctl === 'ride') rideOn();
  else if (t.dataset.ctl === 'train') backToTrain();
  else if (t.dataset.ctl === 'stay') { takeOver(); }
  else if (t.dataset.ctl === 'enter') { if (!state.busy) enter(); }
  else if (t.dataset.ctl === 'back') { const p = prevStop(); if (p) goTo(p.stop, { line: p.line }); }
  else if (t.dataset.ctl === 'again') { state.riding = true; state.ended = false; goTo(FIRST.built, { line: 'built', byTour: true }); }
  else if (t.dataset.flag != null) { const f = STOPS[state.stop].flags[+t.dataset.flag]; f.to ? goTo(f.to, { line: f.line }) : openFlap(f.flap); }
  else if ('close' in t.dataset) closeFlap();
  else if ('closeOv' in t.dataset) $('#overview').hidden = true;
  else if (t.id === 'lines-btn' || 'lines' in t.dataset) openOverview();
  else if ('here' in t.dataset) { if (phoneMQ.matches || t.classList.contains('more-links') || band.querySelector('.bx-from.gone')) { const p = band.querySelector('.band-panel'); p.hidden = !p.hidden; } }
});

// Any touch hands the ride to the visitor; the ride's own buttons are the exception.
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.ctl, .choose, [data-choose], .bx-back, .bx-next .go, [data-depart]')) takeOver(); }, true);
document.addEventListener('pointermove', () => { if (state.mode === 'node' && state.riding && state.left <= 8) takeOver(); }, { passive: true });
document.addEventListener('keydown', (e) => {
  if (state.mode === 'junction' && choose && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { choose(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
  if (e.key === 'Escape') { closeFlap(); $('#overview').hidden = true; } else if (!e.target.closest?.('.ctl')) takeOver();
}, true);

addEventListener('resize', () => { ride?.resize(); ride?.render(); renderMap(); if (state.mode === 'node') { layoutNode(); fitFrom(); } });
phoneMQ.addEventListener('change', () => { renderMap(); if (state.mode === 'node') layoutNode(); });

/* ================= the landing: a departure board on a platform, a train passing behind it ================= */

const landingEl = $('#landing');
const BOARD_AFTER = 10;
const FIRST = { built: 'intro', research: 'finding', writing: 'w-articles' };   // the journey begins at the introduction film

function leaveText() {
  const bar = $('#leave-bar'), txt = $('#leave-text');
  if (!txt) return;
  if (state.riding && !still) { txt.textContent = `Off to ${FIRST.built === 'intro' ? 'the introduction' : STOPS[FIRST.built].name} in ${Math.ceil(state.boardLeft)} s (click anywhere if you’d rather stay).`; bar.style.width = `${100 * (1 - state.boardLeft / BOARD_AFTER)}%`; }
  else { txt.textContent = 'No rush. Hop on, or pick a line.'; bar.style.width = '0'; }
}

// The landing: you are already on the moving train, looking ahead through a translucent screen.
// The line runs on past its stations behind the screen until you board (or for about ten seconds).
let landingRaf = 0;
async function landing() {
  state.mode = 'landing';
  state.boardLeft = BOARD_AFTER;
  if (still) state.riding = false;
  body.classList.add('landing');
  landingEl.hidden = false;
  useLine('built');
  preload(FIRST.built);
  leaveText();
  if (!ride) return;
  ride.resize();
  const L = ride.length, from = 20, to = stationU(ids().length - 1) * L + 90, v = 15;   // metres, metres per second
  let s = from, last = performance.now();
  const nextIdx = (u) => { const i = ride.stationU.findIndex((x) => x > u + 8 / L); return i < 0 ? ride.stationU.length - 1 : i; };
  const frame = (now) => {
    if (state.mode !== 'landing') return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!still) { s += v * dt; if (s > to) s = from; }
    ride.place(s / L, 0, nextIdx(s / L));
    ride.render();
    if (!still) landingRaf = requestAnimationFrame(frame);
  };
  landingRaf = requestAnimationFrame(frame);
}

async function board(line = 'built') {
  if (state.mode !== 'landing') return;
  const id = FIRST[line];
  state.mode = 'ride'; state.busy = true;
  cancelAnimationFrame(landingRaf);
  landingEl.classList.add('leaving');
  state.target = id;
  body.classList.remove('landing');
  ride?.resize(); renderMap(); renderNameband('next');
  await sleep(420);
  landingEl.hidden = true; landingEl.classList.remove('leaving');
  if (line === 'built' && ride && ride.u < stationU(0) - 45 / ride.length) {
    // still before the first station: brake into it
    await runLeg(ride.u, idxOf(id), 3600, [0.01, 0.2]);
  } else {
    if (line !== 'built') useLine(line);
    preload(id);
    const ti = idxOf(id), back = Math.max(0, stationU(ti) - 90 / (ride?.length || 1));
    ride?.place(back, 0, ti);
    await runLeg(back, ti, 3600, [0.01, 0.3]);
  }
  await arrive(id);
  state.busy = false;
}

/* ================= start ================= */

(async () => {
  // A plain visit begins on the platform with the departure board; a link to a stop goes straight there.
  if (!STOPS[location.hash.slice(1)]) { await landing(); return; }
  const start = location.hash.slice(1);
  if (start !== FIRST.built) state.riding = false;     // someone sent a link to a stop: let them read it
  const startLine = TOUR.find((t) => t.stop === start)?.line || linesAt(start).find((l) => l !== 'built' || start !== 'followthrough') || 'built';
  useLine(startLine === 'built' || start !== 'followthrough' ? startLine : 'built');
  const ti = idxOf(start);
  state.busy = true;
  preload(start);
  if (ride) { ride.place(Math.max(0, stationU(ti) - 75 / ride.length), 0, ti); ride.render(); }
  await runLeg(ride ? ride.u : 0, ti, 2600, [0.01, 0.25]);
  await arrive(start);
  state.busy = false;
})();
