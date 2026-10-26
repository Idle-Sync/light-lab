// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  G() {
    if (!this._G) this._G = {
      bk7: { label: 'N-BK7', B: [1.03961212, 0.231792344, 1.01046945], C: [0.00600069867, 0.0200179144, 103.560653] },
      sf11: { label: 'SF11', B: [1.73759695, 0.313747346, 1.89878101], C: [0.013188707, 0.0623068142, 155.23629] },
      silica: { label: 'Fused silica', B: [0.6961663, 0.4079426, 0.8974794], C: [0.00467914826, 0.0135120631, 97.9340025] }
    };
    return this._G;
  }

  // Sellmeier dispersion, wavelength in nm
  n(mat, nm) {
    var g = this.G()[mat], l2 = (nm / 1000) * (nm / 1000), s = 1;
    for (var i = 0; i < 3; i++) s += g.B[i] * l2 / (l2 - g.C[i]);
    return Math.sqrt(s);
  }

  spectrum(spec) { return spec === 'white' ? [400, 445, 490, 535, 580, 625, 670] : [spec]; }

  // thick-lens lensmaker equation, biconvex
  lensF(o, n, t) { return 1 / ((n - 1) * (1 / o.R1 + 1 / o.R2 - (n - 1) * t / (n * o.R1 * o.R2))); }
