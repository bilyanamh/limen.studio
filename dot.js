// The Limen dot, carried through the page.
// 1. A jade dot follows the pointer, the same dot as on the i of the logo. It swells softly over anything clickable.
// 2. Paragraphs marked data-bw sharpen word by word out of a blur as they scroll into view.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // words coming into focus
  if (!reduce) {
    document.documentElement.classList.add('lm-bwj');
    var seen = new WeakMap();
    var words = function () {
      var vh = window.innerHeight || 800, ps = document.querySelectorAll('[data-bw]');
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], r = p.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var ws = p.querySelectorAll('.lm-bw'), n = ws.length;
        var t = Math.min(1, Math.max(0, (vh * 0.94 - r.top) / (vh * 0.42)));
        var k = Math.max(seen.get(p) || 0, Math.round(t * n));
        if (k === seen.get(p)) continue;
        seen.set(p, k);
        for (var j = 0; j < n; j++) if (j < k) ws[j].classList.add('on');
      }
    };
    window.addEventListener('scroll', words, { passive: true, capture: true });
    window.addEventListener('resize', words);
    var tries = 0, iv = setInterval(function () { words(); if (++tries > 20) clearInterval(iv); }, 300);
  }

  // the signal: one dot that slides down a fine line as the page scrolls.
  // It starts as a hollow ring, below the threshold. Crossing into the second section it turns solid,
  // and it pulses each time it crosses the threshold of a new section.
  (function () {
    var st = document.createElement('style');
    st.textContent = '.lm-rail{position:fixed;right:10px;top:27vh;height:46vh;width:14px;z-index:2147482000;pointer-events:none;opacity:0;transition:opacity .6s ease}' +
      '.lm-rail.on{opacity:1}' +
      '.lm-rail::before{content:"";position:absolute;left:6.5px;top:0;bottom:0;width:1px;background:#8A9592;opacity:.55}' +
      '.lm-rail b{position:absolute;left:3px;width:8px;height:1px;background:#8A9592;transition:background-color .4s ease,transform .4s ease}' +
      '.lm-rail b.x{background:#0A7A6E;transform:scaleX(1.5)}' +
      '.lm-rail i{position:absolute;left:0;top:0;width:14px;height:14px;margin-top:-7px;border-radius:50%;box-sizing:border-box;border:2px solid #0A7A6E;background:transparent;transition:background-color .5s ease}' +
      '.lm-rail i.s{background:#0A7A6E}' +
      '.lm-rail i::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:1.5px solid #0A7A6E;opacity:0}' +
      '.lm-rail i.p::after{animation:lmRailP .9s ease-out}' +
      '@keyframes lmRailP{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(3.2)}}' +
      '@media (max-width:700px){.lm-rail{right:3px;width:10px}.lm-rail::before{left:4.5px}.lm-rail b{left:2px;width:6px}.lm-rail i{width:10px;height:10px;margin-top:-5px}}' +
      '@media (prefers-reduced-motion: reduce){.lm-rail i.p::after{animation:none}}@media print{.lm-rail{display:none}}';
    document.head.appendChild(st);
    var rail = document.createElement('div'); rail.className = 'lm-rail'; rail.setAttribute('aria-hidden', 'true');
    var ball = document.createElement('i'); rail.appendChild(ball); document.body.appendChild(rail);
    var ticks = [], fr = [], crossed = -1, built = 0;
    var build = function () {
      var secs = document.querySelectorAll('section'); if (secs.length < 3) return false;
      var H = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), y0 = window.scrollY || 0;
      ticks.forEach(function (t) { t.remove(); }); ticks = []; fr = [];
      for (var i = 1; i < secs.length; i++) {
        var f = Math.min(1, Math.max(0, (secs[i].getBoundingClientRect().top + y0) / H));
        if (f < 0.01) f = Math.min(1, Math.max(0, (secs[0].offsetHeight - window.innerHeight) / H)); // sections stacked at the top: the threshold is where the first one ends
        if (f < 0.01) continue;
        if (fr.length && f - fr[fr.length - 1] < 0.03) continue;
        var t = document.createElement('b'); t.style.top = (f * 100) + '%'; rail.insertBefore(t, ball); ticks.push(t); fr.push(f);
      }
      built = document.documentElement.scrollHeight; return true;
    };
    var upd = function () {
      if (!ticks.length || Math.abs(document.documentElement.scrollHeight - built) > 40) { if (!build()) return; }
      var H = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), f = Math.min(1, Math.max(0, (window.scrollY || 0) / H));
      ball.style.top = (f * 100) + '%'; rail.classList.add('on');
      var c = -1; for (var i = 0; i < fr.length; i++) if (f >= fr[i] - 0.004) c = i;
      if (c !== crossed) {
        if (c > crossed) { ball.classList.remove('p'); void ball.offsetWidth; ball.classList.add('p'); }
        crossed = c; ball.classList.toggle('s', c >= 0);
        ticks.forEach(function (t, i) { t.classList.toggle('x', i <= c); });
      }
    };
    window.addEventListener('scroll', upd, { passive: true, capture: true });
    window.addEventListener('resize', function () { ticks.length = 0; rail.querySelectorAll('b').forEach(function (t) { t.remove(); }); upd(); });
    var n = 0, iv2 = setInterval(function () { upd(); if (++n > 12) clearInterval(iv2); }, 500);
  })();

  // the side tab: a jade tab on the left edge naming the section you are in, like the tab on a magazine page
  (function () {
    var st = document.createElement('style');
    st.textContent = '.lm-stab{position:fixed;left:env(safe-area-inset-left,0px);top:50%;z-index:2147481000;pointer-events:none;transform:translate(-110%,-50%);transition:transform .45s cubic-bezier(.3,.8,.3,1)}' +
      '.lm-stab.on{transform:translate(0,-50%)}' +
      '.lm-stab span{display:block;writing-mode:vertical-rl;transform:rotate(180deg);background:#0A7A6E;color:#fff;font-family:"Geist Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:10px 3px;white-space:nowrap}' +
      '@media (max-width:900px){.lm-stab{display:none}}@media print{.lm-stab{display:none}}';
    document.head.appendChild(st);
    var tab = document.createElement('div'); tab.className = 'lm-stab'; tab.setAttribute('aria-hidden', 'true');
    var tx = document.createElement('span'); tab.appendChild(tx); document.body.appendChild(tab);
    var cur = '';
    var upd = function () {
      var labs = document.querySelectorAll('.lm-lab'), vh = window.innerHeight || 800, pick = '', uniq = [];
      for (var i = 0; i < labs.length; i++) {
        var nm = '', sp = labs[i].querySelectorAll('span');
        for (var k = 0; k < sp.length; k++) if (!sp[k].className && sp[k].textContent.trim()) { nm = sp[k].textContent.trim(); break; }
        if (!nm) continue;
        if (uniq.indexOf(nm) < 0) uniq.push(nm);
        if (labs[i].getBoundingClientRect().top < vh * 0.5) pick = nm;
      }
      if (pick) { var txt = 'N°' + ('0' + (uniq.indexOf(pick) + 1)).slice(-2) + ' · ' + pick; if (txt !== cur) { cur = txt; tx.textContent = txt; } }
      tab.classList.toggle('on', !!pick);
    };
    window.addEventListener('scroll', upd, { passive: true, capture: true }); window.addEventListener('resize', upd);
    var n = 0, iv3 = setInterval(function () { upd(); if (++n > 12) clearInterval(iv3); }, 500);
  })();

  // noise to dot: every discovery begins as noise; it settles into the Limen dot, then breaks up again
  (function () {
    var cvs = [], seen = new WeakSet(), N = 28, R = new Float32Array(N * N), sd = 7;
    for (var i = 0; i < N * N; i++) { sd = (sd * 16807) % 2147483647; R[i] = sd / 2147483647; }
    var find = function () { var cs = document.querySelectorAll('canvas.lm-nd'); for (var i = 0; i < cs.length; i++) if (!seen.has(cs[i])) { seen.add(cs[i]); cs[i].width = N; cs[i].height = N; cvs.push(cs[i]); } };
    var t0 = performance.now();
    var draw = function (now) {
      find();
      for (var c = 0; c < cvs.length; c++) {
        var cv = cvs[c], r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > (window.innerHeight || 800)) continue;
        var x = cv.getContext('2d'), img = x.createImageData(N, N);
        var t = ((now - t0) / 1000) % 6, k = t < 2.4 ? t / 2.4 : t < 4.2 ? 1 : 1 - (t - 4.2) / 1.8; if (reduce) k = 1;
        var e = k * k * (3 - 2 * k), f = Math.floor(now / 80);
        for (var y = 0; y < N; y++) for (var xx = 0; xx < N; xx++) {
          var j = y * N + xx, d = Math.hypot(xx - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), inside = d < 0.46;
          var nn = (R[j] * 997 + f * 0.618) % 1, on = inside ? nn < 0.5 + 0.5 * e : nn < 0.5 * (1 - e), o = j * 4, g = 60 + (nn * 70 | 0);
          if (on && inside) { img.data[o] = 10 * e + g * (1 - e); img.data[o + 1] = 122 * e + g * (1 - e); img.data[o + 2] = 110 * e + g * (1 - e); }
          else if (on) { img.data[o] = g; img.data[o + 1] = g; img.data[o + 2] = g; }
          else { img.data[o] = 238; img.data[o + 1] = 243; img.data[o + 2] = 241; }
          img.data[o + 3] = 255;
        }
        x.putImageData(img, 0, 0);
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce) setTimeout(function () { requestAnimationFrame(draw); }, 1500);
  })();

  // the dot that follows the pointer
  var fine =window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;
  var st = document.createElement('style');
  st.textContent = '.lm-cur{position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#0A7A6E;pointer-events:none;z-index:2147483000;opacity:0;will-change:transform,opacity}@media print{.lm-cur{display:none}}';
  document.head.appendChild(st);
  var d = document.createElement('div'); d.className = 'lm-cur'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d);
  var x = -100, y = -100, tx = -100, ty = -100, s = 1, ts = 1, o = 0, to = 0, live = false, raf = 0;
  var hot = function (e) { var el = e.target; return !!(el && el.closest && el.closest('a,button,[role="button"],input,textarea,select,summary,label')); };
  var tick = function () {
    var e = reduce ? 1 : 0.2;
    x += (tx - x) * e; y += (ty - y) * e; s += (ts - s) * (reduce ? 1 : 0.16); o += (to - o) * 0.2;
    d.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
    d.style.opacity = o.toFixed(3);
    raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.1 || Math.abs(ts - s) > 0.005 || Math.abs(to - o) > 0.005) ? requestAnimationFrame(tick) : 0;
  };
  var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!live) { live = true; x = tx; y = ty; }
    var h = hot(e); ts = h ? 3.4 : 1; to = h ? 0.26 : 1; kick();
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') { ts = hot(e) ? 2.6 : 0.6; kick(); } }, { passive: true });
  window.addEventListener('pointerup', function (e) { if (e.pointerType === 'mouse') { ts = hot(e) ? 3.4 : 1; kick(); } }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { to = 0; kick(); });
})();
