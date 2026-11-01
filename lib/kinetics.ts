/**
 * Michaelis-Menten enzyme kinetics: v = Vmax·[S] / (Km + [S]).
 *
 * Km and Vmax are fitted by nonlinear least squares (Gauss-Newton with step halving), with
 * standard errors from the covariance matrix s²·(JᵀJ)⁻¹, s² = SSR/(n − 2) — the same
 * estimates scipy.optimize.curve_fit returns, which the tests check against.
 *
 * Lineweaver-Burk is provided for comparison only. Taking reciprocals magnifies the error
 * in the lowest-[S] (smallest v) points, so a straight-line fit to 1/v against 1/[S]
 * gives biased Km and Vmax from real data.
 */
import { linearRegression, tCritical95 } from './qpcr';

export const michaelisMenten = (s: number, vmax: number, km: number): number => (vmax * s) / (km + s);

export interface MMFit {
  vmax: number;
  km: number;
  vmaxSE: number;
  kmSE: number;
  vmaxCI: [number, number];
  kmCI: [number, number];
  ssr: number;
  n: number;
}

const ssrOf = (s: number[], v: number[], vmax: number, km: number) =>
  s.reduce((acc, si, i) => acc + (v[i] - michaelisMenten(si, vmax, km)) ** 2, 0);

export const fitMichaelisMenten = (sRaw: number[], vRaw: number[]): MMFit | null => {
  const n = Math.min(sRaw.length, vRaw.length);
  const s = sRaw.slice(0, n), v = vRaw.slice(0, n);
  if (n < 3 || new Set(s).size < 2 || s.some(x => !(x > 0))) return null;

  // Start from Lineweaver-Burk where it gives sensible numbers, else from the data range.
  const lb = lineweaverBurk(s, v);
  let vmax = lb && lb.vmax > 0 && lb.km > 0 ? lb.vmax : Math.max(...v);
  let km = lb && lb.vmax > 0 && lb.km > 0 ? lb.km : s[Math.floor(n / 2)];

  let ssr = ssrOf(s, v, vmax, km);
  for (let iter = 0; iter < 200; iter++) {
    // Jacobian of the model with respect to (Vmax, Km).
    let a11 = 0, a12 = 0, a22 = 0, g1 = 0, g2 = 0;
    for (let i = 0; i < n; i++) {
      const d = km + s[i];
      const j1 = s[i] / d;
      const j2 = (-vmax * s[i]) / (d * d);
      const r = v[i] - michaelisMenten(s[i], vmax, km);
      a11 += j1 * j1; a12 += j1 * j2; a22 += j2 * j2;
      g1 += j1 * r; g2 += j2 * r;
    }
    const det = a11 * a22 - a12 * a12;
    if (!(Math.abs(det) > 0)) break;
    const dv = (a22 * g1 - a12 * g2) / det;
    const dk = (a11 * g2 - a12 * g1) / det;

    let step = 1, improved = false;
    for (let h = 0; h < 30; h++) {
      const nv = vmax + step * dv, nk = km + step * dk;
      if (nk > 0) {
        const nssr = ssrOf(s, v, nv, nk);
        if (nssr <= ssr) { vmax = nv; km = nk; improved = ssr - nssr > 1e-30 * (1 + ssr); ssr = nssr; break; }
      }
      step /= 2;
    }
    if (!improved || (Math.abs(dv) < 1e-12 * Math.abs(vmax) && Math.abs(dk) < 1e-12 * km)) break;
  }

  // Covariance at the optimum.
  let a11 = 0, a12 = 0, a22 = 0;
  for (let i = 0; i < n; i++) {
    const d = km + s[i];
    const j1 = s[i] / d;
    const j2 = (-vmax * s[i]) / (d * d);
    a11 += j1 * j1; a12 += j1 * j2; a22 += j2 * j2;
  }
  const det = a11 * a22 - a12 * a12;
  const s2 = ssr / (n - 2);
  const vmaxSE = det > 0 ? Math.sqrt((s2 * a22) / det) : NaN;
  const kmSE = det > 0 ? Math.sqrt((s2 * a11) / det) : NaN;
  const t = tCritical95(n - 2);

  return {
    vmax, km, vmaxSE, kmSE, ssr, n,
    vmaxCI: [vmax - t * vmaxSE, vmax + t * vmaxSE],
    kmCI: [km - t * kmSE, km + t * kmSE],
  };
};

/** 1/v = (Km/Vmax)(1/[S]) + 1/Vmax, fitted as a straight line. */
export const lineweaverBurk = (s: number[], v: number[]): { vmax: number; km: number } | null => {
  const pairs = s.map((x, i) => [x, v[i]]).filter(([x, y]) => x > 0 && y > 0);
  const fit = linearRegression(pairs.map(p => 1 / p[0]), pairs.map(p => 1 / p[1]));
  if (!fit || fit.intercept === 0) return null;
  return { vmax: 1 / fit.intercept, km: fit.slope / fit.intercept };
};
