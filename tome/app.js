import { flight, arcPoints, metres, seconds, markNumber, tableRowFor } from './model.js';
import { initViewer, openViewer } from './viewer.js';

// Stage 4: stage 2's curved track, re-lit. One unseen overhead lamp lights the card in front
// of you; that card plays its step as a moving picture of the real material. A short caption
// sits above it, and two arrows (the edges of the light) run up to the worker and back down.
// Every picture is a pure function of one clock, so pause, jumps, stills and reduced motion agree.
// Decisions: checkpoints/stage_4/drill/ASSUMPTIONS.md.

const L = await (await fetch('data/lesson.json')).json();
const $ = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const url = new URLSearchParams(location.search);
const still = url.has('t');
const scene = $('scene'), track = $('track'), flyersEl = $('flyers');
const NS = 'http://www.w3.org/2000/svg';

// ── Small helpers ───────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);
const S = (u, a, b) => ease(clamp01((u - a) / (b - a)));          // 0 → 1 between a and b
const lerp = (a, b, k) => a + (b - a) * k;
function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.append(e);
  return e;
}
const set = (e, attrs) => { Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, typeof v === 'number' ? +v.toFixed(2) : v)); };
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ── The clock: quick 1 s moves between cards; each card holds still while it plays ──
const DWELL = [9, 8, 9, 11, 7.5, 16];          // step 6: a 10 s demo, then 6 s for the visitor (trimmed 6 Oct: the user found the long holds unnatural)
const TRAVEL = 1.0;
const segs = [];
{ let t0 = 0; DWELL.forEach((d, i) => { segs.push({ kind: 'dwell', i, t0, t1: t0 + d }); t0 += d; segs.push({ kind: 'travel', i, t0, t1: t0 + TRAVEL }); t0 += TRAVEL; }); }
const CYCLE = segs.at(-1).t1;                 // 66.5 s
const dwellStart = (i) => segs[2 * i].t0;
const LOOP = 6.6, SEAM_AT = 5.8;

// ── The six steps: name, the small text above the light, and who works when ──
const sec = L.page.sections;
const lineCounts = L.plan.slides.map((s) => s.lines.length);
const STEPS = [
  { name: 'Read the pages', mini: 'Read', cap: [['<b class="who-gpt">GPT-5</b> reads your 3 pages', 0], ['and cuts them at the 7 headings', 5]],
    work: [['gpt', 1.5, 5.2]] },
  { name: 'Find the topics', mini: 'Topics', cap: [['<b class="who-gpt">GPT-5</b> makes one topic per heading', 0], ['7 topics; this lesson follows topic 5', 4]],
    work: [['gpt', 0.3, 4.2]] },
  { name: 'Plan the lesson', mini: 'Plan', cap: [['<b class="who-gpt">GPT-5</b> picks 1 of 28 simulations', 0], ['<b class="who-fixed">Fixed code</b> lays out 6 slides', 4]],
    work: [['gpt', 0.3, 3.6], ['fixed', 3.6, 6.6]] },
  { name: 'Build the lesson', mini: 'Build', cap: [['<b class="who-fixed">Fixed code</b> throws the ball', 0], ['<b class="who-gpt">GPT-5</b> writes 24 lines; a voice reads them', 4.6]],
    work: [['fixed', 0.2, 4.5], ['gpt', 4.6, 7.4], ['voice', 7.5, 9.6]] },
  { name: 'Write questions', mini: 'Questions', cap: [['<b class="who-gpt">GPT-5</b> writes 3 practice questions', 0], ['<b class="who-browser">Your browser</b> marks your answer', 3.5]],
    work: [['gpt', 0.3, 3.4]], liveFrom: 3.5 },
  { name: 'Your turn', mini: 'Your turn', cap: [["Not Tome: this page's own calculator", 0], ['Your turn: drag the angle, then throw', 9]],
    work: [], liveFrom: 0 },
];
// what rides the arrows: [direction, worker, label, start, duration, style]
const FLY = [
  [...[0, 1, 2].map((k) => ['up', 'gpt', '', 1.5 + k * 0.25, 0.8, 'page']), ...[1, 2, 3, 4, 5, 6, 7].map((n, k) => ['down', 'gpt', String(n), 3.2 + k * 0.12, 0.8, 'made'])],
  [...[1, 2, 3, 4, 5, 6, 7].map((n, k) => ['up', 'gpt', String(n), 0.3 + k * 0.12, 0.8, '']), ...[1, 2, 3, 4, 5, 6, 7].map((n, k) => ['down', 'gpt', `topic ${n}`, 2.3 + k * 0.22, 0.7, 'made'])],
  [['up', 'gpt', 'topic 5', 0.3, 0.8, ''], ['down', 'gpt', 'projectile', 2.8, 0.8, 'made'], ...[1, 2, 3, 4, 5, 6].map((n, k) => ['down', 'fixed', `slide ${n}`, 4.0 + k * 0.14, 0.8, 'made'])],
  [['down', 'fixed', '20 m/s · 45°', 0.3, 1.0, 'made'], ...[0, 1, 2, 3, 4, 5].map((k) => ['down', 'gpt', `${lineCounts[k]} lines`, 4.7 + k * 0.3, 0.8, 'made']), ...[0, 1, 2].map((k) => ['down', 'voice', '♪', 7.6 + k * 0.4, 0.8, 'made'])],
  [['up', 'gpt', '6 slides', 0.3, 0.8, ''], ...[1, 2, 3].map((n, k) => ['down', 'gpt', `question ${n}`, 1.5 + k * 0.2, 0.8, 'made'])],
  [],
];
// what travels between the page's edges and the lit card: [direction, label, start, duration, style]
const EDGE_FLY = [
  [0, 1, 2].map((k) => ['fromIn', '', 0.1 + k * 0.25, 0.9, 'page']),
  [],
  [1, 2, 3, 4, 5, 6].map((n, k) => ['toOut', `slide ${n}`, 6.8 + k * 0.16, 0.9, 'made']),
  [['toOut', 'the throw', 4.7, 0.9, 'made'], ['toOut', '24 spoken lines', 9.7, 0.9, 'made']],
  [['toOut', '3 questions', 5.4, 0.9, 'made']],
  [],
];

// ── Geometry, recomputed on resize ──────────────────────
let G;
function layout() {
  const W = scene.clientWidth, H = scene.clientHeight, full = $('tome').clientHeight;
  const phone = W < 760;
  const bandH = Math.round(Math.max(phone ? (full < 600 ? 92 : 104) : 130, Math.min(phone ? 128 : 210, full * (phone ? 0.15 : 0.22))));
  const capH = phone ? 44 : 32;
  const cardTop = bandH + capH + 8;
  const below = phone ? 54 : 26;               // phone: room under the card for the two folded flap tabs (12 + 34 + 8)
  const headH = 30, ratio = 300 / 480;
  let cardW = phone ? Math.min(360, W - 40) : Math.min(560, Math.max(340, W * 0.39));
  const maxH = Math.min(full * 0.5 + (phone ? 40 : 0), H - cardTop - below);
  if (headH + cardW * ratio > maxH) cardW = (maxH - headH) / ratio;
  const cardH = Math.round(headH + cardW * ratio);
  const edgeW = phone ? 0 : Math.round(Math.max(170, Math.min(260, (W - cardW) / 2 - 70)));
  const sNear = phone ? 0.78 : 0.62;
  const near = phone ? cardW * 0.98 : cardW / 2 + 26 + (cardW * sNear) / 2;
  const gptH = Math.round(Math.max(34, Math.min(62, cardH * 0.2)));
  G = { W, H, phone, bandH, cardTop, cardW: Math.round(cardW), cardH, edgeW, sNear, sFar: 0.45, near, far: near + cardW * 0.6, R: 2600 * (cardW / 500), gptH };
  const s = scene.style;
  s.setProperty('--band-h', `${bandH}px`); s.setProperty('--cap-top', `${bandH + 10}px`);
  s.setProperty('--card-top', `${cardTop}px`); s.setProperty('--card-w', `${G.cardW}px`); s.setProperty('--card-h', `${cardH}px`);
  s.setProperty('--edge-w', `${edgeW}px`);
  s.setProperty('--gpt-h', `${gptH}px`); s.setProperty('--gpt-w', `${Math.round(gptH * 1.9)}px`);
  s.setProperty('--rail-gap', `${phone ? 64 : Math.min(240, W * 0.13)}px`);
  // phone with little room under the card: an opened flap rises over the card instead of opening as a sliver (7 Oct 2026)
  scene.classList.toggle('flaps-short', phone && H - (cardTop + G.cardH) < 130);
}

// ── The cards: each builds an SVG once, then draw(u) updates it from the clock ──
const cards = [];
const handed = new Set();                    // cards the visitor has taken over this loop
function makeCard(i) {
  const el = document.createElement('div');
  el.className = 'card'; el.dataset.i = i;
  el.innerHTML = `<div class="card-head"><span class="n">${i + 1}</span><span class="nm">${STEPS[i].name}</span><span class="k ${i === 5 ? 'live' : ''}">${i === 5 ? 'Live in your browser' : 'Recorded run'}</span>${i < 5 ? `<button type="button" class="open-btn" aria-label="Open what this step made, full screen">⤢ Full screen</button>` : ''}</div><div class="pic"></div>`;
  const OPEN = [['pages', 1], ['topics', 0], ['lesson', 0], ['lesson', 2], ['lesson', 6]];
  if (i < 5) el.querySelector('.open-btn').onclick = (e) => { e.stopPropagation(); openViewer(OPEN[i][0], OPEN[i][1], el); };
  const pic = el.querySelector('.pic');
  const p = svg('svg', { class: 'p', viewBox: '0 0 480 300', preserveAspectRatio: 'xMidYMid meet' }, pic);
  const c = { el, pic, p, i, draw: () => {} };
  BUILD[i](c);
  return c;
}
const pageImg = (parent, href, w, h) => svg('image', { href, width: w, height: h, preserveAspectRatio: 'xMidYMid slice' }, parent);
const block = (parent, n, w, h, hl = false) => {
  const g = svg('g', {}, parent);
  svg('rect', { width: w, height: h, rx: 4, fill: '#fff', stroke: hl ? '#6c265c' : '#d6cfd8', 'stroke-width': hl ? 2 : 1, class: 'bx' }, g);
  svg('text', { x: 9, y: h / 2 + 4, 'font-size': 12, fill: '#6c265c', class: 'mono' }, g).textContent = n;
  svg('rect', { x: 26, y: h * 0.3, width: w * 0.62, height: 3, rx: 1.5, fill: '#cfc7d2' }, g);
  svg('rect', { x: 26, y: h * 0.6, width: w * 0.44, height: 3, rx: 1.5, fill: '#e0d9e2' }, g);
  return g;
};
// 28 small glyphs, one per ready-made simulation (no names: the shape says "many kinds")
function glyph(name) {
  if (/bell|normal|central|binomial/.test(name)) return 'M2,20 C8,20 9,4 12,4 C15,4 16,20 22,20';
  if (/tree|heap|binary/.test(name)) return 'M12,4 L6,12 M12,4 L18,12 M6,12 L3,20 M6,12 L9,20 M18,12 L15,20 M18,12 L21,20';
  if (/automaton|Markov/.test(name)) return 'M4,12 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M12,12 L16,12 M16,12 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0';
  if (/dipole|charge|gravity/.test(name)) return 'M12,12 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 M12,3 L12,7 M12,17 L12,21 M3,12 L7,12 M17,12 L21,12';
  if (/exponential|logistic|sigmoid|scaling/.test(name)) return 'M2,20 C10,20 14,4 22,4';
  if (/sort/.test(name)) return 'M4,20 L4,14 M8,20 L8,10 M12,20 L12,16 M16,20 L16,6 M20,20 L20,12';
  if (/pendulum/.test(name)) return 'M12,2 L17,16 M17,16 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0';
  if (/predator/.test(name)) return 'M2,12 C6,4 10,4 12,12 C14,20 18,20 22,12 M2,14 C6,20 10,20 12,14 C14,6 18,6 22,14';
  if (/projectile/.test(name)) return 'M3,20 Q12,0 21,20 M19,20 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0';
  if (/sine|harmonic|spring|RC/.test(name)) return 'M2,12 C5,2 8,2 10,12 C12,22 15,22 17,12 C19,4 21,4 22,8';
  if (/rotation/.test(name)) return 'M18,8 A7,7 0 1,0 19,14 M18,4 L18,8 L14,8';
  if (/shear/.test(name)) return 'M4,20 L10,4 L22,4 L16,20 Z';
  if (/secant/.test(name)) return 'M2,20 C8,18 14,10 22,2 M2,16 L22,8';
  return 'M4,4 L20,4 L20,20 L4,20 Z';
}
const PICK = L.plan.simulations.indexOf(L.plan.picked);
const tilePos = (k) => ({ x: 168 + (k % 7) * 43, y: 18 + Math.floor(k / 7) * 43 });

const BUILD = [
  // 1 · Read the pages: the pages fan out, a scan line reads them, cut marks fall at the headings,
  //     and the text settles as 7 numbered parts (part 5 holds the table, 45° row lit)
  (c) => {
    const g = svg('g', {}, c.p);
    const pg = [pageImg(g, 'img/page-1-180.jpg', 74, 96), pageImg(g, 'img/page-3-180.jpg', 74, 96), pageImg(g, 'img/page-2-600.jpg', 96, 124)];
    const frames = pg.map(() => svg('rect', { fill: 'none', stroke: '#cfc4c8', 'stroke-width': 1 }, g));
    const scan = svg('rect', { width: 96, height: 3, fill: 'rgb(255 200 112)', opacity: 0 }, g);
    const clock = svg('text', { x: 98, y: 186, 'text-anchor': 'middle', 'font-size': 13, fill: '#4a4453', class: 'mono' }, g);
    const CUT = [[0, 0.14], [0, 0.46], [0, 0.78], [2, 0.12], [2, 0.42], [2, 0.86], [1, 0.22]];
    const cuts = CUT.map(() => svg('line', { stroke: '#c0612b', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0 }, g));
    const blocks = [1, 2, 3, 4, 5, 6, 7].map((n) => block(g, n, 250, 31, n === 5));
    const mini = svg('g', {}, blocks[4]);
    [0, 1, 2, 3, 4].forEach((r) => svg('rect', { x: 150 + 0, y: 5 + r * 4.6, width: 80, height: 3.4, rx: 1, fill: r === 2 ? '#6c265c' : '#d9cfda' }, mini));
    const POS = [{ x: 18, y: 46, r: -7 }, { x: 96, y: 52, r: 7 }, { x: 50, y: 34, r: 0 }];
    c.draw = (u) => {
      const fan = S(u, 0.3, 1.3);
      pg.forEach((im, k) => {
        const P = POS[k], x = lerp(50, P.x, fan), y = lerp(34, P.y, fan), r = P.r * fan;
        const w = +im.getAttribute('width'), h = +im.getAttribute('height');
        set(im, { x, y, transform: `rotate(${r} ${x + w / 2} ${y + h / 2})` });
        set(frames[k], { x, y, width: w, height: h, transform: `rotate(${r} ${x + w / 2} ${y + h / 2})` });
      });
      const sc = S(u, 1.5, 3.0);
      set(scan, { x: 50, y: 34 + sc * 121, opacity: u > 1.5 && u < 3.1 ? 0.9 : 0 });
      clock.textContent = u >= 1.5 ? `read in ${Math.round(30 * sc)} s` : '';
      CUT.forEach(([pk, f], k) => {
        const P = POS[pk], w = pk === 2 ? 96 : 74, h = pk === 2 ? 124 : 96, a = S(u, 3.2 + k * 0.1, 3.5 + k * 0.1);
        set(cuts[k], { x1: P.x - 4, x2: P.x + w + 4, y1: P.y + h * f, y2: P.y + h * f, opacity: a, transform: `rotate(${P.r} ${P.x + w / 2} ${P.y + h / 2})` });
      });
      blocks.forEach((b, k) => {
        const a = S(u, 3.4 + k * 0.15, 4.4 + k * 0.15), x = lerp(70, 205, a), y = lerp(80, 26 + k * 38, a);
        set(b, { transform: `translate(${x} ${y})`, opacity: a });
      });
      blocks[4].querySelector('.bx').setAttribute('stroke-width', u >= 5 ? 2.5 : 1);
      blocks[4].querySelector('.bx').setAttribute('stroke', u >= 5 ? '#6c265c' : '#d6cfd8');
    };
  },
  // 2 · Find the topics: the 7 parts go up; 7 topic chips come down; topic 5 grows into the question
  (c) => {
    const g = svg('g', {}, c.p);
    const ins = [1, 2, 3, 4, 5, 6, 7].map((n) => block(g, n, 120, 28, n === 5));
    ins.forEach((b, k) => set(b, { transform: `translate(14 ${16 + k * 37})` }));
    const fan = svg('g', { opacity: 0 }, g);
    [15, 30, 45, 60, 75].forEach((a) => {
      const r = (a * Math.PI) / 180, x2 = 250 + 92 * Math.cos(r), y2 = 292 - 92 * Math.sin(r);
      svg('line', { x1: 250, y1: 292, x2, y2, stroke: a === 45 ? '#6c265c' : '#b9aeb9', 'stroke-width': a === 45 ? 2 : 1 }, fan);
      svg('text', { x: x2 + 4, y: y2, 'font-size': 11, fill: a === 45 ? '#6c265c' : '#8a8090', class: 'mono' }, fan).textContent = `${a}°`;
    });
    const chips = [1, 2, 3, 4, 5, 6, 7].map((n) => {
      const ch = svg('g', {}, g);
      svg('rect', { x: -17, y: -17, width: 34, height: 34, rx: 8, fill: n === 5 ? '#6c265c' : '#fff', stroke: n === 5 ? '#6c265c' : '#cfc4d0' }, ch);
      svg('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: n === 5 ? '#fff' : '#4a4453' }, ch).textContent = n;
      return ch;
    });
    const q = svg('text', { x: 318, y: 182, 'text-anchor': 'middle', 'font-size': 17, fill: '#4f1a43', class: 'serif', opacity: 0 }, g);
    q.textContent = 'Which angle throws the farthest?';
    c.draw = (u) => {
      ins.forEach((b, k) => b.setAttribute('opacity', 1 - 0.6 * S(u, 0.3 + k * 0.12, 0.8 + k * 0.12)));
      const focus = S(u, 4.0, 5.5);
      chips.forEach((ch, k) => {
        const drop = S(u, 2.3 + k * 0.15, 3.0 + k * 0.15);
        let x = 182 + k * 44, y = lerp(-30, 56, drop), s = 1, o = drop;
        if (k === 4) { x = lerp(x, 318, focus); y = lerp(y, 112, focus); s = 1 + 1.0 * focus; } else o = drop * (1 - 0.7 * focus);
        set(ch, { transform: `translate(${x} ${y}) scale(${s})`, opacity: o });
      });
      fan.setAttribute('opacity', 0.55 * S(u, 4.6, 5.5));
      q.setAttribute('opacity', S(u, 4.4, 5.4));
    };
  },
  // 3 · Plan the lesson: 28 simulations; a light sweeps and stops on the projectile; the plan's
  //     wording wasn't saved (hatched); fixed code lays out 6 slides; the projectile goes into slide 3
  (c) => {
    const g = svg('g', {}, c.p);
    const defs = svg('defs', {}, c.p);
    const pat = svg('pattern', { id: `hatch${c.i}`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#c9bfca', 'stroke-width': 2 }, pat);
    const chip = svg('g', { transform: 'translate(52 52)' }, g);
    svg('rect', { x: -20, y: -20, width: 40, height: 40, rx: 9, fill: '#6c265c' }, chip);
    svg('text', { x: 0, y: 6, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: '#fff' }, chip).textContent = '5';
    const sheet = svg('g', { opacity: 0 }, g);
    svg('rect', { x: 18, y: 104, width: 112, height: 120, rx: 4, fill: `url(#hatch${c.i})`, stroke: '#cfc4d0' }, sheet);
    svg('text', { x: 74, y: 242, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#6a6474' }, sheet).textContent = "the plan (text not kept)";
    const tiles = L.plan.simulations.map((name, k) => {
      const t = svg('g', {}, g);
      svg('rect', { x: 0, y: 0, width: 36, height: 36, rx: 6, fill: '#fff', stroke: '#d6cfd8', class: 'tb' }, t);
      svg('path', { d: glyph(name), transform: 'translate(6 6)', fill: 'none', stroke: '#6a6474', 'stroke-width': 1.6, 'stroke-linecap': 'round', class: 'tg' }, t);
      return t;
    });
    const spot = svg('rect', { width: 44, height: 44, rx: 9, fill: 'rgb(255 200 112)', opacity: 0 }, g);
    g.insertBefore(spot, tiles[0]);
    const label = svg('text', { 'text-anchor': 'middle', 'font-size': 15, fill: '#4f1a43', class: 'serif', opacity: 0 }, g);
    label.textContent = 'projectile';
    const frames = [1, 2, 3, 4, 5, 6].map((n) => {
      const f = svg('g', {}, g);
      svg('rect', { width: 44, height: 36, rx: 4, fill: '#fff', stroke: n === 3 ? '#6c265c' : '#cfc4d0', 'stroke-width': n === 3 ? 1.8 : 1 }, f);
      svg('text', { x: 6, y: 13, 'font-size': 10.5, fill: '#6a6474', class: 'mono' }, f).textContent = n;
      return f;
    });
    g.append(tiles[PICK], label);                // the picked tile rides above the slide frames
    const SWEEP_PATH = [0, 8, 16, 24, 25, 19, 11, 3, 4, 12, 20, PICK];
    c.draw = (u) => {
      chip.setAttribute('opacity', 1 - 0.6 * S(u, 0.3, 1.1));
      sheet.setAttribute('opacity', S(u, 2.4, 3.0));
      const lit = u >= 3.4, gone = S(u, 4.0, 5.0), fly = S(u, 5.4, 6.2);
      tiles.forEach((t, k) => {
        const P = tilePos(k), a = S(u, 1.3 + (k % 7) * 0.03, 2.0);
        if (k === PICK) {
          const F = { x: 165 + 2 * 50 + 4, y: 236 };
          const x = lerp(P.x, F.x, fly), y = lerp(P.y, F.y, fly), s = lerp(1, 0.86, fly);
          set(t, { transform: `translate(${x} ${y}) scale(${s})`, opacity: a });
          t.querySelector('.tb').setAttribute('fill', lit ? '#6c265c' : '#fff');
          t.querySelector('.tg').setAttribute('stroke', lit ? '#fff' : '#6a6474');
        } else set(t, { transform: `translate(${P.x} ${P.y})`, opacity: a * (lit ? 0.25 : 1) * (1 - gone) });
      });
      const sw = clamp01((u - 2.0) / 1.4);
      if (u > 2.0 && u < 3.6) { const k = SWEEP_PATH[Math.min(SWEEP_PATH.length - 1, Math.floor(sw * SWEEP_PATH.length))]; const P = tilePos(k); set(spot, { x: P.x - 4, y: P.y - 4, opacity: 0.85 }); } else spot.setAttribute('opacity', 0);
      const P = tilePos(PICK);
      set(label, { x: P.x + 18, y: P.y + 56, opacity: S(u, 3.4, 3.8) * (1 - gone) });
      frames.forEach((f, k) => set(f, { transform: `translate(${165 + k * 50} ${232})`, opacity: 0.22 + 0.78 * S(u, 4.0 + k * 0.12, 4.4 + k * 0.12) }));
    };
  },
  // 4 · Build the lesson: fixed code throws the ball (drawn live, Tome's g = 9.81), 24 spoken lines
  //     fall into the 6 slides (5, 5, 3, 3, 3, 5), and the voice service reads them
  (c) => {
    const g = svg('g', {}, c.p);
    const ins = [1, 2, 3, 4, 5, 6].map((n) => { const f = svg('g', { transform: `translate(14 ${14 + (n - 1) * 34})` }, g); svg('rect', { width: 70, height: 28, rx: 4, fill: n === 3 ? '#ecd9e6' : '#fff', stroke: n === 3 ? '#6c265c' : '#cfc4d0' }, f); svg('text', { x: 7, y: 18, 'font-size': 11, fill: '#6a6474', class: 'mono' }, f).textContent = n; return f; });
    const sx = (x) => 112 + x * 8.4, sy = (y) => 170 - y * 10.5;
    const ruler = svg('g', { opacity: 0 }, g);
    svg('line', { x1: sx(0), y1: sy(0), x2: sx(42), y2: sy(0), stroke: '#a48a9f' }, ruler);
    [0, 10, 20, 30, 40].forEach((m) => { svg('line', { x1: sx(m), y1: sy(0), x2: sx(m), y2: sy(0) + 4, stroke: '#a48a9f' }, ruler); svg('text', { x: sx(m), y: sy(0) + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#6a6474', class: 'mono' }, ruler).textContent = `${m} m`; });
    const set1 = svg('text', { x: 300, y: 22, 'text-anchor': 'middle', 'font-size': 14, fill: '#4f1a43', class: 'mono', opacity: 0 }, g);
    const arc = svg('path', { fill: 'none', stroke: '#6c265c', 'stroke-width': 3 }, g);
    const ball = svg('circle', { r: 6.5, fill: '#6c265c', opacity: 0 }, g);
    const land = svg('g', { opacity: 0 }, g);
    const f = flight(L.simulation.speed, L.simulation.angle_deg, L.simulation.g);
    svg('line', { x1: sx(f.range), y1: sy(0) - 10, x2: sx(f.range), y2: sy(0) + 4, stroke: '#6c265c', 'stroke-width': 2 }, land);
    const slots = [0, 1, 2, 3, 4, 5].map((k) => svg('rect', { x: 112 + k * 58, y: 206, width: 50, height: 34, rx: 3, fill: 'none', stroke: '#d6cfd8', opacity: 0 }, g));
    const bars = []; let n = 0;
    lineCounts.forEach((cnt, k) => { for (let j = 0; j < cnt; j++) bars.push({ el: svg('rect', { x: 117 + k * 58, y: 211 + j * 5.4, width: 40, height: 3, rx: 1.5, fill: '#6c265c', opacity: 0 }, g), n: n++ }); });
    const wave = svg('path', { fill: 'none', stroke: '#dcaacd', 'stroke-width': 2 }, g);
    const head = svg('line', { y1: 246, y2: 282, stroke: '#4f1a43', 'stroke-width': 1.5, opacity: 0 }, g);
    const pts = arcPoints(f, 80);
    c.draw = (u) => {
      ins.forEach((fr, k) => fr.setAttribute('opacity', k === 2 ? 1 : 1 - 0.5 * S(u, 0.3, 1.0)));
      ruler.setAttribute('opacity', S(u, 0.3, 1.3));
      set1.setAttribute('opacity', S(u, 1.0, 1.3));
      const tt = Math.max(0, Math.min(f.time, u - 1.5));
      set1.textContent = `20 m/s · 45°${u >= 4.4 ? ' → 40.8 m' : ''}`;
      const shown = pts.filter((q, k) => (f.time * k) / 80 <= tt + 1e-9).concat(u > 1.5 ? [f.at(tt)] : []);
      arc.setAttribute('d', shown.length > 1 ? shown.map((q, k) => `${k ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ') : '');
      const b = f.at(tt); set(ball, { cx: sx(b.x), cy: sy(b.y), opacity: u > 1.4 ? 1 : 0 });
      land.setAttribute('opacity', S(u, 4.3, 4.6));
      slots.forEach((s) => s.setAttribute('opacity', S(u, 4.5, 4.9)));
      bars.forEach(({ el, n: k }) => el.setAttribute('opacity', S(u, 4.7 + k * 0.11, 4.9 + k * 0.11)));
      const wv = S(u, 7.6, 9.4);
      if (u > 7.6) {
        const x0 = 112, x1 = x0 + (460 - x0) * wv;
        let d = ''; for (let x = x0; x <= x1; x += 3) d += `${x === x0 ? 'M' : 'L'}${x},${264 + 9 * Math.sin(x * 0.21) * Math.sin(x * 0.047 + 1)}`;
        wave.setAttribute('d', d);
      } else wave.setAttribute('d', '');
      const hx = 112 + 2 * 58 + 50 * wv;
      set(head, { x1: hx, x2: hx, opacity: u > 7.6 && u < 9.6 ? 1 : 0 });
    };
    // one real line, if the visitor wants to hear it (sound only on a click)
    const ov = document.createElement('div');
    ov.className = 'ov'; ov.style.cssText = 'left:2.5%;bottom:3%;';
    ov.innerHTML = '<button type="button" class="play" aria-label="Play spoken line 1">▶</button><span>line 1</span>';
    c.pic.append(ov);
    ov.querySelector('.play').onclick = () => new Audio(L.simulation.narration[0].audio).play();
    c.controls = [ov];
  },
  // 5 · Write questions: 3 question cards come down; question 1 is answered and your browser marks it
  (c) => {
    const g = svg('g', {}, c.p);
    const ins = [1, 2, 3, 4, 5, 6].map((n) => { const f = svg('g', { transform: `translate(14 ${14 + (n - 1) * 34})` }, g); svg('rect', { width: 70, height: 28, rx: 4, fill: '#fff', stroke: '#cfc4d0' }, f); svg('text', { x: 7, y: 18, 'font-size': 11, fill: '#6a6474', class: 'mono' }, f).textContent = n; return f; });
    const qs = [3, 2, 1].map((n) => {
      const q = svg('g', {}, g);
      svg('rect', { width: 300, height: 196, rx: 8, fill: '#fff', stroke: '#cfc4d0' }, q);
      svg('text', { x: 14, y: 24, 'font-size': 12, fill: '#6c265c', class: 'mono' }, q).textContent = `question ${n}`;
      if (n === 1) svg('text', { x: 150, y: 74, 'text-anchor': 'middle', 'font-size': 17, fill: '#1b1722', class: 'serif' }, q).textContent = '20 m/s, 45°, g = 10 → R = ?';
      return { q, n };
    });
    const tick = svg('text', { x: 300, y: 222, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#1d6b4a', opacity: 0 }, g);
    tick.textContent = '✓ 40 m, right';
    const ov = document.createElement('div');
    ov.className = 'ov'; ov.style.cssText = 'left:44%;top:50%;';
    ov.innerHTML = '<input type="text" inputmode="decimal" autocomplete="off" aria-label="Your answer in metres" id="a1"><span>m</span><button type="button" class="b" id="check">Check</button>';
    c.pic.append(ov);
    const input = ov.querySelector('input');
    ov.querySelector('#check').onclick = () => {
      const r = markNumber(input.value, L.practice[0].answer);
      tick.textContent = r.state === 'right' ? '✓ 40 m, right' : r.state === 'wrong' ? (Math.abs(r.value - 40.8) < 0.05 ? '40.8 m is for g = 9.8; here g = 10' : 'Not this time: it is 40 m') : 'Type a number first';
      tick.setAttribute('fill', r.state === 'right' ? '#1d6b4a' : '#9a2f2f'); tick.setAttribute('opacity', 1);
    };
    c.controls = [ov];
    c.draw = (u) => {
      ins.forEach((fr) => fr.setAttribute('opacity', 1 - 0.6 * S(u, 0.3, 1.1)));
      qs.forEach(({ q, n }) => { const a = S(u, 1.5 + (3 - n) * 0.2, 2.2 + (3 - n) * 0.2), off = (n - 1) * 9; set(q, { transform: `translate(${150 + off} ${lerp(-210, 34 - off, a)})`, opacity: a }); });
      ov.style.opacity = S(u, 2.0, 2.3);
      if (!handed.has(4)) {
        input.value = u >= 4.0 ? '40' : u >= 3.7 ? '4' : '';
        tick.textContent = '✓ 40 m, right'; tick.setAttribute('fill', '#1d6b4a');
        tick.setAttribute('opacity', S(u, 4.6, 4.9));
      }
    };
  },
  // 6 · Your turn (not Tome): the site's own calculator at the page's g = 9.8. A demo throws at 30°
  //     and at 45°, then the dial is yours.
  (c) => {
    const g = svg('g', {}, c.p);
    const sx = (x) => 150 + x * 7.2, sy = (y) => 196 - y * 7.6;
    svg('line', { x1: sx(0), y1: sy(0), x2: sx(44), y2: sy(0), stroke: '#8f93c4' }, g);
    [0, 10, 20, 30, 40].forEach((m) => { svg('line', { x1: sx(m), y1: sy(0), x2: sx(m), y2: sy(0) + 4, stroke: '#8f93c4' }, g); svg('text', { x: sx(m), y: sy(0) + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#3a3e78', class: 'mono' }, g).textContent = `${m} m`; });
    const ghostG = svg('g', {}, g);
    const aim = svg('line', { x1: sx(0), y1: sy(0), stroke: '#3a3e78', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    const arc = svg('path', { fill: 'none', stroke: '#3a3e78', 'stroke-width': 2.6 }, g);
    const ball = svg('circle', { r: 6, fill: '#3a3e78', opacity: 0 }, g);
    const read = svg('text', { x: 320, y: 26, 'text-anchor': 'middle', 'font-size': 15, fill: '#3a3e78', class: 'mono' }, g);
    const ov = document.createElement('div');
    ov.className = 'ov'; ov.style.cssText = 'left:2.5%;top:6%;width:26%;flex-direction:column;align-items:stretch;gap:8px;';
    ov.innerHTML = '<label for="angle" style="font-weight:650;color:#3a3e78">Angle <output id="angle-out">45°</output></label><input type="range" id="angle" min="10" max="80" step="1" value="45"><button type="button" class="b live" id="throw">Throw</button>';
    c.pic.append(ov);
    const range = ov.querySelector('#angle'), out = ov.querySelector('#angle-out');
    let mine = null; const mineGhosts = new Set();
    const ghostPath = (a) => { const h = flight(20, a, 9.8); return arcPoints(h, 40).map((q, k) => `${k ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' '); };
    function drawState(angle, throws, nowThrow) {
      const r = (angle * Math.PI) / 180;
      set(aim, { x2: sx(0) + 36 * Math.cos(r), y2: sy(0) - 36 * Math.sin(r) });
      range.value = angle; out.textContent = `${Math.round(angle)}°`;
      ghostG.innerHTML = '';
      throws.forEach((a) => { svg('path', { d: ghostPath(a), fill: 'none', stroke: '#3a3e78', 'stroke-opacity': 0.28, 'stroke-width': 1.5 }, ghostG); const h = flight(20, a, 9.8); svg('text', { x: sx(h.range / 2), y: sy(h.height) - 5, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#3a3e78', class: 'mono' }, ghostG).textContent = `${a}°`; });
      if (nowThrow) {
        const h = flight(20, nowThrow.a, 9.8), tt = Math.min(h.time, nowThrow.tt), p = h.at(tt);
        arc.setAttribute('d', arcPoints(h, 60).filter((q, k) => (h.time * k) / 60 <= tt + 1e-9).concat([p]).map((q, k) => `${k ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' '));
        set(ball, { cx: sx(p.x), cy: sy(p.y), opacity: 1 });
        read.textContent = tt >= h.time ? `${nowThrow.a}° → ${metres(h.range)}${nowThrow.a === 45 ? ', the farthest' : ''}` : '';
      } else { arc.setAttribute('d', ''); ball.setAttribute('opacity', 0); read.textContent = ''; }
    }
    range.oninput = () => { handed.add(5); setPaused(true, true); mine = { a: Math.round(+range.value), t0: null }; };
    ov.querySelector('#throw').onclick = () => { handed.add(5); setPaused(true, true); const a = Math.round(+range.value); if (mine?.t0 != null) mineGhosts.add(mine.a); mine = { a, t0: performance.now() }; };
    c.controls = [ov];
    c.reset = () => { mine = null; mineGhosts.clear(); };
    c.draw = (u) => {
      if (handed.has(5) && mine) {
        const tt = mine.t0 == null ? -1 : (performance.now() - mine.t0) / 1000;
        drawState(mine.a, [30, 45, ...mineGhosts], tt >= 0 ? { a: mine.a, tt } : null);
        return;
      }
      // the demo: 45 → 30, throw; 30 → 45, throw
      let angle = 45; const thrown = [];
      if (u >= 0.5) angle = lerp(45, 30, S(u, 0.5, 1.5));
      if (u >= 4.6) angle = lerp(30, 45, S(u, 4.6, 5.6));
      let now = null;
      if (u >= 1.8 && u < 6.0) now = { a: 30, tt: u - 1.8 };
      if (u >= 6.0) { thrown.push(30); now = { a: 45, tt: u - 6.0 }; }
      drawState(Math.round(angle), thrown, now);
      ov.classList.toggle('nudge', u >= 9 && Math.floor(u * 2) % 2 === 0);
    };
  },
];

// ── The track ───────────────────────────────────────────
function buildTrack() {
  track.innerHTML = ''; cards.length = 0;
  for (let i = 0; i < 6; i++) { const c = makeCard(i); cards.push({ ...c, slot: i }); track.append(c.el); }
  const seam = document.createElement('div');
  seam.className = 'card seam'; seam.innerHTML = '<span>The replay<br>starts again</span>';
  track.append(seam); cards.push({ el: seam, slot: SEAM_AT, seam: true });
  // using a control inside a card hands that card to the visitor (the track waits until Resume)
  cards.forEach((c, i) => (c.controls || []).forEach((ov) => ov.addEventListener('pointerdown', () => { handed.add(i); setPaused(true, true); })));
}
function pose(o) {
  const a = Math.abs(o), sign = Math.sign(o);
  let x, s;
  if (a <= 1) { x = G.near * a; s = 1 + (G.sNear - 1) * a; }
  else if (a <= 2) { x = G.near + (G.far - G.near) * (a - 1); s = G.sNear + (G.sFar - G.sNear) * (a - 1); }
  else { x = G.far + (G.far - G.near) * (a - 2); s = G.sFar - 0.08 * (a - 2); }
  x *= sign;
  const rise = G.R - Math.sqrt(Math.max(0, G.R * G.R - x * x));
  const tilt = a < 0.1 ? 0 : (Math.asin(Math.max(-1, Math.min(1, x / G.R))) * 180) / Math.PI * 0.3;
  const opacity = a <= 2.2 ? 1 : Math.max(0, 1 - (a - 2.2) / 0.5);
  return { x, rise, s, tilt, opacity, veil: a < 0.08 ? 0 : a <= 1 ? 0.62 * Math.min(1, a / 0.6) : 0.78 };
}
function positionAt(tt) {
  const s = segs.find((x) => tt >= x.t0 && tt < x.t1) || segs.at(-1);
  if (s.kind === 'dwell') return { p: s.i, seg: s, u: tt - s.t0 };
  const k = ease(clamp01((tt - s.t0) / TRAVEL)), next = s.i === 5 ? LOOP : s.i + 1;
  return { p: (s.i + (next - s.i) * k) % LOOP, seg: s, u: DWELL[s.i] };
}
const wrap = (o) => ((o % LOOP) + LOOP * 1.5) % LOOP - LOOP / 2;

// ── Arrows and what rides them ──────────────────────────
const workerEl = { gpt: $('w-gpt'), fixed: $('w-fixed'), voice: $('w-voice') };
function rel(el) { const s = scene.getBoundingClientRect(), r = el.getBoundingClientRect(); return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top, w: r.width, h: r.height }; }
let actors = null;
const bandEl = document.querySelector('.rail-band');
function anchorOf(w) {
  if (actors) { const host = rel($('actors')), an = actors.anchors(w); return { l: host.l + an.in.x, r: host.l + an.out.x, t: host.t + an.in.y - 10, b: host.t + Math.max(an.in.y, an.out.y), w: an.out.x - an.in.x, h: 20, three: true }; }
 const el = w === 'gpt' ? workerEl.gpt.querySelector('.body') : w === 'fixed' ? workerEl.fixed.querySelector('.plate') : workerEl.voice.querySelector('.grille'); return rel(el); }
function arrowPaths(w) {
  const a = anchorOf(w), cx = G.W / 2, top = G.cardTop - 2, half = G.cardW / 2 - 26;
  const up = a.three ? { x1: cx - half, y1: top, x2: a.l, y2: a.b } : { x1: cx - half, y1: top, x2: a.l + a.w * 0.25, y2: a.b + 3 };
  const dn = a.three ? { x1: a.r, y1: a.b, x2: cx + half, y2: top } : { x1: a.l + a.w * 0.75, y1: a.b + 3, x2: cx + half, y2: top };
  const q = (p, bend) => `M${p.x1.toFixed(1)},${p.y1.toFixed(1)} Q${((p.x1 + p.x2) / 2 + bend).toFixed(1)},${((p.y1 + p.y2) / 2).toFixed(1)} ${p.x2.toFixed(1)},${p.y2.toFixed(1)}`;
  return { up: q(up, -18), down: q(dn, 18) };
}
let flyerPool = [], flyStep = -1, edgePool = [];
function placeFlyers(step, u, w) {
  if (flyStep !== step) {
    flyersEl.innerHTML = ''; flyStep = step;
    flyerPool = FLY[step].map((f) => { const d = document.createElement('div'); d.className = `flyer ${f[5]}`; d.textContent = f[2]; flyersEl.append(d); return { f, d }; });
    edgePool = EDGE_FLY[step].map((f) => { const d = document.createElement('div'); d.className = `flyer ${f[4]}`; d.textContent = f[1]; flyersEl.append(d); return { f, d }; });
  }
  // between the page's edges and the lit card (straight across)
  const ei = rel($('edge-in')), eo = rel($('edge-out')), cy = G.cardTop + G.cardH * 0.45, cl = G.W / 2 - G.cardW / 2, cr = G.W / 2 + G.cardW / 2;
  edgePool.forEach(({ f, d }) => {
    const [dir, , a, dur] = f, k = (u - a) / dur;
    if (reduce || k <= 0 || k >= 1) { d.style.opacity = 0; return; }
    const from = dir === 'fromIn' ? { x: ei.r - 10, y: cy } : { x: cr - 30, y: cy }, to = dir === 'fromIn' ? { x: cl + 60, y: cy } : { x: eo.l + 20, y: cy };
    const e = ease(k), x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 40;
    d.style.opacity = Math.min(1, Math.min(k, 1 - k) * 6);
    d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  const paths = { up: $('arw-up'), down: $('arw-down') };
  flyerPool.forEach(({ f, d }) => {
    const [dir, who, , a, dur] = f, k = (u - a) / dur;
    if (reduce || k <= 0 || k >= 1 || who !== w) { d.style.opacity = 0; return; }
    const path = paths[dir], len = path.getTotalLength(), pt = path.getPointAtLength(len * ease(k));
    d.style.opacity = Math.min(1, Math.min(k, 1 - k) * 6);
    d.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
  });
}

// ── The whole run's input (left edge) and output (right edge) ──
const head = (s) => s.replace(/^\d+\.\s*/, '');
function buildEdges() {
  $('edge-in-body').innerHTML = [1, 2, 3].map((n) => `<figure class="pg" data-n="${n}"><img src="img/page-${n}-480.jpg" alt="Page ${n} of my three pages" width="480" height="621" loading="lazy"><figcaption>page ${n} of 3</figcaption></figure>`).join('');
  const f = flight(L.simulation.speed, L.simulation.angle_deg, L.simulation.g);
  const arc = arcPoints(f, 30).map((q, k) => `${k ? 'L' : 'M'}${(6 + q.x * 5.4).toFixed(1)},${(40 - q.y * 3).toFixed(1)}`).join(' ');
  $('edge-out-body').innerHTML = `<p class="total">${L.plan.slides.length} slides · ${L.totals.narration_lines} spoken lines · ${L.practice.length} practice questions</p>`
    + L.plan.slides.map((sl, k) => `<div class="sl ${k === 2 ? 'sim' : ''}" data-k="${k}"><span class="no">${k + 1}</span>${sl.name.toLowerCase() === sl.title.toLowerCase() ? '' : `<span class="kind">${sl.name}</span>`}<span class="tt">${sl.title}</span>${k === 2
      ? `<span><svg viewBox="0 0 240 46" aria-hidden="true"><line x1="6" y1="40" x2="234" y2="40" stroke="#a48a9f"/><path d="${arc}" fill="none" stroke="#6c265c" stroke-width="2.5"/><circle cx="${(6 + f.range * 5.4).toFixed(1)}" cy="40" r="4" fill="#6c265c"/></svg><span class="say">20 m/s at 45°, lands 40.8 m away · ${sl.lines.length} spoken lines</span></span>`
      : `<span class="say">${short(sl.lines[0], 74)} · ${sl.lines.length} spoken lines</span>`}</div>`).join('')
    + `<div class="qs"><b>${L.practice.length} practice questions</b>, each with a stored answer. Question 1: R at 20 m/s, 45°, g = 10 → <b>40 m</b>.</div>`;
}
function wireOpeners() {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); fn(el); }));
  // one Open per flap; clicking a page or slide opens the same view, scrolled to it
  on('#edge-in .open-btn', () => openViewer('pages', 0, $('edge-in')));
  on('#edge-out .open-btn', () => openViewer('lesson', 0, $('edge-out')));
  on('.pg', (el) => openViewer('pages', +el.dataset.n - 1, el));
  on('.sl', (el) => openViewer('lesson', +el.dataset.k, el));
  on('.qs', (el) => openViewer('lesson', L.plan.slides.length, el));
}
function wireEdge(id) {
  const e = $(id), btn = e.querySelector('.fold-btn');
  const toggle = () => { const closed = e.classList.toggle('closed'); btn.setAttribute('aria-expanded', String(!closed)); e.tabIndex = closed ? 0 : -1; };
  e.addEventListener('click', (ev) => { if (String(getSelection())) return; toggle(); });
  e.addEventListener('keydown', (ev) => { if (e.classList.contains('closed') && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); toggle(); } });
}
function lightEdges(step, u, moving) {
  const reading = !moving && step === 0 && u >= 0.1 && u < 3.2;
  document.querySelectorAll('.pg').forEach((p) => p.classList.toggle('reading', reading));
  document.querySelectorAll('.sl').forEach((el) => {
    const k = +el.dataset.k;
    const on = !moving && ((step === 2 && u >= 6.8) || (step === 3 && (k === 2 ? u >= 4.7 && u < 9.7 : false)) || (step === 3 && u >= 9.7));
    el.classList.toggle('now', on);
  });
  document.querySelector('.qs')?.classList.toggle('now', !moving && step === 4 && u >= 5.4);
}

// ── Painting one moment ─────────────────────────────────
let t = 0, paused = false, userPaused = false, inView = false, last = null, lastCap = '';
let curStep = -1, lastEdgeStep = -1;
function paint() {
  const pos = positionAt(t), seg = pos.seg, moving = seg.kind === 'travel';
  const step = seg.i, u = pos.u;
  if (step !== curStep && seg.kind === 'dwell') { if (curStep !== -1 && step === 0) { handed.clear(); cards.forEach((c) => c.reset && c.reset()); } curStep = step; }
  // cards on the curve; the lamp's card is lit; passed cards keep their last frame
  cards.forEach((c) => {
    const o = wrap(c.slot - pos.p), q = pose(o);
    const w = c.seam ? c.el.offsetWidth : G.cardW, h = c.seam ? c.el.offsetHeight : G.cardH;
    const cx = G.W / 2 + q.x, cy = G.cardTop + G.cardH / 2 - q.rise;
    c.el.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${q.tilt}deg) scale(${q.s})`;
    c.el.style.opacity = q.opacity;
    c.el.style.zIndex = String(100 - Math.round(Math.abs(o) * 10));
    c.el.style.setProperty('--veil', q.veil);
    if (c.seam) return;
    const isLit = Math.abs(o) < 0.08;
    c.el.classList.toggle('lit', isLit);
    c.el.inert = !isLit;
    if (c.draw) c.draw(c.slot === step && !moving ? u : c.slot < step || (moving && c.slot === step) ? DWELL[c.slot] : 0);
  });
  scene.classList.toggle('dim', moving);
  scene.classList.toggle('moving', moving);
  // who is working right now
  const S_ = STEPS[step], working = moving ? null : (S_.work.find(([, a, b]) => u >= a && u < b) || [null])[0];
  Object.entries(workerEl).forEach(([k, el]) => el.classList.toggle('on', k === working));
  bandEl.classList.toggle('other-on', working === 'fixed' || working === 'voice');
  if (actors) {
    const span = moving ? null : S_.work.find(([w]) => w === working);
    const f = span ? clamp01((u - span[1]) / (span[2] - span[1])) : 0;
    actors.frame({ active: working, f, off: step === 5 && !moving, time: t, still: still || reduce });
    const host = rel($('actors')), band = rel(bandEl);
    Object.entries(workerEl).forEach(([k, el]) => { const p = actors.anchors(k).foot; el.style.left = `${host.l - band.l + p.x}px`; el.style.top = `${host.t - band.t + p.y + 4}px`; });
  }
  $('w-gpt').closest('.rail-band').classList.toggle('off', step === 5 && !moving);
  // the arrows: the two edges of the light, only for the worker who is working
  ['arw-up', 'arw-down'].forEach((id) => { const a = $(id); a.classList.toggle('on', !!working); a.classList.remove('gpt', 'fixed', 'voice'); if (working) a.classList.add(working); });
  if (working) { const p = arrowPaths(working); $('arw-up').setAttribute('d', p.up); $('arw-down').setAttribute('d', p.down); }
  placeFlyers(step, moving ? -1 : u, working);
  // the small text above the light
  const capList = S_.cap; let cap = capList[0][0];
  capList.forEach(([txt, at]) => { if (u >= at) cap = txt; });
  if (moving) cap = lastCap;
  if (cap !== lastCap) { const el = $('caption'); el.innerHTML = cap; lastCap = cap; }
  // the card's tag turns live when your browser is working
  const live = S_.liveFrom != null && u >= S_.liveFrom;
  const k = cards[step].el.querySelector('.k'); k.textContent = live ? 'Live in your browser' : 'Recorded run'; k.classList.toggle('live', live);
  lightEdges(step, u, moving);
  if (step !== lastEdgeStep && !moving) { lastEdgeStep = step; const tgt = step === 3 ? document.querySelector('.sl.sim') : step === 4 ? document.querySelector('.qs') : null; const body = $('edge-out-body'); if (body) body.scrollTo({ top: tgt ? tgt.offsetTop - body.offsetTop - 40 : 0, behavior: still || reduce ? 'auto' : 'smooth' }); }
  // the voice grille's little wave
  const vp = $('w-voice').querySelector('path'); let d = ''; for (let x = 0; x <= 40; x += 2) d += `${x ? 'L' : 'M'}${x},${10 + (working === 'voice' ? 7 : 1) * Math.sin(x * 0.6 + t * 9) * Math.sin(x * 0.15 + t)}`; vp.setAttribute('d', d);
  // the step dots
  [...$('dots').querySelectorAll('button')].forEach((b, i) => b.toggleAttribute('aria-current', i === (moving ? (step + 1) % 6 : step)));
}
function frame(now) {
  if (last != null && !paused && inView && document.visibilityState === 'visible') { t += Math.min(0.1, (now - last) / 1000); if (t >= CYCLE) t -= CYCLE; }
  last = now;
  paint();
  requestAnimationFrame(frame);
}
function setPaused(on, byUser) {
  paused = on; if (byUser !== undefined) userPaused = byUser && on;
  $('pause').textContent = on ? (userPaused ? 'Resume' : 'Play') : 'Pause';
}
function goTo(i) { t = dwellStart(i) + (reduce ? DWELL[i] - 0.01 : 0); curStep = i; paint(); }

// ── Start ───────────────────────────────────────────────
$('replay-note').textContent = `A replay of one real run on ${L.run_date} · the real run took ${L.totals.build_minutes} minutes`;
$('receipt').textContent = `Reading the pages and building the lesson took ${L.totals.build_minutes} minutes, ${L.totals.gpt5_calls} requests to GPT-5 and $${L.totals.cost_usd.toFixed(2)}, on ${L.run_date}. That doesn't include the voice. The replay above loops every ${Math.round(CYCLE)} seconds.`;
$('dots').innerHTML = STEPS.map((s, i) => `<li><button type="button" aria-label="Go to step ${i + 1}: ${s.name}">${i + 1}</button></li>`).join('');
$('dots').querySelectorAll('button').forEach((b, i) => { b.onclick = () => { goTo(i); if (!reduce) setPaused(false, false); }; });
$('pause').onclick = () => (reduce ? goTo((Math.max(curStep, 0) + 1) % 6) : setPaused(!paused, !paused));
buildEdges(); wireOpeners(); wireEdge('edge-in'); wireEdge('edge-out');
// opening anything holds the replay; closing lets it carry on if it was running
let resumeAfter = false;
initViewer(L, { reduce, onOpen: () => { resumeAfter = !paused; setPaused(true, true); }, onClose: () => { if (resumeAfter) setPaused(false, false); } });
layout(); buildTrack();
if (G.phone && G.H - (G.cardTop + G.cardH) < 130) { $('edge-in').classList.add('closed'); $('edge-out').classList.add('closed'); }
try {
  if (url.get('gl') !== '0') { const m = await import('./actors.js'); actors = m.createActors($('actors')); }
} catch (e) { console.warn('3D workers unavailable; using the drawings', e); actors = null; }
bandEl.classList.toggle('gl', !!actors);
addEventListener('resize', () => { layout(); paint(); });

if (still) {
  document.body.classList.add('still');
  t = Number(url.get('t')) % CYCLE;
  paint(); paused = true;
  $('pause').textContent = 'Pause';            // a still stands for the moving page
  requestAnimationFrame(frame);                // the clock stays put; the 3D view keeps drawing
} else if (reduce) {
  goTo(0); paused = true; $('pause').textContent = 'Next step';
  requestAnimationFrame(frame);
} else {
  new IntersectionObserver(([e]) => { inView = e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= 0.5 * innerHeight); },
    { threshold: Array.from({ length: 11 }, (_, k) => k / 10) }).observe($('tome'));
  requestAnimationFrame(frame);
}
