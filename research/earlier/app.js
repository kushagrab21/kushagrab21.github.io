import { pieces, finding, closing, pieceIds, extraViews } from './data.js';
import { createController, cycleDuration, sceneAt, pacing } from './sequence.js';
import { sketch, updateSketch, sketchState } from './sketches.js';
import { separator, htmlText as text, renderSeparators, setSeparatedText } from './typography.js';

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const staticMode = params.has('still') || motion.matches;
document.body.classList.toggle('still', staticMode);
const controller = createController({ still: params.has('still'), reducedMotion: motion.matches });
const external = link => `<a href="${link.href}" target="_blank" rel="noopener noreferrer"${link.name ? ` aria-label="${text(link.name)} (${link.label})"` : ''}>${text(link.label)} <span aria-hidden="true">↗</span></a>`;
const paperLinks = piece => `<div class="paper-links ${piece.links.some(link => link.name) ? 'named-links' : ''}">${piece.links.map(link => `<div class="paper-link">${link.name ? `<span>${text(link.name)}</span>` : ''}${external(link)}</div>`).join('')}</div>`;

$('#credentials').innerHTML = pieces.map(piece => `<button type="button" data-go="${piece.id}" class="credential" aria-label="${text(`${piece.year}, ${piece.field}, ${piece.badge}`)}"><span class="credential-date">${piece.year}<span>${separator}${text(piece.field)}</span></span><strong>${text(piece.badge)}</strong><span class="credential-note">${text(piece.badgeNote)}</span></button>`).join('');
$('#credentials').insertAdjacentHTML('beforeend', `<p class="mobile-credit">Trade chapter${separator}${text(pieces.find(piece => piece.id === 'trade').credit)}</p>`);
$('#parked').innerHTML = [...pieces.slice(0,4), { ...finding, short: 'The finding' }, pieces[4]].map((piece, i) => `<div class="parked-card ${piece.id === 'finding' ? 'parked-finding' : ''}" style="--slot:${i}"><div class="parked-surface"></div><span>${piece.year}<br>${piece.short}</span></div>`).join('');
$('#cards').innerHTML = pieces.map(piece => `<article id="card-${piece.id}" class="work-card" data-id="${piece.id}" hidden>
  <div class="card-surface" aria-hidden="true"></div>
  <div class="exhibit"><div class="exhibit-meta"><span>${piece.sketch ? 'Sketch' : 'Replay mechanism'}${piece.id === 'spar' ? '<span class="side-study">side study</span>' : ''}</span><span>${text(piece.short)}</span></div>${sketch(piece.id)}<p class="figure-note">${text(piece.note)}</p></div>
  <div class="card-copy"><p class="date">${text(piece.dateLabel ?? (piece.id === 'spar' ? piece.badgeNote : piece.year + separator + piece.field))}</p><h2>${text(piece.question).replaceAll('COVID-19','<span class="nowrap">COVID-19</span>')}</h2><p class="body-copy">${text(piece.body)}</p>${piece.credit ? `<p class="credit">${text(piece.credit)}</p>` : ''}<div class="source-actions">${paperLinks(piece)}<button type="button" class="details-button" data-details="${piece.id}">Publication details</button></div></div>
</article>`).join('') + `<article id="card-finding" class="work-card finding-card" data-id="finding" hidden><div class="card-surface" aria-hidden="true"></div><div class="finding-mark" aria-hidden="true"><span>“done”</span><span class="finding-question">?</span></div><div class="card-copy"><p class="date">${finding.year}${separator}papers on checking AI work</p><h2>${finding.question}</h2><a href="${finding.href}" class="finding-link">${finding.label} <span aria-hidden="true">→</span></a><p class="credit">The next study was made alongside these papers.</p></div></article>`;
$('#closing').textContent = closing;
$('#overview-pieces').innerHTML = pieces.map(piece => `<div class="overview-piece"><button type="button" data-go="${piece.id}" aria-label="Play ${text(piece.field)}"><span>${piece.year}</span><strong>${text(piece.short)}</strong></button>${piece.links.some(link=>link.name) ? `<button type="button" class="overview-details" data-details="${piece.id}">View ${piece.id === 'replay' ? 'whitepapers' : 'study'} <span aria-hidden="true">→</span></button>` : `<div>${piece.links.map(link => external(link)).join('')}</div>`}</div>`).join('');
$('#dots').innerHTML = pieces.map(piece => `<button type="button" data-go="${piece.id}" aria-label="${text(piece.field)}" title="${text(piece.field)}"></button>`).join('');
$('#extra-views').innerHTML = extraViews.map(view => `<button type="button" data-go="${view.id}">${view.label}</button>`).join('');
renderSeparators($('.station'));

let activeId, frameId, last = performance.now(), overrides = {}, detailsId = null, statusText, directSelection = false;
function render() {
  const s = controller.state;
  if (activeId !== s.id) {
    document.querySelectorAll('.work-card').forEach(card => { card.hidden = card.dataset.id !== s.id; });
    activeId = s.id; overrides = {};
  }
  // These are alternate views in one grid cell, never adjacent flex items.
  $('#cards').hidden = s.id === 'overview' || !!detailsId;
  $('#overview').hidden = s.id !== 'overview' || !!detailsId;
  $('#publication').hidden = !detailsId;
  $('#parked').hidden = s.id === 'overview' || !!detailsId;
  document.body.dataset.step = s.id;
  document.body.dataset.phase = s.phase;
  document.body.classList.toggle('paused', !s.playing);
  document.querySelectorAll('[data-go]').forEach(button => {
    button.setAttribute('aria-current', button.dataset.go === s.id ? 'step' : 'false');
  });
  if (pieces.some(p => p.id === s.id)) updateSketch($(`#card-${s.id}`), s.id, s.still ? 1 : s.progress, overrides, s.still || directSelection);
  const visual = sceneAt(s, s.still || directSelection || !!detailsId);
  for (const key of ['room','figures','card','caption','flight']) $('.station').style.setProperty(`--scene-${key}`, visual[key]);
  $('.light').style.setProperty('--light-x', `${visual.light}%`);
  $('#chapter').textContent = detailsId ? 'Open the original work.' : s.id === 'overview' ? 'Choose a piece to look again.' : s.step < 3 ? 'Questions about the world' : 'Then, questions about the machine';
  $('#play').textContent = s.still ? 'Settled view' : s.playing ? 'Pause' : 'Keep playing';
  $('#play').disabled = s.still;
  $('#play').setAttribute('aria-label', s.playing ? 'Pause the sequence' : 'Keep playing the sequence');
  const nextStatus = s.still ? 'Choose any piece' : s.playing ? 'Touch anywhere to pause' : `Paused${separator}choose any piece`;
  if (nextStatus !== statusText) { setSeparatedText($('#status'), nextStatus); statusText = nextStatus; }
  $('.station').style.setProperty('--progress', `${Math.max(0, s.elapsed - pacing.fadeUp - pacing.openingHold) / (cycleDuration - pacing.fadeUp - pacing.openingHold) * 100}%`);
}
function schedule() {
  cancelAnimationFrame(frameId);
  if (controller.state.playing && !document.hidden) { last = performance.now(); frameId = requestAnimationFrame(tick); }
}
function tick(now) {
  const before = controller.state.id;
  controller.tick(Math.min(100, now - last)); last = now;
  if (controller.state.id !== before) directSelection = false;
  render();
  if (controller.state.playing) frameId = requestAnimationFrame(tick);
}
function pause() { controller.pause(); cancelAnimationFrame(frameId); render(); }
function play() { detailsId = null; overrides = {}; controller.play(); render(); schedule(); }
function go(step) { directSelection = true; detailsId = null; overrides = {}; controller.go(step); cancelAnimationFrame(frameId); render(); }
function seek(time) { directSelection = false; detailsId = null; overrides = {}; controller.seek(time); cancelAnimationFrame(frameId); render(); }
function showDetails(id) {
  pause(); const piece = pieces.find(piece => piece.id === id); detailsId = id;
  $('#publication').innerHTML = `<p class="date">${text(piece.dateLabel ?? (piece.id === 'spar' ? piece.badgeNote : piece.year + separator + piece.field))}</p><h2>${text(piece.detailTitle ?? piece.title)}</h2>${piece.credit ? `<p class="credit">${text(piece.credit)}</p>` : ''}${paperLinks(piece)}<button type="button" id="close-details">Back to ${controller.state.id === 'overview' ? 'all work' : 'sketch'}</button>`;
  renderSeparators($('#publication'));
  render(); $('#close-details').focus({ preventScroll: true });
}
function adjacentPiece(direction) {
  const current = controller.state.id;
  const index = pieceIds.indexOf(current);
  if (index !== -1) return pieceIds[(index + direction + pieceIds.length) % pieceIds.length];
  return current === 'finding' ? (direction > 0 ? 'spar' : 'replay') : (direction > 0 ? pieceIds[0] : pieceIds.at(-1));
}

// A native link/button still receives its click after the pause. Nothing is swallowed.
let playWasRunning = false;
function onTouch(event) {
  if (event.type === 'keydown' && ['Shift','Control','Meta','Alt'].includes(event.key)) return;
  if (event.target.closest?.('#play')) playWasRunning = controller.state.playing;
  pause();
}
document.addEventListener('pointerdown', onTouch, { capture:true, passive:true });
document.addEventListener('keydown', onTouch, { capture:true });
document.addEventListener('wheel', onTouch, { capture:true, passive:true });
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.go) go(target.dataset.go);
  if (target.id === 'play') { if (playWasRunning) pause(); else play(); playWasRunning = false; }
  if (target.id === 'previous') go(adjacentPiece(-1));
  if (target.id === 'next') go(adjacentPiece(1));
  if (target.dataset.details) showDetails(target.dataset.details);
  if (target.id === 'close-details') {
    const id = detailsId; detailsId = null; render();
    document.querySelector(`#${controller.state.id === 'overview' ? 'overview' : 'cards'} [data-details="${id}"]`)?.focus({ preventScroll: true });
  }
  if (target.dataset.country) {
    const current = overrides.scenario ?? sketchState('trade', controller.state.still ? .999 : controller.state.progress).scenario;
    overrides.scenario = current ^ (target.dataset.country === 'india' ? 1 : 2); render();
  }
  if (target.dataset.bet) { overrides.bet = target.dataset.bet; render(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(frameId); else schedule(); });
motion.addEventListener('change', () => {
  controller.reduce(motion.matches);
  if (motion.matches) detailsId = null;
  document.body.classList.toggle('still', params.has('still') || motion.matches);
  cancelAnimationFrame(frameId); render();
});
window.__station = { get state() { return { ...controller.state, overrides: { ...overrides }, detailsId }; }, play, pause, go, seek };
render(); schedule();
