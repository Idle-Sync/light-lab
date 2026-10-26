// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  // one group = rays from one emitting point, one wavelength, one exact sequence of surfaces
  record(groups, r, ex, ey, u) {
    var key = r.src + '|' + r.pt + '|' + r.nm + '|' + r.path;
    var g = groups[key] || (groups[key] = { src: r.src, pt: r.pt, nm: r.nm, path: r.path, n: 0, P: 0, Is: 0, a11: 0, a12: 0, a22: 0, b1: 0, b2: 0, dx: 0, dy: 0, ox: 0, oy: 0, px: 0, py: 0, lo: null, hi: null, loU: Infinity, hiU: -Infinity });
    var w = r.w * r.I, m11 = 1 - r.dx * r.dx, m12 = -r.dx * r.dy, m22 = 1 - r.dy * r.dy;
    g.n++; g.P += w; g.Is += r.I;
    g.a11 += w * m11; g.a12 += w * m12; g.a22 += w * m22;
    g.b1 += w * (m11 * ex + m12 * ey); g.b2 += w * (m12 * ex + m22 * ey);
    g.dx += w * r.dx; g.dy += w * r.dy; g.ox += w * r.x; g.oy += w * r.y; g.px += w * ex; g.py += w * ey;
    if (u < g.loU) { g.loU = u; g.lo = [ex, ey]; }
    if (u > g.hiU) { g.hiU = u; g.hi = [ex, ey]; }
  }

  // image point of each group = least-squares crossing of its rays, extended backwards when virtual
  analyze(eye) {
    var groups = this.trace(eye), list = [], half = eye.fov * Math.PI / 360, total = 0;
    for (var key in groups) {
      var g = groups[key], dl = Math.hypot(g.dx, g.dy), dx = g.dx / dl, dy = g.dy / dl;
      var pm = [g.px / g.P, g.py / g.P], om = [g.ox / g.P, g.oy / g.P], det = g.a11 * g.a22 - g.a12 * g.a12, X = null, kind = 'infinity';
      if (g.n >= 2 && det > 1e-12 * g.P * g.P) {
        X = [(g.a22 * g.b1 - g.a12 * g.b2) / det, (g.a11 * g.b2 - g.a12 * g.b1) / det];
        if (Math.hypot(X[0] - eye.x, X[1] - eye.y) > 20000) X = null;
        else if ((X[0] - pm[0]) * dx + (X[1] - pm[1]) * dy > 0) kind = 'behind';
        else kind = (X[0] - om[0]) * dx + (X[1] - om[1]) * dy > 0 ? 'real' : 'virtual';
      }
      var vx = X && kind !== 'behind' ? X[0] - eye.x : -dx, vy = X && kind !== 'behind' ? X[1] - eye.y : -dy;
      var rel = this.adiff(Math.atan2(vy, vx), eye.ang);
      total += g.P;
      list.push({ src: g.src, pt: g.pt, nm: g.nm, path: g.path, P: g.P, n: g.n, T: g.Is / g.n, kind: kind, X: X, dist: X ? Math.hypot(X[0] - eye.x, X[1] - eye.y) : Infinity, rel: rel, vis: Math.abs(rel) <= half, lo: g.lo, hi: g.hi });
    }
    list.sort(function (a, b) { return b.P - a.P; });
    var merged = {}, rows = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i], mk = it.src + '|' + it.path, c = this.rgb(it.nm);
      var m = merged[mk] || (merged[mk] = { path: it.path, P: 0, Tn: 0, n: 0, r: 0, g: 0, b: 0, top: it });
      m.P += it.P; m.Tn += it.T * it.n; m.n += it.n; m.r += it.P * c[0]; m.g += it.P * c[1]; m.b += it.P * c[2];
    }
    for (var mk2 in merged) rows.push(merged[mk2]);
    rows.sort(function (a, b) { return b.P - a.P; });
    return { eye: eye, list: list, rows: rows, total: total };
  }

  pathLabel(p) {
    var cnt = function (ch) { return (p.match(new RegExp(ch, 'g')) || []).length; };
    var t = cnt('t'), i = cnt('i'), x = cnt('x'), e = cnt('e'), m = cnt('m'), parts = [];
    if (t) parts.push(t + ' refraction' + (t > 1 ? 's' : ''));
    if (i + x) parts.push((i + x) + ' internal reflection' + (i + x > 1 ? 's' : '') + (x ? ', ' + x + ' total' : ''));
    if (e) parts.push(e + ' surface reflection' + (e > 1 ? 's' : ''));
    if (m) parts.push(m + ' mirror bounce' + (m > 1 ? 's' : ''));
    if (!parts.length) return 'Straight from the source';
    var s = parts.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  pct(v) {
    var x = v * 100;
    return (x >= 10 ? x.toFixed(1) : x >= 0.1 ? x.toFixed(2) : x >= 0.001 ? x.toFixed(4) : x.toExponential(1)) + ' %';
  }

  eyeObj() {
    var s = this.selObj();
    if (s && s.type === 'eye') return s;
    for (var i = 0; i < this.scene.length; i++) if (this.scene[i].type === 'eye') return this.scene[i];
    return null;
  }
