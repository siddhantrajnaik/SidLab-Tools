import { describe, it, expect } from 'vitest';
import { transformationEfficiency, dnaPlatedUg, expectedColonies } from './transformation';

describe('transformation efficiency', () => {
  it('reproduces NEB’s worked example for C2925', () => {
    // 100 pg pUC19, 50 µL cells + 950 µL SOC, 100 µL plated undiluted, 20 colonies → 2 × 10^6 cfu/µg.
    expect(transformationEfficiency({ colonies: 20, dnaNg: 0.1, recoveryUl: 1000, platedUl: 100, dilution: 1 }))
      .toBeCloseTo(2e6, 0);
  });

  it('reproduces Thermo Fisher’s worked example for Library Efficiency DH5α', () => {
    // 50 pg pUC19, 1 mL recovery, 100 µL of a 1:10 dilution plated, 100 colonies → 2 × 10^8 cfu/µg.
    expect(transformationEfficiency({ colonies: 100, dnaNg: 0.05, recoveryUl: 1000, platedUl: 100, dilution: 10 }))
      .toBeCloseTo(2e8, 0);
  });

  it('counts the DNA actually on the plate', () => {
    expect(dnaPlatedUg({ dnaNg: 0.05, recoveryUl: 1000, platedUl: 100, dilution: 10 })).toBeCloseTo(5e-7, 15);
  });

  it('predicts the colonies a given efficiency should give, the inverse calculation', () => {
    const setup = { dnaNg: 0.1, recoveryUl: 1000, platedUl: 100, dilution: 1 };
    expect(expectedColonies(2e6, setup)).toBeCloseTo(20, 9);
  });

  it('returns 0 rather than Infinity when no DNA was plated', () => {
    expect(transformationEfficiency({ colonies: 20, dnaNg: 0, recoveryUl: 1000, platedUl: 100, dilution: 1 })).toBe(0);
    expect(transformationEfficiency({ colonies: 20, dnaNg: 0.1, recoveryUl: 0, platedUl: 100, dilution: 1 })).toBe(0);
  });

  it('caps the plated volume at the recovery volume', () => {
    // Plating more than you have is not possible; treat it as plating everything.
    expect(dnaPlatedUg({ dnaNg: 1, recoveryUl: 500, platedUl: 800, dilution: 1 })).toBeCloseTo(1e-3, 12);
  });
});
