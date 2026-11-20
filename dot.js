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

  // the pointer, shared by the pattern fields: where it is, and the ripples a click or tap sends out
  var PTR = { x: -1e5, y: -1e5, rips: [] };
  window.addEventListener('pointermove', function (e) { PTR.x = e.clientX; PTR.y = e.clientY; }, { passive: true });
  window.addEventListener('pointerdown', function (e) { PTR.x = e.clientX; PTR.y = e.clientY; PTR.rips.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (PTR.rips.length > 6) PTR.rips.shift(); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { PTR.x = PTR.y = -1e5; });
  // eased pointer for one canvas: o.mx, o.my in canvas pixels, o.mi from 0 (away) to 1 (over it)
  var ease = function (o, r) {
    var inside = PTR.x >= r.left && PTR.x <= r.right && PTR.y >= r.top && PTR.y <= r.bottom, tx = PTR.x - r.left, ty = PTR.y - r.top;
    if (o.mx == null) { o.mx = tx; o.my = ty; o.mi = 0; }
    if (inside && (o.mi < 0.05 || Math.abs(tx - o.mx) + Math.abs(ty - o.my) > 600)) { o.mx = tx; o.my = ty; }
    o.mx += (tx - o.mx) * 0.22; o.my += (ty - o.my) * 0.22; o.mi += ((inside ? 1 : 0) - o.mi) * 0.08;
    var now = performance.now(); o.rips = [];
    for (var i = 0; i < PTR.rips.length; i++) { var R = PTR.rips[i], age = (now - R.t) / 1000; if (age < 2 && R.x >= r.left && R.x <= r.right && R.y >= r.top && R.y <= r.bottom) o.rips.push({ x: R.x - r.left, y: R.y - r.top, age: age }); }
  };

  // a slow, quiet cube field behind a section title: the isometric noise field, large and faint,
  // drifting gently; the odd cube that crosses the threshold catches the jade.
  // Cube field after "Isometric Noise Field II", pattern from bookofshapes.com, redrawn in code.
  (function () {
    var list = [], seen = new WeakSet(), t0 = performance.now();
    var find = function () { var cs = document.querySelectorAll('canvas.lm-isobg'); for (var i = 0; i < cs.length; i++) if (!seen.has(cs[i])) { seen.add(cs[i]); list.push({ el: cs[i], last: -1 }); } };
    var draw = function (now) {
      find();
      for (var q = 0; q < list.length; q++) {
        var o = list[q], cv = o.el, r = cv.getBoundingClientRect(), vh = window.innerHeight || 800;
        if (r.bottom < 0 || r.top > vh || r.width < 2) continue;
        if (!reduce && now - o.last < 33) continue; o.last = now;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
        var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height); ease(o, r);
        var w = r.width, h = r.height, t = reduce ? 4 : (now - t0) / 1000 * 0.32, N = 26;
        var s = Math.max(w / 1100, 0.7), A = 17.32 * s, B = 10 * s, H = 20 * s, ox = w * 0.72 + Math.sin(t * 0.3) * 18 * s, oy = h * 0.08 + Math.cos(t * 0.23) * 10 * s;
        for (var k = 0; k <= 2 * (N - 1); k++) for (var i = Math.max(0, k - N + 1); i <= Math.min(k, N - 1); i++) {
          var j = k - i, cx = ox + (i - j) * 25.98 * s, cy = oy + (i + j) * 15 * s;
          if (cx < -40 || cx > w + 40 || cy > h + 60) continue;
          var n = Math.sin(i * 0.33 + t * 0.9) * Math.cos(j * 0.29 - t * 0.7) * 0.6 + Math.sin((i + j) * 0.21 + t * 0.55) * 0.4, z = 0.5 + 0.5 * n;
          if (o.mi > 0.01) { var mdx = cx - o.mx, mdy = (cy - o.my) * 1.4; z = Math.max(z, o.mi * 1.05 * Math.exp(-(mdx * mdx + mdy * mdy) / (150 * 150 * s * s))); }
          var yy = cy - z * z * H * 2.2, hot = z > 0.86, a = 0.05 + 0.13 * z;
          x.fillStyle = hot ? 'rgba(10,122,110,' + (a * 1.6).toFixed(3) + ')' : 'rgba(238,243,241,' + (a * 0.35).toFixed(3) + ')';
          x.beginPath(); x.moveTo(cx, yy); x.lineTo(cx, yy - H); x.lineTo(cx - A, yy - H - B); x.lineTo(cx - A, yy - B); x.closePath(); x.fill();
          x.fillStyle = hot ? 'rgba(10,122,110,' + (a * 1.2).toFixed(3) + ')' : 'rgba(238,243,241,' + (a * 0.55).toFixed(3) + ')';
          x.beginPath(); x.moveTo(cx, yy); x.lineTo(cx + A, yy - B); x.lineTo(cx + A, yy - H - B); x.lineTo(cx, yy - H); x.closePath(); x.fill();
          x.fillStyle = hot ? 'rgba(10,122,110,' + Math.min(0.85, a * 4).toFixed(3) + ')' : 'rgba(238,243,241,' + a.toFixed(3) + ')';
          x.beginPath(); x.moveTo(cx, yy - H); x.lineTo(cx + A, yy - H - B); x.lineTo(cx, yy - H - 2 * B); x.lineTo(cx - A, yy - H - B); x.closePath(); x.fill();
        }
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce) setTimeout(function () { requestAnimationFrame(draw); }, 1500);
  })();

  // Scroll-driven pattern fields. Every one moves from noise to order as its section scrolls through,
  // so the page tells one story: noise, threshold, signal, connection.
  // Patterns after bookofshapes.com (Cell Shift, Deformed Grid Mesh II, Node Garden, Concentric Noise Rings), redrawn in code.
  (function () {
    var list = [], seen = new WeakSet(), t0 = performance.now();
    var ss = function (a, b, v) { var q = Math.min(1, Math.max(0, (v - a) / (b - a))); return q * q * (3 - 2 * q); };
    var rnd = function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
    var nz = function (x, y, t) { return Math.sin(x * 1.7 + t * 0.6 + Math.sin(y * 1.3 + t * 0.4)) * 0.55 + Math.sin(y * 2.1 - t * 0.5 + x * 0.7) * 0.45; };
    var find = function () {
      var cs = document.querySelectorAll('canvas.lm-pat');
      for (var i = 0; i < cs.length; i++) if (!seen.has(cs[i])) { seen.add(cs[i]); list.push({ el: cs[i], k: cs[i].getAttribute('data-k'), last: -1, lp: -1, sec: cs[i].closest('section') || cs[i].parentNode }); }
    };
    var K = {
      // Before and after: each dot sits half outside its window and slides fully in, a wave from the far corner
      cells: function (x, w, h, p, t, o) {
        var S = Math.max(46, Math.min(72, w / 18)), cols = Math.ceil(w / S) + 1, rows = Math.ceil(h / S) + 1, r = S * 0.395;
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var cx = i * S + S / 2, cy = j * S + S / 2, d = (cols - 1 - i + rows - 1 - j) / (cols + rows - 2);
          var q = ss(d * 0.75, d * 0.75 + 0.25, p * 1.15), dx = cx - o.mx, dy = cy - o.my, inf = o.mi * Math.exp(-(dx * dx + dy * dy) / (S * S * 5));
          for (var k = 0; k < o.rips.length; k++) { var R = o.rips[k], rd = Math.hypot(cx - R.x, cy - R.y) - R.age * 700; inf = Math.max(inf, Math.exp(-rd * rd / (S * S * 0.8)) * (1 - R.age / 2)); }
          var qq = Math.max(q, inf), off = (1 - qq) * S * 0.62, wob = Math.sin(t * 0.8 + i * 0.7 + j * 0.5) * (1 - qq) * S * 0.04;
          x.save(); x.beginPath(); x.rect(cx - S / 2, cy - S / 2, S, S); x.clip();
          x.fillStyle = inf > 0.55 ? 'rgba(10,122,110,' + (0.12 + 0.3 * inf).toFixed(3) + ')' : q > 0.98 && (i * 7 + j * 3) % 11 === 0 ? 'rgba(10,122,110,0.26)' : 'rgba(13,20,19,' + (0.028 + 0.022 * qq).toFixed(3) + ')';
          x.beginPath(); x.arc(cx - off + wob, cy - off, r * (1 + 0.08 * inf), 0, 6.2832); x.fill(); x.restore();
        }
      },
      // Practice: a warped field of dots that straightens into a perfect grid
      grid: function (x, w, h, p, t, o) {
        var G = Math.max(18, w / 64), amp = G * 2.6 * Math.pow(1 - ss(0, 1, p), 1.4) + G * 0.05, L = 120;
        for (var y = G / 2; y < h; y += G) for (var xx = G / 2; xx < w; xx += G) {
          var u = xx / w * 3.2, v = y / h * 2.4, px = xx + nz(u, v, t * 0.5) * amp, py = y + nz(v + 4, u, t * 0.5) * amp;
          var mx = px - o.mx, my = py - o.my, md = Math.hypot(mx, my) + 0.001, f = o.mi * Math.exp(-md * md / (L * L));
          px += mx / md * f * 30; py += my / md * f * 30;
          for (var k = 0; k < o.rips.length; k++) { var R = o.rips[k], rx = px - R.x, ry = py - R.y, rd = Math.hypot(rx, ry) + 0.001, band = Math.exp(-Math.pow(rd - R.age * 520, 2) / 1600) * (1 - R.age / 2); px += rx / rd * band * 16; py += ry / rd * band * 16; f = Math.max(f, band); }
          x.fillStyle = f > 0.5 ? 'rgba(10,122,110,' + (0.4 + 0.5 * f).toFixed(3) + ')' : 'rgba(238,243,241,' + (0.3 + 0.5 * f).toFixed(3) + ')';
          x.beginPath(); x.arc(px, py, 1.45 + f * 1.4, 0, 6.2832); x.fill();
        }
      },
      // Contact: noisy rings that settle into calm ripples around the dish
      rings: function (x, w, h, p, t, o) {
        var cx = w / 2, cy = h / 2, R0 = Math.min(w, h) * 0.3, R1 = R0 * 228 / 106, NR = 50, amp = R0 * (9.3 / 106) * (1 + 1.8 * (1 - ss(0, 1, p)));
        x.lineWidth = 1;
        for (var k = 0; k < NR; k++) {
          var rr = R0 * 1.02 + (R1 - R0 * 1.02) * k / (NR - 1), a = 0.2 * (1 - k / (NR + 10));
          x.strokeStyle = 'rgba(13,20,19,' + a.toFixed(3) + ')'; x.beginPath();
          for (var s = 0; s <= 150; s++) {
            var an = s / 150 * 6.2832, m = rr + amp * (Math.sin(an * 3 + k * 0.12 + t * 0.7) * 0.6 + Math.sin(an * 5 - k * 0.08 - t * 0.5) * 0.4);
            var bx = cx + Math.cos(an) * m - o.mx, by = cy + Math.sin(an) * m - o.my; m += o.mi * 34 * Math.exp(-(bx * bx + by * by) / (110 * 110));
            for (var q2 = 0; q2 < o.rips.length; q2++) { var R = o.rips[q2], wr = R0 + R.age * 260; m += 14 * Math.exp(-Math.pow(rr - wr, 2) / 900) * (1 - R.age / 2) * Math.sin(an * 6 + R.age * 9); }
            var px = cx + Math.cos(an) * m, py = cy + Math.sin(an) * m;
            if (s) x.lineTo(px, py); else x.moveTo(px, py);
          }
          x.stroke();
        }
      }
    };
    var draw = function (now) {
      find();
      var vh = window.innerHeight || 800;
      for (var q = 0; q < list.length; q++) {
        var o = list[q], cv = o.el, r = cv.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width < 2 || !K[o.k]) continue;
        if (!reduce && now - o.last < 33) continue; o.last = now;
        var sr = o.sec.getBoundingClientRect(), p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.92 - sr.top) / (Math.min(sr.height, vh * 1.6) * 0.75)));
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
        var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height); ease(o, r);
        K[o.k](x, r.width, r.height, p, reduce ? 3 : (now - t0) / 1000, o);
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
