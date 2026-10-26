// Physics oracles for the prototype. Run: node reference/checks/verify.mjs
// Loads the logic class straight out of the two .dc.html screens, so it tests exactly what the artifact ran.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

function load(file) {
  const html = readFileSync(join(here, '..', 'ui-mockup', file), 'utf8');
  const src = html.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
  globalThis.requestAnimationFrame = () => 0;
  return new Function('class DCLogic { forceUpdate() {} }\n' + src + '\nreturn Component;')();
}

let failed = 0;
function near(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}: got ${got}, want ${want} ± ${tol}`);
}

const Ray = load('ray-bench.dc.html');
const r = new Ray();
r.renderVals();

// Schott N-BK7 datasheet: nd 1.51680, Vd 64.17
const nd = r.n('bk7', 587.56), nF = r.n('bk7', 486.13), nC = r.n('bk7', 656.27);
near('N-BK7 nd', +nd.toFixed(5), 1.5168, 1e-5);
near('N-BK7 Abbe number', +((nd - 1) / (nF - nC)).toFixed(2), 64.17, 0.01);

// Bench preset: point source 100 mm before a thick biconvex lens (R 50, D 40) images near x = -17
r.load('bench');
r.scene = [r.preset('bench')[0], r.preset('bench')[1]];
Object.assign(r.scene[0], { spec: 587.56, rays: 3, cone: 2 });
const segs = [];
for (const b of Object.values(r.trace().buckets)) for (let i = 0; i < b.pts.length; i += 4) segs.push(b.pts.slice(i, i + 4));
const off = segs.find((s) => s[0] > -116 && s[2] > 1000 && Math.abs(s[3] - s[1]) > 1e-6);
near('thick lens paraxial image x (mm)', +(off[0] - (off[1] + 70) / ((off[3] - off[1]) / (off[2] - off[0]))).toFixed(2), -16.85, 0.05);

// Glass ball: the straight-through path keeps (1 - R)^2 with BK7 normal-incidence Fresnel R = 4.21 %
r.load('ball');
const ball = r.analyze(r.eyeObj());
const direct = ball.rows[0];
near('ball direct path transmission', +(direct.Tn / direct.n).toFixed(3), +Math.pow(1 - Math.pow((nd - 1) / (nd + 1), 2), 2).toFixed(3), 0.002);
near('ball real image x (mm)', +direct.top.X[0].toFixed(1), 79.9, 0.5);

// Magnifier: object 40 mm before lens, principal planes at ±1.96 mm, f 60.2 mm -> virtual image at x ≈ -101.4
r.load('magnifier');
const mag = r.analyze(r.eyeObj());
const base = mag.list.find((g) => g.path === mag.rows[0].path && g.pt === 0);
near('magnifier virtual image x (mm)', +base.X[0].toFixed(1), -101.4, 1.5);
near('magnifier pupil share sums below 100 %', +(mag.total <= 1), 1, 0);

const Wave = load('wave-lab.dc.html');
const w = new Wave();
w.pw = 900;
for (const [mode, label] of [['single', 'first minimum'], ['double', 'first order']]) {
  w.p = null; w.out = null; w.renderVals(); w.p.mode = mode; w.compute();
  const m = w.out.meas;
  near(`${mode} slit far field: Huygens sum vs Fraunhofer ${label} (%)`, +((m.measured - m.fraun) / m.fraun * 100).toFixed(3), 0, 0.01);
}
w.p.mode = 'single'; w.compute();
near('single slit first minimum vs a sin θ = λ (mm)', +w.out.meas.measured.toFixed(4), +w.out.meas.theory.toFixed(4), 1e-4);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
