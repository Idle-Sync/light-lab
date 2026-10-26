// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  rot(o, lx, ly) {
    var c = Math.cos(o.ang), s = Math.sin(o.ang);
    return { x: o.x + lx * c - ly * s, y: o.y + lx * s + ly * c };
  }

  adiff(a, b) {
    var d = (a - b) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  nice(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  lensGeom(o) {
    var h = o.D / 2, R1 = o.R1, R2 = o.R2;
    var s1 = R1 - Math.sqrt(R1 * R1 - h * h), s2 = R2 - Math.sqrt(R2 * R2 - h * h), t = s1 + s2 + 1.5;
    return { h: h, R1: R1, R2: R2, t: t, s1: s1, s2: s2, CL: this.rot(o, -t / 2 + R1, 0), CR: this.rot(o, t / 2 - R2, 0), hL: Math.asin(h / R1), hR: Math.asin(h / R2) };
  }

  arcGeom(o) {
    var cc = o.form === 'concave';
    return { R: o.R, c: this.rot(o, cc ? o.R : -o.R, 0), mid: cc ? o.ang + Math.PI : o.ang, half: Math.asin(o.D / 2 / o.R) };
  }

  prismVerts(o) {
    var H = o.side * Math.sqrt(3) / 2;
    return [this.rot(o, 0, -2 * H / 3), this.rot(o, o.side / 2, H / 3), this.rot(o, -o.side / 2, H / 3)];
  }

  prims(o) {
    var P = [];
    if (o.type === 'mirror' || o.type === 'detector' || o.type === 'blocker') {
      P.push({ k: 's', a: this.rot(o, -o.len / 2, 0), b: this.rot(o, o.len / 2, 0), role: o.type, o: o });
    } else if (o.type === 'arcmirror') {
      var g = this.arcGeom(o);
      P.push({ k: 'a', c: g.c, r: g.R, mid: g.mid, half: g.half, role: 'mirror', o: o });
    } else if (o.type === 'lens') {
      var L = this.lensGeom(o), s = Math.sin(o.ang), c = Math.cos(o.ang), xl = -L.t / 2 + L.s1, xr = L.t / 2 - L.s2;
      P.push({ k: 'a', c: L.CL, r: L.R1, mid: o.ang + Math.PI, half: L.hL, role: 'glass', o: o });
      P.push({ k: 'a', c: L.CR, r: L.R2, mid: o.ang, half: L.hR, role: 'glass', o: o });
      P.push({ k: 's', a: this.rot(o, xl, -L.h), b: this.rot(o, xr, -L.h), n: { x: s, y: -c }, role: 'glass', o: o });
      P.push({ k: 's', a: this.rot(o, xl, L.h), b: this.rot(o, xr, L.h), n: { x: -s, y: c }, role: 'glass', o: o });
    } else if (o.type === 'prism') {
      var v = this.prismVerts(o);
      for (var i = 0; i < 3; i++) {
        var a = v[i], b = v[(i + 1) % 3], ex = b.x - a.x, ey = b.y - a.y, l = Math.hypot(ex, ey), nx = ey / l, ny = -ex / l;
        if (nx * ((a.x + b.x) / 2 - o.x) + ny * ((a.y + b.y) / 2 - o.y) < 0) { nx = -nx; ny = -ny; }
        P.push({ k: 's', a: a, b: b, n: { x: nx, y: ny }, role: 'glass', o: o });
      }
    } else if (o.type === 'ball') {
      P.push({ k: 'a', c: { x: o.x, y: o.y }, r: o.D / 2, mid: 0, half: Math.PI, role: 'glass', o: o });
    } else if (o.type === 'eye') {
      P.push({ k: 's', a: this.rot(o, 0, -o.pupil / 2), b: this.rot(o, 0, o.pupil / 2), role: 'eye', o: o });
    }
    return P;
  }

  hit(p, ox, oy, dx, dy) {
    if (p.k === 's') {
      var ex = p.b.x - p.a.x, ey = p.b.y - p.a.y, den = dx * ey - dy * ex;
      if (den > -1e-12 && den < 1e-12) return null;
      var ax = p.a.x - ox, ay = p.a.y - oy, t = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
      return t > 1e-6 && u >= 0 && u <= 1 ? { t: t, u: u } : null;
    }
    var fx = ox - p.c.x, fy = oy - p.c.y, b = fx * dx + fy * dy, c = fx * fx + fy * fy - p.r * p.r, disc = b * b - c;
    if (disc < 0) return null;
    var sq = Math.sqrt(disc), roots = [-b - sq, -b + sq];
    for (var i = 0; i < 2; i++) {
      var t2 = roots[i];
      if (t2 <= 1e-6) continue;
      if (p.half >= Math.PI) return { t: t2, u: 0 };
      if (Math.abs(this.adiff(Math.atan2(fy + t2 * dy, fx + t2 * dx), p.mid)) <= p.half) return { t: t2, u: 0 };
    }
    return null;
  }

  ext(o) {
    switch (o.type) {
      case 'lens': case 'ball': case 'arcmirror': return o.D / 2;
      case 'prism': return o.side * 0.6;
      case 'beam': return o.width / 2;
      case 'point': return 4;
      case 'object': return 4;
      case 'eye': return o.pupil * 0.75 + 4;
      default: return o.len / 2;
    }
  }

  perpExt(o) {
    switch (o.type) {
      case 'lens': case 'ball': case 'arcmirror': return o.D / 2;
      case 'prism': return o.side * Math.sqrt(3) / 3;
      case 'beam': return o.width / 2;
      case 'object': return o.h;
      case 'eye': return o.pupil * 0.75;
      default: return 0;
    }
  }
