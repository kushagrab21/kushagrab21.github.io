// Dust in the light: motes that drift slowly inside each beam and catch its light.
// Each mote belongs to one beam. The shader places it at a fraction along the beam and a point across it,
// moves it slowly with time, and lights it by that beam's strength, so dust is only ever seen where a beam is on:
// the projector's while the film plays, the floodlights' while the house is up.
import * as THREE from './vendor/three.module.min.js';

const MAX = 5;

const vertex = /* glsl */`
  uniform float uTime, uScale, uDpr;
  uniform vec3 uFrom[${MAX}], uTo[${MAX}];
  uniform float uR0[${MAX}], uR1[${MAX}], uOn[${MAX}];
  attribute float aBeam, aT, aAng, aR, aSeed;
  varying float vLight;
  void main() {
    int i = int(aBeam);
    vec3 o = uFrom[i], e = uTo[i];
    vec3 axis = e - o; float len = length(axis); vec3 d = axis / len;
    vec3 u = normalize(cross(d, abs(d.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 v = cross(d, u);
    float t = fract(aT + uTime * (0.002 + 0.004 * aSeed));            // a slow drift along the beam
    float a = aAng + uTime * 0.06 * (aSeed - 0.5);                      // and a slow turn round it
    float r = mix(uR0[i], uR1[i], t) * aR * 0.9;
    vec3 p = o + d * len * t + (u * cos(a) + v * sin(a)) * r;
    p += 0.32 * vec3(sin(uTime * 0.31 + aSeed * 21.0), sin(uTime * 0.23 + aSeed * 13.0), sin(uTime * 0.27 + aSeed * 7.0));  // air moving
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed * 1.7) + aSeed * 40.0);
    float edge = 1.0 - smoothstep(0.7, 1.0, aR);                        // fainter at the beam's soft edge
    float ends = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.85, 1.0, t)) * (1.0 - 0.45 * t);
    vLight = uOn[i] * twinkle * edge * ends;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min((0.8 + 1.6 * aSeed) * uScale / -mv.z, 2.6 * uDpr);            // fine motes: never blobs, even right beside you
    vLight *= smoothstep(4.0, 9.0, -mv.z);                                       // none in the stretch of beam just over your head
    gl_Position = projectionMatrix * mv;
  }`;

const fragment = /* glsl */`
  uniform vec3 uColour;
  varying float vLight;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float k = 1.0 - smoothstep(0.15, 0.5, length(c));
    if (k * vLight < 0.01) discard;
    gl_FragColor = vec4(uColour * vLight * k, 1.0);
  }`;

// beams: [{ from, to, r0, r1, count }]
export function createDust(beams) {
  const n = beams.reduce((a, b) => a + b.count, 0);
  const attr = { aBeam: new Float32Array(n), aT: new Float32Array(n), aAng: new Float32Array(n), aR: new Float32Array(n), aSeed: new Float32Array(n) };
  let k = 0;
  beams.forEach((b, i) => {
    for (let j = 0; j < b.count; j++, k++) {
      attr.aBeam[k] = i; attr.aT[k] = Math.random(); attr.aAng[k] = Math.random() * Math.PI * 2;
      attr.aR[k] = Math.sqrt(Math.random()); attr.aSeed[k] = Math.random();
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));   // placed in the shader
  for (const [name, arr] of Object.entries(attr)) geo.setAttribute(name, new THREE.BufferAttribute(arr, 1));
  const pad = (f, fill) => Array.from({ length: MAX }, (_, i) => (beams[i] ? f(beams[i]) : fill));
  const uniforms = {
    uTime: { value: 0 }, uScale: { value: 300 }, uDpr: { value: 1 }, uColour: { value: new THREE.Color('#e9ebef') },
    uFrom: { value: pad((b) => b.from, new THREE.Vector3()) }, uTo: { value: pad((b) => b.to, new THREE.Vector3(0, 0, 1)) },
    uR0: { value: pad((b) => b.r0, 0) }, uR1: { value: pad((b) => b.r1, 0) }, uOn: { value: pad(() => 0, 0) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    // on: how lit each beam is (0..1), in the order given; scale: pixels per metre at 1 m, from the canvas height and field of view; dpr: device pixels per CSS pixel
    update(seconds, on, scale, dpr = 1) { uniforms.uTime.value = seconds; on.forEach((v, i) => { uniforms.uOn.value[i] = v; }); uniforms.uScale.value = scale; uniforms.uDpr.value = dpr; },
  };
}
