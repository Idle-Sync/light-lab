// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  selObj() {
    for (var i = 0; i < this.scene.length; i++) if (this.scene[i].id === this.sel) return this.scene[i];
    return null;
  }

  hitsObj(o, x, y, tol) {
    var c = Math.cos(o.ang), s = Math.sin(o.ang), dx = x - o.x, dy = y - o.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
    switch (o.type) {
      case 'point': return Math.hypot(dx, dy) < tol * 1.5;
      case 'eye': return Math.hypot(dx, dy) < o.pupil * 0.9 + tol;
      case 'object': return Math.abs(lx) < tol && ly < tol && ly > -o.h - tol;
      case 'beam': return Math.abs(lx) < tol && Math.abs(ly) < o.width / 2 + tol;
      case 'lens': { var g = this.lensGeom(o); return Math.abs(lx) < g.t / 2 + tol && Math.abs(ly) < g.h + tol; }
      case 'prism': {
        var H = o.side * Math.sqrt(3) / 2;
        if (ly > H / 3 + tol || ly < -2 * H / 3 - tol) return false;
        return Math.abs(lx) < (ly + 2 * H / 3) / H * o.side / 2 + tol;
      }
      case 'ball': return Math.hypot(dx, dy) < o.D / 2 + tol;
      case 'arcmirror': {
        var a = this.arcGeom(o), rr = Math.hypot(x - a.c.x, y - a.c.y);
        return Math.abs(rr - a.R) < tol && Math.abs(this.adiff(Math.atan2(y - a.c.y, x - a.c.x), a.mid)) < a.half + tol / a.R;
      }
      default: return Math.abs(ly) < tol && Math.abs(lx) < o.len / 2 + tol;
    }
  }

  pick(x, y) {
    var tol = 9 / this.v.s;
    for (var i = this.scene.length - 1; i >= 0; i--) if (this.hitsObj(this.scene[i], x, y, tol)) return this.scene[i];
    return null;
  }

  local(e) {
    var r = this.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { sx: sx, sy: sy, x: (sx - this.v.ox) / this.v.s, y: (sy - this.v.oy) / this.v.s };
  }

  nearHandle(p) {
    var o = this.selObj();
    if (!o) return false;
    var hp = this.handle(o);
    return Math.hypot(hp.x - p.x, hp.y - p.y) * this.v.s < 12;
  }

  handle(o) { return this.rot(o, 0, -(this.perpExt(o) + 28 / this.v.s)); }

  onDown(e) {
    var p = this.local(e);
    this.drag = null;
    if (this.nearHandle(p)) this.drag = { mode: 'rot', o: this.selObj() };
    else {
      var o = this.pick(p.x, p.y);
      if (o) { this.sel = o.id; this.drag = { mode: 'move', o: o, dx: o.x - p.x, dy: o.y - p.y }; }
      else { this.sel = null; this.drag = { mode: 'pan', sx: p.sx, sy: p.sy, ox: this.v.ox, oy: this.v.oy }; }
    }
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) {}
    this.render();
    this.ui();
  }

  onMove(e) {
    var p = this.local(e), d = this.drag;
    if (!d) {
      this.cv.style.cursor = this.nearHandle(p) ? 'grab' : this.pick(p.x, p.y) ? 'move' : 'default';
      return;
    }
    if (d.mode === 'pan') { this.v.ox = d.ox + p.sx - d.sx; this.v.oy = d.oy + p.sy - d.sy; }
    else if (d.mode === 'move') { d.o.x = p.x + d.dx; d.o.y = p.y + d.dy; }
    else {
      var a = Math.atan2(p.y - d.o.y, p.x - d.o.x) + Math.PI / 2, deg = a * 180 / Math.PI, sn = Math.round(deg / 15) * 15;
      d.o.ang = Math.abs(deg - sn) < 2.5 ? sn * Math.PI / 180 : a;
    }
    this.render();
    this.ui();
  }

  zoomAt(f, sx, sy) {
    var v = this.v, s = Math.min(40, Math.max(0.3, v.s * f));
    v.ox = sx - (sx - v.ox) * s / v.s;
    v.oy = sy - (sy - v.oy) * s / v.s;
    v.s = s;
    this.render();
    this.ui();
  }

  fitView() {
    var xs = [], ys = [];
    for (var i = 0; i < this.scene.length; i++) { var o = this.scene[i], e = this.ext(o) + 12; xs.push(o.x - e, o.x + e); ys.push(o.y - e, o.y + e); }
    if (!xs.length) { xs = [-100, 100]; ys = [-100, 100]; }
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var narrow = this.W < 760, L = narrow ? 16 : 92, R = narrow ? this.W - 16 : this.W - 332, T = 28, B = narrow ? this.H * 0.45 : this.H - 80;
    var s = Math.min(40, Math.max(0.3, Math.min((R - L) / (x1 - x0), (B - T) / (y1 - y0))));
    this.v = { s: s, ox: (L + R) / 2 - s * (x0 + x1) / 2, oy: (T + B) / 2 - s * (y0 + y1) / 2 };
  }

  center() {
    var v = this.v, cx = this.W < 760 ? this.W / 2 : (92 + this.W - 332) / 2;
    return { x: (cx - v.ox) / v.s, y: (this.H / 2 - v.oy) / v.s };
  }

  add(type) {
    var c = this.center(), o = { id: this.nextId++, type: type, x: Math.round(c.x), y: Math.round(c.y), ang: 0 };
    var P = {
      point: { cone: 30, rays: 31, spec: 'white' }, beam: { width: 20, rays: 9, spec: 532 },
      mirror: { len: 60, ang: Math.PI / 4 }, arcmirror: { R: 120, D: 60, form: 'concave', ang: Math.PI },
      lens: { R1: 60, R2: 60, D: 40, mat: 'bk7' }, prism: { side: 60, mat: 'sf11' }, ball: { D: 30, mat: 'bk7' },
      detector: { len: 50, ang: Math.PI / 2 }, blocker: { len: 40, ang: Math.PI / 2 }, ruler: { len: 50 },
      object: { h: 20, cone: 40, rays: 9, spec: 589.3 }, eye: { pupil: 8, fov: 70, ang: Math.PI }
    }[type];
    Object.assign(o, P);
    this.scene.push(o);
    this.sel = o.id;
    this.render();
    this.ui();
  }

  resize() {
    var box = this.cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (box.width < 1 || box.height < 1) return;
    this.W = box.width; this.H = box.height; this.dpr = dpr;
    this.cv.width = Math.round(box.width * dpr);
    this.cv.height = Math.round(box.height * dpr);
    if (!this.fitted) { this.fitView(); this.fitted = true; }
    this.render();
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

  inspector(o) {
    var self = this, DEG = 180 / Math.PI, ranges = [], groups = [], reads = [], T = {};
    var redo = function () { self.render(); self.ui(); };
    var rg = function (label, min, max, step, get, set, text) {
      var v = get();
      ranges.push({ id: 'f' + o.id + '_' + ranges.length, label: label, min: min, max: max, step: step, value: v, text: text(v), change: function (e) { set(parseFloat(e.target.value)); redo(); } });
    };
    var ch = function (label, opts, get, set) {
      groups.push({ label: label, chips: opts.map(function (op) {
        var on = get() === op.v;
        return { label: op.l, pressed: on, bg: on ? 'rgba(255,181,71,0.14)' : 'transparent', bd: on ? 'rgba(255,181,71,0.6)' : '#2C313B', fg: on ? '#FFD08A' : '#C9CED6', pick: function () { set(op.v); redo(); } };
      }) });
    };
    var ro = function (label, value) { reads.push({ label: label, value: value }); };
    var mm = function (v) { return v + ' mm'; };
    var ang = function (label) { rg(label, -180, 180, 1, function () { return Math.round(self.adiff(-o.ang, 0) * DEG); }, function (v) { o.ang = -v / DEG; }, function (v) { return v + '°'; }); };
    var len = function (label, min, max) { rg(label, min, max, 1, function () { return Math.round(o.len); }, function (v) { o.len = v; }, mm); };
    var glass = function () { ch('Glass', [{ v: 'bk7', l: 'N-BK7' }, { v: 'sf11', l: 'SF11' }, { v: 'silica', l: 'Fused silica' }], function () { return o.mat; }, function (v) { o.mat = v; }); };
    var spec = function () { ch('Spectrum', [{ v: 'white', l: 'White' }, { v: 405, l: '405 nm' }, { v: 532, l: '532 nm' }, { v: 589.3, l: '589 nm' }, { v: 632.8, l: '633 nm' }], function () { return o.spec; }, function (v) { o.spec = v; }); };
    var nd = function () { return self.n(o.mat, 587.56); }, nF = function () { return self.n(o.mat, 486.13); }, nC = function () { return self.n(o.mat, 656.27); };
    var specText = o.spec === 'white' ? 'White light' : o.spec + ' nm';
    var rows = [];
    var partialChips = function () { ch('Partial reflections', [{ v: true, l: 'On' }, { v: false, l: 'Off' }], function () { return self.partial !== false; }, function (v) { self.partial = v; }); };
    var r0 = function () { var n = nd(); ro('Reflectance at normal incidence', self.pct(Math.pow((n - 1) / (n + 1), 2))); };

    switch (o.type) {
      case 'eye': {
        T.title = 'Eye'; T.sub = 'Pupil ' + o.pupil + ' mm, field of view ' + o.fov + '°';
        rg('Pupil diameter', 1, 40, 1, function () { return o.pupil; }, function (v) { o.pupil = v; }, mm);
        rg('Field of view', 10, 170, 1, function () { return o.fov; }, function (v) { o.fov = v; }, function (v) { return v + '°'; });
        ang('Looking toward');
        partialChips();
        var R = self.eyeRes && self.eyeRes.eye.id === o.id ? self.eyeRes : null;
        if (R && R.list.length) {
          var Pmax = R.list[0].P, kept = R.rows.filter(function (r) { return r.P >= Pmax * 1e-4; });
          ro('Light into the pupil', self.pct(R.total) + ' of a source');
          ro('Distinct light paths', String(kept.length));
          kept.slice(0, 6).forEach(function (r) {
            var t = r.top, where = t.kind === 'real' ? 'Real image ' + t.dist.toFixed(0) + ' mm in front'
              : t.kind === 'virtual' ? 'Virtual image, appears ' + t.dist.toFixed(0) + ' mm away'
              : t.kind === 'behind' ? 'Still converging, would focus behind the eye'
              : 'Image at infinity, rays arrive parallel';
            var sc = 255 / Math.max(r.r, r.g, r.b, 1e-12);
            rows.push({
              label: self.pathLabel(r.path), trans: self.pct(r.Tn / r.n),
              color: 'rgb(' + Math.round(r.r * sc) + ',' + Math.round(r.g * sc) + ',' + Math.round(r.b * sc) + ')',
              detail: where + '. ' + self.pct(r.P) + ' of the source enters the pupil' + (t.vis ? '.' : ', outside the field of view.')
            });
          });
        } else ro('Light into the pupil', 'None');
        break;
      }
      case 'object':
        T.title = 'Object'; T.sub = 'Luminous arrow, ' + specText;
        spec();
        rg('Height', 2, 150, 1, function () { return o.h; }, function (v) { o.h = v; }, mm);
        rg('Rays drawn per point', 1, 61, 2, function () { return o.rays; }, function (v) { o.rays = v; }, String);
        rg('Cone angle', 1, 180, 1, function () { return o.cone; }, function (v) { o.cone = v; }, function (v) { return v + '°'; });
        ang('Direction');
        ro('Emitting points', '9, rays drawn from 2');
        break;
      case 'point':
        T.title = 'Point source'; T.sub = specText;
        spec();
        rg('Rays per wavelength', 1, 121, 2, function () { return o.rays; }, function (v) { o.rays = v; }, String);
        rg('Cone angle', 1, 360, 1, function () { return o.cone; }, function (v) { o.cone = v; }, function (v) { return v + '°'; });
        ang('Direction');
        ro('Wavelengths', o.spec === 'white' ? '7, 400 to 670 nm' : o.spec + ' nm');
        ro('Rays emitted', String(o.rays * self.spectrum(o.spec).length));
        break;
      case 'beam':
        T.title = 'Collimated beam'; T.sub = specText;
        spec();
        rg('Rays per wavelength', 1, 61, 2, function () { return o.rays; }, function (v) { o.rays = v; }, String);
        rg('Beam width', 1, 120, 1, function () { return o.width; }, function (v) { o.width = v; }, mm);
        ang('Direction');
        ro('Ray spacing', o.rays > 1 ? (o.width / (o.rays - 1)).toFixed(2) + ' mm' : 'Single ray');
        ro('Rays emitted', String(o.rays * self.spectrum(o.spec).length));
        break;
      case 'lens': {
        T.title = 'Thick lens'; T.sub = self.G()[o.mat].label + ', biconvex';
        glass();
        partialChips();
        var clampL = function () { o.D = Math.min(o.D, 1.96 * Math.min(o.R1, o.R2)); };
        rg('Front radius R1', 10, 400, 1, function () { return o.R1; }, function (v) { o.R1 = v; clampL(); }, mm);
        rg('Back radius R2', 10, 400, 1, function () { return o.R2; }, function (v) { o.R2 = v; clampL(); }, mm);
        rg('Diameter', 4, 120, 1, function () { return Math.round(o.D); }, function (v) { o.D = v; clampL(); }, mm);
        ang('Axis angle');
        var t = self.lensGeom(o).t, f = function (n) { return self.lensF(o, n, t); };
        ro('Focal length at 587.6 nm', f(nd()).toFixed(2) + ' mm');
        ro('Focal shift, F to C line', (f(nC()) - f(nF())).toFixed(3) + ' mm');
        ro('Refractive index nd', nd().toFixed(5));
        ro('Abbe number', ((nd() - 1) / (nF() - nC())).toFixed(2));
        ro('Center thickness', t.toFixed(2) + ' mm');
        ro('f-number', (f(nd()) / o.D).toFixed(2));
        r0();
        break;
      }
      case 'arcmirror': {
        T.title = 'Curved mirror'; T.sub = o.form === 'concave' ? 'Concave, spherical' : 'Convex, spherical';
        ch('Shape', [{ v: 'concave', l: 'Concave' }, { v: 'convex', l: 'Convex' }], function () { return o.form; }, function (v) { o.form = v; });
        var clampM = function () { o.D = Math.min(o.D, 1.96 * o.R); };
        rg('Radius of curvature', 20, 600, 1, function () { return o.R; }, function (v) { o.R = v; clampM(); }, mm);
        rg('Diameter', 4, 200, 1, function () { return Math.round(o.D); }, function (v) { o.D = v; clampM(); }, mm);
        ang('Facing');
        var fm = o.R / 2 * (o.form === 'concave' ? 1 : -1);
        ro('Focal length, paraxial', fm.toFixed(1) + ' mm');
        ro('f-number', Math.abs(fm / o.D).toFixed(2));
        ro('Sag', (o.R - Math.sqrt(o.R * o.R - o.D * o.D / 4)).toFixed(3) + ' mm');
        ro('Reflectance', '100 %, ideal');
        break;
      }
      case 'mirror':
        T.title = 'Flat mirror'; T.sub = 'Front surface';
        len('Length', 5, 300);
        ang('Angle');
        ro('Reflectance', '100 %, ideal');
        break;
      case 'prism': {
        T.title = 'Prism'; T.sub = 'Equilateral, ' + self.G()[o.mat].label;
        glass();
        partialChips();
        rg('Side length', 10, 200, 1, function () { return o.side; }, function (v) { o.side = v; }, mm);
        ang('Rotation');
        var dm = function (n) { return (2 * Math.asin(Math.min(1, n * 0.5)) - Math.PI / 3) * DEG; };
        ro('Index at 486.1 nm', nF().toFixed(5));
        ro('Index at 656.3 nm', nC().toFixed(5));
        ro('Min. deviation, d-line', dm(nd()).toFixed(2) + '°');
        ro('Spread, F to C line', (dm(nF()) - dm(nC())).toFixed(2) + '°');
        r0();
        break;
      }
      case 'ball': {
        T.title = 'Ball lens'; T.sub = self.G()[o.mat].label;
        glass();
        partialChips();
        rg('Diameter', 2, 150, 1, function () { return o.D; }, function (v) { o.D = v; }, mm);
        var efl = nd() * o.D / (4 * (nd() - 1));
        ro('Effective focal length', efl.toFixed(2) + ' mm');
        ro('Back focal length', (efl - o.D / 2).toFixed(2) + ' mm');
        r0();
        var R0 = Math.pow((nd() - 1) / (nd() + 1), 2);
        ro('Head-on, after 1 internal bounce', self.pct((1 - R0) * R0 * (1 - R0)));
        break;
      }
      case 'detector': {
        T.title = 'Detector'; T.sub = 'Line sensor, 48 bins';
        len('Length', 2, 300);
        ang('Angle');
        var d = self.res && self.res.det[o.id];
        if (d && d.power > 0) {
          var c = d.m1 / d.power, rms = Math.sqrt(Math.max(0, d.m2 / d.power - c * c));
          ro('Power, share of one source', (d.power * 100).toFixed(1) + ' %');
          ro('RMS spot width', self.fmtLen(rms));
          ro('Centroid', self.fmtLen(c));
          ro('Ray hits', d.hits.toLocaleString('en-US'));
        } else ro('Power', 'No light');
        break;
      }
      case 'blocker':
        T.title = 'Blocker'; T.sub = 'Absorbs all light';
        len('Length', 2, 300);
        ang('Angle');
        break;
      case 'ruler':
        T.title = 'Ruler'; T.sub = 'Measures distance';
        rg('Length', 1, 500, 0.5, function () { return o.len; }, function (v) { o.len = v; }, mm);
        ang('Angle');
        ro('Length', o.len.toFixed(1) + ' mm');
        ro('Angle', Math.round(self.adiff(-o.ang, 0) * DEG) + '°');
        break;
    }
    return { title: T.title, sub: T.sub, ranges: ranges, groups: groups, reads: reads, rows: rows };
  }

  chipStyle(on) { return { pressed: on, bg: on ? 'rgba(255,181,71,0.14)' : 'transparent', bd: on ? 'rgba(255,181,71,0.6)' : '#2C313B', fg: on ? '#FFD08A' : '#C9CED6' }; }

  load(name) {
    this.presetName = name;
    this.scene = this.preset(name);
    var eye = this.scene.filter(function (o) { return o.type === 'eye'; })[0];
    this.sel = eye ? eye.id : null;
    if (this.W) { this.fitView(); this.render(); }
    this.ui();
  }

  handlers() {
    var self = this;
    var add = {};
    ['point', 'beam', 'object', 'mirror', 'arcmirror', 'lens', 'prism', 'ball', 'eye', 'detector', 'blocker', 'ruler'].forEach(function (t) { add[t] = function () { self.add(t); }; });
    return {
      add: add,
      retinaRef: function (el) { if (el && el !== self.rcv) { self.rcv = el; self.drawRetina(); } },
      canvasRef: function (el) {
        if (!el || el === self.cv) return;
        self.cv = el;
        if (self.ro) self.ro.disconnect();
        self.ro = new ResizeObserver(function () { self.resize(); });
        self.ro.observe(el.parentElement);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.render(); });
      },
      down: function (e) { self.onDown(e); },
      move: function (e) { self.onMove(e); },
      up: function () { self.drag = null; },
      wheel: function (e) { var p = self.local(e); self.zoomAt(Math.exp(-e.deltaY * 0.0015), p.sx, p.sy); },
      zoomIn: function () { self.zoomAt(1.25, self.W / 2, self.H / 2); },
      zoomOut: function () { self.zoomAt(0.8, self.W / 2, self.H / 2); },
      fit: function () { self.fitView(); self.render(); self.ui(); },
      reset: function () { self.load(self.presetName); },
      dup: function () {
        var o = self.selObj(); if (!o) return;
        var c = Object.assign({}, o, { id: self.nextId++, x: o.x + 12, y: o.y + 12 });
        self.scene.push(c); self.sel = c.id; self.render(); self.ui();
      },
      del: function () { self.scene = self.scene.filter(function (o) { return o.id !== self.sel; }); self.sel = null; self.render(); self.ui(); }
    };
  }

  renderVals() {
    if (!this.scene) {
      this.nextId = 100;
      this.partial = true;
      this.v = { s: 3, ox: 600, oy: 400 };
      this.stats = { segs: 0, ms: 0 };
      this.load('ball');
    }
    if (!this._h) this._h = this.handlers();
    var self = this, o = this.selObj(), ins = o ? this.inspector(o) : { title: '', sub: '', ranges: [], groups: [], reads: [], rows: [] };
    var sb = this.nice(90 / this.v.s), eye = this.eyeObj(), ER = this.eyeRes;
    var presets = [{ v: 'ball', l: 'Glass ball and eye' }, { v: 'magnifier', l: 'Magnifying glass' }, { v: 'bench', l: 'Optics bench' }].map(function (p) {
      return Object.assign({ label: p.l, pick: function () { self.load(p.v); } }, self.chipStyle(self.presetName === p.v));
    });
    var sceneGroups = [{ label: 'Partial reflections', chips: [{ v: true, l: 'On' }, { v: false, l: 'Off' }].map(function (p) {
      return Object.assign({ label: p.l, pick: function () { self.partial = p.v; self.render(); self.ui(); } }, self.chipStyle((self.partial !== false) === p.v));
    }) }];
    var eyeSummary = 'Add an eye to see what it sees';
    if (eye && ER && ER.list.length) {
      var kept = ER.rows.filter(function (r) { return r.P >= ER.list[0].P * 1e-4; }).length;
      eyeSummary = kept + ' light path' + (kept > 1 ? 's' : '') + ', brightness on a log scale so faint reflections show';
    } else if (eye) eyeSummary = 'No light reaches the pupil';
    return Object.assign({}, this._h, {
      hasSel: !!o,
      noSel: !o,
      title: ins.title,
      sub: ins.sub,
      ranges: ins.ranges,
      groups: ins.groups,
      reads: ins.reads,
      rows: ins.rows,
      hasRows: ins.rows.length > 0,
      presets: presets,
      sceneGroups: sceneGroups,
      hasEye: !!eye,
      eyeSummary: eyeSummary,
      fovL: eye ? 'Left ' + Math.round(eye.fov / 2) + '°' : '',
      fovR: eye ? 'Right ' + Math.round(eye.fov / 2) + '°' : '',
      sceneReads: [
        { label: 'Objects', value: String(this.scene.length) },
        { label: 'Ray segments', value: this.stats.segs.toLocaleString('en-US') },
        { label: 'Trace and draw', value: this.stats.ms.toFixed(1) + ' ms' }
      ],
      statsText: this.stats.segs.toLocaleString('en-US') + ' ray segments traced in ' + this.stats.ms.toFixed(1) + ' ms',
      scaleText: (+sb.toPrecision(3)) + ' mm',
      scaleW: (sb * this.v.s).toFixed(1)
    });
  }
