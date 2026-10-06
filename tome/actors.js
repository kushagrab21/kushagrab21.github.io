// Tome's three workers, drawn in a small Three.js scene above the track:
//   GPT-5, the AI that reads and writes (a reader holding a page; its visor scans while it reads),
//   Fixed code, ordinary code that does the same thing every time (a press with six slide slots),
//   the Voice service, which turns written lines into speech (a horn that sends out rings).
// The worker on the current step steps forward under the one warm light; the others recede
// into the room. Gestures only ever stand for a recorded read, write, layout or spoken line.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const C = {
  room: 0x1b1c36, floor: 0x2a2440, plinth: 0x15131f,
  body: 0xdcd3e4, deep: 0x4b4466, visor: 0x17142a, lamp: 0xffc870,
  press: 0x3b3550, pressTop: 0x4d4666, slot: 0x2a2540,
  horn: 0x8a6f8e, hornDeep: 0x5b4762, paper: 0xf6efe3, damson: 0x6c265c,
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...o });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const band = (f, a, b) => ease((f - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function lineTexture() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 120; const g = c.getContext('2d');
  g.fillStyle = '#f6efe3'; g.fillRect(0, 0, 96, 120);
  g.fillStyle = 'rgba(60,40,70,0.55)'; g.fillRect(8, 10, 52, 5);
  g.fillStyle = 'rgba(60,40,70,0.35)';
  for (let y = 24; y < 112; y += 9) g.fillRect(8, y, 80 - ((y / 9) % 3) * 12, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const shadow = (r) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(6,4,14,0.6)', 'rgba(6,4,14,0)'), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m;
};
function arm(side, m) {
  const shoulder = new THREE.Group();
  shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), m));
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 12), m); upper.position.y = -0.16; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -0.32; shoulder.add(elbow);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.2, 6, 12), m); fore.position.y = -0.14; elbow.add(fore);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), m); hand.position.y = -0.29; elbow.add(hand);
  shoulder.position.set(side * 0.5, 1.06, 0.04);
  return { shoulder, elbow };
}

// GPT-5: a reader. It holds a page up to read (the visor's light scans across), then writes:
// a new page rises from its chest and its right hand passes it out to the output side.
function buildReader() {
  const g = new THREE.Group(), body = mat(C.body), deep = mat(C.deep);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.08, 40), mat(C.plinth)); plinth.position.y = 0.04; g.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.42, 24), deep); column.position.y = 0.29; g.add(column);
  const torso = rbox(0.86, 0.76, 0.56, 0.2, body); torso.position.y = 0.86; g.add(torso);
  const chestSlot = rbox(0.42, 0.05, 0.05, 0.02, mat(C.visor)); chestSlot.position.set(0, 1.0, 0.29); g.add(chestSlot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.12, 16), deep); neck.position.y = 1.3; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
  head.add(rbox(0.7, 0.44, 0.5, 0.18, body));
  const visor = rbox(0.56, 0.17, 0.04, 0.07, mat(C.visor, { roughness: 0.25 })); visor.position.set(0, 0.0, 0.25); head.add(visor);
  const scanMat = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 1.2 });
  const scan = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.02), scanMat); scan.position.set(0, 0, 0.275); head.add(scan);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: lineTexture(), roughness: 0.9, side: THREE.DoubleSide }));
  g.add(page);
  const out = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.44), new THREE.MeshStandardMaterial({ map: lineTexture(), roughness: 0.9, side: THREE.DoubleSide, color: 0xf3dcea }));
  out.visible = false; g.add(out);
  const Lr = arm(-1, body), Rr = arm(1, body); g.add(Lr.shoulder, Rr.shoulder);
  g.add(shadow(0.85));
  return { group: g, head, scan, scanMat, page, out, L: Lr, R: Rr, h: 1.85 };
}

// Fixed code: a press. Its stamp comes down once per slide, and the six slots on its bed fill in order.
function buildPress() {
  const g = new THREE.Group();
  const base = rbox(1.3, 0.3, 0.8, 0.07, mat(C.press)); base.position.y = 0.15; g.add(base);
  const bed = rbox(1.16, 0.04, 0.66, 0.02, mat(C.pressTop)); bed.position.y = 0.32; g.add(bed);
  const slots = [0, 1, 2, 3, 4, 5].map((k) => {
    const m = new THREE.MeshStandardMaterial({ color: C.slot, emissive: 0x000000, roughness: 0.6 });
    const s = rbox(0.15, 0.03, 0.22, 0.01, m); s.position.set(-0.45 + k * 0.18, 0.35, 0.14); g.add(s); return { s, m };
  });
  for (const x of [-0.56, 0.56]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 12), mat(C.pressTop)); post.position.set(x, 0.75, -0.2); g.add(post); }
  const beam = rbox(1.22, 0.1, 0.16, 0.03, mat(C.pressTop)); beam.position.set(0, 1.18, -0.2); g.add(beam);
  const stamp = new THREE.Group(); g.add(stamp);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10), mat(C.deep)); rod.position.y = 0.21; stamp.add(rod);
  const headM = mat(C.body); const sh = rbox(0.2, 0.08, 0.26, 0.02, headM); stamp.add(sh);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a3450, emissive: 0x000000 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), lampMat); lamp.position.set(0.52, 0.2, 0.41); g.add(lamp);
  g.add(shadow(0.95));
  return { group: g, slots, stamp, lampMat, h: 1.25 };
}

// The voice service: a horn. While it reads the lines aloud, rings travel out of its mouth.
function buildHorn() {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.08, 36), mat(C.plinth)); plinth.position.y = 0.04; g.add(plinth);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 14), mat(C.hornDeep)); stem.position.y = 0.43; g.add(stem);
  const box = rbox(0.42, 0.26, 0.34, 0.06, mat(C.hornDeep)); box.position.y = 0.86; g.add(box);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.05, 0.62, 36, 1, true), mat(C.horn, { side: THREE.DoubleSide, metalness: 0.25, roughness: 0.4 }));
  horn.rotation.x = Math.PI / 2; horn.position.set(0, 1.08, 0.36); g.add(horn);
  const rings = [0, 1, 2].map(() => { const m = new THREE.MeshBasicMaterial({ color: C.lamp, transparent: true, opacity: 0 }); const r = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 8, 40), m); r.position.set(0, 1.08, 0.68); g.add(r); return { r, m }; });
  g.add(shadow(0.7));
  return { group: g, rings, h: 1.45 };
}

const HOME = { voice: [-2.9, -1.3], gpt: [0, -1.9], fixed: [2.9, -1.3] };
const FRONT = [0, 0.25];

export function createActors(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.room, 8.5, 13.5);
  const camera = new THREE.PerspectiveCamera(18, 4, 0.1, 40);
  camera.position.set(0, 2.0, 8.4); camera.lookAt(0, 0.92, -0.5);
  scene.add(new THREE.HemisphereLight(0xb9b0d8, 0x120f1c, 1.15));
  const rim = new THREE.DirectionalLight(0xb4b8ee, 0.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const key = new THREE.SpotLight(C.lamp, 70, 14, 0.4, 0.7, 1.4); key.position.set(0.8, 5.6, 4.0); scene.add(key, key.target);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95, transparent: true, depthWrite: false, alphaMap: radialTexture('#ffffff', '#000000') }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,200,112,0.45)', 'rgba(255,200,112,0)'), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004; scene.add(pool);

  const A = { gpt: buildReader(), fixed: buildPress(), voice: buildHorn() };
  for (const [id, a] of Object.entries(A)) { a.group.position.set(HOME[id][0], 0, HOME[id][1]); a.pos = { x: HOME[id][0], z: HOME[id][1] }; a.scale = 0.8; scene.add(a.group); }

  let w = 1, h = 1;
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 2.2 ? 26 : 18; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  const v = new THREE.Vector3();
  const project = (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; };

  let last = performance.now();
  // state: { active: 'gpt'|'fixed'|'voice'|null, f: 0..1 through that worker's turn, off: step 6 (not Tome), time, still }
  function frame(state) {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = state.still ? 1 : 1 - Math.exp(-dt * 3);
    for (const [id, a] of Object.entries(A)) {
      const on = id === state.active;
      // GPT-5 lives in the middle; when another worker comes forward it steps back to the far side
      let home = HOME[id];
      if (id === 'gpt' && (state.active === 'fixed' || state.active === 'voice')) home = [state.active === 'fixed' ? -1.45 : 1.45, -2.6];
      const [tx, tz] = on ? FRONT : home;
      a.pos.x = mix(a.pos.x, tx, k); a.pos.z = mix(a.pos.z, tz, k);
      const bob = state.still ? 0 : Math.sin(state.time * 1.2 + tx) * 0.012;
      a.group.position.set(a.pos.x, bob, a.pos.z);
      a.scale = mix(a.scale, on ? 1 : state.off ? 0.62 : 0.8, k); a.group.scale.setScalar(a.scale);
      const yaw = on ? 0 : Math.atan2(FRONT[0] - a.pos.x, FRONT[1] - a.pos.z) * 0.35;
      a.group.rotation.y = mix(a.group.rotation.y, yaw, k);
    }
    const f = state.f ?? 0;
    const read = band(f, 0.05, 0.25) * (1 - band(f, 0.45, 0.55)), write = band(f, 0.45, 0.6), give = band(f, 0.7, 0.88) * (1 - band(f, 0.96, 1));

    // GPT-5 reads (page up, visor light scanning), then writes (a new page rises and is handed out)
    const G = A.gpt, gOn = state.active === 'gpt';
    G.head.rotation.x = gOn ? 0.28 * read + 0.08 * write : 0.06;
    G.head.rotation.y = gOn ? 0.35 * give : 0.2;
    G.scan.position.x = gOn && read > 0.05 ? Math.sin(state.time * 6) * 0.2 : 0;
    G.scanMat.emissiveIntensity = gOn ? 1.4 : 0.25;
    const hold = gOn ? Math.max(read, 0.35) : 0.35;
    G.L.shoulder.rotation.set(-1.0 * hold, 0, -0.18);
    G.L.elbow.rotation.x = -0.9 * hold;
    G.R.shoulder.rotation.set(-1.0 * hold * (1 - give) - 1.2 * give, 0, 0.18 + 0.55 * give);
    G.R.elbow.rotation.x = -0.9 * hold * (1 - give) - 0.2 * give;
    G.page.position.set(-0.02, 0.92 + 0.12 * hold, 0.5);
    G.page.rotation.x = -0.35 - 0.45 * read;
    G.page.visible = !gOn || f < 0.55;
    G.out.visible = gOn && write > 0.02;
    G.out.position.set(mix(0, 0.62, give), mix(1.0, 0.95, give) + 0.18 * write * (1 - give), mix(0.3, 0.55, write));
    G.out.rotation.set(-0.2, -0.3 * give, 0);

    // Fixed code stamps the six slots in order
    const P = A.fixed, pOn = state.active === 'fixed';
    const beat = pOn ? f * 6 : 0, idx = Math.floor(beat), frac = beat - idx;
    P.stamp.position.set(pOn ? -0.45 + Math.min(idx, 5) * 0.18 : 0, pOn ? 0.62 - 0.22 * Math.sin(Math.PI * frac) : 0.8, 0.14);
    P.slots.forEach(({ m }, j) => m.emissive.setHex(pOn && j < beat ? C.lamp : 0x000000));
    P.slots.forEach(({ m }) => { m.emissiveIntensity = 0.55; });
    P.lampMat.emissive.setHex(pOn ? C.lamp : 0x000000);

    // The voice service sends rings out of its horn while it speaks
    const V = A.voice, vOn = state.active === 'voice';
    V.rings.forEach(({ r, m }, j) => { const p = ((state.time * 0.8 + j / 3) % 1); r.scale.setScalar(1 + p * 1.2); r.position.z = 0.68 + p * 0.5; m.opacity = vOn ? 0.7 * (1 - p) : 0; });

    const act = A[state.active] ?? A.gpt;
    key.target.position.set(act.pos.x, 0.8, act.pos.z);
    key.intensity = mix(key.intensity, state.active ? 70 : 22, k);
    pool.position.x = mix(pool.position.x, act.pos.x, k); pool.position.z = mix(pool.position.z, act.pos.z, k);
    pool.material.opacity = mix(pool.material.opacity, state.active ? 1 : 0.35, k);
    renderer.render(scene, camera);
  }
  // where the arrows attach (in the host's pixels): the input side, the output side, and under the feet
  function anchors(id) {
    const a = A[id], s = a.scale ?? 1, y = id === 'fixed' ? 0.35 : 0.95 * s;
    return { in: project(a.pos.x - 0.62 * s, y, a.pos.z + 0.3), out: project(a.pos.x + 0.62 * s, y, a.pos.z + 0.3), foot: project(a.pos.x, 0, a.pos.z + 0.4) };
  }
  return { frame, anchors };
}
