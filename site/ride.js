// The view from the front of the train: one line of track, its stations, and a camera that rides it.
// A line can end at a junction (two branches into tunnels), or begin just after a tunnel.
import * as THREE from './vendor/three.module.min.js';

const ROOM = new THREE.Color('#3b2e24');
const LAMP = new THREE.Color('#f6c453');
const UP = new THREE.Vector3(0, 1, 0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const PLATFORM = 110;      // metres of straight track at each station
const BETWEEN = 230;       // metres of track between two stations
const LEAD = 150;          // track before the first station and after the last
const TO_JUNCTION = 150;   // from the last station's centre to the split
const BRANCH = 250;        // length of each branch after the split
const TUNNEL_AT = 150;     // where a branch enters its tunnel

function walk(start, heading0) {
  const pts = [start.clone()];
  let p = start.clone(), heading = heading0;
  return {
    pts,
    get heading() { return heading; },
    step(len, turn) {
      const n = Math.max(1, Math.round(len / 10));
      for (let i = 0; i < n; i++) {
        heading += turn / n;
        p = p.clone().add(new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading)).multiplyScalar(len / n));
        pts.push(p);
      }
    },
  };
}

const frameOf = (curve, u) => {
  const pos = curve.getPointAt(clamp01(u)), tan = curve.getTangentAt(clamp01(u)).normalize();
  return { pos, tan, left: new THREE.Vector3().crossVectors(UP, tan).normalize() };
};

export class Ride {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(ROOM, 20, 210);
    this.scene.background = ROOM.clone();
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 600);
    this.scene.add(new THREE.HemisphereLight('#9c8068', '#1a130f', 0.95));
    this.scene.add(new THREE.AmbientLight('#4a3a2e', 0.6));
    // the train's own headlamp: makes the rails gleam ahead
    this.head = new THREE.SpotLight('#ffe9c2', 38, 110, 0.42, 0.6, 1.4);
    this.scene.add(this.head, this.head.target);
    this.group = null;
    this.u = 0;
    this.turn = 0;            // 0 = looking down the line, 1 = turned to the platform window
    this.choice = null;       // at a junction: 'left' or 'right' once chosen
    this.textures = new THREE.TextureLoader();
    const g = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: '#33291f', roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.02; this.scene.add(g);
  }

  /* ---------- building one line ---------- */

  build(stops, colour, opts = {}) {
    if (this.group) { this.scene.remove(this.group); this.group.traverse((o) => { o.geometry?.dispose(); }); }
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.colour = colour;
    this.choice = null;
    this.junction = null;
    this.branches = {};

    // Walk the line: straight through each station, a gentle bend between them.
    const w = walk(new THREE.Vector3(), 0);
    w.step(LEAD, 0);
    const centres = [];
    stops.forEach((s, i) => {
      w.step(PLATFORM / 2, 0); centres.push(w.pts.length - 1); w.step(PLATFORM / 2, 0);
      if (i < stops.length - 1) w.step(BETWEEN, (i % 2 ? -1 : 1) * 0.42);
    });
    if (opts.junction) w.step(TO_JUNCTION - PLATFORM / 2, 0); else w.step(LEAD, 0.2);
    this.curve = new THREE.CatmullRomCurve3(w.pts, false, 'centripetal');
    this.length = this.curve.getLength();
    const samples = 3000, sp = this.curve.getSpacedPoints(samples);
    this.stationU = centres.map((ci) => {
      let best = 0, bd = Infinity;
      sp.forEach((q, k) => { const d = q.distanceToSquared(w.pts[ci]); if (d < bd) { bd = d; best = k; } });
      return best / samples;
    });

    this.#lay(this.curve, true);
    this.stations = stops.map((s, i) => this.#station(s, this.stationU[i]));

    if (opts.junction) this.#junction(w.pts.at(-1), w.heading, opts.junction);
    if (opts.tunnelAfterFirst && stops.length > 1) {
      const a = this.stationU[0] * this.length + PLATFORM / 2 + 30;
      this.#tunnel(this.curve, a, a + 90);
      this.tunnelU = (a + 55) / this.length;      // where you come out of the junction's tunnel
    }
  }

  // rails, sleepers, ballast and masts along any curve
  #lay(curve, masts) {
    const L = curve.getLength();
    const rail = (off) => {
      const pts = curve.getSpacedPoints(Math.round(L / 4)).map((q, k, a) => q.clone().addScaledVector(frameOf(curve, k / (a.length - 1)).left, off).setY(0.16));
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.round(L / 2), 0.055, 6),
        new THREE.MeshStandardMaterial({ color: '#a39a90', metalness: 0.95, roughness: 0.28 }));
    };
    this.group.add(rail(0.75), rail(-0.75));
    const n = Math.floor(L / 0.75);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: '#40352d', roughness: 1 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), fwd = new THREE.Vector3(0, 0, -1);
    for (let i = 0; i < n; i++) {
      const { pos, tan } = frameOf(curve, i / n);
      m.compose(pos.clone().setY(0.06), q.setFromUnitVectors(fwd, tan), one); sleepers.setMatrixAt(i, m);
    }
    this.group.add(sleepers);
    const k = Math.round(L / 3), pos = [], idx = [];
    for (let i = 0; i <= k; i++) {
      const { pos: c, left } = frameOf(curve, i / k);
      const a = c.clone().addScaledVector(left, 2.4), b = c.clone().addScaledVector(left, -2.4);
      pos.push(a.x, 0.02, a.z, b.x, 0.02, b.z);
      if (i < k) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const bed = new THREE.BufferGeometry();
    bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bed.setIndex(idx); bed.computeVertexNormals();
    this.group.add(new THREE.Mesh(bed, new THREE.MeshStandardMaterial({ color: '#3a3029', roughness: 1, side: THREE.DoubleSide })));
    if (!masts) return;
    const every = 24, count = Math.floor(L / every) * 2;
    const mat = new THREE.MeshStandardMaterial({ color: '#463c34', roughness: 0.8 });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 6.4, 6), mat, count);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), mat, count);
    let j = 0;
    for (let i = 0; i < count / 2; i++) {
      const u = (i * every) / L, { pos: c, tan, left } = frameOf(curve, u);
      if ((this.stationU || []).some((su) => Math.abs(su - u) * L < PLATFORM / 2 + 4)) continue;
      if (curve === this.curve && u * L < 100) continue;          // the landing platform at the start of the line
      q.setFromUnitVectors(fwd, tan);
      for (const side of [1, -1]) {
        m.compose(c.clone().addScaledVector(left, side * 3.6).setY(3.2), q, one); poles.setMatrixAt(j, m);
        m.compose(c.clone().addScaledVector(left, side * 2.6).setY(6.1), q, one); arms.setMatrixAt(j, m);
        j++;
      }
    }
    poles.count = arms.count = j;
    this.group.add(poles, arms);
  }

  // a tunnel over the track between two distances along a curve, with a stone portal and dim lamps inside
  #tunnel(curve, s0, s1) {
    const L = curve.getLength(), wall = new THREE.MeshStandardMaterial({ color: '#1b1511', roughness: 1, side: THREE.DoubleSide });
    const lampMat = new THREE.MeshBasicMaterial({ color: '#c99a46' });
    const fwd = new THREE.Vector3(0, 0, -1), q = new THREE.Quaternion();
    for (let s = s0; s < s1; s += 6) {
      const { pos, tan, left } = frameOf(curve, s / L);
      q.setFromUnitVectors(fwd, tan);
      for (const side of [1, -1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.5, 6.2), wall);
        w.position.copy(pos).addScaledVector(left, side * 3.6).setY(3.25); w.quaternion.copy(q); this.group.add(w);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.6, 6.2), wall);
      roof.position.copy(pos).setY(6.5); roof.quaternion.copy(q); this.group.add(roof);
      if (Math.round((s - s0) / 6) % 3 === 0) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.7), lampMat);
        l.position.copy(pos).addScaledVector(left, 3.25).setY(4.2); l.quaternion.copy(q); this.group.add(l);
      }
    }
    const { pos, tan, left } = frameOf(curve, s0 / L);
    q.setFromUnitVectors(fwd, tan);
    const stone = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.9 });
    for (const [x, y, w, h] of [[-7.5, 4.5, 8, 9], [7.5, 4.5, 8, 9], [0, 8.2, 7.2, 1.6]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2), stone);
      b.position.copy(pos).addScaledVector(left, -x).setY(y); b.quaternion.copy(q); this.group.add(b);
    }
  }

  // where the line splits: two branches, a sign gantry with signals, and a tunnel down each branch
  #junction(at, heading, labels) {
    for (const [side, turn] of [['left', -0.62], ['right', 0.62]]) {
      const w = walk(at, heading);
      w.step(120, turn); w.step(BRANCH - 120, 0);
      const curve = new THREE.CatmullRomCurve3(w.pts, false, 'centripetal');
      this.#lay(curve, false);
      this.#tunnel(curve, TUNNEL_AT, BRANCH + 10);
      this.branches[side] = { curve, length: curve.getLength() };
    }
    // the gantry over the split
    const g = new THREE.Group(), { pos, tan } = frameOf(this.curve, (this.length - 14) / this.length);
    g.position.copy(pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tan);
    const steel = new THREE.MeshStandardMaterial({ color: '#4d433a', roughness: 0.7 });
    for (const x of [-6.5, 6.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), steel); p.position.set(x, 4, 0); g.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.4, 0.4), steel); beam.position.set(0, 7.9, 0); g.add(beam);
    const lit = new THREE.PointLight('#ffe2a8', 30, 30, 1.6); lit.position.set(0, 4, 6); g.add(lit);
    this.signals = {};
    for (const [side, x, arrow] of [['left', -3.25, 'left'], ['right', 3.25, 'right']]) {
      const l = labels[side];
      const tex = this.#sign(l.name, l.gloss, l.colour, arrow);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.1), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55 }));
      board.position.set(x, 6.6, 0.25); g.add(board);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: '#c0392b' }));
      lamp.position.set(x, 5.05, 0.3); g.add(lamp);
      this.signals[side] = lamp;
    }
    this.group.add(g);
    this.junction = { decisionU: (this.length - 32) / this.length };
  }

  setSignal(side) {
    for (const [k, lamp] of Object.entries(this.signals || {})) lamp.material.color.set(k === side ? '#47c26b' : '#c0392b');
  }

  #sign(name, gloss, colour, arrow) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 348;
    const g = c.getContext('2d');
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, 1024, 348);
    g.fillStyle = colour; g.fillRect(0, 236, 1024, 112);
    g.fillStyle = '#1d1a17'; g.font = '700 120px Overpass, system-ui, sans-serif'; g.textBaseline = 'middle';
    const a = arrow === 'left' ? '←  ' : '', b = arrow === 'right' ? '  →' : '';
    g.textAlign = arrow === 'left' ? 'left' : 'right';
    g.fillText(a + name + b, arrow === 'left' ? 44 : 980, 120, 940);
    g.fillStyle = '#fff'; g.font = '600 56px Overpass, system-ui, sans-serif';
    g.fillText(gloss, arrow === 'left' ? 44 : 980, 294, 940);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  #board(name, gloss, colour) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 300;
    const g = c.getContext('2d');
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, 1024, 300);
    g.fillStyle = colour; g.fillRect(0, 196, 1024, 104);
    g.fillStyle = '#1d1a17'; g.font = '700 128px Overpass, system-ui, sans-serif'; g.textBaseline = 'middle';
    g.fillText(name, 44, 104, 940);
    g.fillStyle = '#fff'; g.font = '600 58px Overpass, system-ui, sans-serif';
    g.fillText(gloss, 44, 250, 940);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  #posterTexture(stop) {
    if (stop.poster) { const t = this.textures.load(stop.poster); t.colorSpace = THREE.SRGBColorSpace; return t; }
    // a page-like card for stops that are writing, not a product
    const c = document.createElement('canvas'); c.width = 960; c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#2a221d'; g.fillRect(0, 0, 960, 600);
    g.fillStyle = '#f6c453'; g.fillRect(64, 70, 120, 8);
    g.fillStyle = '#f3ece2'; g.font = '700 64px Overpass, system-ui, sans-serif'; g.fillText(stop.name, 64, 170, 840);
    g.fillStyle = '#c9bdb0'; g.font = '400 36px Overpass, system-ui, sans-serif';
    (stop.lines || []).forEach((l, i) => g.fillText(l, 64, 250 + i * 54, 840));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  #blurred(stop) {
    const c = document.createElement('canvas'); c.width = 480; c.height = 300;
    const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const paint = (img) => { g.filter = 'blur(10px)'; g.drawImage(img, -20, -20, 520, 340); t.needsUpdate = true; };
    if (stop.poster) { const img = new Image(); img.onload = () => paint(img); img.src = stop.poster; }
    else paint(this.#posterTexture(stop).image);
    return t;
  }

  #station(stop, u) {
    const { pos, tan } = frameOf(this.curve, u);
    const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tan);
    // in station space: -z is the direction of travel, -x is the platform side
    const concrete = new THREE.MeshStandardMaterial({ color: '#3b332d', roughness: 0.95 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(5, 1.05, PLATFORM), concrete); plat.position.set(-4.1, 0.52, 0); g.add(plat);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, PLATFORM), new THREE.MeshStandardMaterial({ color: '#bfb393', roughness: 0.7 }));
    edge.position.set(-1.85, 1.07, 0); g.add(edge);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.2, PLATFORM), new THREE.MeshStandardMaterial({ color: '#2a221d', roughness: 1 }));
    wall.position.set(-6.8, 2.6, 0); g.add(wall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, PLATFORM * 0.8), new THREE.MeshStandardMaterial({ color: '#2b231e', roughness: 1 }));
    roof.position.set(-4.1, 5.4, 0); g.add(roof);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: LAMP, emissiveIntensity: 1.6 });
    for (let z = -PLATFORM * 0.38; z <= PLATFORM * 0.38; z += 11) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.22), lampMat); l.position.set(-3.6, 5.25, z); g.add(l);
    }
    const light = new THREE.PointLight(LAMP, 0, 55, 1.7); light.position.set(-3, 4.6, 0); g.add(light);

    // the lit window on the back wall: the product, already playing
    const W = 7.2, H = 4.5;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: this.#posterTexture(stop), toneMapped: false, fog: false }));
    win.position.set(-6.55, 3.2, 0); win.rotation.y = Math.PI / 2; g.add(win);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.36, H + 0.36), new THREE.MeshBasicMaterial({ color: LAMP.clone(), toneMapped: false }));
    frame.position.set(-6.58, 3.2, 0); frame.rotation.y = Math.PI / 2; g.add(frame);

    // running-in boards: one angled to the approaching train, one square at the stopping point
    const tex = this.#board(stop.name, stop.gloss, this.colour);
    const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35 });
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.23), boardMat); b1.position.set(-3.7, 3.1, PLATFORM * 0.42); b1.rotation.y = Math.PI / 2 - 0.95; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.23), boardMat); b2.position.set(-4.9, 3.0, -13); b2.rotation.y = Math.PI / 2; g.add(b2);
    for (const b of [b1, b2]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), concrete); post.position.set(b.position.x, 1.9, b.position.z); g.add(post); }

    // the glow you see from far away: the next station is the one yellow light
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const x = gc.getContext('2d'), r = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,214,120,0.9)'); r.addColorStop(0.35, 'rgba(246,196,83,0.35)'); r.addColorStop(1, 'rgba(246,196,83,0)');
    x.fillStyle = r; x.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    glow.position.set(-2, 5, 0); glow.scale.set(80, 46, 1); g.add(glow);

    // the products' own pictures, blurred, standing far off beside the line like lit buildings
    for (const [cx, cz, cw] of [[38, 30, 26], [-44, -40, 30], [62, -90, 34]]) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(cw, cw * 0.62), new THREE.MeshBasicMaterial({ map: this.#blurred(stop), transparent: true, opacity: 0.55, depthWrite: false }));
      card.position.set(cx, cw * 0.31 + 2, cz); card.rotation.y = cx > 0 ? -0.7 : 0.7; g.add(card);
    }
    this.group.add(g);
    return { u, group: g, light, glow, win, frame };
  }

  /* ---------- the landing: a platform before the first station, and a train that passes once ---------- */

  buildLanding(cars) {
    const L = this.length, g = new THREE.Group();
    const at = (s) => frameOf(this.curve, s / L);
    const { pos, tan } = at(50);
    const plat = new THREE.Group(); plat.position.copy(pos); plat.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tan);
    const concrete = new THREE.MeshStandardMaterial({ color: '#3b332d', roughness: 0.95 });
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); plat.add(b); return b; };
    box(5, 1.05, 90, -4.1, 0.52, 0, concrete);
    box(0.45, 0.04, 90, -1.85, 1.07, 0, new THREE.MeshStandardMaterial({ color: '#bfb393', roughness: 0.7 }));
    box(5.6, 0.25, 70, -4.1, 5.4, 0, new THREE.MeshStandardMaterial({ color: '#2b231e', roughness: 1 }));
    const lampMat = new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: LAMP, emissiveIntensity: 1.6 });
    for (let z = -30; z <= 30; z += 10) box(1.4, 0.06, 0.22, -3.6, 5.25, z, lampMat);
    const light = new THREE.PointLight(LAMP, 46, 60, 1.5); light.position.set(-3, 4.6, 0); plat.add(light);
    const light2 = new THREE.PointLight(LAMP, 30, 50, 1.5); light2.position.set(-3, 4.6, -32); plat.add(light2);
    // the platform's own name board, in the same style as every station's
    const tex = this.#board('Kushagra Bhatnagar', 'Things I built · Research · Writing', this.colour);
    const nameMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.4 });
    for (const [z, rot, w] of [[-18, 0.32, 6.4], [-40, Math.PI / 2, 5.4]]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.293), nameMat);
      b.position.set(-3.5, 3.2, z); b.rotation.y = rot; plat.add(b);
      const bottom = 3.2 - (w * 0.293) / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, bottom - 1.05, 6), concrete); post.position.set(-3.5, (bottom + 1.05) / 2, z); plat.add(post);
    }
    g.add(plat);

    // the train: dark carriages whose windows carry the products' pictures, blurred and streaked
    this.carriages = cars.map((stop, i) => {
      const c = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3, 3.5, 20), new THREE.MeshStandardMaterial({ color: '#2a221d', roughness: 0.6, metalness: 0.3 }));
      body.position.y = 2.1; c.add(body);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.4), new THREE.MeshBasicMaterial({ map: this.#smeared(stop), toneMapped: false }));
      win.position.set(-1.52, 2.6, 0); win.rotation.y = -Math.PI / 2; c.add(win);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 0.12), new THREE.MeshBasicMaterial({ color: stop.colour || '#e07a5f' }));
      stripe.position.set(-1.52, 1.5, 0); stripe.rotation.y = -Math.PI / 2; c.add(stripe);
      if (i === 0) {
        const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.#dot('255,236,190'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
        lamp.scale.set(7, 7, 1); lamp.position.set(0, 1.6, -10.2); c.add(lamp);
      }
      if (i === cars.length - 1) {
        const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.#dot('210,60,45'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
        tail.scale.set(2.6, 2.6, 1); tail.position.set(0, 1.4, 10.2); c.add(tail);
      }
      c.visible = false; g.add(c);
      return c;
    });
    this.landingGroup = g;
    this.group.add(g);
  }

  #dot(rgb) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(0.3, `rgba(${rgb},0.5)`); r.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = r; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  #smeared(stop) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64;
    const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    g.fillStyle = '#f6d9a0'; g.fillRect(0, 0, 512, 64);
    const paint = (img) => {
      g.filter = 'blur(6px)';
      for (let k = 0; k < 6; k++) { g.globalAlpha = 0.35; g.drawImage(img, -40 + k * 14, -30, 600, 124); }
      g.globalAlpha = 1; t.needsUpdate = true;
    };
    if (stop.poster) { const img = new Image(); img.onload = () => paint(img); img.src = stop.poster; }
    else { g.fillStyle = stop.colour || '#4fb0a5'; g.globalAlpha = 0.55; g.fillRect(0, 0, 512, 64); g.globalAlpha = 1; t.needsUpdate = true; }
    return t;
  }

  // the train's head d metres along the line; carriages follow behind it
  trainAt(d) {
    const L = this.length, t0 = this.curve.getTangentAt(0).normalize(), p0 = this.curve.getPointAt(0);
    const fwd = new THREE.Vector3(0, 0, -1);
    (this.carriages || []).forEach((c, i) => {
      const s = d - 10 - i * 21;
      let pos, tan;
      if (s < 0) { pos = p0.clone().addScaledVector(t0, s); tan = t0; }
      else { const f = frameOf(this.curve, Math.min(1, s / L)); pos = f.pos; tan = f.tan; }
      c.position.copy(pos); c.quaternion.setFromUnitVectors(fwd, tan); c.visible = true;
    });
  }
  hideTrain() { (this.carriages || []).forEach((c) => { c.visible = false; }); }

  // standing on the landing platform, looking across the track and down the line towards the first station
  landingPose(phone) {
    const L = this.length, here = frameOf(this.curve, 34 / L);
    const eye = here.pos.clone().addScaledVector(here.left, phone ? 4.6 : 5.2).setY(2.75);
    // look across the track and down the line: the passing train fills the right of the view, the first station glows beyond it
    const ahead = frameOf(this.curve, Math.min(1, (phone ? 110 : 105) / L));
    const look = ahead.pos.clone().addScaledVector(ahead.left, phone ? 1.5 : 9).setY(phone ? 1.8 : 2.4);
    return { eye, look };
  }
  // k = 0: on the platform; k = 1: on the train at u, looking down the line
  placeLanding(k = 0, u = this.u, phone = false) {
    const a = this.landingPose(phone);
    const d = u * this.length;
    const eye = this.routePoint(d).setY(2.5), look = this.routePoint(d + 34).setY(2.0);
    const e = k * k * (3 - 2 * k);
    this.camera.position.copy(a.eye).lerp(eye, e);
    this.camera.lookAt(a.look.clone().lerp(look, e));
    this.head.position.copy(this.camera.position).setY(1.6);
    this.head.target.position.copy(look);
    this.stations.forEach((s, i) => { s.light.intensity = i === 0 ? 34 : 0; s.glow.material.opacity = i === 0 ? 0.9 : 0.15; });
  }

  /* ---------- the camera ---------- */

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));     // follows browser zoom
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // a point d metres along the line, carrying on down the chosen branch past the end
  routePoint(d) {
    const L = this.length, b = this.choice && this.branches[this.choice];
    if (d <= L || !b) return this.curve.getPointAt(clamp01(d / L));
    return b.curve.getPointAt(clamp01((d - L) / b.length));
  }

  place(u, turn = this.turn, target = this.target, beyond = 0) {
    this.u = u; this.turn = turn; this.target = target;
    const d = u * this.length + beyond;
    const eye = this.routePoint(d).setY(2.5), ahead = this.routePoint(d + 34).setY(2.0);
    const tan = this.routePoint(d + 1).sub(this.routePoint(Math.max(0, d - 1))).normalize();
    const left = new THREE.Vector3().crossVectors(UP, tan).normalize();
    eye.addScaledVector(left, 0.2);
    let look = ahead;
    if (turn > 0 && target != null && this.stations[target]) {
      const w = this.stations[target].win.getWorldPosition(new THREE.Vector3());
      const e = turn * turn * (3 - 2 * turn);
      look = ahead.clone().lerp(w, e);
      eye.addScaledVector(left, e * 0.6);
    }
    this.camera.position.copy(eye);
    this.camera.lookAt(look);
    this.head.position.copy(eye).setY(1.6);
    this.head.target.position.copy(ahead);
    // light only the next station; the others are dim shapes in the dark
    this.stations.forEach((s, i) => {
      const dd = (s.u - u) * this.length;
      const lit = i === target || (dd > -20 && dd < BETWEEN + PLATFORM);
      s.light.intensity = lit ? 34 : 0;
      s.glow.material.opacity = lit ? clamp01((dd - 20) / 90) : 0.2;
    });
  }

  // the window's light swells once as you step in
  pulse(i, k) {
    const st = this.stations[i]; if (!st) return;
    const s = Math.sin(Math.PI * clamp01(k));
    st.frame.material.color.copy(LAMP).lerp(new THREE.Color('#fff6dc'), s);
    st.frame.scale.setScalar(1 + 0.05 * s);
  }

  render() { this.renderer.render(this.scene, this.camera); }

  // the window's rectangle on screen, so the product can grow out of it
  windowRect(i) {
    const st = this.stations[i]; if (!st) return null;
    st.win.updateWorldMatrix(true, false);
    const r = this.canvas.getBoundingClientRect();
    const g = st.win.geometry.parameters, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
      new THREE.Vector3(x * g.width / 2, y * g.height / 2, 0).applyMatrix4(st.win.matrixWorld).project(this.camera));
    const xs = pts.map((p) => r.left + (p.x + 1) / 2 * r.width), ys = pts.map((p) => r.top + (1 - p.y) / 2 * r.height);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
}

// A train's run: pull away, cruise, then a longer, gentle brake. Returns distance covered (0..1) at time t (0..1).
export function runProfile(t, a = 0.18, b = 0.6) {
  const v = 1 / (1 - a / 2 - (1 - b) / 2);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < a) return (v * t * t) / (2 * a);
  const s1 = (v * a) / 2;
  if (t < b) return s1 + v * (t - a);
  const s2 = s1 + v * (b - a), d = t - b, w = 1 - b;
  return s2 + v * d - (v * d * d) / (2 * w);
}

export const JUNCTION = { BRANCH, TUNNEL_AT };
