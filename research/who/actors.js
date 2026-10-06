// The curtain call's cast: a small copy of each figure the ride showed, in its own station's colours.
//   Tome's reader: chest slot, scanning visor light, a page in both hands, and the lesson page it hands out.
//   ADSP's analyst: brass ring and joints, a chest panel of blue bars, a brass lens, a lamp on a stalk, a tray.
//   Followthrough's worker: ivory on a petrol plinth, with a paper tray and one sheet that slides across.
//   The AI of The finding: ivory and warm brown, holding up its DONE slip.
// The shapes are copied and simplified from those stations' own actors files, never imported.
// The one whose turn it is steps forward under the one warm light; the others stand back.
// At the end they step aside and turn toward the middle, and the light goes to the name.
// Names and explanations are HTML. The only word in 3D is the DONE slip, which is the object itself, as on
// The finding's own station.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Each station's own colours, copied from its figure: Tome (build/tome/actors.js), ADSP's analyst
// (build/adsp/analyst.js), Followthrough's worker (build/followthrough/actors.js) and the AI of The finding
// (build/research/finding/actors.js). Read, never imported.
const C = {
  fog: 0x30261e, floor: 0x3a2d23, lamp: 0xf6c453, paper: 0xf4ecdc,
  tome: { skin: 0xdcd3e4, deep: 0x4b4466, visor: 0x17142a, plinth: 0x15131f, eye: 0xffc870 },
  adsp: { skin: 0xf0dcb5, deep: 0x936b3d, visor: 0x382c24, plinth: 0x382c24, eye: 0xffce65 },
  followthrough: { skin: 0xd6cfbd, deep: 0x5f7476, visor: 0x10262a, plinth: 0x0f2a2e, eye: 0xe8c56d },
  finding: { skin: 0xe9dfcc, deep: 0x6d5b49, visor: 0x1b1511, plinth: 0x1b1511, eye: 0xf6c453 },
};
const ORDER = ['tome', 'adsp', 'followthrough', 'finding'];
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...o });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10)); // softer in and out
const band = (f, a, b) => ease((f - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function lineTexture(bg, ink) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 120; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 96, 120);
  g.fillStyle = ink; g.fillRect(8, 10, 52, 6);
  g.globalAlpha = 0.6;
  for (let y = 26; y < 112; y += 10) g.fillRect(8, y, 80 - ((y / 10) % 3) * 12, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tableTexture() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 120; const g = c.getContext('2d');
  g.fillStyle = '#fff0d0'; g.fillRect(0, 0, 96, 120);
  g.fillStyle = 'rgba(84,60,37,0.55)';
  for (let y = 10; y < 112; y += 12) { g.fillRect(8, y, 22, 5); g.fillRect(36, y, 22, 5); g.fillRect(64, y, 22, 5); }
  g.fillStyle = 'rgba(112,174,203,0.75)'; g.fillRect(6, 44, 84, 9);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function doneTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = '#2a211b'; g.font = '700 64px Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('DONE', 128, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const shadow = (r) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(10,6,3,0.6)', 'rgba(10,6,3,0)'), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m;
};
function arm(side, m, joint) {
  const shoulder = new THREE.Group();
  shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), joint));
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 12), m); upper.position.y = -0.16; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -0.32; shoulder.add(elbow);
  elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), joint));
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.2, 6, 12), m); fore.position.y = -0.14; elbow.add(fore);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), m); hand.position.y = -0.29; elbow.add(hand);
  shoulder.position.set(side * 0.5, 1.07, 0.03);
  return { shoulder, elbow };
}

// One body plan, with each station's own proportions (torso, head, visor) and eyes.
const SHAPE = {
  tome: { torso: [0.86, 0.76, 0.56, 0.2], head: [0.7, 0.44, 0.5, 0.18], visor: [0.56, 0.17, 0.07], eyes: 'none' },
  adsp: { torso: [0.93, 0.74, 0.57, 0.17], head: [0.79, 0.49, 0.54, 0.2], visor: [0.64, 0.235, 0.09], eyes: 'box' },
  followthrough: { torso: [0.92, 0.78, 0.62, 0.16], head: [0.64, 0.44, 0.52, 0.15], visor: [0.5, 0.2, 0.06], eyes: 'capsule' },
  finding: { torso: [0.88, 0.76, 0.58, 0.18], head: [0.68, 0.44, 0.52, 0.17], visor: [0.54, 0.18, 0.07], eyes: 'capsule' },
};
function body(id) {
  const P = C[id]; const S = SHAPE[id];
  const g = new THREE.Group(); const skinM = mat(P.skin);
  const deep = mat(P.deep, id === 'adsp' ? { metalness: 0.5, roughness: 0.42 } : {});
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.08, 40), mat(P.plinth)); plinth.position.y = 0.04; g.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.42, 24), deep); column.position.y = 0.29; g.add(column);
  const [tw, th, td, tr] = S.torso; const torso = rbox(tw, th, td, tr, skinM); torso.position.y = 0.86; g.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.12, 16), deep); neck.position.y = 1.3; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.56; g.add(head);
  const [hw, hh, hd, hr] = S.head; head.add(rbox(hw, hh, hd, hr, skinM));
  const [vw, vh, vr] = S.visor; const visor = rbox(vw, vh, 0.045, vr, mat(P.visor, { roughness: 0.25 })); visor.position.set(0, 0, hd / 2); head.add(visor);
  const eyeMat = new THREE.MeshStandardMaterial({ color: P.eye, emissive: P.eye, emissiveIntensity: 0.6 });
  if (S.eyes === 'capsule') for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.05, 4, 8), eyeMat); e.rotation.z = Math.PI / 2; e.position.set(k * 0.11, 0, hd / 2 + 0.028); head.add(e); }
  if (S.eyes === 'box') for (const k of [-1, 1]) { const e = rbox(0.08, 0.07, 0.035, 0.027, eyeMat); e.position.set(k * 0.15, 0, hd / 2 + 0.035); head.add(e); }
  const L = arm(-1, skinM, id === 'adsp' ? deep : skinM); const R = arm(1, skinM, id === 'adsp' ? deep : skinM);
  const sx = tw / 2 + 0.07; L.shoulder.position.x = -sx; R.shoulder.position.x = sx; g.add(L.shoulder, R.shoulder);
  const sh = shadow(0.85); sh.userData.soft = true; g.add(sh);
  return { group: g, head, L, R, eyeMat, skinM, deep, hd };
}

// Tome's reader: a slot across its chest, a scanning light in its visor, a page in both hands, and the
// tinted lesson page it writes and hands out.
function buildTome() {
  const a = body('tome');
  const slot = rbox(0.42, 0.05, 0.05, 0.02, mat(C.tome.visor)); slot.position.set(0, 1.0, 0.29); a.group.add(slot);
  const scanMat = new THREE.MeshStandardMaterial({ color: C.tome.eye, emissive: C.tome.eye, emissiveIntensity: 1.1 });
  const scan = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.02), scanMat); scan.position.set(0, 0, a.hd / 2 + 0.03); a.head.add(scan);
  a.scan = scan; a.scanMat = scanMat;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: lineTexture('#f6efe3', '#3c2846'), roughness: 0.9, side: THREE.DoubleSide }));
  a.group.add(page); a.page = page;
  const out = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.44), new THREE.MeshStandardMaterial({ map: lineTexture('#f3dcea', '#6c265c'), roughness: 0.9, side: THREE.DoubleSide }));
  out.visible = false; a.group.add(out); a.out = out;
  return a;
}

// ADSP's analyst: a brass ring round its base, brass joints, a dark chest panel of blue bars, a brass lens over
// its left eye, a lamp on a stalk, a brass tray, and the spreadsheet it reads, held in its left hand.
function buildAdsp() {
  const a = body('adsp');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.028, 10, 48), a.deep); ring.rotation.x = Math.PI / 2; ring.position.y = 0.13; a.group.add(ring);
  const panel = rbox(0.65, 0.37, 0.045, 0.06, mat(C.adsp.visor)); panel.position.set(0, 0.9, 0.29); a.group.add(panel);
  const blue = new THREE.MeshStandardMaterial({ color: 0x81cce8, emissive: 0x28596b, emissiveIntensity: 0.5 });
  a.bars = [0.11, 0.22, 0.16, 0.28, 0.2].map((h, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1, 0.018), blue); b.userData.h = h; b.position.set(-0.23 + i * 0.115, 0.76 + h / 2, 0.323); b.scale.y = h; a.group.add(b); return b; });
  a.barMat = blue;
  const lens = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 12, 40), a.deep); lens.position.set(-0.15, 0, a.hd / 2 + 0.064); a.head.add(lens);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.19, 10), a.deep); stalk.position.set(0.27, 0.33, -0.03); a.head.add(stalk);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffce65, emissive: 0xffb53d, emissiveIntensity: 0.6 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), lampMat); lamp.position.set(0.27, 0.44, -0.03); a.head.add(lamp);
  a.lampMat = lampMat;
  const tray = rbox(1.04, 0.07, 0.4, 0.03, a.deep); tray.position.set(0, 0.58, 0.34); a.group.add(tray);
  const data = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshStandardMaterial({ map: tableTexture(), roughness: 0.9, side: THREE.DoubleSide }));
  data.position.set(0, -0.36, 0.1); data.rotation.x = -Math.PI / 2 + 0.2; a.L.elbow.add(data); a.data = data;
  return a;
}

// Followthrough's worker: ivory, with a petrol plinth and a paper tray across its front; one sheet travels
// from the input side to the output side.
function buildFollowthrough() {
  const a = body('followthrough');
  const tray = rbox(1.02, 0.06, 0.34, 0.03, a.deep); tray.position.set(0, 0.6, 0.42); a.group.add(tray);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.26), mat(C.paper, { roughness: 0.9 })); sheet.position.set(-0.32, 0.64, 0.42); a.group.add(sheet);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), new THREE.MeshBasicMaterial({ map: lineTexture('rgba(0,0,0,0)', 'rgba(37,53,56,0.6)'), transparent: true }));
  lines.rotation.x = -Math.PI / 2; lines.position.y = 0.007; sheet.add(lines);
  a.sheet = sheet;
  return a;
}

// The AI of The finding: ivory and warm brown, and the DONE slip it holds up, the word it typed.
function buildFinding() {
  const a = body('finding');
  const done = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: doneTexture(), roughness: 0.85, side: THREE.DoubleSide }));
  done.position.set(0, -0.5, 0.08); done.visible = false; a.R.elbow.add(done);
  a.done = done;
  return a;
}

// Each figure's gestures for its turn (f runs 0..1), or its resting pose when it isn't its turn.
function pose(A, state) {
  const f = state.f ?? 0;
  // Every turn has the same three beats as the product stations: take in the input, work on it, hand out the result.
  const read = band(f, 0.06, 0.26) * (1 - band(f, 0.4, 0.5));
  const work = band(f, 0.38, 0.52) * (1 - band(f, 0.62, 0.72));
  const give = band(f, 0.62, 0.8) * (1 - band(f, 0.94, 1));

  // Tome: holds the page up and reads it (the visor light sweeps), then a lesson page rises and is handed out.
  const T = A.tome; const tOn = state.active === 'tome';
  const hold = tOn ? Math.max(0.35, read + 0.35 * (1 - give)) : 0.35;
  T.L.shoulder.rotation.set(-1.0 * hold, 0, -0.18); T.L.elbow.rotation.x = -0.9 * hold;
  T.R.shoulder.rotation.set(tOn ? -1.0 * hold * (1 - give) - 1.25 * give : -0.35, 0, 0.18 + (tOn ? 0.6 * give : 0)); T.R.elbow.rotation.x = tOn ? -0.9 * hold * (1 - give) - 0.2 * give : -0.32;
  T.page.position.set(-0.02, 0.92 + 0.14 * hold, 0.5); T.page.rotation.x = -0.35 - 0.4 * read;
  T.page.visible = !tOn || f < 0.5;
  T.out.visible = tOn && f >= 0.4;
  const rise = band(f, 0.4, 0.6);
  T.out.position.set(mix(0, 0.66, give), 0.95 + 0.18 * rise * (1 - give), mix(0.3, 0.55, rise)); T.out.rotation.set(-0.2, -0.35 * give, 0);
  T.head.rotation.x = tOn ? 0.28 * read + 0.08 * work : 0.05; T.head.rotation.y = tOn ? 0.35 * give : 0;
  T.scan.position.x = tOn && read > 0.05 && !state.still ? Math.sin(state.time * 4.8) * 0.2 : 0;
  T.scanMat.emissiveIntensity = tOn ? 1.5 : 0.3;

  // ADSP: lifts the spreadsheet and reads it through its lens, the bars on its chest rise as it works, then it presents the answer.
  const D = A.adsp; const dOn = state.active === 'adsp';
  const lift = dOn ? Math.max(read, 0.25 * (1 - give)) : 0;
  D.L.shoulder.rotation.set(-0.15 - 1.0 * lift, 0, -0.12 - 0.15 * lift); D.L.elbow.rotation.x = -0.1 - 0.9 * lift;
  D.data.visible = dOn && f < 0.7;
  D.head.rotation.y = dOn ? -0.4 * read : 0; D.head.rotation.x = dOn ? 0.25 * read + 0.12 * work : 0.04;
  D.bars.forEach((b, i) => { const grow = dOn ? band(f, 0.36 + i * 0.05, 0.5 + i * 0.05) : 1; const hh = b.userData.h * (dOn ? 0.2 + 0.8 * grow : 1); b.scale.y = hh; b.position.y = 0.76 + hh / 2; });
  D.barMat.emissiveIntensity = dOn ? 0.4 + 0.9 * band(f, 0.4, 0.7) : 0.35;
  D.lampMat.emissiveIntensity = dOn ? 0.6 + 1.2 * work + 0.6 * give : 0.4;
  D.R.shoulder.rotation.set(-0.15 - (dOn ? 1.0 * give : 0), 0, 0.12 + (dOn ? 0.5 * give : 0)); D.R.elbow.rotation.x = dOn ? -0.1 - 0.3 * give : -0.1;

  // Followthrough: reaches to the input side, slides the sheet across its carriage, hands it out on the other side.
  const F = A.followthrough; const fOn = state.active === 'followthrough';
  F.L.shoulder.rotation.set(fOn ? -1.1 * read - 0.75 * work : -0.12, 0, fOn ? -0.55 * read - 0.1 : -0.12); F.L.elbow.rotation.x = fOn ? -0.5 * read - 0.7 * work : -0.1;
  F.R.shoulder.rotation.set(fOn ? -1.1 * give - 0.75 * work : -0.12, 0, fOn ? 0.55 * give + 0.1 : 0.12); F.R.elbow.rotation.x = fOn ? -0.5 * give - 0.7 * work : -0.1;
  F.sheet.position.x = fOn ? mix(-0.3, 0.3, band(f, 0.4, 0.75)) : -0.3;
  F.head.rotation.y = fOn ? mix(-0.42 * read + 0.42 * give, 0, work) : 0; F.head.rotation.x = fOn ? 0.12 * (read + work) : 0.04;

  // The finding: looks over the work, then holds up its DONE slip, as on its station.
  const N = A.finding; const nOn = state.active === 'finding';
  const raise = nOn ? band(f, 0.5, 0.72) * (1 - band(f, 0.95, 1)) : 0;
  N.R.shoulder.rotation.set(mix(-0.12, -2.6, raise), 0, 0.12 + 0.25 * raise); N.R.elbow.rotation.x = mix(-0.1, -0.35, raise);
  N.done.visible = raise > 0.05; N.done.rotation.set(Math.PI, 0, 0); // it reads upright once the arm is up
  N.L.shoulder.rotation.set(nOn ? -0.5 * read : -0.12, 0, -0.12); N.L.elbow.rotation.x = nOn ? -0.6 * read : -0.1;
  N.head.rotation.x = nOn ? 0.25 * read - 0.2 * raise : 0.04; N.head.rotation.y = nOn ? 0.25 * raise : 0;

}

// Where everyone stands, for a wide stage and for the phone's strip.
const LAYOUT = {
  wide: {
    home: { tome: [-4.3, -1.3], adsp: [-2.25, -2.2], followthrough: [2.25, -2.2], finding: [4.3, -1.3] }, // wide enough that the figure in the light never reaches a neighbour's caption
    front: [0, 0.6],
    flank: { tome: [-5.35, -0.6], adsp: [-4.05, -1.7], followthrough: [4.05, -1.7], finding: [5.35, -0.6] },
    pool: [0, 0.2],
  },
  tall: {
    home: { tome: [-2.25, -0.4], adsp: [-0.75, -0.4], followthrough: [0.75, -0.4], finding: [2.25, -0.4] },
    front: null, // on the phone the figure steps forward from its own place in the row
    flank: { tome: [-2.25, -0.4], adsp: [-0.75, -0.4], followthrough: [0.75, -0.4], finding: [2.25, -0.4] },
    pool: [0, 1.6],
  },
};

export function createActors(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.fog, 12, 19.5);
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffe2bd, 0x1b1511, 1.1));
  const rim = new THREE.DirectionalLight(0xffd9a8, 0.45); rim.position.set(-4, 3, -4); scene.add(rim);
  const key = new THREE.SpotLight(C.lamp, 80, 16, 0.36, 0.7, 1.4); key.position.set(0.6, 6.2, 4.4); scene.add(key, key.target);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(6.5, 64), new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95, transparent: true, depthWrite: false, alphaMap: radialTexture('#ffffff', '#000000') }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -0.6; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(246,196,83,0.5)', 'rgba(246,196,83,0)'), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004; scene.add(pool);

  const A = { tome: buildTome(), adsp: buildAdsp(), followthrough: buildFollowthrough(), finding: buildFinding() };
  let mode = 'wide';
  for (const id of ORDER) { const a = A[id]; const [x, z] = LAYOUT.wide.home[id]; a.pos = { x, z }; a.scale = 0.86; a.lift = 0; a.group.position.set(x, 0, z); scene.add(a.group); }

  let w = 1; let h = 1;
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    mode = window.innerWidth <= 600 ? 'tall' : 'wide';
    if (mode === 'wide') {
      // Keep the cast about the same width on 1180×690 and 1440×900: fix the horizontal view, derive the vertical.
      const d = 12.5; const halfW = 6.1;
      camera.fov = (2 * Math.atan(halfW / d / camera.aspect) * 180) / Math.PI;
      camera.position.set(0, 2.6, d); camera.lookAt(0, 0.62, -1.2);
    } else {
      const d = 9.5; const halfW = 3.5;
      camera.fov = (2 * Math.atan(halfW / d / camera.aspect) * 180) / Math.PI;
      camera.position.set(0, 1.6, d); camera.lookAt(0, 0.95, -0.4);
    }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  const v = new THREE.Vector3();
  const project = (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; };

  let last = performance.now();
  // state: { active: id|null, f: 0..1 through the active turn, close: 0..1 (the light moving to the name), still, time }
  function frame(state) {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = state.still ? 1 : 1 - Math.exp(-dt * 3.4); // about 0.8x the original speed
    const k2 = state.still ? 1 : 1 - Math.exp(-dt * 5.2); // walks: ~0.8 s to arrive, so the light (which follows) moves in ~0.7 s
    const L = LAYOUT[mode]; const close = state.close ?? 0;
    for (const id of ORDER) {
      const a = A[id]; const on = id === state.active;
      const home = close > 0.25 ? L.flank[id] : L.home[id];
      let [tx, tz] = home;
      if (on && L.front) [tx, tz] = L.front;
      if (on && !L.front) { tz = home[1] + 0.45; tx = home[0] * 0.8; }
      // two gentle followers in a row: the walk starts softly and ends softly (ease in and out)
      a.aim = a.aim ?? { x: a.pos.x, z: a.pos.z };
      a.aim.x = mix(a.aim.x, tx, k2); a.aim.z = mix(a.aim.z, tz, k2);
      a.pos.x = mix(a.pos.x, a.aim.x, k2); a.pos.z = mix(a.pos.z, a.aim.z, k2);
      const bob = state.still ? 0 : Math.sin(state.time * 0.8 + tx) * 0.01;
      a.group.position.set(a.pos.x, bob, a.pos.z);
      const target = on ? (mode === 'tall' ? 1.06 : 1.18) : close > 0.25 ? 0.72 : 0.86;
      a.scale = mix(a.scale, target, k); a.group.scale.setScalar(a.scale);
      // When it's not their turn they face the front spot a little; at the end they all turn toward the middle.
      const faceX = close > 0.25 ? 0 : (L.front ? L.front[0] : a.pos.x);
      const faceZ = close > 0.25 ? 1.2 : (L.front ? L.front[1] : 2);
      const yaw = on ? 0 : Math.atan2(faceX - a.pos.x, faceZ - a.pos.z) * (close > 0.25 ? 0.7 : 0.35);
      a.group.rotation.y = mix(a.group.rotation.y, yaw, k);
      a.eyeMat.emissiveIntensity = mix(a.eyeMat.emissiveIntensity, on ? 1.2 : 0.35, k);
    }
    pose(A, state);

    // The light follows whoever has the turn; at the close it leaves them for the empty middle.
    const act = A[state.active];
    const lx = act ? act.pos.x : L.pool[0]; const lz = act ? act.pos.z : L.pool[1];
    key.target.position.set(lx, 0.8, lz);
    const lit = act ? 1 : close;
    key.intensity = mix(key.intensity, act ? 85 : 30 + 10 * close, k);
    pool.position.x = mix(pool.position.x, lx, k); pool.position.z = mix(pool.position.z, lz, k);
    pool.material.opacity = mix(pool.material.opacity, mode === 'tall' && !act ? 0 : 0.25 + 0.75 * lit, k);
    renderer.render(scene, camera);
  }

  // Screen points (in the host's pixels) under each figure's feet and above its head, for the HTML labels.
  function anchors() {
    const out = {};
    for (const id of ORDER) { const a = A[id]; const hm = LAYOUT[mode].home[id]; out[id] = { foot: project(a.pos.x, -0.05, a.pos.z + 0.55), top: project(a.pos.x, 2.0 * a.scale, a.pos.z), homeFoot: project(hm[0], -0.05, hm[1] + 0.55) }; }
    out.front = LAYOUT[mode].front ? project(LAYOUT[mode].front[0], -0.05, LAYOUT[mode].front[1] + 0.5) : null;
    return out;
  }
  // Each figure's solid parts on screen (host pixels), one rectangle per part, without the soft floor shadow.
  // The overlap check keeps every caption out of all of them.
  const part = new THREE.Box3(); const corner = new THREE.Vector3();
  function boxes() {
    const out = {};
    for (const id of ORDER) {
      const g = A[id].group; g.updateWorldMatrix(true, true); const rects = [];
      g.traverseVisible((o) => {
        if (!o.isMesh || o.userData.soft) return;
        part.setFromObject(o);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < 8; i++) {
          corner.set(i & 1 ? part.max.x : part.min.x, i & 2 ? part.max.y : part.min.y, i & 4 ? part.max.z : part.min.z).project(camera);
          const x = (corner.x * 0.5 + 0.5) * w; const y = (-corner.y * 0.5 + 0.5) * h;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        rects.push({ left: x0, top: y0, right: x1, bottom: y1 });
      });
      out[id] = rects;
    }
    return out;
  }
  return { frame, anchors, boxes, resize, get mode() { return mode; } };
}

// Still portraits of the four figures in their resting pose, for pages where WebGL fails.
// tools/portraits.mjs calls this once and saves the PNGs into img/; the page never calls it.
export function portraits(w = 220, h = 300) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffe2bd, 0x1b1511, 1.3));
  const key = new THREE.SpotLight(C.lamp, 60, 14, 0.5, 0.7, 1.4); key.position.set(0.6, 6, 4.4); key.target.position.set(0, 0.8, 0); scene.add(key, key.target);
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 40); camera.position.set(0, 1.25, 5.4); camera.lookAt(0, 0.98, 0);
  const B = { tome: buildTome(), adsp: buildAdsp(), followthrough: buildFollowthrough(), finding: buildFinding() };
  pose(B, { active: null, f: 0, time: 0, still: true });
  const out = {};
  for (const id of ORDER) {
    for (const k of ORDER) B[k].group.visible = k === id;
    if (!B[id].group.parent) scene.add(B[id].group);
    for (const k of ORDER) if (k !== id && !B[k].group.parent) scene.add(B[k].group);
    renderer.render(scene, camera);
    out[id] = renderer.domElement.toDataURL('image/png');
  }
  renderer.dispose();
  return out;
}
