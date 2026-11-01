import { describe, it, expect } from 'vitest';
import { michaelisMenten, fitMichaelisMenten, lineweaverBurk } from './kinetics';

// Reference values from scipy.optimize.curve_fit on the same data.
const S = [0.5, 1, 2, 4, 8, 16, 32];
const V = [1.48, 2.62, 4.01, 5.83, 7.06, 7.98, 8.41];

describe('Michaelis-Menten', () => {
  it('v = Vmax·[S]/(Km + [S]) is half Vmax at [S] = Km', () => {
    expect(michaelisMenten(2.5, 10, 2.5)).toBeCloseTo(5, 12);
  });

  it('approaches Vmax at saturating substrate', () => {
    expect(michaelisMenten(1e6, 10, 2.5)).toBeCloseTo(10, 3);
  });
});

describe('nonlinear least-squares fit', () => {
  it('matches scipy for Km, Vmax and their standard errors', () => {
    const fit = fitMichaelisMenten(S, V)!;
    expect(fit.vmax).toBeCloseTo(9.16475866332171, 6);
    expect(fit.km).toBeCloseTo(2.456382690615887, 6);
    expect(fit.vmaxSE).toBeCloseTo(0.09814168881952412, 5);
    expect(fit.kmSE).toBeCloseTo(0.09360345030430739, 5);
    expect(fit.ssr).toBeCloseTo(0.05347192358574732, 8);
  });

  it('recovers exact parameters from noise-free data', () => {
    const v = S.map(s => michaelisMenten(s, 10, 2.5));
    const fit = fitMichaelisMenten(S, v)!;
    expect(fit.vmax).toBeCloseTo(10, 8);
    expect(fit.km).toBeCloseTo(2.5, 8);
  });

  it('does not depend on the starting guess', () => {
    // Different scales of data, same shape.
    const v = S.map(s => michaelisMenten(s, 0.004, 120));
    const fit = fitMichaelisMenten(S.map(s => s * 100), v.map((_, i) => michaelisMenten(S[i] * 100, 0.004, 120)))!;
    expect(fit.vmax).toBeCloseTo(0.004, 9);
    expect(fit.km).toBeCloseTo(120, 5);
  });

  it('gives 95% confidence intervals that contain the estimate', () => {
    const fit = fitMichaelisMenten(S, V)!;
    expect(fit.kmCI[0]).toBeLessThan(fit.km);
    expect(fit.kmCI[1]).toBeGreaterThan(fit.km);
  });

  it('needs at least three points, two of them distinct', () => {
    expect(fitMichaelisMenten([1, 2], [1, 2])).toBeNull();
    expect(fitMichaelisMenten([2, 2, 2], [1, 1.1, 0.9])).toBeNull();
  });
});

describe('Lineweaver-Burk', () => {
  it('is exact on noise-free data', () => {
    const v = S.map(s => michaelisMenten(s, 10, 2.5));
    const lb = lineweaverBurk(S, v)!;
    expect(lb.vmax).toBeCloseTo(10, 9);
    expect(lb.km).toBeCloseTo(2.5, 9);
  });

  it('is biased on real data, which is why the nonlinear fit is the one reported', () => {
    // numpy.polyfit of 1/v against 1/[S] on the same data gives Vmax 9.456, Km 2.677,
    // against the nonlinear 9.165 and 2.456: the reciprocal weights the low-[S] points.
    const lb = lineweaverBurk(S, V)!;
    expect(lb.vmax).toBeCloseTo(9.455565732249559, 6);
    expect(lb.km).toBeCloseTo(2.6774966999745593, 6);
  });
});
