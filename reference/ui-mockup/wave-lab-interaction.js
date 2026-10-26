// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/wave-lab.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  nice(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
    else { r = 1; }
    var f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
    var cv = function (x) { return Math.round(255 * Math.pow(Math.max(0, x * f), 0.8)); };
    return [cv(r), cv(g), cv(b)];
  }

  resize() {
    var box = this.cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (box.width < 1 || box.height < 1) return;
    this.W = box.width; this.H = box.height; this.dpr = dpr;
    this.cv.width = Math.round(box.width * dpr);
    this.cv.height = Math.round(box.height * dpr);
    this.pw = Math.max(200, Math.round(this.W - 2 * 32 - 46));
    this.compute();
    this.draw();
    this.ui();
  }

  ui() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.forceUpdate(); });
  }

  componentWillUnmount() {
    if (this.ro) this.ro.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  update() { this.compute(); this.draw(); this.ui(); }

  handlers() {
    var self = this;
    return {
      canvasRef: function (el) {
        if (!el || el === self.cv) return;
        self.cv = el;
        if (self.ro) self.ro.disconnect();
        self.ro = new ResizeObserver(function () { self.resize(); });
        self.ro.observe(el.parentElement);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.draw(); });
      }
    };
  }

  fmt(v) { return v == null ? 'Out of view' : v.toFixed(4) + ' mm'; }

  renderVals() {
    if (!this.p) this.p = { mode: 'double', nm: 532, a: 40, d: 250, N: 6, L: 1000, Y: 20 };
    if (!this._h) this._h = this.handlers();
    if (!this.out) this.compute();
    var self = this, p = this.p, o = this.out, m = o.meas, N = this.slitCount(), ranges = [], groups = [];
    var rg = function (key, label, min, max, step, text, set) {
      ranges.push({ id: 'w_' + key, label: label, min: min, max: max, step: step, value: p[key], text: text(p[key]), change: function (e) { var v = parseFloat(e.target.value); if (set) set(v); else p[key] = v; self.update(); } });
    };
    var ch = function (label, opts, key) {
      groups.push({ label: label, chips: opts.map(function (op) {
        var on = p[key] === op.v;
        return { label: op.l, pressed: on, bg: on ? 'rgba(255,181,71,0.14)' : 'transparent', bd: on ? 'rgba(255,181,71,0.6)' : '#2C313B', fg: on ? '#FFD08A' : '#C9CED6', pick: function () { p[key] = op.v; if (p.mode !== 'single' && p.a >= p.d) p.a = Math.max(5, p.d - 1); self.update(); } };
      }) });
    };
    var um = function (v) { return v + ' µm'; };
    ch('Aperture', [{ v: 'single', l: 'Single slit' }, { v: 'double', l: 'Double slit' }, { v: 'grating', l: 'Grating' }], 'mode');
    ch('Laser line', [{ v: 405, l: '405 nm' }, { v: 532, l: '532 nm' }, { v: 589.3, l: '589 nm' }, { v: 632.8, l: '633 nm' }], 'nm');
    rg('nm', 'Wavelength', 380, 750, 0.1, function (v) { return v.toFixed(1) + ' nm'; });
    rg('a', 'Slit width a', 5, 500, 1, um, function (v) { p.a = N > 1 ? Math.min(v, p.d - 1) : v; });
    if (N > 1) rg('d', 'Slit separation d', 20, 3000, 1, um, function (v) { p.d = Math.max(v, p.a + 1); });
    if (p.mode === 'grating') rg('N', 'Number of slits', 3, 40, 1, String);
    rg('L', 'Screen distance L', 50, 5000, 10, function (v) { return v.toLocaleString('en-US') + ' mm'; });
    rg('Y', 'Screen view', 0.5, 100, 0.5, function (v) { return '±' + v + ' mm'; });

    var diff = m.measured != null && m.fraun ? (m.measured - m.fraun) / m.fraun * 100 : null;
    var pct = function (v) { return v == null ? 'n/a' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3) + ' %'; };
    var F = o.fresnel;
    var regime = F < 0.1 ? 'Far field. The Fraunhofer formula holds here, so both curves agree closely.'
      : F < 1 ? 'Transition zone. Expect small departures from the Fraunhofer formula.'
      : 'Near field. Only the Huygens–Fresnel sum is valid here; the Fraunhofer curve is shown for comparison.';
    if (N > 1 && m.fraun && m.theory && Math.abs(m.fraun - m.theory) / m.theory > 5e-4) regime += ' The single-slit envelope pulls each bright fringe slightly toward the center, so it sits inside d sin θ = λ.';
    var names = { single: 'Single-slit diffraction', double: 'Double-slit interference', grating: 'Diffraction grating, ' + p.N + ' slits' };
    return Object.assign({}, this._h, {
      sceneName: names[p.mode],
      canvasLabel: names[p.mode] + ' pattern at ' + p.nm + ' nm',
      measLabel: N === 1 ? 'First dark fringe, from center' : 'Fringe spacing, first order',
      measValue: this.fmt(m.measured),
      measRows: [
        { label: 'Fraunhofer formula', value: this.fmt(m.fraun) },
        { label: 'Sum minus formula', value: pct(diff) },
        { label: N === 1 ? 'Condition a sin θ = λ' : 'Condition d sin θ = λ', value: this.fmt(m.theory) },
        { label: N === 1 ? 'Small-angle λL / a' : 'Small-angle λL / d', value: this.fmt(m.small) },
        { label: 'Fresnel number', value: F < 0.01 ? F.toExponential(2) : F.toFixed(3) }
      ],
      regime: m.measured == null ? 'The first ' + (N === 1 ? 'minimum' : 'order') + ' is off screen. Widen the screen view to measure it.' : regime,
      groups: groups,
      ranges: ranges,
      method: 'The pattern is an exact sum of Huygens wavelets: ' + o.S + ' points across each slit, ' + o.M.toLocaleString('en-US') + ' points on the screen, computed in ' + o.ms.toFixed(1) + ' ms. Positions are measured from that curve, not from the formula.'
    });
  }
