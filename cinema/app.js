// The cinema hall: one film sharp at a time, the house down while it plays and up when it ends.
// Phases: arrive (lights going down, first frame held) → playing ⇄ paused → ended (lights up, the next film comes forward).
import { createRoom } from './room.js';
import { STOPS } from './stops.js?v=20261006-cleanup';

const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches;
const STOP = STOPS[q.get('stop')] ? q.get('stop') : 'w-articles';

// The site's shared pacing: the first step arrives slowly (a 2 s fade), then holds 3 s before anything moves.
const FADE = 2000, HOLD = 3000, FULL_NOTE = 8000, NEXT_IN = 15, LIGHTS = 1400;

const hall = $('#hall'), video = $('#film');
const el = {
  where: $('#where'), count: $('#count'), runs: $('#runs'), claim: $('#claim'), title: $('#title'),
  sign: $('#sign'), screen: $('#screen'), disclose: $('#disclose'), under: $('#under'), sound: $('#sound'), soundLabel: $('#soundLabel'),
  soundAction: $('#soundAction'), hint: $('#hint'), cPlay: $('#cPlay'), cAgain: $('#cAgain'), cTime: $('#cTime'), cBar: $('#cBar'), cBarFill: $('#cBarFill'),
  end: $('#end'), nextKicker: $('#nextKicker'), nextClaim: $('#nextClaim'), nextMeta: $('#nextMeta'), nextGo: $('#nextGo'), read: $('#read'), countdown: $('#countdown'),
};

const room = createRoom($('#room'));
const stop = STOPS[STOP];
const films = await Promise.all(stop.films.map((id) => fetch(`films/${id}/film.json`, { cache: 'no-store' }).then((r) => r.json()).then((f) => ({ ...f, dir: `films/${id}/` }))));
const durations = films.map((f) => f.seconds || 0);   // known from the film's record, so the length shows from the first second

const state = { i: 0, phase: 'arrive', watched: new Set(), frozen: false, active: !q.has('shell') };
let timers = [], tweenRaf = 0, reachTimer = 0, countdown = 0;
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearInterval(countdown); countdown = 0; };
const later = (ms, fn) => timers.push(setTimeout(fn, STILL ? Math.min(ms, 400) : ms));

const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const assetOf = (f, name) => `${f.dir}${name}${f.revision ? `?v=${encodeURIComponent(f.revision)}` : ''}`;
const srcOf = (f) => assetOf(f, video.canPlayType('video/mp4; codecs="avc1.42E01E"') ? 'film.mp4' : 'film.webm');

// A browser jumps to a point in a film with byte-range requests. A server without them (like the local preview server) makes every
// seek fall back to the start and can stall the first load. So: ask once; if ranges work, stream; if not, load each film whole
// into memory first, where every point is reachable at once.
// Ask for the first film's first two bytes: a server with ranges sends just those (stream from then on); one without sends the whole
// film, which is kept, so nothing is cancelled or fetched twice.
const whole = new Map();
const ranges = fetch(srcOf(films[0]), { headers: { Range: 'bytes=0-1' } }).then(async (r) => {
  if (r.status === 206) { await r.arrayBuffer(); return true; }
  whole.set(films[0].id, r.blob().then((b) => URL.createObjectURL(b)));
  return false;
}).catch(() => true);
function playable(f) {
  return ranges.then((ok) => {
    if (ok) return srcOf(f);
    if (!whole.has(f.id)) whole.set(f.id, fetch(srcOf(f)).then((r) => r.blob()).then((b) => URL.createObjectURL(b)));
    return whole.get(f.id);
  });
}

// ---------- light ----------
function tween(key, to, ms) {
  const from = room.state[key], t0 = performance.now();
  const step = (now) => {
    const k = STILL ? 1 : Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    room.set({ [key]: from + (to - from) * e });
    if (key === 'house') hall.style.setProperty('--house', room.state.house.toFixed(3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setPhase(p) { state.phase = p; hall.dataset.phase = p; renderText(); }

// ---------- a film arrives ----------
function enter(i) {
  clearTimers();
  state.enteredAt = performance.now(); state.heldFor = null;
  state.i = (i + films.length) % films.length;
  const f = films[state.i], other = films.length > 1 ? films[(state.i + 1) % films.length] : null;
  el.end.hidden = true; el.countdown.textContent = '';
  video.pause(); video.muted = !soundOn || !state.active;
  const mine = state.i;
  if (state.srcFor === f.id) { video.currentTime = 0; room.refresh(); }   // already loaded (the shell restarts the station on arrival): rewind, don't reload
  else {
    state.srcFor = null;
    playable(f).then((url) => {
      if (state.i !== mine) return;
      if (video.src !== url) { video.src = url; video.load(); } else video.currentTime = 0;   // a restart mid-load: same film, so don't abort its load
      state.srcFor = f.id; room.refresh();
    });
  }
  if (other) playable(other);                                   // fetch the next film while this one plays
  room.setFilm(video, assetOf(f, 'poster.jpg'));
  room.setWaiting(other ? assetOf(other, 'poster.jpg') : null);
  room.set({ endDim: 0, waitForward: 0 });
  // the lights go down over the first frame, then a held beat, then it plays
  room.set({ house: 1 }); hall.style.setProperty('--house', '1');
  tween('house', 0, FADE);
  el.disclose.className = 'disclose'; el.disclose.textContent = f.disclosure?.line || '';
  setPhase('arrive');
  if (state.active) later(FADE + HOLD, () => { if (state.phase === 'arrive') start(); });
}

// analytics: the site shell (the parent page) passes these to its report; on its own the hall sends nothing
const report = (name, extra = {}) => { try { parent.__track?.(name, { film: films[state.i].id, ...extra }); } catch { /* not inside the site */ } };

function start() {
  if (!state.counted?.has(state.i)) { (state.counted ||= new Set()).add(state.i); report('film_start'); }
  if (!state.active) return;
  leaveEnd();
  if (state.heldFor == null) state.heldFor = Math.round(performance.now() - state.enteredAt);   // how long the arrival held, by the page's own clock
  setPhase('playing');
  // if the film isn't ready yet, hold on its first frame and start the moment it can play, so it never jumps into motion
  // A film set to start with sound (startWithSound) is refused by browsers until the visitor has clicked. Rather than sit paused,
  // it then starts muted, with Sound off shown, so one click brings the narration in.
  const go = () => {
    if (!state.active || state.phase !== 'playing') return;
    video.play().catch(() => {
      if (!state.active || state.phase !== 'playing') return;
      if (video.muted) { setPhase('paused'); return; }
      video.muted = true; soundOn = false; renderText();
      video.play().catch(() => { if (state.active && state.phase === 'playing') setPhase('paused'); });
    });
  };
  if (video.readyState >= 3) go(); else video.addEventListener('canplay', go, { once: true });
  later(FULL_NOTE, () => { const f = films[state.i]; if (f.disclosure?.sign) { el.disclose.className = 'disclose small'; el.disclose.textContent = f.disclosure.sign; } });
}

function pause() { if (state.phase === 'playing') { video.pause(); setPhase('paused'); } else if (state.phase === 'arrive') { clearTimers(); setPhase('paused'); } }
function setActive(active) {
  if (state.active === active) return;
  state.active = active;
  if (active) enter(0);
  else { clearTimers(); video.pause(); video.muted = true; setPhase('paused'); }
}
function resume() {
  if (state.phase === 'ended') { video.currentTime = 0; start(); return; }   // Play on the end screen: this film again, from the start
  if (state.phase === 'paused') { if (video.ended) video.currentTime = 0; start(); }
}

// Leaving the end screen by any way back into the film (Play, Start again, the time bar): the card goes, the countdown stops,
// the lights go down and the picture comes back to full brightness.
function leaveEnd() {
  if (el.end.hidden) return;
  el.end.hidden = true; clearInterval(countdown); countdown = 0; el.countdown.textContent = '';
  tween('house', 0, LIGHTS); tween('endDim', 0, LIGHTS * 0.6); tween('waitForward', 0, LIGHTS);
  placeEnd();
}

// ---------- the end: a hard stop, the lights come up, the next film comes forward ----------
function ended() {
  report('film_complete');
  clearTimers();
  state.watched.add(state.i);
  setPhase('ended');
  tween('house', 1, LIGHTS); tween('endDim', 1, LIGHTS);
  if (films.length > 1) tween('waitForward', 1, LIGHTS);
  const f = films[state.i], n = (state.i + 1) % films.length, nf = films.length > 1 ? films[n] : null;
  const seen = nf && state.watched.has(n);
  el.next.hidden = !nf;
  if (nf) {
    el.nextKicker.textContent = seen ? 'The other film' : 'Next film';
    el.nextClaim.textContent = nf.claim || nf.title;
    el.nextMeta.textContent = '';
    if (nf.claim) { el.nextMeta.append(nf.title); const dot = document.createElement('span'); dot.className = 'sep'; el.nextMeta.append(dot); }
    el.nextMeta.append(mmss(durations[n] || 0));
    el.nextGo.textContent = seen ? 'Watch it again' : 'Watch the next film';
  }
  el.read.hidden = !f.source;
  if (f.source) el.read.href = f.source.href, el.read.textContent = `${f.source.label} ↗`;
  el.read.title = 'Opens on LinkedIn, in a new tab';
  el.end.hidden = false; placeEnd();
  if (nf && !seen) {
    let left = NEXT_IN;
    const say = () => { el.countdown.textContent = `Next film in ${left} s. ${TOUCH ? 'Tap' : 'Click'} anywhere to stay here.`; };
    say();
    countdown = setInterval(() => { left -= 1; if (left <= 0) { clearInterval(countdown); countdown = 0; enter(n); } else say(); }, 1000);
  }
}
el.next = $('#next');
el.readNow = $('#readNow');
// reaching for a choice at the end holds the countdown, so it never carries the visitor off mid-reach
el.end.addEventListener('pointerenter', () => { if (countdown) { clearInterval(countdown); countdown = 0; el.countdown.textContent = ''; } });

// ---------- words ----------
let soundOn = films[0].startWithSound === true;
function renderText() {
  const f = films[state.i], dur = durations[state.i] || video.duration || 0;
  el.where.textContent = `${stop.line}`;
  el.count.textContent = films.length > 1 ? `${stop.name}, film ${state.i + 1} of ${films.length}` : stop.name;
  el.claim.textContent = f.claim || '';
  el.title.innerHTML = '';
  el.readNow.hidden = !f.source;                   // the introduction has no piece of writing behind it
  if (f.source) { el.readNow.href = f.source.href; el.readNow.textContent = `${f.source.label} ↗`; el.readNow.title = 'Opens on LinkedIn, in a new tab'; }
  el.title.append(f.title);
  if (!f.claim) { /* no sentence of yours yet: the title stands in, and the date sits beside it */ }
  const date = document.createElement('span'); date.className = 'date'; date.innerHTML = f.date ? `<span class="sep"></span>${f.date}` : '';
  el.title.append(date);
  const t = video.currentTime || 0;
  if (state.phase === 'arrive') el.runs.textContent = dur ? `Runs ${mmss(dur)}` : '';
  else if (state.phase === 'ended') el.runs.textContent = 'Ended';
  else el.runs.textContent = dur ? `${mmss(dur - t)} left` : '';
  el.cBarFill.style.width = dur ? `${(100 * t) / dur}%` : '0';
  el.cTime.textContent = dur ? `${mmss(t)} / ${mmss(dur)}` : '';
  el.cPlay.textContent = state.phase === 'playing' ? 'Pause' : 'Play';
  const audible = !video.muted;
  el.soundLabel.textContent = audible ? 'Sound on' : 'Sound off';
  el.sound.classList.toggle('on', audible);
  el.sound.setAttribute('aria-pressed', String(audible));
  el.soundAction.textContent = `${TOUCH ? 'Tap' : 'Click'} to turn ${audible ? 'off' : 'on'}`;
  const tap = TOUCH ? 'Tap' : 'Click';
  el.hint.textContent = state.phase === 'paused' ? `Paused. ${tap} anywhere to play.` : state.phase === 'ended' ? '' : `Plays by itself. ${tap} anywhere to pause.`;
}

// ---------- placing the HTML on the room ----------
function place() {
  const w = innerWidth, h = innerHeight, phone = w <= 700;
  // no sign above any more: the screen takes the space, wider and taller, with the row of controls and the seats below it
  room.layout(w, h, phone ? Math.max(16, h * 0.06) : Math.max(14, h * 0.04), h * (phone ? 0.62 : 0.79), w * (phone ? 0.96 : 0.94));   // 0.79: a taller screen, with a band of seats still below   // 0.76: leaves the red rows a real share of the view
  const r = room.screenRect();
  Object.assign(el.screen.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  el.screen.style.setProperty('--inset', `${(room.filmInset * 100).toFixed(2)}%`);   // words on the film sit on the film, not on the extension
  Object.assign(el.under.style, phone ? { left: '16px', width: `${w - 32}px`, top: `${r.top + r.height + 16}px` }
    : { left: `${r.left}px`, width: `${r.width}px`, top: `${r.top + r.height + 14}px` });
  placeEnd();
}
function placeEnd() {
  const r = room.screenRect(), phone = innerWidth <= 700;
  if (phone) Object.assign(el.end.style, { left: '16px', width: `${innerWidth - 32}px`, top: `${r.top + r.height + 16}px`, bottom: 'auto' });
  else Object.assign(el.end.style, { left: `${r.left}px`, width: `${r.width}px`, top: 'auto', bottom: `${innerHeight - r.top - r.height + r.height * 0.1}px` });
  if (phone && !el.end.hidden) el.under.style.visibility = 'hidden'; else el.under.style.visibility = '';
}

// ---------- the visitor's hand ----------
const isControl = (t) => t.closest('button, a, .c-bar');
document.addEventListener('click', (e) => {
  if (state.frozen) return;
  if (isControl(e.target)) return;
  if (state.phase === 'playing' || state.phase === 'arrive') pause();
  else if (state.phase === 'paused') resume();
  else if (state.phase === 'ended' && countdown) { clearInterval(countdown); countdown = 0; el.countdown.textContent = ''; }
});
el.cPlay.addEventListener('click', () => (state.phase === 'playing' ? pause() : resume()));
el.cAgain.addEventListener('click', () => { video.currentTime = 0; if (state.phase !== 'playing') { setPhase('paused'); resume(); } });
el.cBar.addEventListener('click', (e) => { const b = el.cBar.getBoundingClientRect(); if (video.duration) video.currentTime = ((e.clientX - b.left) / b.width) * video.duration; if (state.phase === 'ended') { setPhase('paused'); leaveEnd(); } renderText(); });
el.sound.addEventListener('click', () => {
  if (!state.active) return;
  soundOn = video.muted; video.muted = !soundOn; if (soundOn) report('film_sound_on', { at: Math.round(video.currentTime) });
  if (soundOn && (state.phase === 'paused' || state.phase === 'arrive')) { clearTimers(); start(); }
  renderText();
});
el.nextGo.addEventListener('click', () => enter((state.i + 1) % films.length));
el.read.addEventListener('click', () => { if (countdown) { clearInterval(countdown); countdown = 0; el.countdown.textContent = ''; } });
el.screen.addEventListener('pointermove', () => { hall.classList.add('reach'); clearTimeout(reachTimer); reachTimer = setTimeout(() => hall.classList.remove('reach'), 2500); });
document.addEventListener('keydown', (e) => { if (e.key === ' ' && !isControl(e.target)) { e.preventDefault(); state.phase === 'playing' ? pause() : resume(); } });

video.addEventListener('timeupdate', renderText);
video.addEventListener('volumechange', renderText);
video.addEventListener('seeked', () => room.refresh());
video.addEventListener('loadedmetadata', () => { durations[state.i] = video.duration; renderText(); });
video.addEventListener('ended', () => { if (!state.frozen) ended(); });

// the other films' lengths, for the sign and the next card
// Only for a film whose record has no length. A second request for the same file while the main one loads stalled it for
// about 7 s on a server without byte ranges (the film then jumped into motion late), so films should carry `seconds`.
films.forEach((f, i) => { if (f.seconds) return; const v = document.createElement('video'); v.preload = 'metadata'; v.src = srcOf(f); v.addEventListener('loadedmetadata', () => { durations[i] = v.duration; renderText(); }); });

addEventListener('resize', place);
place();
enter(0);
place();                                   // again, now the sign has its words (its height places the screen on a phone)
document.fonts.ready.then(place);
(function loop(now) { room.render(now); requestAnimationFrame(loop); })(performance.now());

// For the site shell (restart on arrival) and for headless checks.
window.__station = {
  get state() { return { film: films[state.i].id, i: state.i, phase: state.phase, heldFor: state.heldFor, t: video.currentTime, duration: durations[state.i], sound: soundOn, total: durations.reduce((a, b) => a + b, 0) }; },
  go(i = 0) { state.frozen = false; enter(i); },
  play() { if (state.phase === 'paused') resume(); },       // in the arrival the film starts by itself after the held beat
  pause,
  setActive,
  films: films.map((f) => f.id),
  get showing() { return room.showing; },
  // hold a moment for a screenshot: phase is arrive | playing | paused | ended
  async freeze({ i = 0, t = 0, phase = 'playing', house } = {}) {
    state.frozen = true; clearTimers(); enter(i); clearTimers();
    while (state.srcFor !== films[i].id) await new Promise((r) => setTimeout(r, 50));   // this film's source is in place
    // wait until this film (not the one loading before it) can be seeked, then until the seek has really landed
    for (let k = 0; k < 100 && Math.abs(video.currentTime - t) > 0.15; k++) {
      if (video.readyState >= 1 && !video.seeking) video.currentTime = t;
      await new Promise((r) => setTimeout(r, 100));
    }
    // make sure a real frame is decoded at t (a paused seek can stop at metadata): nudge it with a brief play if needed
    for (let k = 0; k < 30 && video.readyState < 2; k++) await new Promise((r) => setTimeout(r, 100));
    if (video.readyState < 2) { await video.play().catch(() => {}); await new Promise((r) => setTimeout(r, 300)); video.pause(); video.currentTime = t; await new Promise((r) => setTimeout(r, 400)); }
    video.pause(); room.refresh();
    if (phase === 'ended') { ended(); clearInterval(countdown); countdown = 0; el.countdown.textContent = films.length > 1 && !state.watched.has((i + 1) % films.length) ? `Next film in ${NEXT_IN - 3} s. Click anywhere to stay here.` : ''; }
    else setPhase(phase);
    if (phase === 'playing') { const f = films[i]; if (t * 1000 > FULL_NOTE && f.disclosure?.sign) { el.disclose.className = 'disclose small'; el.disclose.textContent = f.disclosure.sign; } }
    const hv = house ?? (phase === 'ended' ? 1 : phase === 'arrive' ? 0.8 : 0);
    room.set({ house: hv, endDim: phase === 'ended' ? 1 : 0, waitForward: phase === 'ended' ? 1 : 0 });
    hall.style.setProperty('--house', String(hv));
    renderText();
  },
};
if (q.has('shell')) parent.postMessage({ type: 'cinema-ready' }, location.origin);
