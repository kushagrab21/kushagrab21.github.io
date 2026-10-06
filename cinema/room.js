// The auditorium the film plays in, seen from a seat a few rows back.
// A big, gently curved screen; raked rows of seats in front (raked so no seat back crosses the picture);
// floodlights on the side walls that are the house lights: on as you arrive, down while the film plays, up at the end;
// the projector's beam through the haze while it plays; small step lights in the aisles that never go out.
// Words never go in here; app.js lays HTML over the rectangles this module reports.
import * as THREE from './vendor/three.module.min.js';
import { createDust } from './dust.js';

const SW = 28, SH = 15.75, SY = 9.4;     // the screen: width, height, centre height (metres)
const R = 46;                             // the screen's curve
const ROWS = 16, ROW_D = 2.2, RISE = 0.78, FRONT = 6.5;   // a steep rake, so every row sees over the one in front
const WARM = new THREE.Color('#ffd7a3');
const WHITE = new THREE.Color('#f2f4f8');    // the floodlights: white, as in the reference photographs
const GREY = new THREE.Color('#cfd3da');     // the projector's beam: greyish white
const lerp = (a, b, k) => a + (b - a) * k;

// a soft gradient for the visible beam of a light in the haze
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);   // soft edges across the beam
  side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.3, 'rgba(0,0,0,0)'); side.addColorStop(0.7, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

// a poster, blurred and darkened, for a film that is waiting its turn
function blurredPoster(img) {
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  const g = c.getContext('2d');
  g.filter = 'blur(9px) brightness(0.7) saturate(0.85)';
  g.drawImage(img, -20, -12, 520, 294);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// a light's beam: a cone from the lamp towards a target, glowing additively in the haze
function beam(tex, from, to, r0, r1, colour) {
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(r0, r1, len, 32, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: colour, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
  return m;
}

export function createRoom(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const ROOM = new THREE.Color('#0b0908');
  scene.background = ROOM;
  scene.fog = new THREE.Fog(ROOM, 40, 95);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  const btex = beamTexture();

  // ---------- the house ----------
  const fill = new THREE.HemisphereLight('#e6e2dc', '#0d0a08', 0.2); scene.add(fill);
  const W2 = 19;                                            // half the hall's width
  const backZ = FRONT + ROWS * ROW_D + 4;
  const wallMat = new THREE.MeshStandardMaterial({ color: '#171312', roughness: 0.95 });
  const panelMat = new THREE.MeshStandardMaterial({ color: '#1f1a18', roughness: 0.9 });
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(backZ + 6, 26), wallMat);
    wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * W2, 10, backZ / 2 - 3); scene.add(wall);
    // tall fabric panels along the walls: the room's rhythm
    for (let z = 2; z < backZ - 2; z += 4.2) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 14, 3.4), panelMat);
      p.position.set(s * (W2 - 0.13), 9.5 + (z / backZ) * 3, z); scene.add(p);
    }
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, 30), new THREE.MeshStandardMaterial({ color: '#0c0a0a', roughness: 1 })); front.position.set(0, 11, -2.2); scene.add(front);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, backZ + 6), new THREE.MeshStandardMaterial({ color: '#0a0908', roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 24, backZ / 2 - 3); scene.add(ceiling);
  // the stage floor in front of the screen
  const stage = new THREE.Mesh(new THREE.BoxGeometry(2 * W2, 1, 8), new THREE.MeshStandardMaterial({ color: '#121010', roughness: 0.7 }));
  stage.position.set(0, -0.5, 2); scene.add(stage);

  // ---------- the screen: black masking, then the curved picture ----------
  // The screen is as wide as the window allows, from 16:9 up to 2.2:1 (near the wide cinema ratio). The film itself stays 16:9, sharp and
  // uncropped in the middle; the screen beyond its sides carries the film's own edge colours, softened, so the picture seems to run on.
  const FILM = 16 / 9;
  let sw = SW, th = SW / R, screenAspect = FILM;
  const curve = (r, w, h) => new THREE.CylinderGeometry(r, r, h, 64, 1, true, Math.PI - w / r / 2, w / r);
  const mask = new THREE.Mesh(curve(R + 0.06, SW + 3.2, SH + 2.4), new THREE.MeshBasicMaterial({ color: '#0a0807', side: THREE.DoubleSide }));
  mask.position.set(0, SY, R); scene.add(mask);
  const screenMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, toneMapped: false, fog: false,
    uniforms: { map: { value: null }, uDim: { value: 1 }, uSA: { value: FILM }, uFA: { value: FILM } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uDim, uSA, uFA; varying vec2 vUv;
      void main() {
        float u = 1.0 - vUv.x;                              // drawn on the inside of the curve: left and right flipped back
        float fu = (u - 0.5) * uSA / uFA + 0.5;             // where this point falls in the 16:9 film
        vec3 c;
        if (fu >= 0.0 && fu <= 1.0) c = texture2D(map, vec2(fu, vUv.y)).rgb;
        else {
          float beyond = fu < 0.0 ? -fu : fu - 1.0;         // how far past the film's edge
          float e = fu < 0.0 ? 0.0 : 1.0, dir = fu < 0.0 ? 1.0 : -1.0;
          vec3 acc = vec3(0.0);
          for (int i = 0; i < 5; i++) for (int j = 0; j < 5; j++) {   // a wide, soft average of the film's edge region: a glow, never lines
            float x = e + dir * float(i) / 4.0 * 0.2;
            float y = clamp(vUv.y + (float(j) / 4.0 - 0.5) * (0.3 + beyond * 0.9), 0.0, 1.0);
            acc += texture2D(map, vec2(x, y)).rgb;
          }
          c = acc / 25.0 * mix(0.34, 0.08, smoothstep(0.0, 0.22, beyond));
        }
        gl_FragColor = vec4(c * uDim, 1.0);   // the film's own colours, passed straight through (no colour-space conversion either way)
      }`,
  });
  const screen = new THREE.Mesh(curve(R, SW, SH), screenMat);
  screen.position.set(0, SY, R); scene.add(screen);
  function setScreenAspect(a) {
    a = Math.min(1.95, Math.max(FILM, a));   // close to the film's own 16:9: wider read as stretched on a wide window (your feedback)
    if (Math.abs(a - screenAspect) < 0.01) return;
    screenAspect = a; sw = SH * a; th = sw / R;
    screen.geometry.dispose(); screen.geometry = curve(R, sw, SH);
    mask.geometry.dispose(); mask.geometry = curve(R + 0.06, sw + 3.2, SH + 2.4);
    screenMat.uniforms.uSA.value = a;
  }

  // ---------- seats: raked rows, bent to face the screen ----------
  const seatW = 1.12, perRow = 15, aisle = 2.6;
  const parts = {
    back: { geo: new THREE.BoxGeometry(0.98, 1.05, 0.2), mat: new THREE.MeshStandardMaterial({ color: '#6b1d1b', roughness: 0.92 }) },
    top: { geo: new THREE.CylinderGeometry(0.1, 0.1, 0.98, 10), mat: new THREE.MeshStandardMaterial({ color: '#7d2422', roughness: 0.88 }) },
    cush: { geo: new THREE.BoxGeometry(0.94, 0.16, 0.72), mat: new THREE.MeshStandardMaterial({ color: '#521614', roughness: 0.95 }) },
    arm: { geo: new THREE.BoxGeometry(0.11, 0.08, 0.78), mat: new THREE.MeshStandardMaterial({ color: '#17110e', roughness: 0.5 }) },
  };
  const seats = [];
  for (let k = 0; k < ROWS; k++) {
    const z0 = FRONT + k * ROW_D, y0 = k * RISE, Rr = z0 + 30;   // rows bend round a point behind the screen
    for (let j = 0; j < perRow; j++) {
      const a = ((j - (perRow - 1) / 2) * seatW) / Rr;
      seats.push({ x: Math.sin(a) * Rr, z: z0 + (Rr - Math.cos(a) * Rr), y: y0, a });
    }
    const riser = new THREE.Mesh(new THREE.BoxGeometry(2 * W2, RISE, ROW_D), new THREE.MeshStandardMaterial({ color: '#141110', roughness: 0.95 }));
    riser.position.set(0, y0 - RISE / 2, z0 + 0.7); scene.add(riser);
    // step lights in the side aisles: always on, at exit-light level
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: '#c98a3a' }));
      lamp.position.set(s * ((perRow / 2) * seatW + aisle / 2), y0 + 0.03, z0 - 0.4); scene.add(lamp);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  const place = (name, off, rotX = 0) => {
    const p = parts[name], sides = name === 'arm' ? [-1, 1] : [0];
    const im = new THREE.InstancedMesh(p.geo, p.mat, seats.length * sides.length);
    let n = 0;
    for (const s of seats) for (const side of sides) {
      q.setFromEuler(new THREE.Euler(rotX, -s.a, name === 'top' ? Math.PI / 2 : 0, 'YXZ'));
      const v = new THREE.Vector3(off[0] + side * 0.52, off[1], off[2]).applyAxisAngle(UP, -s.a).add(new THREE.Vector3(s.x, s.y, s.z));
      m4.compose(v, q, one); im.setMatrixAt(n++, m4);
    }
    scene.add(im);
  };
  place('back', [0, 0.95, 0.35], -0.16);
  place('top', [0, 1.48, 0.43]);
  place('cush', [0, 0.42, -0.02]);
  place('arm', [0, 0.66, 0]);

  // ---------- floodlights: the house lights ----------
  const floods = [];
  // each floodlight lights the wall and stage just outside the screen's edge on its own side, never the picture (as in the reference halls)
  for (const s of [-1, 1]) for (const z of [3, 11]) {
    const target = new THREE.Vector3(s * (W2 - 0.6), SY - (z < 5 ? 3 : 6.5), 0.6);   // the corner where the side wall meets the screen wall
    const pos = new THREE.Vector3(s * (W2 - 0.9), 17.5 - z * 0.15, z);
    const sp = new THREE.SpotLight(WHITE, 0, 0, 0.42, 0.7, 0); sp.position.copy(pos); sp.target.position.copy(target);
    scene.add(sp, sp.target);
    // the fixture: a dark can, with only its lens lit
    const aimQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(pos).normalize());
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.1, 24), new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 0.45, metalness: 0.6 }));
    can.position.copy(pos).add(new THREE.Vector3(0, 0.55, 0).applyQuaternion(aimQ)); can.quaternion.copy(aimQ); scene.add(can);
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshBasicMaterial({ color: WHITE, side: THREE.DoubleSide }));
    head.position.copy(pos).add(new THREE.Vector3(0, -0.02, 0).applyQuaternion(aimQ)); head.quaternion.copy(aimQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)); scene.add(head);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.4), new THREE.MeshStandardMaterial({ color: '#15100d' }));
    housing.position.set(s * (W2 - 0.25), pos.y, z); scene.add(housing);
    const end = target.clone().lerp(pos, 0.15);
    const b = beam(btex, pos, end, 0.45, 4.2, WHITE); scene.add(b);
    floods.push({ sp, head, b, from: pos.clone(), to: end, r0: 0.45, r1: 4.2 });
  }
  // wall washers along the sides: small warm glows that make the room readable when the house is up
  const washers = [];
  for (const s of [-1, 1]) for (let z = 8; z < backZ - 4; z += 8.4) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ color: WHITE }));
    g.position.set(s * (W2 - 0.3), 6.2 + z * 0.12, z); g.rotation.y = -s * Math.PI / 2; scene.add(g);
    const l = new THREE.PointLight('#e9e4dc', 0, 12, 1.6); l.position.set(s * (W2 - 1.2), 6.6 + z * 0.12, z); scene.add(l);
    washers.push({ g, l });
  }

  // ---------- the picture's light: spill on the room, and the projector beam ----------
  const spill = new THREE.PointLight('#ffffff', 0, 0, 0); spill.position.set(0, SY - 2, 7); scene.add(spill);
  const behind = new THREE.DirectionalLight('#e8dccd', 0.3); behind.position.set(4, 30, backZ + 20); behind.target.position.set(0, 0, 0); scene.add(behind, behind.target);
  const booth = new THREE.Vector3(0, ROWS * RISE + 7.5, backZ - 0.5);
  const projTo = new THREE.Vector3(0, SY, 0.5);
  const projBeam = beam(btex, booth, projTo, 0.15, 11, GREY); scene.add(projBeam);
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: GREY }));
  port.position.copy(booth).add(new THREE.Vector3(0, 0, -0.05)); port.rotation.y = Math.PI; scene.add(port);

  // dust drifting in the light: most of it in the projector's beam, some in each floodlight's
  const dust = createDust([{ from: booth, to: projTo, r0: 0.15, r1: 11, count: 1800 }, ...floods.map((f) => ({ from: f.from, to: f.to, r0: f.r0, r1: f.r1, count: 380 }))]);
  scene.add(dust.points);

  // ---------- the film waiting its turn: a dim, blurred lightbox on the front wall, right of the screen, turned a little towards you ----------
  const waitMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, toneMapped: false });
  const waitPic = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.7), waitMat);
  waitPic.position.set(17.4, 6.8, -1.2); waitPic.rotation.y = -0.36; scene.add(waitPic);

  const textures = new Map(), loader = new THREE.TextureLoader();
  function poster(url) {
    if (!textures.has(url)) { const t = loader.load(url); t.colorSpace = THREE.NoColorSpace; textures.set(url, t); }   // raw, like the video: the screen shader passes colours through
    return textures.get(url);
  }

  let videoTex = null, W = 1, H = 1;
  const PITCH = THREE.MathUtils.degToRad(5);   // looking slightly down: the screen leans a little towards you, and the rows step down below it

  function aimDown() { const c = camera.position; camera.lookAt(0, c.y - Math.tan(PITCH) * c.z, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }

  // Where you sit and how you look: high at the back of the rows (a raised back aisle), looking slightly down.
  // The head never tilts to fit the page. The frame shifts instead, like an architect's camera, so the screen keeps the same lean on every window shape.
  // topPx: where the screen's top edge lands (under the sign). bottomPx: the lowest its bottom edge may come; below that are the seats.
  function layout(w, h, topPx = null, bottomPx = null, maxWPx = null) {
    W = w; H = h; renderer.setSize(w, h, false);
    const aspect = w / h, phone = aspect < 1; camera.aspect = aspect;
    const row = phone ? ROWS - 1 : 11;
    camera.position.set(0, row * RISE + (phone ? 4.6 : 3.2), FRONT + row * ROW_D + 0.6);   // on a tall phone, higher still, so the near rows don't loom
    const top = topPx ?? h * 0.12, bottom = bottomPx ?? h * (phone ? 0.58 : 0.72), maxW = maxWPx ?? w * (phone ? 0.94 : 0.8);
    setScreenAspect(maxW / (bottom - top) * 0.97);   // as wide as the window allows, 16:9 to 1.95:1
    camera.clearViewOffset(); camera.fov = 45; aimDown();
    for (let i = 0; i < 4; i++) {           // size: as big as fits between the sign and the seats, and within the width
      const r = screenRect();
      const k = Math.min((bottom - top) / r.height, maxW / r.width);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / k));
      camera.updateProjectionMatrix();
    }
    const r = screenRect();
    camera.setViewOffset(w, h, 0, r.top - top, w, h);   // place: shift the frame so the top edge lands under the sign
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }

  function screenRect() {
    screen.updateMatrixWorld();
    const pts = [];
    for (const fx of [-1, -0.5, 0, 0.5, 1]) for (const fy of [-1, 1]) {
      const a = Math.PI + fx * th / 2;
      const p = new THREE.Vector3(R * Math.sin(a), fy * SH / 2, R * Math.cos(a)).applyMatrix4(screen.matrixWorld).project(camera);
      pts.push([(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]);
    }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  // the colour of the picture, sampled small, so the room takes on the film's light
  const probe = document.createElement('canvas'); probe.width = 8; probe.height = 5;
  const pg = probe.getContext('2d', { willReadFrequently: true });
  const spillCol = new THREE.Color('#ffe6c8'); let spillLum = 0.4, lastProbe = 0;
  function sample(video, now) {
    if (!video || video.readyState < 2 || now - lastProbe < 140) return;
    lastProbe = now;
    try {
      pg.drawImage(video, 0, 0, 8, 5);
      const px = pg.getImageData(0, 0, 8, 5).data; let r = 0, g = 0, b = 0;
      for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
      const n = px.length / 4; r /= n * 255; g /= n * 255; b /= n * 255;
      const mx = Math.max(r, g, b, 0.05);
      spillCol.lerp(new THREE.Color(r / mx, g / mx, b / mx), 0.35); spillLum = lerp(spillLum, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.35);
    } catch { /* a film from another origin can't be read; the spill stays warm */ }
  }

  const state = { house: 1, endDim: 0, waitShow: 0, waitForward: 0 };
  let video = null;

  return {
    frame: 'hall',
    layout,
    screenRect,
    // the share of the screen's width on each side that is extension, not film
    get filmInset() { return (1 - FILM / screenAspect) / 2; },
    setFilm(v, posterUrl) {
      video = v;
      screenMat.uniforms.map.value = poster(posterUrl);
      if (videoTex) videoTex.dispose();
      videoTex = new THREE.VideoTexture(v); videoTex.colorSpace = THREE.NoColorSpace;   // raw: decoding then re-encoding brightened the film by a whole gamma (milky)
      videoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();   // crisper where the curve turns the picture away from you
      const use = () => { screenMat.uniforms.map.value = videoTex; };
      if (v.readyState >= 2) use(); else for (const ev of ['loadeddata', 'seeked', 'playing']) v.addEventListener(ev, use, { once: true });
    },
    setWaiting(posterUrl) {
      if (!posterUrl) { state.waitShow = 0; return; }
      const img = new Image();
      img.onload = () => { waitMat.map = blurredPoster(img); waitMat.needsUpdate = true; };
      img.src = posterUrl; state.waitShow = 1;
    },
    // after a seek while paused the video makes no new frames by itself: take the current one
    refresh() { if (videoTex) videoTex.needsUpdate = true; },
    get showing() { return screenMat.uniforms.map.value === videoTex ? 'video' : 'poster'; },
    set(k) { Object.assign(state, k); },
    get state() { return { ...state }; },
    render(now = performance.now()) {
      sample(video, now);
      const hs = state.house, dark = 1 - hs;
      fill.intensity = 0.1 + 0.3 * hs;
      behind.intensity = 0.8 + 0.3 * hs;   // the seats stay readable in the dark, as in the reference halls; the near-black walls barely take it
      for (const f of floods) {
        f.sp.intensity = 0.1 + 2.6 * hs;
        f.head.material.color.copy(WHITE).multiplyScalar(0.18 + 0.82 * hs);
        f.b.material.opacity = 0.08 + 0.17 * hs;   // a low glow stays on while the film plays, so the dust in it can be seen
      }
      for (const w of washers) { w.l.intensity = 0.03 + 1.4 * hs; w.g.material.color.copy(WHITE).multiplyScalar(0.12 + 0.88 * hs); }
      spill.color.copy(spillCol);
      spill.intensity = (0.25 + 1.6 * spillLum) * (0.35 + 0.65 * dark) * (1 - 0.5 * state.endDim);
      projBeam.material.opacity = 0.11 * dark * (1 - state.endDim) * (0.5 + spillLum);
      port.material.color.setScalar(0.25 + 0.75 * dark * (1 - state.endDim));
      screenMat.uniforms.uDim.value = 1 - 0.8 * state.endDim;
      waitMat.opacity = state.waitShow * (1 - state.waitForward) * (0.55 + 0.4 * hs);
      const projOn = dark * (1 - state.endDim) * (0.45 + spillLum);
      dust.update(now / 1000, [projOn * 1.3, ...floods.map(() => 0.42 + 0.45 * hs)], (H * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.05, renderer.getPixelRatio());
      renderer.render(scene, camera);
    },
  };
}
