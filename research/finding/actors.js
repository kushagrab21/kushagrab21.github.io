// The two figures of "The finding", in the approved pattern (followthrough/actors.js, tome/actors.js):
//   the AI, ivory with a visor, under the one warm spotlight. Here the spotlight is the AI's sight:
//     what it lights is what the AI can see.
//   My checker, in the fog at the back, holding the pages kept back from the AI. It never enters the
//     warm light; when it scores a DONE it steps forward under a cool light of its own.
// Gestures stand only for what the log records: reading the page, rewriting code, replying DONE,
// scoring the reply.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const C = {
  room: 0x3b2e24, floor: 0x4a3a2d, plinth: 0x1b1511,
  body: 0xe9dfcc, deep: 0x6d5b49, visor: 0x1b1511, lamp: 0xf6c453,
  checker: 0x7d8683, checkerDeep: 0x4f5755, slit: 0xcfd8d4,
  paper: 0xf3ecdd, wrong: 0xd9674e, right: 0x8fc7a0, cool: 0xc9d7de,
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...o });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const band = (f, a, b) => ease((f - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadow(r) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(18,12,8,0.6)', 'rgba(18,12,8,0)'), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m;
}
function sheetTexture(lines = 6) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 120; const g = c.getContext('2d');
  g.fillStyle = '#f3ecdd'; g.fillRect(0, 0, 96, 120);
  g.fillStyle = 'rgba(60,45,35,0.5)'; g.fillRect(8, 10, 46, 5);
  g.fillStyle = 'rgba(60,45,35,0.32)';
  for (let i = 0; i < lines; i++) g.fillRect(8, 26 + i * 13, 78 - (i % 3) * 14, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function doneTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = '#2a211b'; g.font = '700 64px "Source Code Pro", Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('DONE', 128, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function arm(side, m, r = 1) {
  const shoulder = new THREE.Group();
  shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.105 * r, 18, 12), m));
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.068 * r, 0.23, 6, 12), m); upper.position.y = -0.165; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -0.33; shoulder.add(elbow);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * r, 0.2, 6, 12), m); fore.position.y = -0.14; elbow.add(fore);
  const hand = new THREE.Group(); hand.position.y = -0.29; elbow.add(hand);
  hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.072 * r, 14, 10), m));
  return { shoulder, elbow, hand };
}

// The AI: the same family as Followthrough's worker and Tome's reader.
function buildAI() {
  const g = new THREE.Group(); const body = mat(C.body); const deep = mat(C.deep);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.08, 40), mat(C.plinth)); plinth.position.y = 0.04; g.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.42, 24), deep); column.position.y = 0.29; g.add(column);
  const torso = rbox(0.88, 0.76, 0.58, 0.18, body); torso.position.y = 0.86; g.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.12, 16), deep); neck.position.y = 1.3; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
  head.add(rbox(0.68, 0.44, 0.52, 0.17, body));
  const visor = rbox(0.54, 0.18, 0.04, 0.07, mat(C.visor, { roughness: 0.25 })); visor.position.set(0, 0.0, 0.255); head.add(visor);
  const eyeMat = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 1 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.05, 4, 8), eyeMat); e.rotation.z = Math.PI / 2; e.position.set(s * 0.11, 0.0, 0.28); head.add(e); }
  const L = arm(-1, body); const R = arm(1, body);
  L.shoulder.position.set(-0.52, 1.07, 0.04); R.shoulder.position.set(0.52, 1.07, 0.04); g.add(L.shoulder, R.shoulder);
  // The DONE reply: a slip it holds up in its right hand. It is the literal word it typed.
  const done = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: doneTexture(), roughness: 0.85, side: THREE.DoubleSide }));
  done.position.set(0, -0.2, 0.08); done.visible = false; R.hand.add(done);
  g.add(shadow(0.85));
  return { group: g, head, eyeMat, L, R, done };
}

// My checker: a taller, narrower figure in slate, with a slit of light for a face and the kept-back pages
// held against its chest. It has hands but never touches the code: it holds pages back and scores.
function buildChecker() {
  const g = new THREE.Group(); const body = mat(C.checker); const deep = mat(C.checkerDeep);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.08, 40), mat(C.plinth)); plinth.position.y = 0.04; g.add(plinth);
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 1.1, 36), body); robe.position.y = 0.63; g.add(robe);
  const chest = rbox(0.66, 0.42, 0.46, 0.14, body); chest.position.y = 1.28; g.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 14), deep); neck.position.y = 1.55; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.78; g.add(head);
  head.add(rbox(0.46, 0.4, 0.42, 0.15, body));
  const slitMat = new THREE.MeshStandardMaterial({ color: C.slit, emissive: C.slit, emissiveIntensity: 0.5 });
  const slit = rbox(0.34, 0.045, 0.03, 0.015, slitMat); slit.position.set(0, 0.02, 0.215); head.add(slit);
  const L = arm(-1, body, 0.9); const R = arm(1, body, 0.9);
  L.shoulder.position.set(-0.4, 1.4, 0.04); R.shoulder.position.set(0.4, 1.4, 0.04); g.add(L.shoulder, R.shoulder);
  // the stack of kept-back pages, held up in front of its chest
  const stack = new THREE.Group(); stack.position.set(0, 1.12, 0.36); g.add(stack);
  const sheets = [0, 1, 2].map((i) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.56), new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: 0.9, side: THREE.DoubleSide, color: i === 0 ? 0xffffff : 0xe6dccb }));
    s.position.set(0.015 * i, 0.012 * i, -0.012 * i); s.rotation.x = -0.18; stack.add(s); return s;
  });
  g.add(shadow(0.75));
  return { group: g, head, slitMat, L, R, stack, sheets, h: 2.0 };
}

const HOME = { ai: [0, 0.2], checker: [3.6, -1.5] };

export function createActors(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.room, 8.2, 13.2);
  const camera = new THREE.PerspectiveCamera(22, 3, 0.1, 40);
  scene.add(new THREE.HemisphereLight(0xd8c3a8, 0x1b1511, 0.95));
  const rim = new THREE.DirectionalLight(0xc7b49b, 0.45); rim.position.set(-4, 3, -4); scene.add(rim);
  // The AI's sight: one warm spotlight, always on the AI, never on the checker.
  const key = new THREE.SpotLight(C.lamp, 48, 13, 0.36, 0.7, 1.4); key.position.set(-0.6, 5.4, 4.0); scene.add(key, key.target);
  // My checker's own light: cool and dim, rising only when it scores a DONE.
  const coolKey = new THREE.SpotLight(C.cool, 0, 12, 0.32, 0.8, 1.4); coolKey.position.set(3.8, 5.2, 2.0); scene.add(coolKey, coolKey.target);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.6, 64), new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95, transparent: true, depthWrite: false, alphaMap: radialTexture('#ffffff', '#000000') }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(246,196,83,0.5)', 'rgba(246,196,83,0)'), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004; scene.add(pool);
  const coolPool = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(201,215,222,0.4)', 'rgba(201,215,222,0)'), transparent: true, depthWrite: false, opacity: 0 }));
  coolPool.rotation.x = -Math.PI / 2; coolPool.position.y = 0.005; scene.add(coolPool);

  const A = { ai: buildAI(), checker: buildChecker() };
  for (const [id, a] of Object.entries(A)) { a.pos = { x: HOME[id][0], z: HOME[id][1] }; a.scale = id === 'ai' ? 1 : 0.8; a.group.position.set(a.pos.x, 0, a.pos.z); scene.add(a.group); }

  let w = 1; let h = 1; let narrow = false;
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    narrow = w / h < 1.9;
    // a wide strip on laptops, a squarer box on phones: keep both figures in frame
    camera.fov = narrow ? 30 : w / h > 3.4 ? 17 : 21;
    camera.position.set(narrow ? 1.2 : 0.9, 2.1, narrow ? 9.6 : 8.6);
    camera.lookAt(narrow ? 1.2 : 0.9, 1.0, -0.6);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  const v = new THREE.Vector3();
  const project = (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; };

  let last = performance.now();
  // state: { pose: 'read'|'work'|'raise'|'hold', f, checker: 'away'|'score', verdict: null|'wrong', recede, raiseRight, still, time }
  function frame(s) {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    // PACING.md version 2: figures move at about 0.8× the first speed; the light follows over about 0.7 s
    const k = s.still ? 1 : 1 - Math.exp(-dt * 2.4);
    const kl = s.still ? 1 : 1 - Math.exp(-dt * 4.3);
    const ai = A.ai; const ck = A.checker;
    // where each figure stands
    const aiTarget = s.recede ? [HOME.ai[0], -0.9] : HOME.ai;
    const ckTarget = s.checker === 'give' ? [HOME.checker[0] - 0.25, HOME.checker[1] + 0.3] : s.checker === 'score' ? [HOME.checker[0] - 0.5, HOME.checker[1] + 0.8] : s.recede ? [HOME.checker[0] + 0.3, HOME.checker[1] - 0.8] : HOME.checker;
    for (const [a, t, sc] of [[ai, aiTarget, s.recede ? 0.8 : 1], [ck, ckTarget, s.checker === 'score' ? 0.92 : s.recede ? 0.7 : 0.8]]) {
      a.pos.x = mix(a.pos.x, t[0], k); a.pos.z = mix(a.pos.z, t[1], k);
      a.scale = mix(a.scale, sc, k);
      const bob = s.still ? 0 : Math.sin(s.time * 0.96 + t[0]) * 0.012;
      a.group.position.set(a.pos.x, bob, a.pos.z); a.group.scale.setScalar(a.scale);
    }
    ck.group.rotation.y = mix(ck.group.rotation.y, -0.42, k);
    ai.group.rotation.y = mix(ai.group.rotation.y, 0.04, k);

    // The AI: reads down at its page, rewrites (both hands at work), or holds DONE up.
    const f = s.f ?? 0;
    const work = s.pose === 'work' ? Math.sin(Math.PI * Math.min(1, f * 1.1)) : 0;
    const raise = s.pose === 'raise' ? band(f, 0.0, 0.25) : s.pose === 'hold' ? 1 : 0;
    const tap = s.still ? 0 : Math.sin(s.time * 7.2) * 0.12 * work;
    ai.head.rotation.x = mix(ai.head.rotation.x, s.recede ? 0.05 : 0.22 + 0.06 * work - 0.2 * raise, k);
    ai.head.rotation.y = mix(ai.head.rotation.y, raise ? -0.08 : 0, k);
    ai.L.shoulder.rotation.set(-0.95 * work - 0.25 + tap, 0, -0.16);
    ai.L.elbow.rotation.x = -0.85 * work - 0.25;
    ai.R.shoulder.rotation.set(-0.95 * work * (1 - raise) - 0.25 * (1 - raise) - 2.5 * raise - tap, 0, 0.16 + 0.25 * raise);
    ai.R.elbow.rotation.x = -0.85 * work * (1 - raise) - 0.25 * (1 - raise) - 0.35 * raise;
    ai.done.visible = raise > 0.05;
    ai.done.rotation.set(0, 0, -0.1);
    ai.done.position.set(0, -0.24, 0.1);
    ai.done.material.color.setHex(s.verdict === 'right-done' ? 0xeaf5ea : 0xffffff);
    ai.eyeMat.emissiveIntensity = s.recede ? 0.4 : 1.15;

    // My checker: steps forward to score; the top page lifts and turns toward the room; its slit shows the verdict.
    const scoring = s.checker === 'score';
    const giving = s.checker === 'give';
    const lift = scoring ? band(s.cf ?? 1, 0.15, 0.6) : 0;
    const top = ck.sheets[0];
    {
      top.position.set(0, 0.0 + 0.32 * lift, 0.0 + 0.12 * lift); top.rotation.set(-0.18 + 0.18 * lift, 0.35 * lift, 0);
      ck.L.shoulder.rotation.set(-0.75, 0, -0.32); ck.L.elbow.rotation.x = -1.2;
      ck.R.shoulder.rotation.set(-0.75 - 0.6 * lift, 0, 0.32 - 0.1 * lift); ck.R.elbow.rotation.x = -1.2 + 0.4 * lift;
      ck.head.rotation.x = mix(ck.head.rotation.x, scoring ? 0.1 : 0.0, k);
    }
    ck.sheets.forEach((sh, i) => { sh.visible = i < (s.pagesHeld ?? 2) || (i === 0 && (scoring || giving)); });
    // releasing a stage: the top page leaves the checker's hands, toward the AI, and is gone
    const g = giving ? (s.cf ?? 0) : 0;
    if (giving) {
      top.position.x += -1.6 * g; top.position.y += 0.35 * Math.sin(Math.PI * g); top.position.z += 0.6 * g;
      top.rotation.y = 0.6 * g; top.material.transparent = true; top.material.opacity = 1 - band(g, 0.55, 1);
      ck.R.shoulder.rotation.x = -0.75 - 0.5 * Math.sin(Math.PI * g); ck.R.shoulder.rotation.z = 0.32 + 0.3 * g;
    } else if (top.material.opacity !== 1) { top.material.opacity = 1; }
    const slitColor = scoring && s.verdict === 'wrong' && lift > 0.6 ? C.wrong : C.slit;
    ck.slitMat.emissive.setHex(slitColor); ck.slitMat.color.setHex(slitColor);
    ck.slitMat.emissiveIntensity = scoring ? 1.3 : 0.45;

    // lights: the warm key always on the AI; the cool one only while the checker scores
    key.target.position.set(ai.pos.x, 0.8, ai.pos.z);
    key.intensity = mix(key.intensity, s.recede ? 20 : 48, kl);
    pool.position.x = mix(pool.position.x, ai.pos.x, k); pool.position.z = mix(pool.position.z, ai.pos.z, k);
    pool.material.opacity = mix(pool.material.opacity, s.recede ? 0.4 : 1, kl);
    coolKey.target.position.set(ck.pos.x, 0.9, ck.pos.z);
    coolKey.intensity = mix(coolKey.intensity, scoring ? 34 : 0, kl);
    coolPool.position.set(ck.pos.x, 0.005, ck.pos.z);
    coolPool.material.opacity = mix(coolPool.material.opacity, scoring ? 1 : 0, kl);
    renderer.render(scene, camera);
  }

  // Where HTML attaches (host pixels): the AI's eyes (for its sight), under each figure (for labels).
  function anchors() {
    const ai = A.ai; const ck = A.checker; const sa = ai.scale; const sc = ck.scale;
    return {
      eye: project(ai.pos.x, 1.55 * sa, ai.pos.z + 0.3),
      aiFoot: project(ai.pos.x, 0, ai.pos.z + 0.5),
      checkerFoot: project(ck.pos.x, 0, ck.pos.z + 0.4),
      checkerTop: project(ck.pos.x, ck.h * sc, ck.pos.z),
    };
  }
  // Stand a figure where the page needs it: find the world x that projects to screen x (at depth z).
  function setHome(id, screenX, z) {
    let lo = -12; let hi = 12;
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (project(mid, 0, z).x < screenX) lo = mid; else hi = mid; }
    HOME[id] = [(lo + hi) / 2, z];
  }
  function snap() { for (const [id, a] of Object.entries(A)) { a.pos.x = HOME[id][0]; a.pos.z = HOME[id][1]; } }
  return { frame, anchors, setHome, snap, resize, isNarrow: () => narrow };
}
