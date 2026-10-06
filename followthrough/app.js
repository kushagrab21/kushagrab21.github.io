// Followthrough block, checkpoint 5: one recorded step at a time, inside the whole job.
// The input flap holds exactly what went in, the output flap exactly what came out, and the actor
// responsible stands between them with arrows running through it. The rest of the job stays findable
// in the map above and drifts, blurred, in the room behind. The first touch pins the whole step for
// reading; the replay keeps going on its own until "Follow the replay" reconnects it.
import { buildOperations } from './operations.js';
import { runEditCheck, tampers } from './model.js';
import { BAND, AREAS, ACTORS, STEPS, FLAP, RESULT, PLAY, BRIDGE, recordName, tabName } from './copy.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('still') === '1';
const narrow = () => matchMedia('(max-width: 760px)').matches;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const when = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`; };

const run = await (await fetch('data/recorded_run.json')).json();
const OPS = buildOperations(run);
const N = OPS.length;
// Seconds each step holds the stage. The first holds longest; checks are shorter than edits.
const DUR = OPS.map((o, i) => (i === 0 ? 15 : o.actor === 'code' ? 11 : o.id === 'draft' ? 16 : 14)); // trimmed ~20% on 6 Oct: long still holds after each action
const START = DUR.reduce((a, d, i) => { a.push(i ? a[i - 1] + DUR[i - 1] : 0); return a; }, []);
const CYCLE = DUR.reduce((a, b) => a + b, 0);

/* ---------------- fixed text ---------------- */
$('#ft-title').textContent = BAND.title;
$('#lead').textContent = BAND.lead;
$('#recorded').textContent = BAND.recorded;
$('#research-link').textContent = BAND.research;
$('#bridge').textContent = BRIDGE;
$('#try-shortcut').textContent = PLAY.tryIt;
$('#follow').textContent = PLAY.follow;

/* ---------------- the job map: three areas on one shallow curve ---------------- */
function drawMap() {
  const groups = { documents: [], review: [], later: [] };
  OPS.forEach((o, i) => groups[o.area].push(i));
  const step = (i) => `<button type="button" class="step" data-op="${i}" aria-label="${esc(STEPS[OPS[i].id].title)}" title="${esc(STEPS[OPS[i].id].title)}">${esc(STEPS[OPS[i].id].map)}</button>`;
  const docSteps = () => {
    const out = []; let g = null;
    for (const i of groups.documents) {
      const name = STEPS[OPS[i].id].group;
      if (name !== g) { if (g) out.push('</span>'); out.push(`<span class="pairgroup"><span class="pairname">${esc(name)}</span>`); g = name; }
      out.push(step(i));
    }
    out.push('</span>'); return out.join('');
  };
  $('#jobmap').innerHTML = `
    <svg class="map-curve" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 10"><path d="M0,3 Q50,11 100,3"></path></svg>
    <div class="area" data-area="documents"><p class="area-head"><span class="area-name">${esc(AREAS.documents.name)}</span><span class="status status-open">${esc(AREAS.documents.status)}</span></p><div class="area-steps">${docSteps()}</div></div>
    <div class="area" data-area="review"><p class="area-head"><span class="area-name">${esc(AREAS.review.name)}</span></p><div class="area-steps">${groups.review.map((i, k) => `${k ? '<i class="sep" aria-hidden="true">→</i>' : ''}${step(i)}`).join('')}</div></div>
    <div class="area" data-area="later"><p class="area-head"><span class="area-name">${esc(AREAS.later.name)}</span></p><div class="area-steps">${groups.later.map(step).join('')}<span class="status status-draft">${esc(AREAS.later.status)}</span></div></div>
    <span class="replay-marker" id="replay-marker" aria-hidden="true">Replay</span>`;
  // On phones the map scrolls sideways, so both open outcomes are also stated once above it.
  $('.band-text').insertAdjacentHTML('beforeend', `<p class="phone-status"><span class="status status-open">${esc(AREAS.documents.status)}</span> <span class="status status-draft">${esc(AREAS.later.status)}</span></p>`);
}
drawMap();
// When the map has less room (a small laptop, or the block scaled inside the site), it tightens in steps
// instead of letting chips overlap: first the pair names go, then other areas' steps shrink to dots.
function fitMap() {
  const map = $('#jobmap'); if (narrow()) { map.classList.remove('tight', 'tighter', 'tightest'); return; }
  const fits = () => $$('.area', map).reduce((a, el) => a + el.scrollWidth, 0) + 40 <= map.clientWidth;
  map.classList.remove('tight', 'tighter', 'tightest');
  if (fits()) return;
  map.classList.add('tight'); if (fits()) return;
  map.classList.add('tighter'); if (fits()) return;
  map.classList.add('tightest');
}
new ResizeObserver(fitMap).observe($('#jobmap'));

/* ---------------- recorded records, drawn exactly as stored ---------------- */
function markAll(text, phrases) {
  let html = esc(text);
  for (const p of phrases) if (p) html = html.split(esc(p)).join(`<mark class="hl">${esc(p)}</mark>`);
  return html;
}
function emailHTML(a) {
  const s = run.snapshots[a.key].text; const [head, ...rest] = s.split('\n\n');
  const rows = head.split('\n').map((l) => { const k = l.indexOf(': '); return [l.slice(0, k), l.slice(k + 2)]; })
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === 'Date' ? esc(when(v)) : esc(v)}</dd>`).join('');
  return `<article class="rec rec-email"><dl class="mail-head">${rows}</dl><div class="mail-body">${markAll(rest.join('\n\n').trim(), a.highlight)}</div></article>`;
}
// The export keeps the document's hard line breaks inside paragraphs and writes every list number as
// "1."; numbering is drawn by the page, and wrapped lines are rejoined for display. Words are untouched.
function docHTML(a, role) {
  const out = [];
  a.lines.forEach((l, i) => {
    const list = /^1\. /.test(l.text);
    const text = list ? l.text.slice(3) : l.text;
    const prev = out.at(-1);
    if (prev && !list && !prev.list && l.style === 'NORMAL_TEXT' && prev.style === 'NORMAL_TEXT' && /^[a-z]/.test(text) && !l.changed && !prev.changed) { prev.text += ` ${text}`; return; }
    out.push({ text, style: l.style, list, changed: l.changed, was: l.was, n: i + 1 });
  });
  const body = out.map((p) => {
    const cls = `ln st-${p.style.toLowerCase()}${p.list ? ' is-item' : ''}${p.changed ? ' hl' : ''}${p.changed && !p.was && role === 'input' ? ' is-target' : ''}`;
    const was = p.was ? `<p class="was-note"><span>${RESULT.was}</span> “${esc(p.was)}”</p>` : '';
    return `<p class="${cls}" data-line="${p.n}">${esc(p.text)}</p>${was}`;
  }).join('');
  return `<article class="rec rec-doc"><div class="page">${body}</div></article>`;
}
function askedHTML(a) {
  return `<article class="rec rec-plain"><ul class="asked">${a.replacements.map((r) => `<li class="hl">Replace <q>${esc(r.find)}</q> with <q>${esc(r.replace)}</q></li>`).join('')}</ul></article>`;
}
function checkHTML(a) {
  const r = a.result; const changed = r.diffs.line_changes;
  const ok = (b) => `<span class="tick ${b ? 'pass' : 'fail'}" aria-hidden="true">${b ? '✓' : '✗'}</span>`;
  const explained = changed.every((c) => c.explained_by_replacement);
  return `<article class="rec rec-result">
    <p class="res-title">${esc(RESULT.checkTitle)}</p>
    <ul class="res-rows">
      <li class="hl">${ok(explained && r.dateApplied)}${esc(RESULT.lines(changed.length, a.total))}</li>
      <li>${ok(r.unrelatedTextPreserved)}${esc(RESULT.other)}</li>
      <li>${ok(r.stylesPreserved)}${esc(RESULT.styles(r.diffs.after_styles.length))}</li>
    </ul>
    <ol class="diffs">${changed.map((c) => `<li><span class="dl">Line ${c.line}</span><span class="dbefore">${esc(c.before)}</span><span class="darrow" aria-hidden="true">↓</span><span class="dafter">${esc(c.after)}</span></li>`).join('')}</ol>
    <button type="button" class="try" data-try>${esc(RESULT.try)}</button>
  </article>`;
}
function claimHTML(a) {
  const f = a.finding;
  return `<article class="rec rec-plain"><blockquote class="claim hl">${esc(f.claim)}</blockquote>
    <p class="sub">Quotes given for it</p>
    <ul class="quotes">${f.excerpts.map((x) => `<li><q>${esc(x.quote)}</q><span class="qsrc">from ${esc(x.from)}</span></li>`).join('')}</ul></article>`;
}
function quotesHTML(a) {
  return `<article class="rec rec-result"><p class="res-title">${esc(RESULT.quoteQuestion)}</p>
    <ul class="quotes">${a.result.checked.map((c, i) => `<li class="${i === 0 ? 'hl' : ''}"><span class="tick ${c.present_verbatim ? 'pass' : 'fail'}" aria-hidden="true">${c.present_verbatim ? '✓' : '✗'}</span><q>${esc(c.quote)}</q><span class="qsrc">${esc(c.present_verbatim ? RESULT.found(a.excerpts[i].from) : RESULT.notFound(a.excerpts[i].from))}</span></li>`).join('')}</ul>
    <p class="limit">${esc(RESULT.quoteLimit)}</p></article>`;
}
function rulingHTML(a) {
  const label = a.ruling === 'accepted' ? 'Accepted' : 'Sent back to fix';
  let text = esc(a.text);
  if (a.focus) text = text.replace(/(In finding fd_000001[^.]*\.)/, '<mark class="hl">$1</mark>');
  else text = `<span class="hl">${text}</span>`;
  const note = `<p class="note gloss">${esc(RESULT.gloss[a.key])}</p>${a.focus ? '<p class="note">“fd_000001” is the recording’s name for the statement about 2–5 pm.</p>' : ''}`;
  return `<article class="rec rec-plain"><p class="decision ${a.ruling === 'accepted' ? 'is-accept' : 'is-return'}">${label}<time>${esc(when(a.at))}</time></p><p class="ruling-text">${text}</p>${note}</article>`;
}
function findingsHTML(a) {
  return `<article class="rec rec-plain"><ol class="findings">${a.findings.map((f, i) => `<li class="${i < 2 ? 'hl' : ''}">
      <p class="f-claim">${esc(f.claim)}</p><p class="f-type">${esc(f.type === 'assessment' ? RESULT.assessment : RESULT.direct)}</p>
      <ul class="quotes">${f.excerpts.map((x) => `<li><q>${esc(x.quote)}</q><span class="qsrc">from ${esc(x.from)}</span></li>`).join('')}</ul></li>`).join('')}</ol></article>`;
}
function requestHTML(a) {
  return `<article class="rec rec-plain"><p class="sub">What the person asked the later job to do</p><blockquote class="claim hl">${esc(a.text)}</blockquote></article>`;
}
function resultsHTML(a) {
  return `<article class="rec rec-plain">
    <p class="sub">Changes the first job made</p>
    <ul class="asked">${a.changes.map((c) => c.lines.map((l) => `<li><b>${esc(c.title.replace('Northstar Workshop — ', ''))}</b> <q>${esc(l.after)}</q></li>`).join('')).join('')}</ul>
    <p class="sub">Statements the reviewer accepted</p>
    <ul class="quotes">${a.findings.map((f) => `<li>${esc(f.claim)}</li>`).join('')}</ul>
    <p class="sub">${esc(RESULT.stillOpen)}</p>
    <p class="open-item hl">${esc(a.outstanding)}</p></article>`;
}
function draftHTML(a) {
  return `<article class="rec rec-email rec-draft"><p class="draft-badge">${esc(RESULT.draftLabel)}</p>
    <dl class="mail-head"><dt>To</dt><dd>${esc(a.to)}</dd><dt>Subject</dt><dd class="hl">${esc(a.subject)}</dd><dt>Saved</dt><dd>${esc(when(a.at))}</dd></dl>
    <div class="mail-body">${markAll(a.body, ['Await venue rebooking confirmation for Oct 27'])}</div>
    <p class="note">${esc(RESULT.linksRemoved)}</p></article>`;
}
const RENDER = { email: emailHTML, doc: docHTML, asked: askedHTML, check: checkHTML, claim: claimHTML, quotes: quotesHTML, ruling: rulingHTML, findings: findingsHTML, request: requestHTML, results: resultsHTML, draft: draftHTML };

/* ---------------- the visitor's own copy, for "Try the check" ---------------- */
const exercise = { time: false, heading: false, open: false };
function exerciseHTML(op) {
  const edit = op.edit; const t = exercise.time; const h = exercise.heading;
  const tamper = t && h ? (x) => tampers.heading.apply(tampers.time.apply(x)) : t ? tampers.time.apply : h ? tampers.heading.apply : null;
  const { result: r, ms } = runEditCheck(run, edit, tamper);
  const ok = r.unrelatedTextPreserved && r.stylesPreserved;
  const which = /Brief/.test(run.snapshots[edit.after_source_id].title) ? 'Brief' : 'Invitation';
  const lines = run.snapshots[edit.after_source_id].text.split('\n').slice(0, 4);
  const why = [!r.unrelatedTextPreserved && RESULT.failTime, !r.stylesPreserved && RESULT.failHeading].filter(Boolean);
  return `<article class="rec rec-yours"><p class="yours-label">${esc(RESULT.yourCopy(which))}</p>
    <div class="page">
      <p class="ln st-heading_1${h ? ' is-flat' : ''}">${esc(lines[0])}</p>
      ${lines.slice(1).map((l) => `<p class="ln">${/^Time:/.test(l) && t ? '<span class="bad">Time: 3–6 pm</span>' : esc(l)}</p>`).join('')}
    </div>
    <div class="ex-controls">
      <button type="button" data-ex="time" aria-pressed="${t}">${esc(t ? RESULT.putTime : RESULT.changeTime)}</button>
      <button type="button" data-ex="heading" aria-pressed="${h}">${esc(h ? RESULT.unflatten : RESULT.flatten)}</button>
      <button type="button" data-ex="reset">${esc(RESULT.reset)}</button>
    </div>
    <p class="ex-result ${ok ? 'pass' : 'fail'}"><b>${esc(ok ? RESULT.pass : RESULT.fail)}</b> ${esc(why.join(' '))} <span class="ms">(${ms.toFixed(1)} ms)</span></p>
    <button type="button" class="back" data-back>${esc(RESULT.back)}</button></article>`;
}

/* ---------------- the two flaps ---------------- */
const flaps = { in: { el: $('#flap-in'), open: true, tab: 0, scroll: {} }, out: { el: $('#flap-out'), open: true, tab: 0, scroll: {} } };
let shown = -1; // index of the step on stage
function records(op, side) { return side === 'in' ? op.inputs : [op.output]; }
function flapHTML(op, side) {
  const f = flaps[side]; const recs = records(op, side); const a = recs[f.tab] ?? recs[0];
  const role = side === 'in' ? 'input' : 'output';
  const sideName = side === 'in' ? FLAP.input : FLAP.output;
  const title = side === 'out' && exercise.open && op.edit ? RESULT.yourTitle : recordName(a, role);
  const tabs = recs.length > 1 ? `<div class="tabs" role="tablist" aria-label="${sideName}">${recs.map((r, i) => `<button type="button" role="tab" class="tab" data-tab="${i}" aria-selected="${i === f.tab}" title="${esc(recordName(r, role))}">${esc(tabName(r))}</button>`).join('')}</div>` : '';
  const body = side === 'out' && exercise.open && op.edit ? exerciseHTML(op) : RENDER[a.type](a, role);
  const draft = op.output.type === 'draft' && side === 'out' ? ' is-draft' : '';
  return `<div class="flap-face${draft}">
      <header class="flap-head">
        <button type="button" class="hinge" aria-expanded="${f.open}" aria-controls="${side}-body" aria-label="${f.open ? FLAP.close : (side === 'in' ? FLAP.openInput : FLAP.openOutput)}"><i aria-hidden="true"></i><span>${FLAP.fold}</span></button>
        <p class="flap-side">${sideName}</p>
        <p class="flap-title">${esc(title)}</p>
      </header>
      ${tabs}
      <div class="flap-body" id="${side}-body" tabindex="0">${body}</div>
    </div>
    <div class="flap-spine" aria-hidden="true"><span class="spine-side">${sideName}</span><span class="spine-title">${esc(title)}</span><span class="spine-open">${side === 'in' ? FLAP.openInput : FLAP.openOutput}</span></div>`;
}
function renderFlap(side, { keepScroll = false } = {}) {
  const op = OPS[shown]; const f = flaps[side];
  const prevScroll = $(`#${side}-body`)?.scrollTop;
  f.el.innerHTML = flapHTML(op, side);
  f.el.classList.toggle('is-open', f.open);
  const body = $(`#${side}-body`);
  if (keepScroll && prevScroll != null) body.scrollTop = prevScroll;
  else {
    // Arrive at the passage that matters, inside the complete record.
    const hl = body.querySelector('.hl, .yours-label');
    const y = hl ? hl.offsetTop - body.clientHeight * 0.28 : 0;
    body.scrollTop = y < 70 ? 0 : y;
  }
}
function setFlap(side, open) {
  flaps[side].open = open;
  flaps[side].el.classList.toggle('is-open', open);
  const hinge = $('.hinge', flaps[side].el);
  hinge.setAttribute('aria-expanded', String(open));
  hinge.setAttribute('aria-label', open ? FLAP.close : (side === 'in' ? FLAP.openInput : FLAP.openOutput));
  $('#inspect').classList.toggle(`${side}-closed`, !open);
}

/* ---------------- who owns the stage: the replay, or the visitor reading ---------------- */
let clock = 0; let paused = false; let visible = true;
let reading = null; // index of the step the visitor has pinned, or null while following
const speed = Number(params.get('speed') || 1);
const opAt = (t) => { const x = ((t % CYCLE) + CYCLE) % CYCLE; let i = 0; while (i < N - 1 && x >= START[i + 1]) i += 1; return { i, f: (x - START[i]) / DUR[i] }; };

function show(i, { animate = true } = {}) {
  const prev = shown;
  const handover = animate && !reduced && prev >= 0 && prev !== i && !narrow();
  if (handover) sendCardBack(prev);
  shown = i; const op = OPS[i];
  flaps.in.tab = 0; flaps.out.tab = 0; exercise.open = false;
  renderFlap('in'); renderFlap('out');
  const s = STEPS[op.id]; const actor = ACTORS[op.actor];
  $('#step-title').textContent = s.title;
  $('#step-say').textContent = s.say;
  $('#card-count').textContent = PLAY.count(i + 1, N);
  $('#card-area').textContent = AREAS[op.area].name;
  $('#phases').innerHTML = PLAY.phases.map((p, k) => `<li data-k="${k}">${esc(p)}</li>`).join('');
  if (handover) bringCardForward(i);
  $('#actor-name').innerHTML = `<b>${esc(actor.name)}</b>, ${esc(actor.role)}`;
  $('#vlink-in').textContent = s.read; $('#vlink-out').textContent = s.write;
  const ft = $('#ft'); ft.dataset.area = op.area; ft.dataset.actor = op.actor; ft.dataset.op = op.id;
  $$('.step').forEach((b) => b.classList.toggle('is-shown', Number(b.dataset.op) === i));
  $$('.area').forEach((a) => a.classList.toggle('is-shown', a.dataset.area === op.area));
  if ($('#jobmap').classList.contains('tighter')) fitMap();
  if (animate && !reduced && prev >= 0) carryTokens(prev, i);
}

// The step card is the current step's card from the curve behind the stage. On its turn it comes
// forward and sharpens; when the step ends it blurs and goes back to its place on the curve.
const backing = new Set(); // cards on their way back, whose blurred copy stays hidden until they land
function sendCardBack(k) {
  const card = $('#step-card'); const c = card.getBoundingClientRect(); const room = conveyor.getBoundingClientRect();
  const copy = card.cloneNode(true); copy.removeAttribute('id'); copy.classList.add('card-leaving'); copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  Object.assign(copy.style, { left: `${c.left - room.left}px`, top: `${c.top - room.top}px`, width: `${c.width}px`, height: `${c.height}px` });
  conveyor.appendChild(copy); backing.add(k);
  // Its place on the curve is now one step to the left of centre.
  const cx = c.left - room.left + c.width / 2; const cy = c.top - room.top + c.height / 2;
  const dx = room.width / 2 - conveyorGap() - cx; const dy = GHOST.cy - cy; const sc = (GHOST.w / c.width) * 0.85;
  copy.animate([
    { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    { transform: `translate(${dx * 0.4}px, ${dy * 0.3}px) scale(${(1 + sc) / 2})`, filter: 'blur(2px)', opacity: 0.8, offset: 0.35 },
    { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(-2deg)`, filter: 'blur(5px)', opacity: 0.25 },
  ], { duration: 1500, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).finished.then(() => { copy.remove(); backing.delete(k); });
}
function bringCardForward(i) {
  const card = $('#step-card'); const c = card.getBoundingClientRect(); const room = conveyor.getBoundingClientRect();
  // It starts where its blurred copy sits: one place to the right on the curve, small and out of focus.
  const fromX = room.left + room.width / 2 + conveyorGap() - (c.left + c.width / 2); const fromY = room.top + GHOST.cy - (c.top + c.height / 2);
  const sc = (GHOST.w / c.width) * 0.85;
  card.animate([
    { transform: `translate(${fromX}px, ${fromY}px) scale(${sc}) rotate(2deg)`, filter: 'blur(5px)', opacity: 0.3 },
    { transform: `translate(${fromX * 0.4}px, ${fromY * 0.4}px) scale(${(1 + sc) / 2})`, filter: 'blur(2.5px)', opacity: 0.75, offset: 0.45 },
    { transform: 'none', filter: 'blur(0px)', opacity: 1 },
  ], { duration: 1500, easing: 'cubic-bezier(.3,.1,.2,1)' });
}

// When a step's output becomes the next step's input, its named paper travels across into the input
// flap. Material that came from elsewhere drops in from the job map instead, under its own name.
function carryTokens(prev, i) {
  const host = $('#tokens'); const box = $('#inspect').getBoundingClientRect();
  const op = OPS[i]; const carry = new Set(op.carry ?? []);
  const outR = flaps.out.el.getBoundingClientRect(); const inR = flaps.in.el.getBoundingClientRect();
  const mapR = $(`.area[data-area="${op.area}"]`).getBoundingClientRect();
  op.inputs.slice(0, 3).forEach((a, k) => {
    const t = document.createElement('div'); t.className = `token${carry.has(k) ? ' is-carried' : ''}`;
    t.textContent = recordName(a, 'input'); host.appendChild(t);
    const from = carry.has(k) ? { x: outR.left - box.left + 20, y: outR.top - box.top + 40 } : { x: mapR.left - box.left + 30, y: -20 };
    const to = { x: inR.left - box.left + 20, y: inR.top - box.top + 46 + k * 34 };
    const lift = carry.has(k) ? -70 : 20;
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) + lift };
    const kf = [0, 0.5, 1].map((u) => {
      const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mid.x + u * u * to.x;
      const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * mid.y + u * u * to.y;
      return { transform: `translate(${x}px, ${y}px)`, opacity: u === 1 ? 0 : 1 };
    });
    kf[0].opacity = 0.0; kf[1].opacity = 1;
    t.animate(kf, { duration: 1400 + k * 160, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' }).finished.then(() => t.remove());
  });
}

let pinReason = null;
function pin(i = shown, why = 'select') {
  if (reading === i) return;
  pinReason = why;
  const changing = i !== shown;
  reading = i;
  if (changing) show(i, { animate: false });
  updateOwnership();
}
function follow() {
  reading = null; exercise.open = false;
  const { i } = opAt(clock); show(i, { animate: false });
  updateOwnership();
}
function updateOwnership() {
  const r = reading != null;
  $('#ft').classList.toggle('is-reading', r);
  $('#follow').hidden = !r;
  $$('.step').forEach((b) => b.classList.toggle('is-reading', r && Number(b.dataset.op) === reading));
  if (r) $('#own-line').textContent = PLAY.reading(STEPS[OPS[reading].id].title);
}

/* ---------------- arrows from the input, through the actor, to the output ---------------- */
const svg = $('#routes'); const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, cls, parent = svg) => { const el = document.createElementNS(NS, tag); el.setAttribute('class', cls); parent.appendChild(el); return el; };
const R = {
  inPath: mk('path', 'route route-in'), outPath: mk('path', 'route route-out'), backPath: mk('path', 'route route-back'),
  inDot: mk('circle', 'pulse'), outDot: mk('circle', 'pulse'), backDot: mk('circle', 'pulse pulse-back'),
  inLabel: mk('text', 'route-label'), outLabel: mk('text', 'route-label'), backLabel: mk('text', 'route-label route-label-back'),
};
R.inPath.setAttribute('marker-end', 'url(#arrowhead)'); R.outPath.setAttribute('marker-end', 'url(#arrowhead)'); R.backPath.setAttribute('marker-end', 'url(#arrowhead-back)');
[R.inDot, R.outDot, R.backDot].forEach((d) => d.setAttribute('r', '4'));

function portY(side, box) {
  const f = flaps[side]; const r = f.el.getBoundingClientRect();
  if (!f.open) return r.top - box.top + Math.min(r.height * 0.4, 150);
  const body = $(`#${side}-body`); const b = body.getBoundingClientRect();
  const hl = body.querySelector('.hl'); const top = b.top + 14; const bottom = b.bottom - 14;
  const y = hl ? hl.getBoundingClientRect().top + Math.min(hl.getBoundingClientRect().height / 2, 14) : top;
  return Math.max(top, Math.min(bottom, y)) - box.top;
}
// A route stays in the gutter beside the flap, turns, and runs level into the actor: it never crosses text.
function routeD(x1, y1, gx, y2, x2) {
  const r = Math.min(10, Math.abs(y2 - y1) / 2); const dir = y2 > y1 ? 1 : -1; const sx = Math.sign(gx - x1) || 1; const ex = Math.sign(x2 - gx) || 1;
  if (Math.abs(y2 - y1) < 2) return `M${x1},${y1} H${x2}`;
  return `M${x1},${y1} H${gx - sx * r} Q${gx},${y1} ${gx},${y1 + dir * r} V${y2 - dir * r} Q${gx},${y2} ${gx + ex * r},${y2} H${x2}`;
}
function drawRoutes(op, f, t) {
  if (narrow()) { svg.style.display = 'none'; return; }
  svg.style.display = '';
  const box = $('#inspect').getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const stage = $('#actors').getBoundingClientRect(); const ox = stage.left - box.left; const oy = stage.top - box.top;
  const an = actors ? actors.anchors(op.actor) : fallbackAnchors(op.actor);
  const inR = flaps.in.el.getBoundingClientRect(); const outR = flaps.out.el.getBoundingClientRect();
  const x1 = inR.right - box.left; const x4 = outR.left - box.left;
  const gIn = x1 + 14; const gOut = x4 - 14;
  const ay = oy + an.in.y; const axIn = Math.max(gIn + 24, ox + an.in.x); const axOut = Math.min(gOut - 24, ox + an.out.x);
  const yIn = portY('in', box); const yOut = portY('out', box);
  R.inPath.setAttribute('d', routeD(x1, yIn, gIn, ay, axIn));
  R.outPath.setAttribute('d', routeD(axOut, oy + an.out.y, gOut, yOut, x4 - 3));
  const s = STEPS[op.id];
  R.inLabel.textContent = s.read; R.inLabel.setAttribute('x', (gIn + axIn) / 2); R.inLabel.setAttribute('y', ay - 9);
  R.outLabel.textContent = s.write; R.outLabel.setAttribute('x', (axOut + gOut) / 2); R.outLabel.setAttribute('y', oy + an.out.y - 9);
  // While following, information travels in, then out. While reading, a slow pulse repeats on both.
  const loop = reading != null || reduced;
  // A dot crosses its arrow in about 1.3 s and repeats every 2 s while the arrow is live (the user found the old one-crossing-per-step dots too slow).
  const D = DUR[Math.max(0, OPS.indexOf(op))] || 18, sec = f * D, CROSS = 1.3, EVERY = 2.0;
  const pulse = (from, to) => (sec < from * D || sec > to * D ? -1 : ((sec - from * D) % EVERY) / CROSS);
  const pin1 = loop ? (t * 0.6) % 1 : pulse(0.1, 0.5); const pout = loop ? ((t * 0.6) + 0.5) % 1 : pulse(0.64, 1);
  place(R.inDot, R.inPath, pin1); place(R.outDot, R.outPath, pout);
  R.inPath.classList.toggle('is-live', loop || (f > 0.08 && f < 0.5));
  R.outPath.classList.toggle('is-live', loop || f > 0.62);
  R.outPath.classList.toggle('is-waiting', !loop && f < 0.6);
  // A returned statement goes back to Followthrough: a separate branch from the reviewer to the worker's home.
  const back = op.returnsTo && (loop || f > 0.7);
  if (back) {
    const w = (actors ? actors.anchors('worker') : fallbackAnchors('worker')).top; const me = an.top;
    // It leaves from the reviewer's left side (toward Followthrough's home), above where its input arrives.
    const bx1 = ox + an.in.x + 18; const by1 = oy + an.in.y - 28; const bx2 = ox + w.x; const by2 = oy + w.y;
    const peak = Math.max(18, Math.min(by1, by2) - 34); // stays inside the stage, below the job map
    R.backPath.setAttribute('d', `M${bx1},${by1} C${bx1},${peak} ${bx2},${peak} ${bx2},${by2 - 6}`);
    R.backLabel.textContent = 'sent back to Followthrough'; R.backLabel.setAttribute('x', Math.max(bx2, ox + 80)); R.backLabel.setAttribute('y', Math.max(12, Math.min(peak, by2) - 10)); // beside the end it reaches, clear of the reviewer
    place(R.backDot, R.backPath, loop ? (t * 0.55) % 1 : pulse(0.7, 1));
  }
  R.backPath.style.display = back ? '' : 'none'; R.backLabel.style.display = back ? '' : 'none'; if (!back) R.backDot.style.opacity = 0;
}
function place(dot, path, u) {
  if (u < 0 || u > 1 || reduced) { dot.style.opacity = 0; return; }
  const len = path.getTotalLength(); const p = path.getPointAtLength(len * u);
  dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.style.opacity = Math.min(1, Math.sin(u * Math.PI) * 2);
}

/* ---------------- the actors (Three.js), with a drawn fallback ---------------- */
let actors = null;
try {
  if (params.get('gl') !== '0') { const m = await import('./actors.js'); actors = m.createActors($('#actors')); }
} catch (e) { console.warn('3D actors unavailable, using drawings', e); actors = null; }
function fallbackAnchors(id) {
  const r = $('#actors').getBoundingClientRect(); const cx = r.width / 2; const cy = r.height * 0.58;
  return { in: { x: cx - 60, y: cy }, out: { x: cx + 60, y: cy }, top: { x: cx + (id === 'worker' ? -r.width * 0.32 : 0), y: r.height * 0.2 } };
}
if (!actors) {
  $('#actors').classList.add('is-drawn');
  $('#actors').innerHTML = `<svg viewBox="0 0 200 120" aria-hidden="true">
    <g class="fb fb-worker"><rect x="78" y="44" width="44" height="40" rx="10"/><rect x="84" y="20" width="32" height="22" rx="8"/><rect x="88" y="27" width="24" height="8" rx="3" class="visor"/><rect x="72" y="80" width="56" height="5" rx="2" class="tray"/></g>
    <g class="fb fb-reviewer"><path d="M86 90 L90 50 Q100 40 110 50 L114 90 Z"/><circle cx="100" cy="30" r="14" class="lens"/></g>
    <g class="fb fb-code"><rect x="64" y="70" width="72" height="18" rx="5"/><rect x="70" y="64" width="26" height="6" class="sheet"/><rect x="104" y="64" width="26" height="6" class="sheet"/></g>
  </svg>`;
}

/* ---------------- the room: blurred papers from every step drift on one shallow curve ---------------- */
const conveyor = $('#conveyor');
// Each blurred card is drawn and blurred once into an image, so moving it costs nothing per frame.
function blurredCard(tint) {
  const pad = 16; const w = 230; const h = 144; const c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2;
  const g = c.getContext('2d'); g.filter = 'blur(5px)';
  g.fillStyle = '#f3eddf'; g.beginPath(); g.roundRect(pad, pad, w, h, 10); g.fill();
  const bar = (x, y, bw, bh, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(pad + x, pad + y, bw, bh, 3); g.fill(); };
  bar(16, 16, w * 0.42, 7, tint); bar(16, 34, w * 0.8, 10, 'rgba(37,53,56,0.5)');
  bar(16, 56, w * 0.86, 6, 'rgba(37,53,56,0.28)'); bar(16, 70, w * 0.8, 6, 'rgba(37,53,56,0.28)'); bar(16, 84, w * 0.62, 6, 'rgba(37,53,56,0.28)');
  bar(16, 112, w * 0.82, 4, 'rgba(201,162,69,0.55)');
  return c.toDataURL();
}
const CARD_IMG = { documents: blurredCard('rgba(75,95,97,0.5)'), review: blurredCard('rgba(143,74,44,0.5)'), later: blurredCard('rgba(45,107,76,0.5)') };
conveyor.innerHTML = OPS.map((o, i) => `<i class="ghost" data-i="${i}" style="background-image:url(${CARD_IMG[o.area]})"></i>`).join('');
const ghosts = $$('.ghost', conveyor);
const GHOST = { w: 230, cy: 72 }; // a blurred card's width and the height of its centre on the curve
const conveyorGap = () => (narrow() ? 120 : Math.max(200, conveyor.clientWidth / 5.2));
let rail = null; // smoothed position of the step on stage along the curve
function drawRoom(t, f, dt) {
  const { i } = opAt(clock); const target = shown;
  rail = reduced || rail == null ? target : rail + (((target - rail + N / 2) % N + N) % N - N / 2) * Math.min(1, dt * 1.5);
  const w = conveyor.clientWidth; const gap = conveyorGap();
  ghosts.forEach((g, k) => {
    let d = k - rail; d = ((d + N / 2) % N + N) % N - N / 2; // nearest way round the loop
    const x = w / 2 + d * gap + (reduced ? 0 : Math.sin(t / 5.4 + k) * 10);
    const y = 30 * (d / 3) ** 2 + (reduced ? 0 : Math.cos(t / 6.1 + k * 1.7) * 6);
    const near = Math.max(0, 1 - Math.abs(d) / 4.5);
    g.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(d * 2.2).toFixed(2)}deg) scale(${(0.75 + 0.25 * near).toFixed(3)})`;
    // The card on stage is the sharp centre card; its blurred copy is not drawn twice.
    g.style.opacity = (k === shown || backing.has(k) ? 0 : 0.14 + 0.36 * near).toFixed(3);
  });
  // The room shifts a little toward the part of the job on stage, and the warm light follows the actor.
  const area = OPS[shown].area; const shift = { documents: 26, review: 0, later: -26 }[area];
  $('#ft').style.setProperty('--room-shift', `${reduced ? 0 : shift + Math.sin(t / 8) * 6}px`);
  const replayBtn = $(`.step[data-op="${i}"]`); const mk2 = $('#replay-marker');
  if (replayBtn) { const m = $('#jobmap').getBoundingClientRect(); const b = replayBtn.getBoundingClientRect(); mk2.style.transform = `translate(${(b.left - m.left + b.width / 2).toFixed(1)}px, ${(b.bottom - m.top + 2).toFixed(1)}px)`; }
}

// Unowned flaps drift a little sideways; while someone reads, they hold still.
function driftFlaps(t) {
  for (const [side, f] of Object.entries(flaps)) {
    const still = reading != null || reduced || narrow();
    const x = still ? 0 : Math.sin((t / 17) * Math.PI + (side === 'in' ? 0 : 1.1)) * 10;
    const y = still ? 0 : -4 * Math.sin((t / 17) * Math.PI * 2 + (side === 'in' ? 0.6 : 0)) ** 2;
    f.el.style.setProperty('--dx', `${x.toFixed(2)}px`); f.el.style.setProperty('--dy', `${y.toFixed(2)}px`);
  }
}

/* ---------------- the loop ---------------- */
let last = performance.now(); let lastOwn = ''; let lastPhase = -1; let lastPhaseOp = -1;
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!paused && visible) clock += dt * speed;
  const t = now / 1000;
  const { i, f } = opAt(clock);
  if (reading == null && i !== shown) show(i);
  const op = OPS[shown];
  const ff = reading != null ? 1 : f;
  $('#ft').classList.toggle('is-writing', reading == null && f < 0.62);
  if (actors) actors.frame({ active: op.actor, f: reading != null ? 0.86 : f, decision: op.output.type === 'ruling' ? (op.output.ruling === 'accepted' ? 'accept' : 'return') : null, time: paused ? 0 : t, still: reduced });
  drawRoutes(op, ff, t);
  const phase = ff < 0.45 ? 0 : ff < 0.66 ? 1 : 2;
  if (phase !== lastPhase || shown !== lastPhaseOp) { $$('#phases li').forEach((li, k) => { li.classList.toggle('is-done', k < phase || ff >= 0.95); li.classList.toggle('is-now', k === phase && ff < 0.95); }); lastPhase = phase; lastPhaseOp = shown; }
  drawRoom(t, f, dt);
  driftFlaps(paused ? 0 : t);
  $('#progress').style.transform = `scaleX(${((START[i] + f * DUR[i]) / CYCLE).toFixed(4)})`;
  const own = reading != null ? PLAY.reading(STEPS[OPS[reading].id].title) : paused ? PLAY.paused(i + 1, N) : PLAY.following(i + 1, N);
  if (own !== lastOwn) { $('#own-line').textContent = own; lastOwn = own; }
  $('#replay-at').textContent = reading != null && i !== reading ? PLAY.movedOn(STEPS[OPS[i].id].title) : '';
  requestAnimationFrame(tick);
}

/* ---------------- interaction ---------------- */
// Any reading gesture in the step pins it: pointer, keyboard focus, wheel, a scroll the visitor made, a selection.
const inspect = $('#inspect');
inspect.addEventListener('pointerdown', () => pin(shown, 'pointer'));
inspect.addEventListener('focusin', (e) => pin(shown, `focus:${e.target.className}`));
inspect.addEventListener('wheel', () => pin(shown, 'wheel'), { passive: true });
// No pin on 'scroll' itself: the browser also scrolls a flap when its content changes. Wheel, pointer,
// keyboard focus and selection are the visitor's own reading gestures.
inspect.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) pin(shown, 'keys'); });
document.addEventListener('selectionchange', () => { const s = getSelection(); if (s && !s.isCollapsed && inspect.contains(s.anchorNode)) pin(shown, 'selection'); });

// A plain click anywhere on a flap opens or folds it. Links, tabs, buttons, scrolling and selecting text don't.
let down = null;
for (const side of ['in', 'out']) {
  const el = flaps[side].el;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, scroll: $(`#${side}-body`)?.scrollTop }; });
  el.addEventListener('click', (e) => {
    const f = flaps[side];
    if (e.target.closest('.hinge')) { setFlap(side, !f.open); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { f.tab = Number(tab.dataset.tab); renderFlap(side); return; }
    if (e.target.closest('[data-try]')) { exercise.open = true; renderFlap('out'); return; }
    if (e.target.closest('[data-back]')) { exercise.open = false; renderFlap('out'); return; }
    const ex = e.target.closest('[data-ex]');
    if (ex) { if (ex.dataset.ex === 'reset') { exercise.time = false; exercise.heading = false; } else exercise[ex.dataset.ex] = !exercise[ex.dataset.ex]; renderFlap('out', { keepScroll: true }); return; }
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    const sel = getSelection(); if (sel && !sel.isCollapsed && el.contains(sel.anchorNode)) return;
    if (down && (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || ($(`#${side}-body`)?.scrollTop ?? 0) !== down.scroll)) return;
    setFlap(side, !f.open);
  });
}
$('#jobmap').addEventListener('click', (e) => { const b = e.target.closest('[data-op]'); if (b) pin(Number(b.dataset.op)); });
$('#follow').addEventListener('click', follow);
$('#try-shortcut').addEventListener('click', () => {
  const i = OPS.findIndex((o) => o.id === 'brief-check'); pin(i); exercise.open = true; setFlap('out', true); renderFlap('out');
  $('#out-body').focus({ preventScroll: true });
});
function setPaused(p) { paused = p; $('#pause').setAttribute('aria-pressed', String(p)); $('#pause .pause-label').textContent = p ? PLAY.resume : PLAY.pause; }
$('#pause').addEventListener('click', () => setPaused(!paused));
setPaused(false);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.15 }).observe($('#ft'));

/* ---------------- freezing a moment for checkpoint screenshots ---------------- */
// ?op=<id>&f=<0..1> or ?t=<s> pauses there; &read=<id> pins a step; &closed=in|out; &tab=<side>:<n>; &try=1; &ex=time,heading
const opIndex = (id) => Math.max(0, OPS.findIndex((o) => o.id === id));
if (params.has('op')) { const k = opIndex(params.get('op')); clock = START[k] + Number(params.get('f') ?? 0.5) * DUR[k]; setPaused(true); }
if (params.has('t')) { clock = Number(params.get('t')); setPaused(true); }
show(opAt(clock).i, { animate: false });
if (params.has('read')) pin(opIndex(params.get('read')));
for (const k of (params.get('ex') || '').split(',').filter(Boolean)) exercise[k] = true;
if (params.get('try') === '1') { exercise.open = true; renderFlap('out'); }
for (const s of (params.get('closed') || '').split(',').filter(Boolean)) setFlap(s, false);
if (params.has('tab')) { const [s, n] = params.get('tab').split(':'); flaps[s].tab = Number(n); renderFlap(s); }
if (params.get('run') === '1') setPaused(false);
requestAnimationFrame(tick);

// Read-only hooks for the runtime checks.
window.__ft = {
  get clock() { return clock; }, CYCLE, N, DUR, get shown() { return OPS[shown].id; }, get reading() { return reading == null ? null : OPS[reading].id; },
  get replay() { return OPS[opAt(clock).i].id; }, get pinReason() { return pinReason; }, exercise, flaps, gl: Boolean(actors),
  facts: () => [$('.status-open').textContent, $('.status-draft').textContent, JSON.stringify(run.task_a.edits.map((e) => e.recorded)), run.task_b.drafts.at(-1).body],
};
