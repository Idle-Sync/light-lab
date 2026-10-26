// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  rgb(nm) {
    var C = this._rgb || (this._rgb = {});
    if (C[nm]) return C[nm];
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
    else { r = 1; }
    var f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
    var cv = function (x) { return Math.round(255 * Math.pow(Math.max(0, x * f), 0.8)); };
    return (C[nm] = [cv(r), cv(g), cv(b)]);
  }

  srcColor(o) { return o.spec === 'white' ? [255, 246, 230] : this.rgb(o.spec); }

  render() {
    if (!this.cv || !this.W) return;
    var t0 = performance.now();
    this.res = this.trace();
    var eye = this.eyeObj();
    this.eyeRes = eye ? this.analyze(eye) : null;
    this.draw(this.res);
    this.drawRetina();
    this.stats = { segs: this.res.count, ms: performance.now() - t0 };
  }

  draw(res) {
    var ctx = this.cv.getContext('2d'), dpr = this.dpr, v = this.v, W = this.W, H = this.H, px = 1 / v.s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    var step = this.nice(26 / v.s), gx0 = Math.floor(-v.ox / v.s / step) * step, gy0 = Math.floor(-v.oy / v.s / step) * step;
    var gx1 = (W - v.ox) / v.s, gy1 = (H - v.oy) / v.s;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (var gx = gx0; gx <= gx1; gx += step) for (var gy = gy0; gy <= gy1; gy += step) ctx.fillRect(gx * v.s + v.ox - 0.75, gy * v.s + v.oy - 0.75, 1.5, 1.5);

    ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = px;
    ctx.lineCap = 'butt';
    for (var key in res.buckets) {
      var b = res.buckets[key], c = this.rgb(b.nm), P = b.pts;
      ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + b.al.toFixed(3) + ')';
      for (var i = 0; i < P.length; i += 4) { ctx.beginPath(); ctx.moveTo(P[i], P[i + 1]); ctx.lineTo(P[i + 2], P[i + 3]); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over';

    for (var j = 0; j < this.scene.length; j++) this.paintObj(ctx, this.scene[j], px, this.scene[j].id === this.sel, res);
    this.paintImages(ctx, px);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '500 12px "Instrument Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var k = 0; k < this.scene.length; k++) {
      var o = this.scene[k], t = this.label(o, res);
      if (!t) continue;
      ctx.fillStyle = o.id === this.sel ? '#FFD08A' : '#A3AAB6';
      ctx.fillText(t, o.x * v.s + v.ox, (o.y + this.ext(o)) * v.s + v.oy + 14);
    }

    var ER = this.eyeRes;
    if (ER) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#E6E8EC';
      for (var ri = 0; ri < Math.min(5, ER.rows.length); ri++) {
        var tp = ER.rows[ri].top;
        if (tp.X && (tp.kind === 'real' || tp.kind === 'virtual') && tp.P >= ER.list[0].P * 1e-4) ctx.fillText(this.pct(ER.rows[ri].Tn / ER.rows[ri].n), tp.X[0] * v.s + v.ox + 8, tp.X[1] * v.s + v.oy - 6);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    }

    var so = this.selObj();
    if (so) {
      var hp = this.handle(so), cx = so.x * v.s + v.ox, cy = so.y * v.s + v.oy, hx = hp.x * v.s + v.ox, hy = hp.y * v.s + v.oy;
      ctx.strokeStyle = 'rgba(255,181,71,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#FFB547'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFB547';
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI); ctx.fill();
    }
  }

  // dots where the eye sees each image; dashed back-extensions for virtual images
  paintImages(ctx, px) {
    var R = this.eyeRes;
    if (!R || !R.list.length) return;
    var Pmax = R.list[0].P, shown = 0, chains = {};
    ctx.lineWidth = px;
    for (var i = 0; i < R.list.length && shown < 80; i++) {
      var g = R.list[i];
      if (!g.X || g.P < Pmax * 1e-4 || (g.kind !== 'real' && g.kind !== 'virtual')) continue;
      shown++;
      var c = this.rgb(g.nm), col = c[0] + ',' + c[1] + ',' + c[2];
      if (g.kind === 'virtual' && g.lo && g.hi) {
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.strokeStyle = 'rgba(' + col + ',0.4)';
        ctx.beginPath(); ctx.moveTo(g.lo[0], g.lo[1]); ctx.lineTo(g.X[0], g.X[1]); ctx.moveTo(g.hi[0], g.hi[1]); ctx.lineTo(g.X[0], g.X[1]); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#000'; ctx.strokeStyle = 'rgba(' + col + ',0.95)'; ctx.lineWidth = 1.5 * px;
      ctx.beginPath(); ctx.arc(g.X[0], g.X[1], 3.5 * px, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.lineWidth = px;
      var ck = g.src + '|' + g.nm + '|' + g.path;
      (chains[ck] || (chains[ck] = [])).push(g);
    }
    for (var k in chains) {
      var ch = chains[k].sort(function (a, b) { return a.pt - b.pt; });
      if (ch.length < 2) continue;
      var c2 = this.rgb(ch[0].nm);
      ctx.strokeStyle = 'rgba(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ',0.75)'; ctx.lineWidth = 1.5 * px;
      ctx.setLineDash(ch[0].kind === 'virtual' ? [5 * px, 3 * px] : []);
      ctx.beginPath();
      for (var j = 0; j < ch.length; j++) { if (j) ctx.lineTo(ch[j].X[0], ch[j].X[1]); else ctx.moveTo(ch[j].X[0], ch[j].X[1]); }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  label(o, res) {
    if (o.type === 'eye') {
      var R = this.eyeRes;
      if (!R || R.eye.id !== o.id) return 'Eye';
      var n = R.rows.filter(function (r) { return r.P >= R.list[0].P * 1e-4; }).length;
      return n ? 'Sees ' + n + ' light path' + (n > 1 ? 's' : '') : 'Sees nothing';
    }
    if (o.type === 'object') return (o.spec === 'white' ? 'White' : o.spec + ' nm') + ' object';
    if (o.type === 'lens') return 'f ' + this.lensF(o, this.n(o.mat, 587.56), this.lensGeom(o).t).toFixed(1) + ' mm';
    if (o.type === 'arcmirror') return 'f ' + (o.form === 'concave' ? '' : '−') + (o.R / 2).toFixed(1) + ' mm';
    if (o.type === 'ball') { var n = this.n(o.mat, 587.56); return 'f ' + (n * o.D / (4 * (n - 1))).toFixed(1) + ' mm'; }
    if (o.type === 'prism') return 'n ' + this.n(o.mat, 587.56).toFixed(4);
    if (o.type === 'ruler') return o.len.toFixed(1) + ' mm';
    if (o.type === 'point' || o.type === 'beam') return o.spec === 'white' ? 'White' : o.spec + ' nm';
    if (o.type === 'detector') {
      var d = res.det[o.id];
      if (!d || d.power <= 0) return 'No light';
      var c = d.m1 / d.power, rms = Math.sqrt(Math.max(0, d.m2 / d.power - c * c));
      return 'RMS ' + this.fmtLen(rms);
    }
    return '';
  }

  fmtLen(v) { return Math.abs(v) < 1 ? (v * 1000).toFixed(0) + ' µm' : v.toFixed(2) + ' mm'; }

  paintObj(ctx, o, px, sel, res) {
    var A = '#FFB547';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.type === 'eye') {
      var f = o.fov * Math.PI / 180, Re = Math.max(o.pupil * 0.75, 8 * px), cc = this.rot(o, -Re * 0.75, 0);
      ctx.fillStyle = 'rgba(255,181,71,0.06)';
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.arc(o.x, o.y, 70 * px, o.ang - f / 2, o.ang + f / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cc.x, cc.y, Re, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(230,232,236,0.07)'; ctx.fill();
      ctx.lineWidth = (sel ? 1.6 : 1) * px; ctx.strokeStyle = sel ? A : 'rgba(230,232,236,0.6)'; ctx.stroke();
      var ir = this.rot(o, -Re * 0.25, 0);
      ctx.fillStyle = sel ? A : '#E6E8EC';
      ctx.beginPath(); ctx.arc(ir.x, ir.y, Math.min(Re * 0.35, o.pupil / 2), 0, 2 * Math.PI); ctx.fill();
      var e0 = this.rot(o, 0, -o.pupil / 2), e1 = this.rot(o, 0, o.pupil / 2);
      ctx.strokeStyle = sel ? A : '#E6E8EC'; ctx.lineWidth = 2.5 * px;
      ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
      return;
    }
    if (o.type === 'object') {
      var oc = this.srcColor(o), ocs = 'rgb(' + oc[0] + ',' + oc[1] + ',' + oc[2] + ')', tip = this.rot(o, 0, -o.h), hl = this.rot(o, -4 * px, -o.h + 8 * px), hr = this.rot(o, 4 * px, -o.h + 8 * px);
      ctx.shadowColor = ocs; ctx.shadowBlur = 10;
      ctx.strokeStyle = sel ? A : ocs; ctx.lineWidth = 2.5 * px;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tip.x, tip.y); ctx.moveTo(hl.x, hl.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(hr.x, hr.y); ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
    if (o.type === 'lens' || o.type === 'prism' || o.type === 'ball') {
      ctx.beginPath();
      if (o.type === 'lens') {
        var L = this.lensGeom(o);
        ctx.arc(L.CL.x, L.CL.y, L.R1, o.ang + Math.PI - L.hL, o.ang + Math.PI + L.hL);
        ctx.arc(L.CR.x, L.CR.y, L.R2, o.ang - L.hR, o.ang + L.hR);
        ctx.closePath();
      } else if (o.type === 'prism') {
        var v = this.prismVerts(o);
        ctx.moveTo(v[0].x, v[0].y); ctx.lineTo(v[1].x, v[1].y); ctx.lineTo(v[2].x, v[2].y); ctx.closePath();
      } else {
        ctx.arc(o.x, o.y, o.D / 2, 0, 2 * Math.PI);
      }
      ctx.fillStyle = 'rgba(150,180,235,0.08)';
      ctx.fill();
      ctx.lineWidth = (sel ? 1.6 : 1) * px;
      ctx.strokeStyle = sel ? A : 'rgba(175,198,240,0.5)';
      ctx.stroke();
      return;
    }
    if (o.type === 'arcmirror') {
      var g = this.arcGeom(o), out = o.form === 'concave' ? 1 : -1;
      ctx.lineWidth = px;
      ctx.strokeStyle = 'rgba(213,219,228,0.35)';
      var n = Math.max(4, Math.round(g.R * 2 * g.half * this.v.s / 7));
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var an = g.mid - g.half + 2 * g.half * i / n, ca = Math.cos(an), sa = Math.sin(an);
        var x0 = g.c.x + g.R * ca, y0 = g.c.y + g.R * sa;
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + out * 5 * px * ca - 3 * px * sa, y0 + out * 5 * px * sa + 3 * px * ca);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.c.x, g.c.y, g.R, g.mid - g.half, g.mid + g.half);
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = sel ? A : '#D5DBE4';
      ctx.stroke();
      return;
    }
    if (o.type === 'point' || o.type === 'beam') {
      var c = this.srcColor(o), cs = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      ctx.shadowColor = cs;
      ctx.shadowBlur = 14;
      if (o.type === 'point') {
        ctx.fillStyle = cs;
        ctx.beginPath(); ctx.arc(o.x, o.y, 4.5 * px, 0, 2 * Math.PI); ctx.fill();
      } else {
        var a = this.rot(o, 0, -o.width / 2), b = this.rot(o, 0, o.width / 2);
        ctx.strokeStyle = cs; ctx.lineWidth = 3 * px;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (sel) {
        ctx.strokeStyle = A; ctx.lineWidth = 1.5 * px;
        ctx.beginPath();
        if (o.type === 'point') ctx.arc(o.x, o.y, 9 * px, 0, 2 * Math.PI);
        else { var a2 = this.rot(o, -4 * px, -o.width / 2 - 4 * px), b2 = this.rot(o, -4 * px, o.width / 2 + 4 * px); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); }
        ctx.stroke();
      }
      return;
    }
    var p0 = this.rot(o, -o.len / 2, 0), p1 = this.rot(o, o.len / 2, 0);
    if (o.type === 'mirror') {
      ctx.lineWidth = px;
      ctx.strokeStyle = 'rgba(213,219,228,0.35)';
      ctx.beginPath();
      for (var u = -o.len / 2; u <= o.len / 2; u += 7 * px) { var h0 = this.rot(o, u, 0), h1 = this.rot(o, u - 3 * px, 5 * px); ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y); }
      ctx.stroke();
    }
    if (o.type === 'detector') {
      var d = res.det[o.id], mx = 0;
      if (d) for (var q = 0; q < d.I.length; q++) mx = Math.max(mx, d.I[q]);
      if (mx > 0) {
        var bw = o.len / d.I.length, nx = Math.sin(o.ang), ny = -Math.cos(o.ang);
        ctx.lineCap = 'butt';
        ctx.lineWidth = bw * 0.8;
        for (var q2 = 0; q2 < d.I.length; q2++) {
          if (d.I[q2] <= 0) continue;
          var m = Math.max(d.R[q2], d.G[q2], d.B[q2]), bb = this.rot(o, -o.len / 2 + (q2 + 0.5) * bw, 0), ln = 4 * px + 26 * px * d.I[q2] / mx;
          ctx.strokeStyle = 'rgb(' + Math.round(255 * d.R[q2] / m) + ',' + Math.round(255 * d.G[q2] / m) + ',' + Math.round(255 * d.B[q2] / m) + ')';
          ctx.beginPath(); ctx.moveTo(bb.x + nx * 3 * px, bb.y + ny * 3 * px); ctx.lineTo(bb.x + nx * ln, bb.y + ny * ln); ctx.stroke();
        }
        ctx.lineCap = 'round';
      }
    }
    if (o.type === 'ruler') {
      var tick = 10 * this.v.s >= 6 ? 10 : 50;
      ctx.lineWidth = px;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      for (var tu = 0; tu <= o.len + 1e-9; tu += tick) { var tl = Math.abs(tu % 50) < 1e-9 ? 8 : 4, t0 = this.rot(o, -o.len / 2 + tu, 0), t1 = this.rot(o, -o.len / 2 + tu, tl * px); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); }
      ctx.stroke();
    }
    var widths = { mirror: 2, detector: 3, blocker: 4.5, ruler: 1 }, colors = { mirror: '#D5DBE4', detector: 'rgba(150,165,190,0.95)', blocker: '#4A505C', ruler: 'rgba(255,255,255,0.7)' };
    ctx.lineWidth = widths[o.type] * px;
    ctx.strokeStyle = sel ? A : colors[o.type];
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  drawRetina() {
    var cv = this.rcv, R = this.eyeRes;
    if (!cv || !cv.isConnected) return;
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (w < 1) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22262E'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    if (!R || !R.list.length) {
      ctx.fillStyle = '#6B7380'; ctx.font = '500 12px "Instrument Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('No light reaches the pupil. Aim the eye at the optics.', w / 2, h / 2);
      return;
    }
    var fov = R.eye.fov * Math.PI / 180, Pmax = R.list[0].P, X = function (rel) { return (rel + fov / 2) / fov * w; };
    var bright = function (P) { return Math.max(0.1, Math.min(1, (Math.log10(P / Pmax) + 4) / 4)); };
    ctx.globalCompositeOperation = 'lighter';
    var chains = {};
    for (var i = 0; i < R.list.length; i++) {
      var g = R.list[i];
      if (!g.vis || g.P < Pmax * 1e-4) continue;
      var c = this.rgb(g.nm), b = bright(g.P), x = X(g.rel), rad = 4 + 9 * b;
      var grd = ctx.createRadialGradient(x, h / 2, 0, x, h / 2, rad);
      grd.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + b + ')');
      grd.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      ctx.fillStyle = grd; ctx.fillRect(x - rad, h / 2 - rad, 2 * rad, 2 * rad);
      var ck = g.src + '|' + g.nm + '|' + g.path;
      (chains[ck] || (chains[ck] = [])).push(g);
    }
    for (var ck2 in chains) {
      var ch = chains[ck2].sort(function (a, b) { return a.pt - b.pt; });
      if (ch.length < 2) continue;
      var c2 = this.rgb(ch[0].nm), b2 = bright(ch[0].P);
      ctx.strokeStyle = 'rgba(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ',' + (0.8 * b2) + ')'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (var k = 0; k < ch.length; k++) { if (k) ctx.lineTo(X(ch[k].rel), h / 2); else ctx.moveTo(X(ch[k].rel), h / 2); }
      ctx.stroke();
      var tip = ch[ch.length - 1], prev = ch[ch.length - 2], dir = X(tip.rel) > X(prev.rel) ? 1 : -1, tx = X(tip.rel);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.moveTo(tx + dir * 8, h / 2); ctx.lineTo(tx - dir * 2, h / 2 - 7); ctx.lineTo(tx - dir * 2, h / 2 + 7); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#C9CED6'; ctx.font = '500 11px "Instrument Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (var j = 0; j < Math.min(4, R.rows.length); j++) {
      var tp = R.rows[j].top;
      if (tp.vis) ctx.fillText(this.pct(R.rows[j].Tn / R.rows[j].n), X(tp.rel), h - 2);
    }
  }
