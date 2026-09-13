import { describe, it, expect } from 'vitest';
import { ATOMIC_WEIGHTS, parseFormula, formatFormula, massPercent } from './formula';

describe('atomic weights (NIST)', () => {
  it('covers the elements a lab formula actually uses', () => {
    for (const el of ['H', 'C', 'N', 'O', 'Na', 'Mg', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Zn', 'I']) {
      expect(ATOMIC_WEIGHTS[el], el).toBeGreaterThan(0);
    }
  });

  // Against IUPAC's conventional atomic weights. NIST gives an interval for elements with
  // variable isotopic composition and the midpoint is used, so agreement is to 0.01.
  it.each([
    ['H', 1.008], ['C', 12.011], ['N', 14.007], ['O', 15.999], ['Na', 22.990],
    ['P', 30.974], ['S', 32.06], ['Cl', 35.45], ['K', 39.098], ['Ca', 40.078],
  ])('%s matches the IUPAC conventional weight', (el, expected) => {
    expect(Math.abs(ATOMIC_WEIGHTS[el] - expected)).toBeLessThan(0.01);
  });

  it('is case sensitive, as chemistry requires', () => {
    // Co is cobalt; CO is carbon monoxide. A case-insensitive table would conflate them.
    expect(ATOMIC_WEIGHTS.Co).toBeCloseTo(58.93, 1);
    expect(parseFormula('CO').mass).toBeCloseTo(28.01, 1);
    expect(parseFormula('Co').mass).toBeCloseTo(58.93, 1);
  });
});

describe('molecular weight', () => {
  // Reference values are the standard published molecular weights for these reagents.
  it.each([
    ['H2O', 18.015],
    ['NaCl', 58.44],
    ['C6H12O6', 180.156],      // glucose
    ['NaOH', 40.00],
    ['HCl', 36.46],
    ['H2SO4', 98.08],
    ['KH2PO4', 136.09],
    ['Na2HPO4', 141.96],
    ['C4H11NO3', 121.14],      // Tris base
    ['C8H18N2O4S', 238.30],    // HEPES
  ])('%s = %s g/mol', (formula, expected) => {
    expect(parseFormula(formula).mass).toBeCloseTo(expected, 1);
  });

  it('handles nested groups', () => {
    // Ca(OH)2 = 40.078 + 2*(15.999 + 1.008)
    expect(parseFormula('Ca(OH)2').mass).toBeCloseTo(74.09, 1);
    expect(parseFormula('K3[Fe(CN)6]').mass).toBeCloseTo(329.24, 1);
  });

  it('handles hydrates written with a dot or a middle dot', () => {
    // Copper(II) sulfate pentahydrate, 249.68 g/mol.
    expect(parseFormula('CuSO4·5H2O').mass).toBeCloseTo(249.68, 1);
    expect(parseFormula('CuSO4.5H2O').mass).toBeCloseTo(249.68, 1);
    // EDTA disodium dihydrate, 372.24 — the value the molarity presets use.
    expect(parseFormula('C10H14N2Na2O8·2H2O').mass).toBeCloseTo(372.24, 1);
  });

  it('counts atoms, not just mass', () => {
    expect(parseFormula('C6H12O6').atoms).toEqual({ C: 6, H: 12, O: 6 });
    expect(parseFormula('Ca(OH)2').atoms).toEqual({ Ca: 1, O: 2, H: 2 });
  });

  it('ignores whitespace', () => {
    expect(parseFormula(' Na Cl ').mass).toBeCloseTo(parseFormula('NaCl').mass, 9);
  });

  it('reports an unknown element rather than silently ignoring it', () => {
    const r = parseFormula('XyZ2');
    expect(r.error).toMatch(/Unknown element/);
    expect(r.mass).toBe(0);
  });

  it('reports unbalanced brackets', () => {
    expect(parseFormula('Ca(OH2').error).toMatch(/Unclosed/);
    expect(parseFormula('CaOH)2').error).toMatch(/Unmatched/);
  });

  it('returns zero for an empty formula without erroring', () => {
    expect(parseFormula('')).toEqual({ atoms: {}, mass: 0 });
  });
});

describe('formatting', () => {
  it('writes formulas in Hill order: carbon, hydrogen, then alphabetical', () => {
    expect(formatFormula({ O: 6, H: 12, C: 6 })).toBe('C6H12O6');
    expect(formatFormula({ Cl: 1, Na: 1 })).toBe('ClNa');
    expect(formatFormula({ S: 1, O: 4, H: 2 })).toBe('H2O4S');
  });

  it('omits the 1 on single atoms', () => {
    expect(formatFormula({ H: 2, O: 1 })).toBe('H2O');
  });

  it('round-trips a parsed formula', () => {
    expect(formatFormula(parseFormula('C6H12O6').atoms)).toBe('C6H12O6');
  });
});

describe('mass percent', () => {
  it('sums to 100%', () => {
    const total = massPercent(parseFormula('C6H12O6').atoms).reduce((s, x) => s + x.percent, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('is ordered heaviest contribution first', () => {
    const rows = massPercent(parseFormula('C6H12O6').atoms);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].percent).toBeLessThanOrEqual(rows[i - 1].percent);
    }
  });

  it('water is about 11% hydrogen by mass', () => {
    const h = massPercent(parseFormula('H2O').atoms).find(r => r.element === 'H');
    expect(h!.percent).toBeCloseTo(11.19, 1);
  });
});
