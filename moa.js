// A patch that sees infection coming: a 3D mechanism-of-action study for Limen.
// Everything happens on the cut face of a block of skin, like a diorama, so the
// viewer always sees inside without x-ray tricks.
import * as THREE from 'three';

const C = {
  paper: 0xEEF3F1, ink: 0x0D1413, green: 0x0B7A57,
  corneum: 0xF4DED0, epi: 0xE8BFAA, dermis: 0xE09A8B, hypo: 0xF3D795, fat: 0xF8E4AE,
  vessel: 0xB8433C, vessel2: 0x6E86B8, patch: 0xF7F9F8, needle: 0xDCE3E1,
  bact: 0xC9A23A, bact2: 0x8FA846, marker: 0xD6524A, fluid: 0xFFFFFF
};
const T = 26; // seconds per loop
const STEPS = [
  { t: 0, n: 'Skin, seen in section', h: 'Skin, seen in <span>section</span>' },
  { t: 4.2, n: 'The patch reads the fluid between cells', h: 'The patch reads the fluid <span>between cells</span>' },
  { t: 9, n: 'An infection starts quietly', h: 'An infection starts <span>quietly</span>' },
  { t: 14.5, n: 'Its signs cross the threshold', h: 'Its signs cross the <span>threshold</span>' },
  { t: 19.5, n: 'Days before you feel ill', h: 'Days before you <span>feel ill</span>' }
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const q = clamp((v - a) / (b - a)); return q * q * (3 - 2 * q); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const canvas = document.getElementById('mo-c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.paper);
scene.fog = new THREE.Fog(C.paper, 26, 48);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd9d6, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(7, 12, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xdff3ec, 0.6); rim.position.set(-8, 4, -6); scene.add(rim);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.12 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -3.3; ground.receiveShadow = true; scene.add(ground);

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
const world = new THREE.Group(); scene.add(world);

// ---- the block of skin: layers stacked, cut face toward the viewer at z = 2.5
const W = 8, D = 5, FZ = D / 2;
const skin = new THREE.Group(); world.add(skin);
function layer(h, y, color, rough) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(W, h, D), mat(color, { roughness: rough }));
  m.position.y = y - h / 2; m.castShadow = true; m.receiveShadow = true; skin.add(m); return m;
}
layer(0.07, 0, C.corneum, 0.8);
layer(0.38, -0.07, C.epi, 0.7);
layer(1.85, -0.45, C.dermis, 0.6);
layer(0.95, -2.3, C.hypo, 0.5);

const R = rng(11);
// fat lobules swelling out of the lowest layer's cut face
const fatG = new THREE.SphereGeometry(1, 20, 14), fatM = mat(C.fat, { roughness: 0.35 });
for (let i = 0; i < 26; i++) {
  const r = 0.16 + R() * 0.2, f = new THREE.Mesh(fatG, fatM);
  f.scale.set(r * 1.2, r, r * 0.55); f.position.set(-W / 2 + 0.3 + R() * (W - 0.6), -2.42 - R() * 0.7, FZ + 0.02);
  f.castShadow = true; skin.add(f);
}
// cells of the epidermis as a fine cobble on the cut face
const cellG = new THREE.SphereGeometry(1, 10, 8), cellM = mat(0xEFCDBB, { roughness: 0.75 });
const cells = new THREE.InstancedMesh(cellG, cellM, 140); let ci = 0;
const dm = new THREE.Object3D();
for (let i = 0; i < 140; i++) {
  dm.position.set(-W / 2 + 0.06 + (i % 70) * (W - 0.12) / 69 + (R() - 0.5) * 0.04, -0.17 - Math.floor(i / 70) * 0.17, FZ + 0.01);
  const s = 0.065 + R() * 0.02; dm.scale.set(s, s * 0.8, s * 0.35); dm.updateMatrix(); cells.setMatrixAt(ci++, dm.matrix);
}
skin.add(cells);
// blood vessels drawn as tubes on the cut face of the dermis
function vessel(pts, color, r) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], FZ + 0.04)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 10, false), mat(color, { roughness: 0.35 }));
  m.castShadow = true; skin.add(m);
}
vessel([[-4, -1.75], [-2.6, -1.55], [-1.2, -1.85], [0.4, -1.6], [2, -1.9], [4, -1.7]], C.vessel, 0.07);
vessel([[-4, -2.0], [-2.2, -2.05], [-0.6, -1.95], [1.2, -2.12], [4, -2.0]], C.vessel2, 0.06);
vessel([[-1.2, -1.85], [-1.0, -1.3], [-0.7, -0.85], [-0.45, -0.62]], C.vessel, 0.035);
vessel([[2, -1.9], [2.2, -1.35], [2.05, -0.9], [2.3, -0.62]], C.vessel, 0.035);
// a hair, for scale
vessel([[3.2, -1.6], [3.25, -0.9], [3.3, 0], [3.42, 0.9], [3.6, 1.6]], 0x3B2E2A, 0.025);

// ---- the patch: a soft white slab with the green dot on top and microneedles beneath
const patch = new THREE.Group(); world.add(patch);
const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.9), new THREE.MeshPhysicalMaterial({ color: C.patch, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.4 }));
slab.castShadow = true; slab.receiveShadow = true; patch.add(slab);
const rimM = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.04, 2.02), mat(0xDDE5E2)); rimM.position.y = -0.08; patch.add(rimM);
const dotM = new THREE.MeshStandardMaterial({ color: C.green, roughness: 0.3, emissive: C.green, emissiveIntensity: 0.15 });
const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 40), dotM); dot.position.y = 0.105; patch.add(dot);
const needleG = new THREE.ConeGeometry(0.045, 0.5, 14); needleG.rotateX(Math.PI); needleG.translate(0, -0.33, 0);
const needleM = new THREE.MeshPhysicalMaterial({ color: C.needle, roughness: 0.2, metalness: 0.2, transmission: 0.2 });
const tips = [];
for (let ix = -1; ix <= 1; ix++) for (let iz = 0; iz < 3; iz++) {
  const n = new THREE.Mesh(needleG, needleM); n.position.set(ix * 0.8, 0, 0.3 - iz * 0.42 + 0.24); n.castShadow = true; patch.add(n);
  tips.push(n);
}
patch.position.set(0, 3.2, FZ - 0.54 + 0.02); // the front row of needles sits on the cut face

// ---- the iris: a green ring that opens above the patch when the signal crosses
const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 12, 120), new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: 0 }));
world.add(ring);
const ring2 = ring.clone(); ring2.material = ring.material.clone(); world.add(ring2);

// ---- bacteria and the molecules they shed, on the cut face of the dermis
const bG = new THREE.CapsuleGeometry(0.055, 0.17, 6, 12);
const bM = [mat(C.bact, { roughness: 0.45 }), mat(C.bact2, { roughness: 0.45 })];
const RB = rng(23), BN = 46, bact = [];
const seedX = 0.9, seedY = -1.15;
for (let i = 0; i < BN; i++) {
  const m = new THREE.Mesh(bG, bM[i % 2]); m.castShadow = true;
  const a = RB() * 6.28, d = Math.sqrt(RB()) * 0.95;
  bact.push({ m, x: seedX + Math.cos(a) * d * 1.5, y: seedY + Math.sin(a) * d * 0.55, rot: RB() * 6.28, born: 8.6 + (i / BN) * 5.2 + RB() * 0.4, ph: RB() * 6.28 });
  world.add(m);
}
const mG = new THREE.IcosahedronGeometry(0.045, 0), mM = new THREE.MeshStandardMaterial({ color: C.marker, roughness: 0.4, emissive: C.marker, emissiveIntensity: 0.25 });
const RM = rng(41), MN = 70, mol = [];
const tipFront = [-0.8, 0, 0.8].map((x) => new THREE.Vector2(x, -0.5));
for (let i = 0; i < MN; i++) {
  const src = bact[Math.floor(RM() * BN)], tip = tipFront[Math.floor(RM() * 3)];
  const m = new THREE.Mesh(mG, mM); world.add(m);
  mol.push({ m, src, tip, t0: 10.2 + RM() * 7, dur: 2.4 + RM() * 1.6, wob: RM() * 6.28, bend: (RM() - 0.5) * 0.9 });
}
// a faint drift of fluid in the dermis
const fG = new THREE.SphereGeometry(0.018, 6, 4), fM = new THREE.MeshBasicMaterial({ color: C.fluid, transparent: true, opacity: 0.55 });
const RF = rng(5), FN = 90, fluid = new THREE.InstancedMesh(fG, fM, FN), fl = [];
for (let i = 0; i < FN; i++) fl.push({ x: -W / 2 + RF() * W, y: -0.5 - RF() * 1.7, s: 0.15 + RF() * 0.3, p: RF() * 6.28 });
world.add(fluid);

// ---- camera path: wide establishing view, push in to the patch, pull back for the payoff
const camKeys = [
  { t: 0, p: [10.5, 6.2, 14], l: [0, -0.9, 0] },
  { t: 4, p: [8, 4.4, 11.5], l: [0, -0.5, 0.6] },
  { t: 9, p: [4.2, 1.6, 8.6], l: [0.4, -0.9, 2.2] },
  { t: 14.5, p: [2.6, 1.0, 7.2], l: [0.2, -0.6, 2.3] },
  { t: 19.5, p: [7.5, 4.5, 12], l: [0, 0, 1.2] },
  { t: 26, p: [10.5, 6.2, 14], l: [0, -0.9, 0] }
];
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function camAt(t) {
  let i = 0; while (i < camKeys.length - 2 && t >= camKeys[i + 1].t) i++;
  const a = camKeys[i], b = camKeys[i + 1], q = ss(a.t, b.t, t);
  return { p: v3(a.p).lerp(v3(b.p), q), l: v3(a.l).lerp(v3(b.l), q) };
}

function frame(t) {
  // skin rises in, the patch lands and its needles go in
  const intro = ss(0, 1.6, t), out = 1 - ss(24.6, 26, t);
  world.position.y = lerp(-0.6, 0, intro); world.scale.setScalar(lerp(0.96, 1, intro));
  const land = ss(4.4, 7.4, t) * (1 - ss(24.2, 25.6, t));
  patch.position.y = lerp(3.2, 0.095, land);
  patch.rotation.z = (1 - land) * 0.08; patch.visible = t > 3.6 && t < 25.8;

  // bacteria multiply around one seed point and gently tumble
  for (const b of bact) {
    const g = ss(b.born, b.born + 0.6, t) * out;
    b.m.visible = g > 0.01; b.m.scale.setScalar(g);
    const wob = Math.sin(t * 1.3 + b.ph) * 0.03;
    b.m.position.set(b.x + wob, b.y + Math.cos(t * 1.1 + b.ph) * 0.02, FZ + 0.09);
    b.m.rotation.set(0, 0, b.rot + Math.sin(t * 0.7 + b.ph) * 0.4);
  }
  // molecules rise from the bacteria to the needle tips
  let arrived = 0;
  for (const o of mol) {
    const q = clamp((t - o.t0) / o.dur);
    const vis = q > 0 && q < 1 && t < 24.4; o.m.visible = vis; if (q >= 1 && t < 24.4) arrived++;
    if (!vis) continue;
    const e = q * q * (3 - 2 * q), sx = o.src.m.position.x, sy = o.src.m.position.y;
    const x = lerp(sx, o.tip.x, e) + Math.sin(e * 3.14) * o.bend + Math.sin(t * 3 + o.wob) * 0.02, y = lerp(sy, o.tip.y, e);
    o.m.position.set(x, y, FZ + 0.12); o.m.rotation.set(t * 2 + o.wob, t * 1.4, 0); o.m.scale.setScalar(0.7 + 0.5 * Math.sin(q * 3.14));
  }
  // the sensor answers: the dot brightens and pulses, then the iris opens above it
  const sig = ss(14.2, 15.4, t) * (1 - ss(24, 25.2, t));
  dotM.emissiveIntensity = 0.15 + sig * (1.1 + 0.5 * Math.sin(t * 7));
  const rp = patch.position.clone().add(new THREE.Vector3(0, 0.6, 0.05));
  const o1 = ss(15, 18.5, t), o2 = ss(16, 19.5, t), hold = 1 - ss(23.8, 25, t);
  ring.position.copy(rp); ring2.position.copy(rp);
  ring.scale.setScalar(lerp(0.2, 1.6, o1)); ring.material.opacity = Math.min(1, o1 * 3) * hold;
  ring2.scale.setScalar(lerp(0.2, 2.6, o2)); ring2.material.opacity = (1 - o2) * 0.8 * (o2 > 0 ? 1 : 0) * hold;
  ring.lookAt(camera.position); ring2.lookAt(camera.position);

  // fluid drifts slowly through the dermis
  for (let i = 0; i < FN; i++) {
    const f = fl[i], x = ((f.x + t * f.s + W / 2) % W) - W / 2;
    dm.position.set(x, f.y + Math.sin(t * 0.8 + f.p) * 0.06, FZ + 0.06); dm.scale.setScalar(1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); fluid.setMatrixAt(i, dm.matrix);
  }
  fluid.instanceMatrix.needsUpdate = true;

  const c = camAt(t), sway = Math.sin(t * 0.25) * 0.35;
  camera.position.set(c.p.x + sway, c.p.y, c.p.z); camera.lookAt(c.l);
}

// ---- captions and controls
const tEl = document.getElementById('mo-t'), nEl = document.getElementById('mo-n'), steps = document.getElementById('mo-steps'), prog = document.getElementById('mo-prog'), play = document.getElementById('mo-play');
const btns = STEPS.map((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Go to step ${i + 1}: ${s.n}`); b.addEventListener('click', () => { clock = s.t + 0.01; if (!playing) render(); }); steps.appendChild(b); return b; });
let shown = -1;
function caption(t) {
  let i = 0; while (i < STEPS.length - 1 && t >= STEPS[i + 1].t) i++;
  if (i !== shown) {
    shown = i; tEl.classList.add('out');
    setTimeout(() => { tEl.innerHTML = STEPS[i].h; nEl.textContent = `0${i + 1} / 0${STEPS.length}`; tEl.classList.remove('out'); }, 260);
    btns.forEach((b, k) => { b.toggleAttribute('aria-current', k === i); if (k === i) b.setAttribute('aria-current', 'step'); b.classList.toggle('done', k < i); });
  }
  prog.style.width = (t / T * 100).toFixed(2) + '%';
}

function resize() {
  const r = canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 46 : 32; camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { resize(); if (!playing) render(); });
resize();

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduce, clock = reduce ? 16.5 : 0, last = performance.now(), visible = true;
play.textContent = playing ? 'Pause' : 'Play';
play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; last = performance.now(); });
new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
function render() { frame(clock); caption(clock); renderer.render(scene, camera); }
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing && visible) { clock = (clock + dt) % T; render(); }
  requestAnimationFrame(loop);
}
render(); requestAnimationFrame(loop);
window.__moa = { seek: (t) => { clock = t; render(); }, pause: () => { playing = false; } };
