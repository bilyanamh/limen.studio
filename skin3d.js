// Inside the skin: a real-time 3D mechanism-of-action scene for Limen.
// The tissue is cut open like an anatomical section: everything lives behind the
// cut face at z = 0 and the camera travels in front of it, so it never clips into
// the structures. One progress value, p from 0 to 1, drives the camera and the story.
import * as THREE from 'three';
import { EffectComposer } from './lib/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/jsm/postprocessing/OutputPass.js';
import { BokehPass } from './lib/jsm/postprocessing/BokehPass.js';

export const STEPS = [
  { p: 0, h: 'A patch on the <span>skin</span>' },
  { p: 0.17, h: 'Its needles reach just <span>below the surface</span>' },
  { p: 0.34, h: 'Into the fluid <span>between cells</span>' },
  { p: 0.48, h: 'An infection starts <span>quietly</span>' },
  { p: 0.64, h: 'Its markers reach <span>the sensor</span>' },
  { p: 0.8, h: 'Days before you <span>feel ill</span>' }
];

const P = {
  night: 0x0F0D0E, ground: 0xF4DCCB, skin: 0xEAB0A0, sheen: 0xFFE4D6, cells: [0xF0B49F, 0xE59C8E, 0xF4C6B2, 0xDB8E88, 0xEEAA9A],
  basal: [0xD68C93, 0xC97F8E, 0xDF9C98], membrane: 0xC8A2BC, collagen: [0xF0D2BE, 0xE7BBA8, 0xF5DECB, 0xE2B2A6],
  fibro: 0xD6A8C2, vessel: 0xD0505A, vein: 0xA48CBE, rbc: 0xD9485A, fat: 0xF6DDAA, patch: 0xF8F2EE,
  bact: [0xD9A441, 0xB8B35A, 0xC98F3E], marker: 0xFFF1DE, glow: 0xFFF3E8, vesicle: 0xF9D6CC, cargo: [0xE9A1C8, 0xF3B45C, 0xC9A0E8, 0xF07F8E]
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const q = clamp((v - a) / (b - a)); return q * q * (3 - 2 * q); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise2(x, y) { return Math.sin(x * 1.7 + Math.sin(y * 0.9) * 1.3) * 0.5 + Math.sin(y * 2.3 + x * 0.6) * 0.3 + Math.sin((x + y) * 4.1) * 0.12; }

export function createSkin(canvas, opts = {}) {
  const lite = !!opts.lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(P.ground); // a warm blush ground inside the figure frame
  scene.fog = new THREE.FogExp2(P.ground, 0.05);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

  // light: a warm pink key from above, a magenta glow from inside the tissue, a cool violet rim
  scene.add(new THREE.HemisphereLight(0xfff3ea, 0xc69a90, 0.8));
  const key = new THREE.DirectionalLight(0xffe8d6, 2.6); key.position.set(-6, 12, 14); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9b8ff, 0.9); rim.position.set(10, -4, -6); scene.add(rim);
  const inner = new THREE.PointLight(0xff9a7a, 120, 0, 2); inner.position.set(5, -6, 6); scene.add(inner);
  const tipLight = new THREE.PointLight(0xffe2c4, 0, 0, 2); tipLight.position.set(0, -7.3, 0.6); scene.add(tipLight);
  const patchLight = new THREE.PointLight(0xfff0f5, 0, 0, 2); patchLight.position.set(0, 1.2, 1.2); scene.add(patchLight);

  const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, sheen: 0.45, sheenColor: new THREE.Color(P.sheen), sheenRoughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, ...o });
  const tissue = new THREE.Group(); scene.add(tissue);
  // deep tissue behind the cut face, so gaps between structures read as flesh, not paper
  { const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 15), new THREE.MeshStandardMaterial({ color: 0xC08680, roughness: 0.9 })); back.position.set(0, -8.6, -6.2); tissue.add(back); }
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const X0 = -11, X1 = 11, Z0 = -7;

  // the skin surface: a fine relief of ridges and furrows on top of the block
  {
    const g = new THREE.PlaneGeometry(X1 - X0, -Z0 + 0.4, lite ? 120 : 260, lite ? 50 : 110); g.rotateX(-Math.PI / 2); g.translate(0, 0, Z0 / 2 + 0.2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const r = Math.abs(Math.sin(x * 1.9 + z * 0.8 + noise2(x * 0.4, z * 0.4) * 1.6)); pos.setY(i, 0.06 * (1 - r) + 0.05 * noise2(x * 3, z * 3)); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, phys(P.skin, { roughness: 0.6, sheen: 1 })); tissue.add(m);
    // its front edge, so the surface reads as a sheet sitting on the cells
    const lip = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.3, 0.25), phys(0xF0A7B9, { roughness: 0.55 })); lip.position.set(0, -0.12, 0.02); tissue.add(lip);
  }

  // the epidermis: tightly stacked cells, flat at the top and tall columns at the base
  {
    const R = rng(3), list = [];
    const dx = lite ? 0.62 : 0.5;
    for (let x = X0 + 0.3; x < X1 - 0.3; x += dx) for (let z = -0.15; z > (lite ? -3.2 : -4.6); z -= dx) {
      for (let k = 0; k < 4; k++) list.push({ x: x + (R() - 0.5) * 0.12, z: z + (R() - 0.5) * 0.12, k });
    }
    const g = new THREE.SphereGeometry(1, lite ? 10 : 16, lite ? 8 : 12);
    const mesh = new THREE.InstancedMesh(g, phys(0xffffff, { roughness: 0.38, clearcoat: 0.45 }), list.length);
    list.forEach((c, i) => {
      const y = [-0.42, -0.86, -1.45, -2.35][c.k], s = [[0.3, 0.12], [0.27, 0.2], [0.25, 0.28], [0.2, 0.62]][c.k];
      dummy.position.set(c.x, y + (R() - 0.5) * 0.06, c.z); dummy.rotation.set((R() - 0.5) * 0.2, R() * 6.28, (R() - 0.5) * 0.15);
      dummy.scale.set(s[0] * (0.9 + R() * 0.25), s[1] * (0.9 + R() * 0.2), s[0] * (0.9 + R() * 0.25)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      const pal = c.k === 3 ? P.basal : P.cells; mesh.setColorAt(i, col.setHex(pal[Math.floor(R() * pal.length)]));
    });
    tissue.add(mesh);
    // nuclei glinting in the tall basal cells
    const nuc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7B3A78, roughness: 0.3, emissive: 0x3a0c2c }), Math.floor(list.length / 4));
    let ni = 0; list.forEach((c) => { if (c.k !== 3 || ni >= nuc.count) return; dummy.position.set(c.x, -2.2, c.z + 0.16); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.6, 1); dummy.updateMatrix(); nuc.setMatrixAt(ni++, dummy.matrix); });
    nuc.count = ni; tissue.add(nuc);
  }

  // the basement membrane: a lilac sheet that rises and falls between epidermis and dermis
  {
    const g = new THREE.PlaneGeometry(X1 - X0, -Z0, lite ? 120 : 220, 20); g.rotateX(-Math.PI / 2); g.translate(0, 0, Z0 / 2);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, -3.05 + Math.sin(x * 1.3) * 0.28 + Math.sin(z * 0.9 + x * 0.4) * 0.12); }
    g.computeVertexNormals(); tissue.add(new THREE.Mesh(g, phys(P.membrane, { side: THREE.DoubleSide, roughness: 0.5 })));
  }

  // the dermis: wavy collagen bundles, spindle fibroblasts, capillaries and fat below
  {
    const R = rng(9), n = lite ? 160 : 420;
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3((u - 0.5) * 9, Math.sin(u * 9) * 0.22, Math.cos(u * 7) * 0.18)); }
    const fg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), lite ? 48 : 90, 0.11, lite ? 6 : 8, false);
    const fib = new THREE.InstancedMesh(fg, phys(0xffffff, { roughness: 0.36, clearcoat: 0.55, sheen: 1 }), n);
    for (let i = 0; i < n; i++) {
      const y = -3.6 - R() * 9.4, x = X0 + R() * (X1 - X0); let z = -0.3 - R() * (lite ? 3.5 : 5.5);
      if (x > -1.8 && x < 5 && y < -6.2 && y > -11.8 && z > -1.6) z -= 1.6; // keep a clear window onto the needle tip and the infection
      dummy.position.set(x, y, z); dummy.rotation.set((R() - 0.5) * 0.25, (R() - 0.5) * 0.7, (R() - 0.5) * 0.5);
      const s = 0.7 + R() * 0.9; dummy.scale.set(s, 0.8 + R() * 0.9, 0.8 + R() * 0.9); dummy.updateMatrix(); fib.setMatrixAt(i, dummy.matrix);
      fib.setColorAt(i, col.setHex(P.collagen[Math.floor(R() * P.collagen.length)]));
    }
    tissue.add(fib);
    const sp = new THREE.SphereGeometry(1, 12, 8); const fbM = new THREE.InstancedMesh(sp, phys(P.fibro, { roughness: 0.3, clearcoat: 0.7 }), lite ? 40 : 110);
    for (let i = 0; i < fbM.count; i++) { dummy.position.set(X0 + R() * (X1 - X0), -3.8 - R() * 8.5, -0.1 - R() * 3); dummy.rotation.set(0, R(), (R() - 0.5) * 0.6); dummy.scale.set(0.55 + R() * 0.3, 0.09, 0.12); dummy.updateMatrix(); fbM.setMatrixAt(i, dummy.matrix); }
    tissue.add(fbM);
    const fat = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), phys(P.fat, { roughness: 0.25, clearcoat: 0.8 }), lite ? 30 : 70);
    for (let i = 0; i < fat.count; i++) { const r = 0.7 + R() * 0.8; dummy.position.set(X0 + R() * (X1 - X0), -13.6 - R() * 2.5, -0.4 - R() * 3); dummy.rotation.set(0, 0, 0); dummy.scale.set(r * 1.15, r, r); dummy.updateMatrix(); fat.setMatrixAt(i, dummy.matrix); }
    tissue.add(fat);
  }
  // capillaries with blood cells flowing through them
  const flows = [];
  {
    const vessel = (pts, color, r, cells) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
      tissue.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 14, false), new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, transparent: true, opacity: 0.55, emissive: color, emissiveIntensity: 0.18, depthWrite: false })));
      if (!cells) return;
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: P.rbc, roughness: 0.3, clearcoat: 0.6, emissive: 0x4a0410 }), cells);
      tissue.add(m); flows.push({ curve, m, n: cells, r, ph: Math.random() });
    };
    vessel([[-11, -4.6, -0.6], [-7, -4.2, -0.3], [-3, -5.2, -0.5], [1, -4.4, -0.2], [5, -5.6, -0.6], [11, -4.9, -0.4]], P.vessel, 0.32, lite ? 40 : 90);
    vessel([[-11, -11.2, -0.8], [-6, -10.6, -0.4], [-1, -11.6, -0.6], [4, -10.9, -0.3], [11, -11.4, -0.7]], P.vein, 0.42, lite ? 40 : 90);
    vessel([[-3, -5.2, -0.5], [-2.4, -7.4, -0.2], [-3.4, -9.6, -0.4], [-1, -11.6, -0.6]], P.vessel, 0.18, lite ? 16 : 34);
    vessel([[5, -5.6, -0.6], [4.4, -7.8, -0.3], [5.2, -9.8, -0.2], [4, -10.9, -0.3]], P.vessel, 0.18, lite ? 16 : 34);
  }

  // the patch and its microneedles
  const patch = new THREE.Group(); scene.add(patch);
  const patchMat = new THREE.MeshPhysicalMaterial({ color: P.patch, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: 0xffffff, emissiveIntensity: 0 });
  {
    const s = new THREE.Shape(), w = 3.4, d = 2.6, r = 0.7;
    s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 20 }); g.rotateX(Math.PI / 2); g.translate(0, 0.3, 0);
    const m = new THREE.Mesh(g, patchMat); patch.add(m);
  }
  const needleMat = new THREE.MeshPhysicalMaterial({ color: 0xF8EEF4, roughness: 0.12, metalness: 0.05, clearcoat: 1, transparent: true, opacity: 0.88, emissive: 0xff7aa6, emissiveIntensity: 0 });
  const needleG = new THREE.ConeGeometry(0.34, 7.6, 32, 1); needleG.rotateX(Math.PI); needleG.translate(0, -3.8 + 0.05, 0);
  const NEEDLE_Z = [-0.12, -2.0], NEEDLE_X = [-2.4, 0, 2.4];
  for (const z of NEEDLE_Z) for (const x of NEEDLE_X) { const n = new THREE.Mesh(needleG, needleMat); n.position.set(x, 0, z + 1.85); patch.add(n); }
  patch.position.set(0, 0.06, -1.85 + 0);
  const TIP = new THREE.Vector3(0, -7.5, -0.12);

  // bacteria, multiplying near the tip of the front needle
  const R = rng(21), BN = lite ? 120 : 260, bact = [];
  const bMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 0.7, sheen: 0.5, sheenColor: new THREE.Color(0xfff2c0) }), BN);
  for (let i = 0; i < BN; i++) {
    const a = R() * 6.28, d = Math.pow(R(), 0.7);
    bact.push({ x: 1.9 + Math.cos(a) * d * 2.2, y: -9.6 + Math.sin(a) * d * 1.0, z: 0.05 - R() * 1.1, r: [R() * 6.28, R() * 6.28, R() * 6.28], born: 0.44 + (i / BN) * 0.17 + R() * 0.02, ph: R() * 6.28 });
    bMesh.setColorAt(i, col.setHex(P.bact[i % 3]));
  }
  scene.add(bMesh);

  // the markers they shed, glowing so the eye can follow them to the sensor
  const MN = lite ? 120 : 260, mol = [];
  const mMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 1), new THREE.MeshStandardMaterial({ color: P.marker, emissive: P.marker, emissiveIntensity: 2.4, roughness: 0.3 }), MN);
  for (let i = 0; i < MN; i++) {
    const src = bact[Math.floor(R() * BN)], a = R() * 6.28, h = R() * 1.2;
    mol.push({ src, end: new THREE.Vector3(TIP.x + Math.cos(a) * (0.05 + h * 0.08), TIP.y + h, TIP.z + Math.abs(Math.sin(a)) * (0.05 + h * 0.08) + 0.06), t0: 0.55 + R() * 0.12, dur: 0.06 + R() * 0.05, bend: new THREE.Vector3((R() - 0.5) * 2.4, (R() - 0.2) * 1.6, R() * 1.2) });
  }
  scene.add(mMesh);

  // fluid between the cells: fine glowing specks drifting through the dermis
  const FN = lite ? 900 : 2600, fPos = new Float32Array(FN * 3), fSeed = [];
  for (let i = 0; i < FN; i++) { fSeed.push([X0 + R() * (X1 - X0), -3.4 - R() * 9.5, 0.6 - R() * 3, 0.1 + R() * 0.25, R() * 6.28]); }
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,220,235,0.6)'); g.addColorStop(1, 'rgba(255,200,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const fluid = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.09, map: dotTex, color: P.glow, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.NormalBlending }));
  scene.add(fluid);

  // the signal: light running up the needle once the markers have bound
  const PN = 90, pPos = new Float32Array(PN * 3), pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pulse = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.3, map: dotTex, color: 0xfff0dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pulse);

  // a fine spray of particles streaming off the infection towards the needle tip
  const SN = lite ? 700 : 2000, sPos = new Float32Array(SN * 3), sGeo = new THREE.BufferGeometry(), sSeed = [];
  for (let i = 0; i < SN; i++) sSeed.push([R(), R(), R(), R()]);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const spray = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.075, map: dotTex, color: 0xfff6e6, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(spray);
  // translucent vesicles drifting through the fluid, each carrying a little coloured cargo
  const VN = lite ? 8 : 16, ves = [];
  const vMat = new THREE.MeshPhysicalMaterial({ color: P.vesicle, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.32, sheen: 1, sheenColor: new THREE.Color(0xffffff), depthWrite: false });
  const cargoG = new THREE.SphereGeometry(1, 10, 8), vG = new THREE.SphereGeometry(1, 40, 28);
  const cargo = new THREE.InstancedMesh(cargoG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0x2a0f12 }), VN * 14);
  for (let i = 0; i < VN; i++) {
    const r = 0.28 + R() * 0.5, m = new THREE.Mesh(vG, vMat); m.scale.setScalar(r); scene.add(m);
    ves.push({ m, r, x: -7 + R() * 14, y: -3.8 - R() * 8.2, z: 0.6 + R() * 2.2, sp: 0.08 + R() * 0.12, ph: R() * 6.28, k: [] });
    for (let k = 0; k < 14; k++) { ves[i].k.push([(R() - 0.5) * 1.2, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2, 0.05 + R() * 0.08]); cargo.setColorAt(i * 14 + k, col.setHex(P.cargo[Math.floor(R() * P.cargo.length)])); }
  }
  scene.add(cargo);

  // camera path
  const K = [
    [0, [9.5, 5, 14], [0, -2.6, -2]],
    [0.14, [6, 2.2, 10], [0, -1.6, -1]],
    [0.28, [3.8, -1.8, 6.4], [0.2, -2.3, -1.2]],
    [0.42, [5.6, -6.2, 8], [0.4, -7.2, -1]],
    [0.56, [4.2, -9.2, 5.2], [1.6, -9.2, -0.3]],
    [0.7, [1.5, -7.0, 3.4], [0, -7.4, -0.3]],
    [0.84, [2.4, -3.6, 5.2], [0, -2.2, -0.4]],
    [1, [9, 4.4, 13.5], [0, -2.4, -1.5]]
  ].map(([p, a, b]) => ({ p, a: new THREE.Vector3(...a), b: new THREE.Vector3(...b) }));
  const posCurve = new THREE.CatmullRomCurve3(K.map((k) => k.a), false, 'centripetal'), lookCurve = new THREE.CatmullRomCurve3(K.map((k) => k.b), false, 'centripetal');
  function pathU(p) { let i = 0; while (i < K.length - 2 && p >= K[i + 1].p) i++; const a = K[i], b = K[i + 1], q = clamp((p - a.p) / (b.p - a.p)); return (i + q * q * (3 - 2 * q)) / (K.length - 1); }

  // post: a soft bloom so the markers and the signal glow like the light in the tissue
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = lite ? null : new BokehPass(scene, camera, { focus: 10, aperture: 0.0045, maxblur: 0.012 }); if (bokeh) composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), lite ? 0.35 : 0.45, 0.5, 0.97); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let p = 0;
  function setProgress(v) { p = clamp(v); }
  function render(t) {
    const u = pathU(p), cp = posCurve.getPointAt(u), lp = lookCurve.getPointAt(u);
    camera.position.set(cp.x + Math.sin(t * 0.3) * 0.12, cp.y + Math.sin(t * 0.4) * 0.08, cp.z); camera.lookAt(lp);
    scene.fog.density = 0.22 / (cp.distanceTo(lp) + 6); // thinner haze on wide views, thick haze close in

    for (const f of flows) {
      for (let i = 0; i < f.n; i++) {
        const q = ((i / f.n) + t * 0.02 + f.ph) % 1, pt = f.curve.getPointAt(q);
        dummy.position.copy(pt); dummy.rotation.set(i, i * 0.7, 0); const s = f.r * 0.42; dummy.scale.set(s, s * 0.45, s); dummy.updateMatrix(); f.m.setMatrixAt(i, dummy.matrix);
      }
      f.m.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < FN; i++) { const s = fSeed[i], x = ((s[0] - X0 + t * s[3]) % (X1 - X0)) + X0; fPos[i * 3] = x; fPos[i * 3 + 1] = s[1] + Math.sin(t * 0.7 + s[4]) * 0.12; fPos[i * 3 + 2] = s[2]; }
    fGeo.attributes.position.needsUpdate = true;

    for (let i = 0; i < BN; i++) {
      const b = bact[i], g = ss(b.born, b.born + 0.03, p) * (1 - ss(0.95, 1, p));
      dummy.position.set(b.x + Math.sin(t * 0.9 + b.ph) * 0.05, b.y + Math.cos(t * 0.8 + b.ph) * 0.04, b.z);
      dummy.rotation.set(b.r[0] + t * 0.2, b.r[1], b.r[2] + Math.sin(t + b.ph) * 0.3); dummy.scale.setScalar(Math.max(0.0001, g)); dummy.updateMatrix(); bMesh.setMatrixAt(i, dummy.matrix);
    }
    bMesh.instanceMatrix.needsUpdate = true;
    const v = new THREE.Vector3(), c1 = new THREE.Vector3();
    for (let i = 0; i < MN; i++) {
      const o = mol[i], q = clamp((p - o.t0) / o.dur), e = q * q * (3 - 2 * q), on = q > 0 && p < 0.96;
      const s0 = new THREE.Vector3(o.src.x, o.src.y, o.src.z + 0.1);
      c1.copy(s0).lerp(o.end, 0.5).add(o.bend);
      v.copy(s0).multiplyScalar((1 - e) * (1 - e)).addScaledVector(c1, 2 * (1 - e) * e).addScaledVector(o.end, e * e);
      if (q < 1) v.x += Math.sin(t * 3 + i) * 0.03 * (1 - e);
      dummy.position.copy(v); dummy.rotation.set(t + i, t * 0.7, 0); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); mMesh.setMatrixAt(i, dummy.matrix);
    }
    mMesh.instanceMatrix.needsUpdate = true;

    const bound = ss(0.66, 0.76, p) * (1 - ss(0.95, 1, p));
    needleMat.emissiveIntensity = bound * (0.35 + 0.25 * Math.sin(t * 6));
    tipLight.intensity = bound * 9;
    const run = ss(0.74, 0.9, p) * (1 - ss(0.96, 1, p));
    pulse.material.opacity = run;
    for (let i = 0; i < PN; i++) { const ph = ((i / PN) + t * 0.55) % 1; pPos[i * 3] = TIP.x + Math.sin(i * 1.7) * 0.06 * (1 - ph); pPos[i * 3 + 1] = lerp(TIP.y, 0.1, ph); pPos[i * 3 + 2] = TIP.z + 0.34 * ph + 0.1; }
    pGeo.attributes.position.needsUpdate = true;
    const lit = ss(0.84, 0.94, p);
    patchMat.emissiveIntensity = lit * 0.18; patchLight.intensity = lit * 10;

    // spray: particles leave the colony in a soft cone and drift up towards the tip
    const sp = ss(0.5, 0.56, p) * (1 - ss(0.8, 0.86, p));
    spray.material.opacity = sp * 0.85;
    if (sp > 0) for (let i = 0; i < SN; i++) {
      const q = sSeed[i], ph = (q[0] + t * (0.16 + q[1] * 0.2)) % 1, sx = 1.9 + (q[2] - 0.5) * 2.6, sy = -9.4 + (q[3] - 0.5) * 0.8;
      const tx = TIP.x + (q[2] - 0.5) * 1.6, ty = TIP.y - 0.2 + (q[1] - 0.5) * 0.6, e = ph * ph * (3 - 2 * ph);
      sPos[i * 3] = lerp(sx, tx, e) + Math.sin(ph * 9 + q[0] * 20) * 0.18 * (1 - e); sPos[i * 3 + 1] = lerp(sy, ty, e) + Math.sin(ph * 3.14) * (0.6 + q[3] * 0.8); sPos[i * 3 + 2] = 0.15 + q[1] * 0.9 * (1 - e);
    }
    sGeo.attributes.position.needsUpdate = true;
    // vesicles drift and turn slowly; their cargo turns with them
    ves.forEach((v, i) => {
      const x = ((v.x + 7 + t * v.sp) % 14) - 7, y = v.y + Math.sin(t * 0.4 + v.ph) * 0.3, z = v.z + Math.cos(t * 0.3 + v.ph) * 0.2;
      v.m.position.set(x, y, z);
      v.k.forEach((k, j) => { const a = t * 0.3 + v.ph; dummy.position.set(x + (k[0] * Math.cos(a) - k[2] * Math.sin(a)) * v.r * 0.75, y + k[1] * v.r * 0.75, z + (k[0] * Math.sin(a) + k[2] * Math.cos(a)) * v.r * 0.75); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(k[3] * v.r * 2); dummy.updateMatrix(); cargo.setMatrixAt(i * 14 + j, dummy.matrix); });
    });
    cargo.instanceMatrix.needsUpdate = true;
    if (bokeh) bokeh.uniforms.focus.value = cp.distanceTo(lp);

    composer.render();
  }
  function resize(w, h) {
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 52 : 34; camera.updateProjectionMatrix();
  }
  return { setProgress, render, resize, renderer };
}
