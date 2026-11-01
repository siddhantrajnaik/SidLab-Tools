import { describe, it, expect } from 'vitest';
import {
  linearRegression, tCritical95, efficiencyFromSlope, slopeForEfficiency,
  standardCurve, pfafflRatio, deltaDeltaCq, parseColumn,
} from './qpcr';

describe('linear regression', () => {
  // Reference values from scipy.stats.linregress on the same five points.
  const x = [0, -1, -2, -3, -4];
  const y = [15.1, 18.5, 21.7, 25.2, 28.4];

  it('matches scipy for slope, intercept, R² and the slope standard error', () => {
    const r = linearRegression(x, y)!;
    expect(r.slope).toBeCloseTo(-3.33, 9);
    expect(r.intercept).toBeCloseTo(15.12, 9);
    expect(r.r2).toBeCloseTo(0.9998286868395425, 9);
    expect(r.slopeSE).toBeCloseTo(0.025166114784248385, 9);
  });

  it('recovers an exact line exactly', () => {
    const r = linearRegression([1, 2, 3, 4], [10, 7, 4, 1])!;
    expect(r.slope).toBeCloseTo(-3, 12);
    expect(r.intercept).toBeCloseTo(13, 12);
    expect(r.r2).toBeCloseTo(1, 12);
    expect(r.slopeSE).toBeCloseTo(0, 12);
  });

  it('refuses fewer than two points, or no spread in x, rather than returning NaN', () => {
    expect(linearRegression([1], [2])).toBeNull();
    expect(linearRegression([2, 2, 2], [1, 2, 3])).toBeNull();
  });
});

describe('Student t critical values', () => {
  // Two-sided 95% (the 0.975 quantile), from scipy.stats.t.ppf.
  it.each([
    [1, 12.7062], [2, 4.3027], [3, 3.1824], [4, 2.7764], [5, 2.5706],
    [8, 2.306], [10, 2.2281], [13, 2.1604], [20, 2.086], [30, 2.0423], [100, 1.984],
  ])('df = %i gives %s', (df, expected) => {
    expect(tCritical95(df)).toBeCloseTo(expected, 3);
  });
});

describe('efficiency from the standard-curve slope', () => {
  // MIQE 2.0 (Bustin et al., Clin Chem 2025;71:634, doi:10.1093/clinchem/hvaf043):
  // %E = 100 × (10^(−1/slope) − 1).
  it('a slope of −3.32 is 100% — perfect doubling every cycle', () => {
    expect(efficiencyFromSlope(-1 / Math.log10(2))).toBeCloseTo(100, 9);
    expect(efficiencyFromSlope(-3.32)).toBeCloseTo(100, 0);
  });

  it('a steeper slope (more cycles per tenfold) is less efficient, a shallower one more', () => {
    expect(efficiencyFromSlope(-3.6)).toBeCloseTo(89.57, 2);
    expect(efficiencyFromSlope(-3.1)).toBeCloseTo(110.17, 2);
  });

  it('inverts cleanly', () => {
    for (const e of [70, 90, 100, 110]) {
      expect(efficiencyFromSlope(slopeForEfficiency(e))).toBeCloseTo(e, 9);
    }
  });

  it('a perfect tenfold dilution series at 100% efficiency recovers 100%', () => {
    const dilutions = [1, 0.1, 0.01, 0.001, 0.0001];
    const step = 1 / Math.log10(2); // cycles per tenfold dilution
    const cq = dilutions.map((_, i) => 15 + i * step);
    const curve = standardCurve(dilutions.map(d => Math.log10(d)), cq)!;
    expect(curve.efficiency).toBeCloseTo(100, 9);
    expect(curve.amplificationFactor).toBeCloseTo(2, 9);
  });

  it('reports a confidence interval for the efficiency, as MIQE 2.0 asks', () => {
    const curve = standardCurve([0, -1, -2, -3, -4], [15.1, 18.5, 21.7, 25.2, 28.4])!;
    // Slope CI from scipy: [−3.4101, −3.2499].
    const [sLow, sHigh] = curve.slopeCI!;
    const [eLow, eHigh] = curve.efficiencyCI!;
    expect(sLow).toBeCloseTo(-3.410089809013477, 4);
    expect(sHigh).toBeCloseTo(-3.2499101909865225, 4);
    // The steeper end of the slope interval is the lower efficiency.
    expect(eLow).toBeCloseTo(efficiencyFromSlope(-3.410089809013477), 2);
    expect(eHigh).toBeCloseTo(efficiencyFromSlope(-3.2499101909865225), 2);
    expect(eLow).toBeLessThan(curve.efficiency);
    expect(eHigh).toBeGreaterThan(curve.efficiency);
  });

  it('flags an apparent efficiency above 100%, which MIQE 2.0 attributes to pipetting error', () => {
    // 3.0 cycles per tenfold is shallower than the 3.32 a perfect doubling allows.
    const shallow = standardCurve([0, -1, -2, -3], [15, 18.0, 21.0, 24.0])!;
    expect(shallow.efficiency).toBeCloseTo(115.4, 1);
    expect(shallow.aboveTheoretical).toBe(true);
    const fine = standardCurve([0, -1, -2, -3], [15, 18.5, 22.0, 25.5])!;
    expect(fine.aboveTheoretical).toBe(false);
  });

  it('cannot give a confidence interval from two points, and says so', () => {
    const two = standardCurve([0, -1], [15, 18.32])!;
    expect(two.efficiency).toBeGreaterThan(0);
    expect(two.slopeCI).toBeNull();
    expect(two.efficiencyCI).toBeNull();
  });
});

describe('Pfaffl efficiency-corrected ratio', () => {
  // Worked example from Pfaffl, Nucleic Acids Res 2001;29:e45 (doi:10.1093/nar/29.9.e45).
  // Efficiencies are amplification factors (2.0 = 100%); ΔCP is control − sample.
  it('reproduces the paper’s unnormalized fold changes', () => {
    // TyrA up 49.1-fold; PyrB down 27.6-fold.
    expect(Math.pow(2.09, 5.283)).toBeCloseTo(49.1, 1);
    // The paper prints 27.6; its stated inputs give 27.66, so allow for its rounding.
    expect(Math.abs(1 / Math.pow(2.16, -4.311) - 27.6)).toBeLessThan(0.1);
  });

  it('reproduces the paper’s normalized PyrB down-regulation of 23.2-fold', () => {
    // Normalized to the Gst reference gene: E = 1.99, ΔCP = −0.256.
    const ratio = pfafflRatio(2.16, -4.311, 1.99, -0.256);
    expect(1 / ratio).toBeCloseTo(23.2, 1);
  });

  it('reproduces the paper’s normalized TyrA up-regulation of about 58.5-fold', () => {
    // The paper reports 58.5 as an average over its dilution series; the single
    // calculation from the stated values gives 58.6.
    expect(pfafflRatio(2.09, 5.283, 1.99, -0.256)).toBeCloseTo(58.6, 1);
  });

  it('reduces to 2^−ΔΔCq when both assays double exactly', () => {
    // ΔCq(target) = 3, ΔCq(ref) = 1, both as control − sample.
    expect(pfafflRatio(2, 3, 2, 1)).toBeCloseTo(Math.pow(2, 2), 12);
  });

  it('is 1 when nothing changed', () => {
    expect(pfafflRatio(1.95, 0, 2.02, 0)).toBe(1);
  });
});

describe('2^−ΔΔCq (Livak & Schmittgen, Methods 2001;25:402)', () => {
  it('computes ΔCq, ΔΔCq and fold change', () => {
    // Target Cq 25 → 22 on treatment; reference stays at 18.
    const r = deltaDeltaCq({ targetControl: 25, refControl: 18, targetTreated: 22, refTreated: 18 });
    expect(r.dCqControl).toBe(7);
    expect(r.dCqTreated).toBe(4);
    expect(r.ddCq).toBe(-3);
    expect(r.foldChange).toBeCloseTo(8, 12);
  });

  it('a ΔΔCq of zero is no change', () => {
    expect(deltaDeltaCq({ targetControl: 25, refControl: 18, targetTreated: 26, refTreated: 19 }).foldChange).toBe(1);
  });

  it('agrees with Pfaffl at exactly 100% efficiency', () => {
    const c = { targetControl: 26.1, refControl: 17.4, targetTreated: 23.9, refTreated: 17.9 };
    const pfaffl = pfafflRatio(2, c.targetControl - c.targetTreated, 2, c.refControl - c.refTreated);
    expect(deltaDeltaCq(c).foldChange).toBeCloseTo(pfaffl, 12);
  });

  it('diverges from Pfaffl when the efficiencies are not 100%, which is why MIQE 2.0 advises against it', () => {
    const c = { targetControl: 26, refControl: 18, targetTreated: 20, refTreated: 18 };
    const assumed = deltaDeltaCq(c).foldChange;            // 2^6 = 64
    const corrected = pfafflRatio(1.85, 6, 2, 0);           // 1.85^6 ≈ 40
    expect(assumed).toBeCloseTo(64, 9);
    expect(corrected).toBeCloseTo(40.1, 0);
  });
});

describe('pasted columns', () => {
  it('reads numbers separated by newlines, tabs, commas or spaces', () => {
    expect(parseColumn('15.1\n18.5\t21.7, 25.2  28.4')).toEqual([15.1, 18.5, 21.7, 25.2, 28.4]);
  });

  it('skips headers and blanks, and keeps scientific notation', () => {
    expect(parseColumn('Cq\n\n 15.1\nUndetermined\n1e-3')).toEqual([15.1, 0.001]);
  });
});
