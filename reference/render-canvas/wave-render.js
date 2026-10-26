// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/wave-lab.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  draw() {
    if (!this.cv || !this.W || !this.out) return;
    var ctx = this.cv.getContext('2d'), dpr = this.dpr, W = this.W, H = this.H, o = this.out, p = this.p, col = this.rgb(p.nm);
    var cs = function (a) { return 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')'; };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '500 12px "Instrument Sans", system-ui, sans-serif';

    var pad = 32, x0 = pad + 30, pw = this.pw, top = 44, sh = Math.max(150, H * 0.32), mid = top + sh / 2;
    var stripY = top + sh + 56, stripH = 56, plotY = stripY + stripH + 52, plotH = Math.max(80, H - plotY - 44);
    var X = function (y) { return x0 + (y + p.Y) / (2 * p.Y) * pw; };

    // schematic
    var lx = pad, bx = pad + Math.max(150, pw * 0.26), sx = W - pad - 70, N = o.N;
    var vs = Math.min(26, sh * 0.6 / Math.max(1, N)), gap = N === 1 ? 12 : Math.max(3, Math.min(vs * 0.7, vs * p.a / p.d));
    var ysl = [];
    for (var j = 0; j < N; j++) ysl.push(mid + (j - (N - 1) / 2) * vs);

    ctx.fillStyle = '#191C22'; ctx.strokeStyle = '#3A404C'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(lx, mid - 16, 72, 32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C9CED6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Laser', lx + 36, mid);
    ctx.fillStyle = '#A3AAB6'; ctx.textBaseline = 'top';
    ctx.fillText(p.nm.toFixed(1) + ' nm', lx + 36, mid + 24);

    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = cs(1); ctx.shadowBlur = 12;
    ctx.strokeStyle = cs(0.95); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx + 72, mid); ctx.lineTo(bx, mid); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, top, sx - bx, sh); ctx.clip();
    ctx.lineWidth = 1.2;
    var reach = Math.hypot(sx - bx, sh);
    for (j = 0; j < N; j++) {
      for (var r = 8; r < reach; r += 11) {
        ctx.strokeStyle = cs((0.24 / Math.sqrt(N)) * (1 - 0.7 * r / reach));
        ctx.beginPath(); ctx.arc(bx, ysl[j], r, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = '#C9CED6'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
    ctx.beginPath();
    var yy = top;
    for (j = 0; j < N; j++) { ctx.moveTo(bx, yy); ctx.lineTo(bx, ysl[j] - gap / 2); yy = ysl[j] + gap / 2; }
    ctx.moveTo(bx, yy); ctx.lineTo(bx, top + sh);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, top + sh); ctx.stroke();
    for (var py = 0; py < sh; py++) {
      var ym = (py - sh / 2) / (sh / 2) * p.Y, ii = Math.round((ym + p.Y) / (2 * p.Y) * (o.M - 1));
      if (ii < 0 || ii >= o.M) continue;
      ctx.fillStyle = cs(0.9);
      ctx.fillRect(sx + 4, top + py, o.I[ii] * 56, 1);
    }

    ctx.fillStyle = '#A3AAB6'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var um = ' µm';
    ctx.fillText(N === 1 ? 'a ' + p.a + um : 'a ' + p.a + um + ', d ' + p.d + um + (N > 2 ? ', ' + N + ' slits' : ''), bx, top + sh + 10);
    ctx.textAlign = 'right';
    ctx.fillText('Schematic, not to scale', W - pad, top + sh + 10);
    ctx.strokeStyle = '#4A515E'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, top - 18); ctx.lineTo(sx, top - 18); ctx.moveTo(bx, top - 23); ctx.lineTo(bx, top - 13); ctx.moveTo(sx, top - 23); ctx.lineTo(sx, top - 13); ctx.stroke();
    var lt = 'L ' + p.L.toLocaleString('en-US') + ' mm', lw = ctx.measureText(lt).width + 16;
    ctx.fillStyle = '#000'; ctx.fillRect((bx + sx) / 2 - lw / 2, top - 26, lw, 16);
    ctx.fillStyle = '#A3AAB6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lt, (bx + sx) / 2, top - 18);

    // screen strip
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#C9CED6';
    ctx.fillText('Screen, ±' + p.Y + ' mm', x0, stripY - 12);
    for (var i = 0; i < pw; i++) {
      var k = Math.min(o.M - 1, Math.round(i * (o.M - 1) / (pw - 1))), b = Math.pow(o.I[k], 0.5);
      ctx.fillStyle = 'rgb(' + Math.round(col[0] * b) + ',' + Math.round(col[1] * b) + ',' + Math.round(col[2] * b) + ')';
      ctx.fillRect(x0 + i, stripY, 1.5, stripH);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 0.5, stripY - 0.5, pw + 1, stripH + 1);

    // plot
    ctx.fillStyle = '#C9CED6';
    ctx.fillText('Relative intensity', x0, plotY - 16);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#A3AAB6';
    ctx.strokeStyle = '#22262E';
    [0, 0.5, 1].forEach(function (v) {
      var gy = plotY + plotH * (1 - v);
      ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + pw, gy); ctx.stroke();
      ctx.fillText(String(v), x0 - 8, gy);
    });
    var step = this.nice(p.Y / 4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var t = -Math.floor(p.Y / step) * step; t <= p.Y + 1e-9; t += step) {
      var tx = X(t);
      ctx.strokeStyle = '#3A404C';
      ctx.beginPath(); ctx.moveTo(tx, plotY + plotH); ctx.lineTo(tx, plotY + plotH + 5); ctx.stroke();
      ctx.fillText((+t.toPrecision(4)) + (Math.abs(t) < 1e-9 ? ' mm' : ''), tx, plotY + plotH + 9);
    }

    var m = o.meas, A = '#FFB547';
    var marks = m.measured != null ? [m.left, m.right] : [];
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,181,71,0.6)'; ctx.lineWidth = 1;
    marks.forEach(function (y) { var mx = X(y); ctx.beginPath(); ctx.moveTo(mx, stripY); ctx.lineTo(mx, plotY + plotH); ctx.stroke(); });
    ctx.setLineDash([]);

    ctx.strokeStyle = cs(1); ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (i = 0; i < o.M; i++) { var px = x0 + i * pw / (o.M - 1), pyy = plotY + plotH * (1 - o.I[i]); if (i) ctx.lineTo(px, pyy); else ctx.moveTo(px, pyy); }
    ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#9AA2AF'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (i = 0; i < o.M; i++) { var qx = x0 + i * pw / (o.M - 1), qy = plotY + plotH * (1 - o.T[i]); if (i) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy); }
    ctx.stroke();
    ctx.setLineDash([]);

    if (marks.length) {
      ctx.fillStyle = A; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(o.N === 1 ? 'First minimum' : 'First order', X(marks[1]) + 6, plotY + 14);
    }

    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var lgY = plotY - 20, lgX = x0 + pw;
    ctx.fillStyle = '#C9CED6';
    ctx.fillText('Fraunhofer formula', lgX, lgY);
    var w2 = ctx.measureText('Fraunhofer formula').width;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#9AA2AF'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(lgX - w2 - 32, lgY); ctx.lineTo(lgX - w2 - 8, lgY); ctx.stroke();
    ctx.setLineDash([]);
    var l1 = 'Huygens–Fresnel sum', x1 = lgX - w2 - 52;
    ctx.fillText(l1, x1, lgY);
    var w1 = ctx.measureText(l1).width;
    ctx.strokeStyle = cs(1); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x1 - w1 - 32, lgY); ctx.lineTo(x1 - w1 - 8, lgY); ctx.stroke();
  }
