// Inside the skin: a real-time 3D mechanism-of-action scene for Limen.
// Art direction: a soft, misty macro world. Cream branching fibres of the dermis,
// coral star-shaped immune cells resting on them, small orange lights deep in the haze,
// and a strong depth of field. One progress value, p from 0 to 1, drives camera and story.
import * as THREE from 'three';
import { EffectComposer } from './lib/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/jsm/postprocessing/OutputPass.js';
import { BokehPass } from './lib/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from './lib/jsm/postprocessing/ShaderPass.js';

export const STEPS = [
  { p: 0, h: 'A patch on the <span>skin</span>' },
  { p: 0.17, h: 'Its needles reach just <span>below the surface</span>' },
  { p: 0.34, h: 'Into the fluid <span>between cells</span>' },
  { p: 0.48, h: 'An infection starts <span>quietly</span>' },
  { p: 0.64, h: 'Its markers reach <span>the sensor</span>' },
  { p: 0.8, h: 'Days before you <span>feel ill</span>' }
];

export const GROUND = '#B4ADA6';
const P = {
  ground: 0xB4ADA6, fibre: 0xEFE7DE, elastic: 0xE6D6B8, vessel: 0xE58A86, rbc: 0xC2343F, surface: 0xEDE3DA, lip: 0xE4D4C9,
  cells: [0xF3E9E1, 0xEDE0D6, 0xF6EEE8, 0xE9DBD0], basal: [0xEC9A84, 0xE38671, 0xF0AA92], nucleus: 0xB9503D,
  membrane: 0xE6CDBF, coral: 0xE9765E, coralHot: 0xF0603F, bact: [0x6E2E33, 0x5A2630, 0x82393A],
  glow: 0xFF8F45, marker: 0xFF7A2E, dust: 0xFFF8F0, patch: 0xF7F2EE
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const q = clamp((v - a) / (b - a)); return q * q * (3 - 2 * q); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise2(x, y) { return Math.sin(x * 1.7 + Math.sin(y * 0.9) * 1.3) * 0.5 + Math.sin(y * 2.3 + x * 0.6) * 0.3 + Math.sin((x + y) * 4.1) * 0.12; }

// A geometry builder that merges many tapered tubes into one mesh
function TubeBuilder() {
  const pos = [], nor = [], uv = [], w = [], idx = [];
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
  function add(pts, radFn, radial, wFn) {
    const n = pts.length; if (n < 3) return;
    let along = 0; const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      T.subVectors(b, a); if (T.lengthSq() < 1e-10) T.set(1, 0, 0); T.normalize();
      if (i > 0) { N.addScaledVector(T, -N.dot(T)); along += pts[i].distanceTo(pts[i - 1]); }
      if (i === 0 || N.lengthSq() < 1e-6) { tmp.set(Math.abs(T.y) < 0.9 ? 0 : 1, Math.abs(T.y) < 0.9 ? 1 : 0, 0); N.crossVectors(T, tmp); }
      N.normalize();
      B.crossVectors(T, N);
      const u = i / (n - 1), r = radFn(u), ww = wFn ? wFn(u) : 0;
      for (let j = 0; j <= radial; j++) {
        const ang = (j / radial) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
        pos.push(pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r); nor.push(nx, ny, nz); uv.push(along * 0.9, j / radial); w.push(ww);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = base + i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  function build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aW', new THREE.Float32BufferAttribute(w, 1));
    g.setIndex(idx); return g;
  }
  return { add, build };
}

export function createSkin(canvas, opts = {}) {
  const lite = !!opts.lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(P.ground);
  scene.fog = new THREE.FogExp2(P.ground, 0.05);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

  // light: soft overcast from above, a cool-white backlight that rims the fibres, warm orange glows inside
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa89c94, 0.85));
  const key = new THREE.DirectionalLight(0xfff1e6, 1.9); key.position.set(-6, 12, 14); scene.add(key);
  const back = new THREE.DirectionalLight(0xffffff, 2.2); back.position.set(4, -2, -14); scene.add(back);
  const tipLight = new THREE.PointLight(0xffa060, 0, 0, 2); tipLight.position.set(0, -7.3, 0.6); scene.add(tipLight);
  const patchLight = new THREE.PointLight(0xffd2a8, 0, 0, 2); patchLight.position.set(0, 1.2, 1.2); scene.add(patchLight);
  const infLight = new THREE.PointLight(0xff7a3a, 0, 0, 2); infLight.position.set(1.9, -9.4, 0.6); scene.add(infLight);

  // camera path, defined first so the fibres can leave a clear tunnel for it
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
  const camS = []; for (let i = 0; i <= 160; i++) { const u = i / 160; const c = posCurve.getPointAt(u); if (c.y < -1) camS.push(c); }
  const TIP = new THREE.Vector3(0, -7.5, -0.12), COL = new THREE.Vector3(1.9, -9.5, -0.2);
  const blocked = (q, r2 = 3.6) => {
    if (q.x > -3.2 && q.x < 5.4 && q.y < -5.8 && q.y > -11.4 && q.z > -1.6) return true; // the window onto the tip and the infection
    if (q.z > -2.5) for (const c of camS) if (c.distanceToSquared(q) < r2) return true; // the camera's way through
    return false;
  };

  const uT = { value: 0 };
  // a fine, fibrous surface texture used as a bump map on fibres and cells
  const bump = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), R = rng(5);
    x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 256); for (let i = 0; i < 512; i += 3 + (R() * 4 | 0)) { x.fillStyle = `rgba(${R() < 0.5 ? 60 : 200},${R() < 0.5 ? 60 : 200},128,0.18)`; x.fillRect(i, 0, 1 + R() * 1.5, 256); }
    for (let i = 0; i < 9000; i++) { const v = 90 + R() * 120 | 0; x.fillStyle = `rgba(${v},${v},${v},${0.25 + R() * 0.4})`; const r = 0.6 + R() * 2.4; x.beginPath(); x.ellipse(R() * 512, R() * 256, r * 1.4, r * 0.8, 0, 0, 6.28); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();

  const tissue = new THREE.Group(); scene.add(tissue);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const X0 = -11, X1 = 11, Z0 = -7;

  // the skin surface: a fine relief of ridges and furrows on top of the epidermis
  {
    const g = new THREE.PlaneGeometry(X1 - X0, -Z0 + 0.4, lite ? 120 : 260, lite ? 50 : 110); g.rotateX(-Math.PI / 2); g.translate(0, 0, Z0 / 2 + 0.2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const r = Math.abs(Math.sin(x * 1.9 + z * 0.8 + noise2(x * 0.4, z * 0.4) * 1.6)); pos.setY(i, 0.06 * (1 - r) + 0.05 * noise2(x * 3, z * 3)); }
    g.computeVertexNormals();
    tissue.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: P.surface, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 })));
    const lip = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.3, 0.25), new THREE.MeshStandardMaterial({ color: P.lip, roughness: 0.75 })); lip.position.set(0, -0.12, 0.02); tissue.add(lip);
  }

  // the epidermis: soft cream cells stacked in layers, coral columns at the base
  {
    const R = rng(3), list = [];
    const dx = lite ? 0.62 : 0.5;
    for (let x = X0 + 0.3; x < X1 - 0.3; x += dx) for (let z = -0.15; z > (lite ? -3.2 : -4.6); z -= dx) {
      for (let k = 0; k < 4; k++) list.push({ x: x + (R() - 0.5) * 0.12, z: z + (R() - 0.5) * 0.12, k });
    }
    const g = new THREE.SphereGeometry(1, lite ? 10 : 16, lite ? 8 : 12);
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, sheen: 1, sheenColor: new THREE.Color(0xfff2ea), sheenRoughness: 0.5 }), list.length);
    list.forEach((c, i) => {
      const y = [-0.42, -0.86, -1.45, -2.35][c.k], s = [[0.3, 0.12], [0.27, 0.2], [0.25, 0.28], [0.2, 0.62]][c.k];
      dummy.position.set(c.x, y + (R() - 0.5) * 0.06, c.z); dummy.rotation.set((R() - 0.5) * 0.2, R() * 6.28, (R() - 0.5) * 0.15);
      dummy.scale.set(s[0] * (0.9 + R() * 0.25), s[1] * (0.9 + R() * 0.2), s[0] * (0.9 + R() * 0.25)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      const pal = c.k === 3 ? P.basal : P.cells; mesh.setColorAt(i, col.setHex(pal[Math.floor(R() * pal.length)]));
    });
    tissue.add(mesh);
    const nuc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: P.nucleus, roughness: 0.4, emissive: 0x5a1408 }), Math.floor(list.length / 4));
    let ni = 0; list.forEach((c) => { if (c.k !== 3 || ni >= nuc.count) return; dummy.position.set(c.x, -2.2, c.z + 0.16); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.6, 1); dummy.updateMatrix(); nuc.setMatrixAt(ni++, dummy.matrix); });
    nuc.count = ni; tissue.add(nuc);
  }

  // the basement membrane: a pale sheet that rises and falls under the epidermis
  {
    const g = new THREE.PlaneGeometry(X1 - X0, -Z0, lite ? 120 : 220, 20); g.rotateX(-Math.PI / 2); g.translate(0, 0, Z0 / 2);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, -3.05 + Math.sin(x * 1.3) * 0.28 + Math.sin(z * 0.9 + x * 0.4) * 0.12); }
    g.computeVertexNormals(); tissue.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: P.membrane, side: THREE.DoubleSide, roughness: 0.7 })));
  }

  // the dermis as it really is. Papillary layer: thin loose collagen just under the membrane.
  // Reticular layer: thick wavy collagen bundles, each a rope of fine fibrils, in a loose basket weave.
  // Thin branching elastic fibres run between them, and everything sits in interstitial fluid.
  const bundles = [];
  {
    const R = rng(11), tb = TubeBuilder(), eb = TubeBuilder();
    const rv = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    const walk = (start, d0, len, step, turn, r2, steer) => {
      const pts = [start.clone()], d = d0.clone().normalize(), p = start.clone();
      for (let s = 0; s < len / step; s++) {
        rv.set(R() - 0.5, (R() - 0.5) * 0.5, (R() - 0.5) * 0.8); d.addScaledVector(rv, turn).normalize();
        if (p.y > -3.8 && d.y > 0) d.y = -Math.abs(d.y) - 0.15;
        if (p.z > 2 && d.z > 0) d.z = -0.3;
        d.normalize(); let ok = !blocked(rv.copy(p).addScaledVector(d, step), r2);
        for (let k = 0; k < (steer ? 8 : 0) && !ok; k++) { d.x += (R() - 0.5) * 1.2; d.y += (R() - 0.5) * 1.2; d.z -= R() * 0.6; d.normalize(); ok = !blocked(rv.copy(p).addScaledVector(d, step), r2); }
        if (!ok) break;
        p.addScaledVector(d, step); pts.push(p.clone());
      }
      return pts;
    };
    const smooth = (pts, k) => { for (let n = 0; n < k; n++) for (let i = pts.length - 2; i > 0; i--) pts[i] = pts[i - 1].clone().add(pts[i].clone().multiplyScalar(2)).add(pts[i + 1]).multiplyScalar(0.25); return pts; };
    const frames = (pts) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        T.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]); if (T.lengthSq() < 1e-10) T.set(1, 0, 0); T.normalize();
        if (i > 0) N.addScaledVector(T, -N.dot(T));
        if (i === 0 || N.lengthSq() < 1e-6) { tmp.set(Math.abs(T.y) < 0.9 ? 0 : 1, Math.abs(T.y) < 0.9 ? 1 : 0, 0); N.crossVectors(T, tmp); }
        N.normalize(); B.crossVectors(T, N); out.push([T.clone(), N.clone(), B.clone()]);
      }
      return out;
    };
    const NS = lite ? 5 : 9, rad = lite ? 6 : 8;
    const bundle = (pts, Rb) => {
      if (pts.length < 6) return;
      smooth(pts, 4);
      const F = frames(pts), along = [0];
      for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + pts[i].distanceTo(pts[i - 1]));
      // the crimp: relaxed collagen is gently wavy
      const ph = R() * 6.28, cf = 1.6 + R() * 0.8, ca = Rb * 0.35;
      const C = pts.map((q, i) => q.clone().addScaledVector(F[i][1], Math.sin(along[i] * cf + ph) * ca).addScaledVector(F[i][2], Math.cos(along[i] * cf * 0.7 + ph) * ca * 0.6));
      bundles.push({ C, F, Rb });
      const tw = (0.35 + R() * 0.3) * (R() < 0.5 ? 1 : -1);
      for (let k = 0; k <= NS; k++) {
        const a0 = (k / NS) * 6.28 + R() * 0.4, off = k === NS ? 0 : Rb * (0.42 + R() * 0.2), rs = Rb * (k === NS ? 0.5 : 0.36) * (0.85 + R() * 0.3);
        const i0 = Math.floor(R() * pts.length * 0.06), i1 = pts.length - Math.floor(R() * pts.length * 0.06); // fibres fray at the ends
        const sp = [];
        for (let i = i0; i < i1; i++) { const a = a0 + tw * along[i]; sp.push(C[i].clone().addScaledVector(F[i][1], Math.cos(a) * off).addScaledVector(F[i][2], Math.sin(a) * off)); }
        tb.add(sp, (u) => rs * Math.pow(Math.sin(Math.PI * clamp(u * 0.98 + 0.01)), 0.3) * (1 + 0.06 * Math.sin(u * sp.length * 1.7 + k)), rad);
      }
      // a few hair-fine fibrils wound around the outside of the bundle
      for (let k = 0; k < (lite ? 1 : 3); k++) {
        const a0 = R() * 6.28, tw2 = tw * (2.2 + R()), sp = [], i0 = Math.floor(R() * pts.length * 0.3), i1 = i0 + Math.floor(pts.length * (0.3 + R() * 0.4));
        for (let i = i0; i < Math.min(i1, pts.length); i++) { const a = a0 + tw2 * along[i]; sp.push(C[i].clone().addScaledVector(F[i][1], Math.cos(a) * Rb * 0.92).addScaledVector(F[i][2], Math.sin(a) * Rb * 0.92)); }
        tb.add(sp, () => Math.max(0.014, Rb * 0.07), 4);
      }
    };
    const NB = lite ? 48 : 64;
    for (let t = 0; t < NB; t++) {
      const papillary = t < NB * 0.22;
      const s = new THREE.Vector3(X0 - 2 + R() * (X1 - X0 + 4), papillary ? -3.9 - R() * 1.4 : -5.4 - R() * 9.6, -8.5 + R() * 10);
      const th = R() * 6.28, d = new THREE.Vector3(Math.cos(th), (R() - 0.5) * 0.45, Math.sin(th) * 0.7);
      const Rb = papillary ? 0.07 + R() * 0.07 : 0.2 + R() * 0.26, len = 8 + R() * 10;
      const back = walk(s, d.clone().negate(), len * 0.5, 0.25, 0.09, 9, false).reverse(), fwd = walk(s, d, len * 0.5, 0.25, 0.09, 9, false);
      bundle(back.concat(fwd.slice(1)), Rb);
    }
    // elastic fibres: thin, branching, slightly warmer
    const NE = lite ? 30 : 60;
    for (let t = 0; t < NE; t++) {
      const s = new THREE.Vector3(X0 + R() * (X1 - X0), -4 - R() * 10.5, -8 + R() * 9.5), d = new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.8, R() - 0.5);
      const pts = smooth(walk(s, d, 4 + R() * 7, 0.22, 0.28, 3.6, true), 3);
      if (pts.length < 5) continue;
      const r0 = 0.03 + R() * 0.025; eb.add(pts, (u) => r0 * (1 - u * 0.5), 5);
      for (let b = 0; b < 2 + Math.floor(R() * 3); b++) {
        const i = 1 + Math.floor(R() * (pts.length - 3)), dd = new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize().add(rv.set(R() - 0.5, R() - 0.5, R() - 0.5)).normalize();
        const c = smooth(walk(pts[i], dd, 1.5 + R() * 2.5, 0.2, 0.3, 3.6, true), 2); if (c.length > 4) eb.add(c, (u) => r0 * 0.7 * (1 - u * 0.8), 4);
      }
    }
    tissue.add(new THREE.Mesh(tb.build(), new THREE.MeshPhysicalMaterial({ color: P.fibre, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, bumpMap: bump, bumpScale: lite ? 1.2 : 1.6 })));
    tissue.add(new THREE.Mesh(eb.build(), new THREE.MeshPhysicalMaterial({ color: P.elastic, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 })));
  }

  // capillaries: a vessel under the membrane sending loops up into the papillae, red blood cells flowing through
  const flows = [];
  {
    const vessel = (q, r, cells) => {
      const curve = new THREE.CatmullRomCurve3(q.map((v) => new THREE.Vector3(...v)));
      tissue.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, r, 16, false), new THREE.MeshPhysicalMaterial({ color: P.vessel, roughness: 0.25, clearcoat: 0.9, transparent: true, opacity: 0.45, depthWrite: false })));
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshPhysicalMaterial({ color: P.rbc, roughness: 0.35, clearcoat: 0.6, emissive: 0x3a0408 }), cells);
      tissue.add(m); flows.push({ curve, m, n: cells, r, ph: 0 });
    };
    const q = [[-11, -5.6, -1.8]];
    for (let x = -9; x <= 9; x += 3) q.push([x - 0.7, -5.4, -1.7], [x - 0.45, -3.9, -1.6], [x, -3.6, -1.6], [x + 0.45, -3.9, -1.6], [x + 0.7, -5.4, -1.7]);
    q.push([11, -5.6, -1.8]);
    vessel(q, 0.16, lite ? 90 : 200);
  }

  // the cells of the dermis, in coral: their arms sway slowly in the fluid
  const cellMats = [];
  const cellMat = (hot) => {
    const m = new THREE.MeshPhysicalMaterial({ color: hot ? P.coralHot : P.coral, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xffc9b2), sheenRoughness: 0.4, emissive: 0xc8402a, emissiveIntensity: 0.28, bumpMap: bump, bumpScale: 1.4, clearcoat: 0.35, clearcoatRoughness: 0.5 });
    const amp = { value: hot ? 0.16 : 0.1 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT; sh.uniforms.uAmp = amp;
      sh.vertexShader = 'attribute float aW;\nuniform float uT;\nuniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += vec3(sin(uT*0.9+position.y*2.1+position.x*1.3), cos(uT*0.7+position.x*1.7), sin(uT*0.8+position.z*1.9)) * aW * aW * uAmp;');
    };
    cellMats.push({ m, amp, hot }); return m;
  };
  const cool = cellMat(false), hot = cellMat(true);
  {
    const R = rng(17);
    const makeCell = (c, size, mat) => {
      const tb = TubeBuilder(), arms = 6 + Math.floor(R() * 4), rv = new THREE.Vector3();
      for (let a = 0; a < arms; a++) {
        const d = new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.9, R() - 0.5).normalize(), p = new THREE.Vector3(), pts = [p.clone()];
        const len = (1.5 + R() * 1.2) * size, n = 22;
        const ax = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), curl = 0.06 + R() * 0.07, wph = R() * 6.28;
        for (let i = 0; i < n; i++) { d.applyAxisAngle(ax, curl * Math.sin(wph + (i / n) * 4.2)); p.addScaledVector(d, len / n); pts.push(p.clone()); }
        rv.set(R() - 0.5, R() - 0.5, R() - 0.5);
        tb.add(pts, (u) => size * (0.13 * Math.pow(1 - u, 1.6) + 0.018), lite ? 6 : 8, (u) => u);
        if (R() < 0.75) { const k = 8 + Math.floor(R() * 8), q = pts[k].clone(), d2 = d.clone().add(rv.set(R() - 0.5, R() - 0.5, R() - 0.5)).normalize(), pts2 = [q.clone()];
          const ax2 = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(); for (let i = 0; i < 12; i++) { d2.applyAxisAngle(ax2, 0.06); q.addScaledVector(d2, len * 0.55 / 12); pts2.push(q.clone()); }
          tb.add(pts2, (u) => size * (0.04 * Math.pow(1 - u, 1.3) + 0.014), 6, (u) => 0.5 + u * 0.5); }
      }
      const g = tb.build(), cm = new THREE.Mesh(g, mat);
      const body = new THREE.IcosahedronGeometry(size * 0.3, 4); const bp = body.attributes.position;
      for (let i = 0; i < bp.count; i++) { const f = 1 + 0.08 * Math.sin(bp.getX(i) * 9 + bp.getY(i) * 7) * Math.cos(bp.getZ(i) * 8); bp.setXYZ(i, bp.getX(i) * f, bp.getY(i) * f * 0.8, bp.getZ(i) * f); }
      body.computeVertexNormals(); body.setAttribute('aW', new THREE.Float32BufferAttribute(new Float32Array(bp.count), 1));
      const grp = new THREE.Group(); grp.add(cm, new THREE.Mesh(body, mat)); grp.position.copy(c); grp.rotation.set(R() * 6, R() * 6, R() * 6); tissue.add(grp);
    };
    // fibroblasts: spindle cells lying along the collagen bundles they make
    const makeFibro = (bd, i, size, mat) => {
      const tb = TubeBuilder(), rv = new THREE.Vector3();
      for (const sgn of [1, -1, 0]) {
        if (sgn === 0 && R() < 0.4) continue;
        const d = sgn ? new THREE.Vector3(sgn, (R() - 0.5) * 0.15, (R() - 0.5) * 0.15).normalize() : new THREE.Vector3((R() - 0.5) * 0.6, 1, (R() - 0.5) * 0.6).normalize();
        const p = new THREE.Vector3(sgn * size * 0.3, 0, 0), pts = [p.clone()], len = size * (sgn ? 1.3 + R() * 0.9 : 0.6 + R() * 0.5), ax = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), cu = 0.04 + R() * 0.05;
        for (let k = 0; k < 16; k++) { d.applyAxisAngle(ax, cu * Math.sin(k * 0.5)); p.addScaledVector(d, len / 16); pts.push(p.clone()); }
        tb.add(pts, (u) => size * (0.11 * Math.pow(1 - u, 1.2) + 0.012), lite ? 6 : 8, (u) => u * 0.5);
      }
      const body = new THREE.SphereGeometry(1, 24, 16); body.scale(size * 0.5, size * 0.14, size * 0.18);
      body.setAttribute('aW', new THREE.Float32BufferAttribute(new Float32Array(body.attributes.position.count), 1));
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: P.nucleus, roughness: 0.5 })); nuc.scale.set(size * 0.22, size * 0.09, size * 0.1); nuc.position.set(0, 0, size * 0.06);
      const grp = new THREE.Group(); grp.add(new THREE.Mesh(tb.build(), mat), new THREE.Mesh(body, mat), nuc);
      const [T, Nn, Bn] = bd.F[i]; grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(T, Nn, Bn));
      grp.position.copy(bd.C[i]).addScaledVector(Nn, bd.Rb + size * 0.12); tissue.add(grp);
    };
    let made = 0, tries = 0; const NF = lite ? 9 : 20, ND = lite ? 3 : 6;
    while (made < NF && tries++ < 600) {
      const bd = bundles[Math.floor(R() * bundles.length)], i = 3 + Math.floor(R() * (bd.C.length - 6));
      if (bd.Rb < 0.18 || i < 3 || blocked(bd.C[i])) continue;
      makeFibro(bd, i, 0.75 + R() * 0.4, cool); made++;
    }
    // dermal dendritic cells: the skin's resident immune sentinels, star-shaped, sitting in the fluid
    made = 0; tries = 0;
    while (made < ND && tries++ < 400) {
      const q = new THREE.Vector3(X0 + 1 + R() * (X1 - X0 - 2), -5 - R() * 8, -1.5 - R() * 5);
      if (blocked(q, 9)) continue;
      makeCell(q, 0.65 + R() * 0.3, cool); made++;
    }
    // three cells close to where the infection will start: they warm and reach as it grows
    [[-0.8, -10.6, -2.6], [4.8, -8.2, -2.4]].forEach((q) => makeCell(new THREE.Vector3(...q), 0.8, hot));
  }

  // small orange lights deep in the haze, flickering; more of them wake near the infection
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,246,220,1)'); g.addColorStop(0.12, 'rgba(255,190,110,0.95)'); g.addColorStop(0.4, 'rgba(255,130,50,0.35)'); g.addColorStop(1, 'rgba(255,110,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glows = [];
  {
    const R = rng(29), N = lite ? 18 : 34;
    for (let i = 0; i < N; i++) {
      const near = i < N * 0.35;
      let q;
      for (let k = 0; k < 40; k++) { q = near ? new THREE.Vector3(COL.x + (R() - 0.5) * 7, COL.y + (R() - 0.5) * 4, -1.8 - R() * 3) : new THREE.Vector3(X0 + R() * (X1 - X0), -4.2 - R() * 10, -1 - R() * 7); if (!blocked(q)) break; }
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      sp.position.copy(q); const s = 0.35 + R() * 0.9; sp.scale.setScalar(s); scene.add(sp);
      glows.push({ sp, s, near, ph: R() * 6.28, f: 0.6 + R() * 1.4 });
    }
  }
  const glowLights = [[-6, -8, -3.5], [7, -6, -4], [-2, -13, -4.5]].map((q) => { const l = new THREE.PointLight(0xff8a40, 26, 0, 2); l.position.set(...q); scene.add(l); return l; });

  // the patch and its microneedles
  const patch = new THREE.Group(); scene.add(patch);
  const patchMat = new THREE.MeshPhysicalMaterial({ color: P.patch, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), emissive: 0xffb27a, emissiveIntensity: 0 });
  {
    const s = new THREE.Shape(), w = 3.4, d = 2.6, r = 0.7;
    s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 20 }); g.rotateX(Math.PI / 2); g.translate(0, 0.3, 0);
    patch.add(new THREE.Mesh(g, patchMat));
  }
  const needleMat = new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.1, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.72, emissive: 0xff8a40, emissiveIntensity: 0 });
  const needleG = new THREE.ConeGeometry(0.34, 7.6, 40, 1); needleG.rotateX(Math.PI); needleG.translate(0, -3.8 + 0.05, 0);
  for (const z of [-0.12, -2.0]) for (const x of [-2.4, 0, 2.4]) { const n = new THREE.Mesh(needleG, needleMat); n.position.set(x, 0, z + 1.85); patch.add(n); }
  patch.position.set(0, 0.06, -1.85);

  // bacteria, multiplying near the tip of the front needle: small dark rods against the cream
  const R = rng(21), BN = lite ? 160 : 352, bact = [];
  const bMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color(0xe0a090), bumpMap: bump, bumpScale: 1.6 }), BN);
  for (let i = 0; i < BN; i++) {
    // cocci in grape-like clusters, the way Staphylococcus aureus grows
    const NC = 16, c = i % NC, k = Math.floor(i / NC), ca = c * 2.4, cd = Math.sqrt((c + 0.5) / NC);
    const cx = COL.x + Math.cos(ca) * cd * 2.0, cy = COL.y + Math.sin(ca) * cd * 0.9, cz = -0.45 + Math.sin(c * 1.7) * 0.4;
    const u = R() * 2 - 1, th = R() * 6.28, rr = 0.16 * Math.cbrt(k + 1) * 0.55, sq = Math.sqrt(1 - u * u);
    bact.push({ x: cx + sq * Math.cos(th) * rr, y: cy + u * rr, z: cz + sq * Math.sin(th) * rr, r: [0, 0, 0], born: 0.44 + (k / (BN / NC)) * 0.17 + (c / NC) * 0.02, ph: R() * 6.28 });
    bMesh.setColorAt(i, col.setHex(P.bact[i % 3]));
  }
  scene.add(bMesh);

  // the markers they shed: tiny orange lights the eye can follow to the sensor
  const MN = lite ? 120 : 260, mol = [];
  const mMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 1), new THREE.MeshStandardMaterial({ color: P.marker, emissive: P.marker, emissiveIntensity: 2.2, roughness: 0.3 }), MN);
  for (let i = 0; i < MN; i++) {
    const src = bact[Math.floor(R() * BN)], a = R() * 6.28, h = R() * 1.2;
    mol.push({ src, end: new THREE.Vector3(TIP.x + Math.cos(a) * (0.05 + h * 0.08), TIP.y + h, TIP.z + Math.abs(Math.sin(a)) * (0.05 + h * 0.08) + 0.06), t0: 0.55 + R() * 0.12, dur: 0.06 + R() * 0.05, bend: new THREE.Vector3((R() - 0.5) * 2.4, (R() - 0.2) * 1.6, R() * 1.2) });
  }
  scene.add(mMesh);

  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,240,228,0.6)'); g.addColorStop(1, 'rgba(255,230,210,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // fluid between the cells: fine pale dust drifting through the dermis
  const FN = lite ? 700 : 2000, fPos = new Float32Array(FN * 3), fSeed = [];
  for (let i = 0; i < FN; i++) fSeed.push([X0 + R() * (X1 - X0), -3.4 - R() * 11, 1.2 - R() * 7, 0.08 + R() * 0.2, R() * 6.28]);
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  scene.add(new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.06, map: dotTex, color: P.dust, transparent: true, opacity: 0.6, depthWrite: false })));

  // the signal: orange light running up the needle once the markers have bound
  const PN = 90, pPos = new Float32Array(PN * 3), pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pulse = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.32, map: glowTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pulse);

  // a fine spray of warm specks streaming off the infection towards the tip
  const SN = lite ? 600 : 1600, sPos = new Float32Array(SN * 3), sGeo = new THREE.BufferGeometry(), sSeed = [];
  for (let i = 0; i < SN; i++) sSeed.push([R(), R(), R(), R()]);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const spray = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.05, map: dotTex, color: 0xffb27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(spray);

  // post: depth of field, a soft bloom on the lights, then a little vignette and film grain
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // a guard: some GPUs produce a stray NaN pixel on grazing sheen, which bloom would spread into a black block
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null }, uC: { value: new THREE.Color(P.ground) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 uC; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (!(c.r == c.r && c.g == c.g && c.b == c.b) || max(c.r, max(c.g, c.b)) > 60.0) c = vec4(uC, 1.0); gl_FragColor = c; }' }));
  const bokeh = lite ? null : new BokehPass(scene, camera, { focus: 10, aperture: 0.0012, maxblur: 0.0025 }); if (bokeh) composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), lite ? 0.18 : 0.2, 0.45, 0.98); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uRes; varying vec2 vUv;\n' +
      'void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = smoothstep(0.95, 0.25, length(q * vec2(1.0, 1.15)));\n' +
      ' c.rgb *= mix(0.88, 1.0, v); float n = fract(sin(dot(floor(vUv * uRes) + floor(uT * 24.0) * 7.13, vec2(12.9898, 78.233))) * 43758.5453);\n' +
      ' c.rgb += (n - 0.5) * 0.008; gl_FragColor = c; }'
  });
  composer.addPass(finish);

  let p = 0;
  function setProgress(v) { p = clamp(v); }
  const v = new THREE.Vector3(), c1 = new THREE.Vector3(), s0 = new THREE.Vector3();
  function render(t) {
    uT.value = t; finish.uniforms.uT.value = t;
    const u = pathU(p), cp = posCurve.getPointAt(u), lp = lookCurve.getPointAt(u);
    camera.position.set(cp.x + Math.sin(t * 0.3) * 0.12, cp.y + Math.sin(t * 0.4) * 0.08, cp.z); camera.lookAt(lp);
    const dist = cp.distanceTo(lp);
    scene.fog.density = (lite ? 0.26 : 0.2) / (dist + 3); // misty in close, clearer on the wide views

    for (let i = 0; i < FN; i++) { const s = fSeed[i], x = ((s[0] - X0 + t * s[3]) % (X1 - X0)) + X0; fPos[i * 3] = x; fPos[i * 3 + 1] = s[1] + Math.sin(t * 0.7 + s[4]) * 0.12; fPos[i * 3 + 2] = s[2]; }
    fGeo.attributes.position.needsUpdate = true;
    for (const f of flows) {
      for (let i = 0; i < f.n; i++) {
        const q = ((i / f.n) + t * 0.012) % 1, pt = f.curve.getPointAt(q);
        dummy.position.copy(pt); dummy.rotation.set(i * 1.3, i * 0.7, i * 0.4); const sc = f.r * 0.62; dummy.scale.set(sc, sc * 0.38, sc); dummy.updateMatrix(); f.m.setMatrixAt(i, dummy.matrix);
      }
      f.m.instanceMatrix.needsUpdate = true;
    }

    const inf = ss(0.46, 0.62, p) * (1 - ss(0.95, 1, p));
    for (const g of glows) { const fl = 0.62 + 0.38 * Math.sin(t * g.f + g.ph) * Math.sin(t * g.f * 0.37 + g.ph * 2); const o = g.near ? lerp(0.25, 1, inf) : 0.8; g.sp.material.opacity = o * fl; g.sp.scale.setScalar(g.s * (g.near ? 1 + inf * 0.5 : 1)); }
    glowLights.forEach((l, i) => { l.intensity = 22 + 8 * Math.sin(t * (0.8 + i * 0.3) + i); });
    infLight.intensity = inf * 22;
    cellMats.forEach((c) => { if (c.hot) { c.m.emissiveIntensity = 0.28 + inf * 0.55; c.amp.value = 0.1 + inf * 0.14; } });

    for (let i = 0; i < BN; i++) {
      const b = bact[i], g = ss(b.born, b.born + 0.03, p) * (1 - ss(0.95, 1, p));
      dummy.position.set(b.x + Math.sin(t * 0.9 + b.ph) * 0.05, b.y + Math.cos(t * 0.8 + b.ph) * 0.04, b.z);
      dummy.rotation.set(b.r[0] + t * 0.2, b.r[1], b.r[2] + Math.sin(t + b.ph) * 0.3); dummy.scale.setScalar(Math.max(0.0001, g)); dummy.updateMatrix(); bMesh.setMatrixAt(i, dummy.matrix);
    }
    bMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < MN; i++) {
      const o = mol[i], q = clamp((p - o.t0) / o.dur), e = q * q * (3 - 2 * q), on = q > 0 && p < 0.96;
      s0.set(o.src.x, o.src.y, o.src.z + 0.1);
      c1.copy(s0).lerp(o.end, 0.5).add(o.bend);
      v.copy(s0).multiplyScalar((1 - e) * (1 - e)).addScaledVector(c1, 2 * (1 - e) * e).addScaledVector(o.end, e * e);
      if (q < 1) v.x += Math.sin(t * 3 + i) * 0.03 * (1 - e);
      dummy.position.copy(v); dummy.rotation.set(t + i, t * 0.7, 0); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); mMesh.setMatrixAt(i, dummy.matrix);
    }
    mMesh.instanceMatrix.needsUpdate = true;

    const bound = ss(0.66, 0.76, p) * (1 - ss(0.95, 1, p));
    needleMat.emissiveIntensity = bound * (0.3 + 0.2 * Math.sin(t * 6));
    tipLight.intensity = bound * 6;
    const run = ss(0.74, 0.9, p) * (1 - ss(0.96, 1, p));
    pulse.material.opacity = run;
    for (let i = 0; i < PN; i++) { const ph = ((i / PN) + t * 0.55) % 1; pPos[i * 3] = TIP.x + Math.sin(i * 1.7) * 0.06 * (1 - ph); pPos[i * 3 + 1] = lerp(TIP.y, 0.1, ph); pPos[i * 3 + 2] = TIP.z + 0.34 * ph + 0.1; }
    pGeo.attributes.position.needsUpdate = true;
    const lit = ss(0.84, 0.94, p);
    patchMat.emissiveIntensity = lit * 0.22; patchLight.intensity = lit * 12;

    const sp = ss(0.5, 0.56, p) * (1 - ss(0.8, 0.86, p));
    spray.material.opacity = sp * 0.55;
    if (sp > 0) for (let i = 0; i < SN; i++) {
      const q = sSeed[i], ph = (q[0] + t * (0.16 + q[1] * 0.2)) % 1, sx = COL.x + (q[2] - 0.5) * 2.6, sy = COL.y + 0.1 + (q[3] - 0.5) * 0.8;
      const tx = TIP.x + (q[2] - 0.5) * 1.6, ty = TIP.y - 0.2 + (q[1] - 0.5) * 0.6, e = ph * ph * (3 - 2 * ph);
      sPos[i * 3] = lerp(sx, tx, e) + Math.sin(ph * 9 + q[0] * 20) * 0.18 * (1 - e); sPos[i * 3 + 1] = lerp(sy, ty, e) + Math.sin(ph * 3.14) * (0.6 + q[3] * 0.8); sPos[i * 3 + 2] = 0.15 + q[1] * 0.9 * (1 - e);
    }
    sGeo.attributes.position.needsUpdate = true;
    if (bokeh) bokeh.uniforms.focus.value = dist;

    composer.render();
  }
  function resize(w, h) {
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    const pr = renderer.getPixelRatio(); finish.uniforms.uRes.value.set(w * pr, h * pr);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 52 : 34; camera.updateProjectionMatrix();
  }
  return { setProgress, render, resize, renderer };
}
