// The work-page version of the skin scene: the same 3D world as the homepage,
// played as a 30-second film with captions, play and pause, and step buttons.
import { createSkin, STEPS } from './skin3d.js';

const T = 30;
const canvas = document.getElementById('mo-c');
const s = createSkin(canvas, { lite: innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4 });
const tEl = document.getElementById('mo-t'), nEl = document.getElementById('mo-n'), steps = document.getElementById('mo-steps'), prog = document.getElementById('mo-prog'), play = document.getElementById('mo-play');

const btns = STEPS.map((st, i) => {
  const b = document.createElement('button'); b.type = 'button';
  b.setAttribute('aria-label', `Go to step ${i + 1}: ${st.h.replace(/<[^>]+>/g, '')}`);
  b.addEventListener('click', () => { clock = st.p * T + 0.01; draw(); });
  steps.appendChild(b); return b;
});
let shown = -1;
function caption(p) {
  let i = 0; while (i < STEPS.length - 1 && p >= STEPS[i + 1].p) i++;
  if (i !== shown) {
    const first = shown < 0; shown = i; tEl.classList.add('out');
    setTimeout(() => { tEl.innerHTML = STEPS[i].h; nEl.textContent = `0${i + 1} / 0${STEPS.length}`; tEl.classList.remove('out'); }, first ? 0 : 260);
    btns.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.classList.toggle('done', k < i); });
  }
  prog.style.width = (p * 100).toFixed(2) + '%';
}
function resize() { const r = canvas.getBoundingClientRect(); s.resize(Math.max(1, r.width), Math.max(1, r.height)); }
addEventListener('resize', () => { resize(); draw(); });
resize();

const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduce, clock = reduce ? 0.6 * T : 0, last = performance.now(), visible = true, wall = 0;
play.textContent = playing ? 'Pause' : 'Play';
play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; last = performance.now(); });
new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
function draw() { const p = clock / T; s.setProgress(p); s.render(wall); caption(p); }
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (visible) { wall += dt; if (playing) clock = (clock + dt) % T; draw(); }
  requestAnimationFrame(loop);
}
draw(); requestAnimationFrame(loop);
window.__moa = { seek: (t) => { clock = t; draw(); }, pause: () => { playing = false; } };
