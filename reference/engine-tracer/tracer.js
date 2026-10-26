// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  isSource(o) { return o.type === 'point' || o.type === 'beam' || o.type === 'object'; }

  // dense = the eye pass: many more rays, each carrying the sequence of surfaces it met
  emit(o, st, dense) {
    var L = this.spectrum(o.spec), a = L.length > 1 ? 0.42 : 0.85, N = Math.max(1, Math.round(o.rays)), K = 9, pts = [];
    if (o.type === 'object') {
      for (var p = 0; p < K; p++) if (dense || p === 0 || p === K - 1) { var q = this.rot(o, 0, -o.h * p / (K - 1)); pts.push({ x: q.x, y: q.y, k: p }); }
    } else pts.push({ x: o.x, y: o.y, k: 0 });
    if (dense) N = o.type === 'beam' ? Math.min(800, Math.max(N, Math.round(o.width / 0.08))) : Math.min(1000, Math.max(N, Math.round(Math.min(360, o.cone) / 0.05)));
    var w = 1 / (N * L.length * pts.length), c = Math.cos(o.ang), s = Math.sin(o.ang);
    for (var pi = 0; pi < pts.length; pi++) {
      for (var k = 0; k < L.length; k++) {
        for (var i = 0; i < N; i++) {
          var f = N === 1 ? 0 : i / (N - 1) - 0.5, ray;
          if (o.type === 'beam') {
            var off = o.width * f;
            ray = { x: o.x - s * off, y: o.y + c * off, dx: c, dy: s };
          } else {
            var th = o.cone >= 360 ? o.ang + 2 * Math.PI * i / N : o.ang + o.cone * Math.PI / 180 * f;
            ray = { x: pts[pi].x, y: pts[pi].y, dx: Math.cos(th), dy: Math.sin(th) };
          }
          ray.nm = L[k]; ray.a = a; ray.w = w; ray.I = 1; ray.depth = 0; ray.src = o.id; ray.pt = pts[pi].k;
          if (dense) ray.path = '';
          st.push(ray);
        }
      }
    }
  }

  spawn(st, r, x, y, dx, dy, I, code, minI) {
    if (I < minI) return;
    var l = Math.hypot(dx, dy);
    st.push({ x: x, y: y, dx: dx / l, dy: dy / l, nm: r.nm, a: r.a, w: r.w, I: I, depth: r.depth + 1, src: r.src, pt: r.pt, path: r.path === undefined ? undefined : r.path + code });
  }

  trace(eye) {
    var obs = !!eye, prims = [], det = {}, buckets = {}, groups = {}, count = 0, st = [], BINS = 48, cap = obs ? 400000 : 40000, minI = obs ? 1e-5 : 0.002;
    var ec = obs ? Math.cos(eye.ang) : 0, es = obs ? Math.sin(eye.ang) : 0, partial = this.partial !== false;
    for (var j = 0; j < this.scene.length; j++) {
      var o = this.scene[j], ps = this.prims(o);
      for (var q = 0; q < ps.length; q++) prims.push(ps[q]);
      if (o.type === 'detector') det[o.id] = { power: 0, m1: 0, m2: 0, hits: 0, I: new Float64Array(BINS), R: new Float64Array(BINS), G: new Float64Array(BINS), B: new Float64Array(BINS) };
      if (this.isSource(o)) this.emit(o, st, obs);
    }
    while (st.length && count < cap) {
      var r = st.pop(), bt = 4000, bp = null, bu = 0, bi2 = -1;
      for (var i = 0; i < prims.length; i++) {
        var h = this.hit(prims[i], r.x, r.y, r.dx, r.dy);
        if (h && h.t < bt) { bt = h.t; bp = prims[i]; bu = h.u; bi2 = i; }
      }
      var ex = r.x + r.dx * bt, ey = r.y + r.dy * bt;
      if (!obs) {
        var qa = Math.min(32, Math.max(1, Math.round(r.a * r.I * 32))), key = r.nm + '|' + qa;
        var bk = buckets[key] || (buckets[key] = { nm: r.nm, al: qa / 32, pts: [] });
        bk.pts.push(r.x, r.y, ex, ey);
      }
      count++;
      if (!bp || r.depth > 40) continue;
      if (bp.role === 'eye') {
        if (obs && bp.o.id === eye.id && r.dx * ec + r.dy * es < 0) this.record(groups, r, ex, ey, bu);
        continue;
      }
      if (bp.role === 'detector') {
        if (obs) continue;
        var D = det[bp.o.id], s = (bu - 0.5) * bp.o.len, w = r.w * r.I, bi = Math.min(BINS - 1, Math.floor(bu * BINS)), col = this.rgb(r.nm);
        D.power += w; D.m1 += w * s; D.m2 += w * s * s; D.hits++;
        D.I[bi] += w; D.R[bi] += w * col[0]; D.G[bi] += w * col[1]; D.B[bi] += w * col[2];
        continue;
      }
      if (bp.role === 'blocker') continue;
      var nx, ny;
      if (bp.k === 's') { nx = bp.n ? bp.n.x : 0; ny = bp.n ? bp.n.y : 0; if (!bp.n) { var sx = bp.b.x - bp.a.x, sy = bp.b.y - bp.a.y, sl = Math.hypot(sx, sy); nx = -sy / sl; ny = sx / sl; } }
      else { nx = (ex - bp.c.x) / bp.r; ny = (ey - bp.c.y) / bp.r; }
      var dn = r.dx * nx + r.dy * ny;
      if (bp.role === 'mirror') { this.spawn(st, r, ex, ey, r.dx - 2 * dn * nx, r.dy - 2 * dn * ny, r.I, 'm' + bi2, minI); continue; }
      var ng = this.n(bp.o.mat, r.nm), cosi = -dn, n1 = 1, n2 = ng;
      if (cosi < 0) { cosi = -cosi; nx = -nx; ny = -ny; n1 = ng; n2 = 1; }
      var rx = r.dx + 2 * cosi * nx, ry = r.dy + 2 * cosi * ny, eta = n1 / n2, k2 = 1 - eta * eta * (1 - cosi * cosi);
      if (k2 <= 0) { this.spawn(st, r, ex, ey, rx, ry, r.I, 'x' + bi2, minI); continue; }
      var ct = Math.sqrt(k2), tx = eta * r.dx + (eta * cosi - ct) * nx, ty = eta * r.dy + (eta * cosi - ct) * ny;
      var rs = (n1 * cosi - n2 * ct) / (n1 * cosi + n2 * ct), rp = (n2 * cosi - n1 * ct) / (n2 * cosi + n1 * ct), Rf = (rs * rs + rp * rp) / 2;
      if (!partial) { this.spawn(st, r, ex, ey, tx, ty, r.I, 't' + bi2, minI); continue; }
      this.spawn(st, r, ex, ey, tx, ty, r.I * (1 - Rf), 't' + bi2, minI);
      this.spawn(st, r, ex, ey, rx, ry, r.I * Rf, (n1 > n2 ? 'i' : 'e') + bi2, minI);
    }
    return obs ? groups : { buckets: buckets, det: det, count: count };
  }
