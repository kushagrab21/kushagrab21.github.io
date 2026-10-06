// Every DONE in the study, falling as a dot onto the moment it was said (after R2D3's "Reality check").
// Wrong ones are red; right ones faint. Deterministic: the same seed gives the same fall, so ?still can
// draw the settled piles. Four signs; the dots pile up on them (on a phone, one row per sign).
import { MOMENTS } from './data.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildDots() {
  const dots = [];
  MOMENTS.forEach((m, mi) => {
    for (let j = 0; j < m.said; j++) dots.push({ m: mi, wrong: j < m.wrong, slot: 0 });
  });
  // slots: within each moment, the wrong ones take the first slots (nearest the sign), then the right ones
  const seen = MOMENTS.map(() => ({ wrong: 0, right: 0 }));
  for (const d of dots) { const c = seen[d.m]; d.slot = d.wrong ? c.wrong++ : c.right++; }
  const r = rng(608);
  for (const d of dots) { d.delay = r() * 0.72; d.x0 = r(); }
  return dots;
}

export function createTally(canvas) {
  const ctx = canvas.getContext('2d');
  const dots = buildDots();
  let W = 1; let H = 1; let dpr = 1; let L = null;

  function layout(w, h, narrow) {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    const n = MOMENTS.length;
    const regions = [];
    if (narrow) {
      // phone: one row per moment, the sign on the left and its pile to the right, the group centred
      const signW = Math.round(Math.min(132, w * 0.36)); const px = signW + 12; const pw = w - px;
      let s = 13; const rowsOf = (sz, nn) => Math.ceil(nn / Math.floor(pw / sz));
      const heightAt = (sz) => MOMENTS.reduce((acc, m) => acc + Math.max(40, rowsOf(sz, m.said) * sz + 20), 0) + 14 * (n - 1);
      while (s > 3 && heightAt(s) > h - 30) s--;
      const per = Math.floor(pw / s);
      // bottom-aligned, so the paused step card at the top of the stage never covers a pile
      let y = Math.max(30, h - heightAt(s) - 4);
      for (let i = 0; i < n; i++) {
        const ph = Math.max(40, rowsOf(s, MOMENTS[i].said) * s + 20);
        const base = y + ph;
        regions.push({ x: px, w: pw, base, s, per, row: true, signW, mid: y + ph / 2, left: true });
        y = base + 14;
      }
      L = { regions, s };
    } else {
      const gap = 22; const cw = (w - gap * (n - 1)) / n;
      const base = h - 64;
      let s = 16; const fit = (sz) => Math.ceil(344 / Math.floor(cw / sz)) * sz <= base - 40;
      while (s > 3 && !fit(s)) s--;
      for (let i = 0; i < n; i++) regions.push({ x: i * (cw + gap), w: cw, base, s, per: Math.floor(cw / s), signTop: base + 6 });
      L = { regions, s };
    }
    return L;
  }

  // the resting place of a dot
  function target(d) {
    const R = L.regions[d.m]; const s = R.s; const per = R.per;
    const used = Math.min(per, MOMENTS[d.m].said) * s; const left = R.left ? R.x : R.x + (R.w - used) / 2;
    // wrong ones sit at the bottom of the pile, right ones on top of them
    const m = MOMENTS[d.m]; const k = d.wrong ? d.slot : m.wrong + d.slot;
    const col = k % per; const row = Math.floor(k / per);
    return { x: left + col * s + s / 2, y: R.base - row * s - s / 2 };
  }

  // p: 0..1 through the fall. lit: index of the sign under the yellow light (or -1)
  function draw(p, { lit = 2 } = {}) {
    if (!L) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    // the floor each pile lands on
    for (const d of dots) {
      const q = Math.max(0, Math.min(1, (p - d.delay) / 0.26));
      if (q <= 0) continue;
      const t = target(d); const R = L.regions[d.m]; const s = R.s;
      const startY = -10; const e = q * q; // falls, accelerating
      const sx = R.x + d.x0 * R.w;
      const x = sx + (t.x - sx) * Math.min(1, q * 1.4);
      const y = startY + (t.y - startY) * e;
      const r = Math.max(1.3, s * 0.36);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (d.wrong) ctx.fillStyle = '#e8745a';
      else ctx.fillStyle = d.m === lit ? 'rgba(246,226,180,0.55)' : 'rgba(243,233,218,0.32)';
      ctx.fill();
    }
  }
  return { layout, draw, regions: () => L?.regions ?? [] };
}
