// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/wave-lab.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  slitCount() { return this.p.mode === 'single' ? 1 : this.p.mode === 'double' ? 2 : this.p.N; }

  // Huygens-Fresnel sum over every slit, 2D cylindrical wavelets with obliquity factor; lengths in mm
  compute() {
    var t0 = performance.now(), p = this.p, lam = p.nm * 1e-6, k = 2 * Math.PI / lam, a = p.a * 1e-3, d = p.d * 1e-3, L = p.L, N = this.slitCount();
    var M = Math.max(300, Math.min(2000, Math.round(this.pw || 900))), Y = p.Y, cs = [];
    for (var j = 0; j < N; j++) cs.push((j - (N - 1) / 2) * d);
    var W = (N - 1) * d + a, edge = Y + W / 2;
    var span = k * a * edge / Math.hypot(edge, L) + k * a * a / (4 * L);
    var S = Math.min(600, Math.max(24, Math.ceil(span / 0.2) + 8));
    var us = new Float64Array(S);
    for (j = 0; j < S; j++) us[j] = -a / 2 + (j + 0.5) * a / S;
    var I = new Float64Array(M), T = new Float64Array(M), ys = new Float64Array(M), mx = 0;
    for (var i = 0; i < M; i++) {
      var y = -Y + 2 * Y * i / (M - 1), re = 0, im = 0;
      for (var c = 0; c < N; c++) {
        for (var q = 0; q < S; q++) {
          var dy = y - cs[c] - us[q], r = Math.sqrt(L * L + dy * dy), ph = k * (dy * dy / (r + L)), amp = (1 + L / r) / (2 * Math.sqrt(r));
          re += amp * Math.cos(ph); im += amp * Math.sin(ph);
        }
      }
      ys[i] = y; I[i] = re * re + im * im;
      if (I[i] > mx) mx = I[i];
      var st = y / Math.hypot(y, L), be = Math.PI * a * st / lam, env = Math.abs(be) < 1e-12 ? 1 : Math.pow(Math.sin(be) / be, 2), af = 1;
      if (N > 1) { var al = Math.PI * d * st / lam, sa = Math.sin(al); af = Math.abs(sa) < 1e-12 ? 1 : Math.pow(Math.sin(N * al) / (N * sa), 2); }
      T[i] = env * af;
    }
    for (i = 0; i < M; i++) I[i] /= mx;

    var dyS = ys[1] - ys[0];
    // extreme of A inside [yc - hw, yc + hw], refined with a parabola; null when it sits on the window edge or off screen
    var extreme = function (A, yc, hw, wantMax) {
      var i0 = Math.max(1, Math.ceil((yc - hw + Y) / dyS)), i1 = Math.min(M - 2, Math.floor((yc + hw + Y) / dyS)), bi = -1;
      for (var ii = i0; ii <= i1; ii++) if (bi < 0 || (wantMax ? A[ii] > A[bi] : A[ii] < A[bi])) bi = ii;
      if (bi < 0 || bi === i0 || bi === i1) return null;
      var a0 = A[bi - 1], b0 = A[bi], c0 = A[bi + 1], den = a0 - 2 * b0 + c0;
      return ys[bi] + (den === 0 ? 0 : 0.5 * (a0 - c0) / den) * dyS;
    };
    var size = N === 1 ? a : d, isMax = N > 1, meas = { measured: null, fraun: null, theory: null, small: lam * L / size };
    if (lam / size < 1) {
      meas.theory = L * Math.tan(Math.asin(lam / size));
      var hw = 0.3 * meas.small, r1 = extreme(I, meas.theory, hw, isMax), l1 = extreme(I, -meas.theory, hw, isMax);
      var r2 = extreme(T, meas.theory, hw, isMax), l2 = extreme(T, -meas.theory, hw, isMax);
      if (r1 != null && l1 != null) { meas.measured = (r1 - l1) / 2; meas.left = l1; meas.right = r1; }
      if (r2 != null && l2 != null) meas.fraun = (r2 - l2) / 2;
    }
    this.out = { I: I, T: T, M: M, N: N, S: S, meas: meas, fresnel: (W / 2) * (W / 2) / (lam * L), ms: performance.now() - t0 };
  }
