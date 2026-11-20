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

  // noise to dot: every discovery begins as noise; it settles into the Limen dot, then breaks up again.
  // Used for the dot that ends each headline's crosshair line.
  (function () {
    var cvs = [], seen = new WeakSet(), N = 23, R = new Float32Array(N * N), sd = 7;
    for (var i = 0; i < N * N; i++) { sd = (sd * 16807) % 2147483647; R[i] = sd / 2147483647; }
    var find = function () {
      var cs = document.querySelectorAll('canvas.lm-nd');
      for (var i = 0; i < cs.length; i++) if (!seen.has(cs[i])) {
        seen.add(cs[i]); cs[i].width = N; cs[i].height = N;
        var m = (getComputedStyle(cs[i].parentNode.parentNode).color || '').match(/\d+(\.\d+)?/g) || [13, 20, 19];
        cvs.push({ el: cs[i], c: [+m[0], +m[1], +m[2]], off: cvs.length * 1.7 });
      }
    };
    var t0 = performance.now();
    var draw = function (now) {
      find();
      for (var c = 0; c < cvs.length; c++) {
        var o = cvs[c], cv = o.el, r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > (window.innerHeight || 800) || !r.width) continue;
        var x = cv.getContext('2d'), img = x.createImageData(N, N);
        var t = ((now - t0) / 1000 + o.off) % 7, k = t < 2.6 ? t / 2.6 : t < 5.2 ? 1 : 1 - (t - 5.2) / 1.8; if (reduce) k = 1;
        var e = k * k * (3 - 2 * k), f = Math.floor(now / 90);
        for (var y = 0; y < N; y++) for (var xx = 0; xx < N; xx++) {
          var j = y * N + xx, d = Math.hypot(xx - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), q = j * 4;
          var nn = (R[j] * 997 + f * 0.618) % 1, inside = d < 0.44;
          var on = inside ? nn < 0.45 + 0.55 * e : d < 1 && nn < 0.42 * (1 - e) * (1 - d * 0.6);
          if (!on) { img.data[q + 3] = 0; continue; }
          if (inside) { img.data[q] = o.c[0] + (10 - o.c[0]) * e; img.data[q + 1] = o.c[1] + (122 - o.c[1]) * e; img.data[q + 2] = o.c[2] + (110 - o.c[2]) * e; img.data[q + 3] = 140 + 115 * e; }
          else { img.data[q] = o.c[0]; img.data[q + 1] = o.c[1]; img.data[q + 2] = o.c[2]; img.data[q + 3] = 150 * (1 - e); }
        }
        x.putImageData(img, 0, 0);
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce) setTimeout(function () { requestAnimationFrame(draw); }, 1500);
  })();

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
        if (!reduce && now - o.last < 40) continue; o.last = now;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
        var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
        var w = r.width, h = r.height, t = reduce ? 4 : (now - t0) / 1000 * 0.32, N = 26;
        var s = Math.max(w / 1100, 0.7), A = 17.32 * s, B = 10 * s, H = 20 * s, ox = w * 0.72 + Math.sin(t * 0.3) * 18 * s, oy = h * 0.08 + Math.cos(t * 0.23) * 10 * s;
        for (var k = 0; k <= 2 * (N - 1); k++) for (var i = Math.max(0, k - N + 1); i <= Math.min(k, N - 1); i++) {
          var j = k - i, cx = ox + (i - j) * 25.98 * s, cy = oy + (i + j) * 15 * s;
          if (cx < -40 || cx > w + 40 || cy > h + 60) continue;
          var n = Math.sin(i * 0.33 + t * 0.9) * Math.cos(j * 0.29 - t * 0.7) * 0.6 + Math.sin((i + j) * 0.21 + t * 0.55) * 0.4, z = 0.5 + 0.5 * n;
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
      cells: function (x, w, h, p, t) {
        var S = Math.max(46, Math.min(72, w / 18)), cols = Math.ceil(w / S) + 1, rows = Math.ceil(h / S) + 1, r = S * 0.395;
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var cx = i * S + S / 2, cy = j * S + S / 2, d = (cols - 1 - i + rows - 1 - j) / (cols + rows - 2);
          var q = ss(d * 0.75, d * 0.75 + 0.25, p * 1.15), off = (1 - q) * S * 0.62, wob = Math.sin(t * 0.8 + i * 0.7 + j * 0.5) * (1 - q) * S * 0.04;
          x.save(); x.beginPath(); x.rect(cx - S / 2, cy - S / 2, S, S); x.clip();
          x.fillStyle = q > 0.98 && (i * 7 + j * 3) % 11 === 0 ? 'rgba(10,122,110,0.26)' : 'rgba(13,20,19,' + (0.028 + 0.022 * q).toFixed(3) + ')';
          x.beginPath(); x.arc(cx - off + wob, cy - off, r, 0, 6.2832); x.fill(); x.restore();
        }
      },
      // Practice: a warped field of dots that straightens into a perfect grid
      grid: function (x, w, h, p, t) {
        var G = Math.max(18, w / 64), amp = G * 2.6 * Math.pow(1 - ss(0, 1, p), 1.4) + G * 0.05;
        x.fillStyle = 'rgba(238,243,241,0.3)';
        for (var y = G / 2; y < h; y += G) for (var xx = G / 2; xx < w; xx += G) {
          var u = xx / w * 3.2, v = y / h * 2.4, dx = nz(u, v, t * 0.5) * amp, dy = nz(v + 4, u, t * 0.5) * amp;
          x.beginPath(); x.arc(xx + dx, y + dy, 1.45, 0, 6.2832); x.fill();
        }
      },
      // How it lands: nodes on a loose grid, the links between them drawing in one by one
      nodes: function (x, w, h, p, t, o) {
        if (!o.g || o.gw !== w || o.gh !== h) {
          var R = rnd(91), G = Math.max(44, w / 26), N = [], E = [], cols = Math.ceil(w / G), rows = Math.ceil(h / G);
          for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) N.push({ x: i * G + G / 2 + (R() - 0.5) * G * 0.3, y: j * G + G / 2 + (R() - 0.5) * G * 0.3, ph: R() * 6.28 });
          for (var j2 = 0; j2 < rows; j2++) for (var i2 = 0; i2 < cols; i2++) {
            var a = j2 * cols + i2;
            if (i2 < cols - 1 && R() < 0.42) E.push([a, a + 1, R()]);
            if (j2 < rows - 1 && R() < 0.42) E.push([a, a + cols, R()]);
            if (i2 < cols - 1 && j2 < rows - 1 && R() < 0.12) E.push([a, a + cols + 1, R()]);
          }
          o.g = { N: N, E: E }; o.gw = w; o.gh = h;
        }
        var lit = {};
        x.lineWidth = 1; x.strokeStyle = 'rgba(13,20,19,0.16)';
        for (var e = 0; e < o.g.E.length; e++) {
          var E2 = o.g.E[e], q = ss(E2[2] * 0.85, E2[2] * 0.85 + 0.15, p); if (q <= 0) continue;
          var A = o.g.N[E2[0]], B = o.g.N[E2[1]]; lit[E2[0]] = lit[E2[1]] = 1;
          x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(A.x + (B.x - A.x) * q, A.y + (B.y - A.y) * q); x.stroke();
        }
        for (var n = 0; n < o.g.N.length; n++) {
          var P = o.g.N[n], on = lit[n], hub = on && n % 23 === 0;
          x.fillStyle = hub ? 'rgba(10,122,110,0.7)' : on ? 'rgba(13,20,19,0.3)' : 'rgba(13,20,19,0.12)';
          x.beginPath(); x.arc(P.x, P.y, hub ? 3.2 : on ? 2.2 : 1.6 + 0.4 * Math.sin(t + P.ph), 0, 6.2832); x.fill();
        }
      },
      // Contact: noisy rings that settle into calm ripples around the dish
      rings: function (x, w, h, p, t) {
        var cx = w / 2, cy = h / 2, R0 = Math.min(w, h) * 0.3, amp = R0 * 0.14 * (1 - ss(0, 1, p)) + R0 * 0.006;
        x.lineWidth = 1;
        for (var k = 0; k < 26; k++) {
          var rr = R0 * (1.02 + k * 0.045), a = 0.24 * (1 - k / 30);
          x.strokeStyle = 'rgba(13,20,19,' + a.toFixed(3) + ')'; x.beginPath();
          for (var s = 0; s <= 120; s++) {
            var an = s / 120 * 6.2832, m = rr + amp * (Math.sin(an * 3 + k * 0.35 + t * 0.7) * 0.6 + Math.sin(an * 5 - k * 0.22 - t * 0.5) * 0.4);
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
        var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
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
