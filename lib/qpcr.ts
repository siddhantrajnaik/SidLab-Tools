/**
 * qPCR analysis: amplification efficiency from a standard curve, and relative
 * quantification by the efficiency-corrected (Pfaffl) and 2^−ΔΔCq methods.
 *
 * Sources:
 *  - MIQE 2.0: Bustin et al., Clin Chem 2025;71:634-651, doi:10.1093/clinchem/hvaf043.
 *    Gives %E = 100 × (10^(−1/slope) − 1), asks for efficiency to be reported with a
 *    confidence interval, and attributes efficiencies above 100% to pipetting errors in
 *    the dilution series. It does NOT endorse a "90-110%" acceptance window or an R²
 *    cutoff — both are often attributed to MIQE by secondary sources, so neither is used
 *    here as a pass/fail rule.
 *  - Pfaffl, Nucleic Acids Res 2001;29:e45, doi:10.1093/nar/29.9.e45.
 *  - Livak & Schmittgen, Methods 2001;25:402-408, doi:10.1006/meth.2001.1262.
 */

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
  /** Standard error of the slope. */
  slopeSE: number;
  n: number;
}

/** Ordinary least squares. Null when the fit is undefined (fewer than two points, or no spread in x). */
export const linearRegression = (x: number[], y: number[]): Regression | null => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;
  const mx = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
    syy += (y[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssRes = Math.max(0, syy - slope * sxy);
  const r2 = syy === 0 ? 1 : 1 - ssRes / syy;
  const slopeSE = n > 2 ? Math.sqrt(ssRes / (n - 2) / sxx) : NaN;
  return { slope, intercept, r2, slopeSE, n };
};

// --- Student t distribution -------------------------------------------------
// Two-sided 95% critical value, from the regularised incomplete beta function
// (continued fraction, as in Numerical Recipes §6.4) and bisection.

const logGamma = (z: number): number => {
  // Lanczos approximation, g = 7.
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let a = c[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
};

const betaContinuedFraction = (a: number, b: number, x: number): number => {
  const tiny = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
};

/** Regularised incomplete beta I_x(a, b). */
const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
};

/** P(|T| > t) for Student's t with df degrees of freedom. */
const twoSidedP = (t: number, df: number): number => incompleteBeta(df / (df + t * t), df / 2, 0.5);

/** The t value leaving 2.5% in each tail. */
export const tCritical95 = (df: number): number => {
  if (!(df >= 1)) return NaN;
  let low = 0, high = 1000;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (twoSidedP(mid, df) > 0.05) low = mid; else high = mid;
  }
  return (low + high) / 2;
};

// --- Efficiency -------------------------------------------------------------

/** %E = 100 × (10^(−1/slope) − 1), for Cq plotted against log10 of input. */
export const efficiencyFromSlope = (slope: number): number => 100 * (Math.pow(10, -1 / slope) - 1);

export const slopeForEfficiency = (efficiencyPercent: number): number =>
  -1 / Math.log10(1 + efficiencyPercent / 100);

export interface StandardCurve extends Regression {
  /** Percent efficiency; 100 means the product exactly doubles every cycle. */
  efficiency: number;
  /** Fold amplification per cycle, 1 + E/100 — the E that Pfaffl's equation takes. */
  amplificationFactor: number;
  /** 95% confidence interval on the slope, and the efficiency range it implies. */
  slopeCI: [number, number] | null;
  efficiencyCI: [number, number] | null;
  /**
   * True when the fitted efficiency exceeds 100% — a slope shallower than −3.32. A
   * reaction cannot more than double per cycle; MIQE 2.0 traces this to pipetting error
   * in the dilution series.
   */
  aboveTheoretical: boolean;
}

/**
 * Fit Cq against log10(relative input). The x values should be log10 of the dilution or
 * copy number, so a tenfold series is spaced by 1.
 */
export const standardCurve = (log10Input: number[], cq: number[]): StandardCurve | null => {
  const fit = linearRegression(log10Input, cq);
  if (!fit || fit.slope >= 0) return null;
  const efficiency = efficiencyFromSlope(fit.slope);
  let slopeCI: [number, number] | null = null;
  let efficiencyCI: [number, number] | null = null;
  if (fit.n > 2 && isFinite(fit.slopeSE)) {
    const half = tCritical95(fit.n - 2) * fit.slopeSE;
    slopeCI = [fit.slope - half, fit.slope + half];
    // A steeper (more negative) slope is a lower efficiency, so the ends swap.
    const ends = slopeCI.map(s => (s < 0 ? efficiencyFromSlope(s) : Infinity));
    efficiencyCI = [Math.min(...ends), Math.max(...ends)];
  }
  return {
    ...fit,
    efficiency,
    amplificationFactor: 1 + efficiency / 100,
    slopeCI,
    efficiencyCI,
    aboveTheoretical: efficiency > 100,
  };
};

// --- Relative quantification ------------------------------------------------

/**
 * Pfaffl 2001, Eq. 1:
 *   ratio = E_target^ΔCq_target(control − sample) / E_ref^ΔCq_ref(control − sample)
 * where E is the amplification factor per cycle (2.0 for 100% efficiency).
 */
export const pfafflRatio = (
  eTarget: number, dCqTarget: number, eRef: number, dCqRef: number
): number => Math.pow(eTarget, dCqTarget) / Math.pow(eRef, dCqRef);

export interface DdCqInput {
  targetControl: number;
  refControl: number;
  targetTreated: number;
  refTreated: number;
}

export interface DdCqResult {
  dCqControl: number;
  dCqTreated: number;
  ddCq: number;
  foldChange: number;
}

/**
 * Livak & Schmittgen 2001: ΔCq = Cq(target) − Cq(reference) in each condition,
 * ΔΔCq = ΔCq(treated) − ΔCq(control), fold change = 2^−ΔΔCq. Assumes both assays are
 * 100% efficient; MIQE 2.0 recommends against relying on it for that reason.
 */
export const deltaDeltaCq = (c: DdCqInput): DdCqResult => {
  const dCqControl = c.targetControl - c.refControl;
  const dCqTreated = c.targetTreated - c.refTreated;
  const ddCq = dCqTreated - dCqControl;
  return { dCqControl, dCqTreated, ddCq, foldChange: Math.pow(2, -ddCq) };
};

/** Numbers from pasted text — a column from a plate-reader export, a comma list, anything. */
export const parseColumn = (text: string): number[] =>
  (text.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [])
    .map(Number)
    .filter(n => isFinite(n));
