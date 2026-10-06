// The three actors, drawn in a small Three.js scene: Followthrough (the AI that edits), the reviewer
// (a second AI that reads and judges, and can't edit) and the code check (an instrument, no persona).
// Each has a home in the room. The one responsible for the current step comes forward under the
// warm light; the others recede into the room. Gestures only ever stand for a recorded read, write,
// comparison or decision.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const C = {
  room: 0x19373b, floor: 0x152d31, petrolDark: 0x0f2a2e,
  worker: 0xd6cfbd, workerDeep: 0x5f7476, visor: 0x10262a,
  reviewer: 0x7f93a8, reviewerDeep: 0x55687c, lens: 0xc9d6dc,
  code: 0x2a4c50, codeTop: 0x355e61,
  paper: 0xf3eddf, warm: 0xe8c56d, mint: 0x8fc7a8, clay: 0xc98a6b, scan: 0xdff3f0,
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...o });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const band = (f, a, b) => ease((f - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function contactShadow(r) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(5,18,20,0.55)', 'rgba(5,18,20,0)'), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.005; return m;
}

function arm(side, m) {
  // shoulder → upper arm → elbow → forearm → hand; rotations are set per frame
  const shoulder = new THREE.Group();
  shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), m));
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 12), m); upper.position.y = -0.17; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -0.34; shoulder.add(elbow);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.2, 6, 12), m); fore.position.y = -0.14; elbow.add(fore);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), m); hand.position.y = -0.3; elbow.add(hand);
  shoulder.position.set(side * 0.53, 1.08, 0.02);
  return { shoulder, elbow, side };
}

function buildWorker() {
  const g = new THREE.Group(); const body = mat(C.worker); const deep = mat(C.workerDeep);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.08, 40), mat(C.petrolDark)); plinth.position.y = 0.04; g.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.4, 24), deep); column.position.y = 0.28; g.add(column);
  const torso = rbox(0.92, 0.78, 0.62, 0.16, body); torso.position.y = 0.86; g.add(torso);
  // The paper carriage: a tray across the front, with one sheet that travels from the input side to the output side.
  const tray = rbox(1.02, 0.06, 0.34, 0.03, deep); tray.position.set(0, 0.6, 0.42); g.add(tray);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.26), mat(C.paper, { roughness: 0.9 })); sheet.position.set(-0.32, 0.64, 0.42); g.add(sheet);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), new THREE.MeshBasicMaterial({ map: lineTexture(), transparent: true }));
  lines.rotation.x = -Math.PI / 2; lines.position.y = 0.007; sheet.add(lines);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 16), deep); neck.position.y = 1.31; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.56; g.add(head);
  head.add(rbox(0.64, 0.44, 0.52, 0.15, body));
  const visor = rbox(0.5, 0.2, 0.04, 0.06, mat(C.visor, { roughness: 0.3 })); visor.position.set(0, 0.01, 0.255); head.add(visor);
  const eyeMat = new THREE.MeshStandardMaterial({ color: C.warm, emissive: C.warm, emissiveIntensity: 0.9 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.05, 4, 8), eyeMat); e.rotation.z = Math.PI / 2; e.position.set(s * 0.11, 0.01, 0.28); head.add(e); }
  const L = arm(-1, body); const R = arm(1, body); g.add(L.shoulder, R.shoulder);
  g.add(contactShadow(0.85));
  return { group: g, head, sheet, L, R, eyeMat, torso };
}

function lineTexture() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 56; const g = c.getContext('2d');
  g.fillStyle = 'rgba(37,53,56,0.55)';
  [8, 18, 28, 38, 48].forEach((y, i) => g.fillRect(6, y, i === 0 ? 50 : 84 - (i % 2) * 18, 3));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildReviewer() {
  const g = new THREE.Group(); const body = mat(C.reviewer); const deep = mat(C.reviewerDeep);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.08, 40), mat(C.petrolDark)); plinth.position.y = 0.04; g.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.95, 36), body); column.position.y = 0.55; g.add(column);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), body); cap.position.y = 1.02; g.add(cap);
  // A slot on the front where its decision slip comes out. It has no hands: it hands back a decision, never an edit.
  const slot = rbox(0.4, 0.05, 0.08, 0.02, mat(C.visor)); slot.position.set(0, 0.72, 0.34); g.add(slot);
  const slip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), mat(C.paper, { roughness: 0.9 })); slip.position.set(0, 0.72, 0.3); slip.visible = false; g.add(slip);
  const ringMat = new THREE.MeshStandardMaterial({ color: C.reviewerDeep, emissive: 0x000000, roughness: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 10, 48), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.42; g.add(ring);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.34, 12), deep); neck.position.y = 1.24; g.add(neck);
  // The lens: what the reviewer is for. It tilts toward whatever it is reading.
  const lens = new THREE.Group(); lens.position.y = 1.6; g.add(lens);
  lens.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 16, 48), mat(C.lens, { metalness: 0.4, roughness: 0.3 })));
  lens.add(new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), new THREE.MeshStandardMaterial({ color: 0x9fc8cf, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide })));
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); glint.position.set(-0.1, 0.1, 0.01); lens.add(glint);
  g.add(contactShadow(0.75));
  return { group: g, lens, slip, ringMat };
}

function buildCode() {
  const g = new THREE.Group();
  const base = rbox(1.36, 0.34, 0.84, 0.08, mat(C.code)); base.position.y = 0.17; g.add(base);
  const top = rbox(1.2, 0.04, 0.7, 0.02, mat(C.codeTop)); top.position.y = 0.355; g.add(top);
  // Two sheets side by side: the earlier version and the saved version, compared line by line.
  const sheets = [-0.3, 0.3].map((x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.012, 0.56), mat(C.paper, { roughness: 0.9 })); s.position.set(x, 0.385, 0); g.add(s);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.42), new THREE.MeshBasicMaterial({ map: lineTexture(), transparent: true })); l.rotation.x = -Math.PI / 2; l.position.y = 0.008; s.add(l); return s; });
  const scanMat = new THREE.MeshStandardMaterial({ color: C.scan, emissive: C.scan, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 });
  const scan = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.035), scanMat); scan.position.set(0, 0.4, -0.28); g.add(scan);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3d5a5c, emissive: 0x000000 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), lampMat); lamp.position.set(0.52, 0.22, 0.43); g.add(lamp);
  g.add(contactShadow(0.95));
  return { group: g, scan, scanMat, lampMat, sheets };
}

// Homes in the room (x, z). The responsible actor walks forward to the front spot.
const HOME = { worker: [-2.1, -1.5], code: [0, -2.4], reviewer: [2.1, -1.5] };
const FRONT = [0, 0.85];

export function createActors(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.room, 7.2, 12.5);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(0, 2.5, 7.6); camera.lookAt(0, 0.85, -0.2);

  scene.add(new THREE.HemisphereLight(0x9cc3c0, 0x0b2124, 1.25));
  const rim = new THREE.DirectionalLight(0xa9ccd0, 0.7); rim.position.set(4, 3, -4); scene.add(rim);
  const key = new THREE.SpotLight(C.warm, 60, 14, 0.42, 0.75, 1.4); key.position.set(-1.6, 5.2, 4.2); scene.add(key, key.target);

  // The floor patch fades out at its edge, so the 3D floor melts into the page's room instead of ending in a box.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), new THREE.MeshStandardMaterial({ color: 0x2a5053, roughness: 0.95, transparent: true, depthWrite: false, alphaMap: radialTexture('#ffffff', '#000000') }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(232,197,109,0.42)', 'rgba(232,197,109,0)'), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; scene.add(pool);

  const A = { worker: buildWorker(), reviewer: buildReviewer(), code: buildCode() };
  for (const [id, a] of Object.entries(A)) { a.group.position.set(HOME[id][0], 0, HOME[id][1]); a.pos = { x: HOME[id][0], z: HOME[id][1] }; scene.add(a.group); }

  let w = 0; let h = 0;
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Keep the front actor a similar size on narrow and wide stages.
    // A short, wide stage (a laptop with the step card below) frames the front actor more tightly.
    const a = w / h; camera.fov = a < 1.1 ? 34 : a > 2.2 ? 19 : a > 1.7 ? 23 : 28;
    camera.position.set(0, a > 1.7 ? 2.1 : 2.5, 7.6); camera.lookAt(0, a > 1.7 ? 0.95 : 0.85, a > 1.7 ? 0.2 : -0.2); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  const v = new THREE.Vector3();
  function project(x, y, z) { v.set(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; }

  let last = performance.now();
  // state: { active, f (0..1 within the step), decision: 'return'|'accept'|null, still, time }
  function frame(state) {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = state.still ? 1 : 1 - Math.exp(-dt * 2.6);
    for (const [id, a] of Object.entries(A)) {
      const on = id === state.active;
      const [tx, tz] = on ? FRONT : HOME[id];
      a.pos.x = mix(a.pos.x, tx, k); a.pos.z = mix(a.pos.z, tz, k);
      const bob = state.still ? 0 : Math.sin(state.time * 1.3 + tx) * 0.015;
      a.group.position.set(a.pos.x, bob, a.pos.z);
      a.scale = mix(a.scale ?? 1, on ? 1 : 0.78, k); a.group.scale.setScalar(a.scale);
      // Recede: face the front spot slightly when at home; face the visitor when responsible.
      const yaw = on ? 0 : Math.atan2(FRONT[0] - a.pos.x, FRONT[1] - a.pos.z) * 0.35;
      a.group.rotation.y = mix(a.group.rotation.y, yaw, k);
    }
    const f = state.f; const read = band(f, 0.12, 0.3) * (1 - band(f, 0.45, 0.55)); const work = band(f, 0.4, 0.55) * (1 - band(f, 0.7, 0.8)); const give = band(f, 0.66, 0.82);

    // Followthrough: looks and reaches toward the input, moves the sheet across its carriage, then hands it out.
    const W = A.worker; const wOn = state.active === 'worker';
    W.head.rotation.y = wOn ? mix(-0.42 * read + 0.42 * give, 0, work) : 0.25;
    W.head.rotation.x = wOn ? 0.12 * (read + work) : 0.05;
    const reachL = wOn ? read : 0; const reachR = wOn ? give * (1 - band(f, 0.92, 1)) : 0; const hold = wOn ? work : 0;
    W.L.shoulder.rotation.set(-1.1 * reachL - 0.75 * hold, 0, -0.55 * reachL - 0.1);
    W.L.elbow.rotation.x = -0.5 * reachL - 0.7 * hold;
    W.R.shoulder.rotation.set(-1.1 * reachR - 0.75 * hold, 0, 0.55 * reachR + 0.1);
    W.R.elbow.rotation.x = -0.5 * reachR - 0.7 * hold;
    W.sheet.position.x = wOn ? mix(-0.32, 0.32, band(f, 0.42, 0.78)) : -0.32;
    W.eyeMat.emissiveIntensity = wOn ? 1.1 : 0.35;

    // The reviewer: the lens tilts to the input, then a decision slip comes out of its slot.
    const R = A.reviewer; const rOn = state.active === 'reviewer';
    R.lens.rotation.y = rOn ? -0.55 * read + 0.2 * work : 0.3;
    R.lens.rotation.x = rOn ? 0.35 * (read + work) : 0.1;
    R.slip.visible = rOn && give > 0.01;
    const back = state.decision === 'return';
    R.slip.position.set(rOn ? (back ? -0.5 : 0.5) * give : 0, 0.72, 0.3 + 0.25 * give);
    const ringColor = !rOn || give < 0.5 ? 0x000000 : back ? C.clay : C.mint;
    R.ringMat.emissive.setHex(ringColor); R.ringMat.emissiveIntensity = 0.9;

    // The code check: a light bar sweeps across both versions, then the lamp shows the result.
    const K = A.code; const kOn = state.active === 'code';
    K.scan.position.z = kOn ? mix(-0.28, 0.28, band(f, 0.3, 0.7)) : -0.28;
    K.scanMat.opacity = kOn ? 0.25 + 0.7 * band(f, 0.25, 0.32) * (1 - band(f, 0.72, 0.8)) : 0.15;
    K.lampMat.emissive.setHex(kOn && give > 0.3 ? C.mint : 0x000000);
    K.sheets.forEach((s, i) => { s.position.y = 0.385 + (kOn ? 0.03 * Math.sin(band(f, 0.12, 0.3) * Math.PI) * (i ? 1 : 0.6) : 0); });

    // The warm light and its pool follow whoever is responsible.
    const act = A[state.active] ?? A.worker;
    key.target.position.set(act.pos.x, 0.8, act.pos.z);
    pool.position.x = mix(pool.position.x, act.pos.x, k); pool.position.z = mix(pool.position.z, act.pos.z, k);
    renderer.render(scene, camera);
  }

  // Where the arrows attach: the intake on the input side, the output on the other, and the head.
  function anchors(id) {
    const a = A[id]; const y = id === 'code' ? 0.35 : 0.9; const s = id === 'code' ? 0.75 : 0.6;
    return { in: project(a.pos.x - s, y, a.pos.z + 0.3), out: project(a.pos.x + s, y, a.pos.z + 0.3), top: project(a.pos.x, id === 'code' ? 0.6 : 1.95, a.pos.z) };
  }
  return { frame, anchors, resize, canvas: renderer.domElement };
}
