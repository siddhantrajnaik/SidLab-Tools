import { describe, it, expect } from 'vitest';
import { AVOGADRO, MW_PER_UNIT, copiesFromMass, massFromCopies, dilutionSeries, averageBasePairMass } from './copynumber';
import { AVG_MW } from './sequence';

describe('constants', () => {
  it('uses the exact SI value of the Avogadro constant (NIST CODATA)', () => {
    expect(AVOGADRO).toBe(6.02214076e23);
  });

  it('shares its per-unit masses with the rest of the app, so the tools cannot disagree', () => {
    expect(MW_PER_UNIT.dsDNA).toBe(AVG_MW.dsDNAPerBp);
    expect(MW_PER_UNIT.ssDNA).toBe(AVG_MW.ssDNAPerNt);
    expect(MW_PER_UNIT.RNA).toBe(AVG_MW.rnaPerNt);
  });

  it('660 g/mol per bp is the sodium salt of an average base pair, within 0.3%', () => {
    // From the nucleotide residue masses in lib/tm.ts: A·T 617.4, G·C 618.4, mean 617.9 as
    // the free acid; replacing two phosphate protons with Na+ gives 661.9.
    const m = averageBasePairMass();
    expect(m.freeAcid).toBeCloseTo(617.9, 6);
    expect(m.sodiumSalt).toBeCloseTo(661.86, 2);
    expect(Math.abs(m.sodiumSalt - MW_PER_UNIT.dsDNA) / m.sodiumSalt).toBeLessThan(0.003);
  });
});

describe('copies from mass', () => {
  it('1 ng of a 5 kb plasmid is 1.825 × 10^8 copies', () => {
    // 1e-9 g × 6.02214076e23 / (5000 × 660)
    expect(copiesFromMass(1, 5000, 'dsDNA')).toBeCloseTo(182489113.9, 0);
  });

  it('scales linearly with mass and inversely with length', () => {
    expect(copiesFromMass(10, 5000, 'dsDNA')).toBeCloseTo(10 * copiesFromMass(1, 5000, 'dsDNA'), 3);
    expect(copiesFromMass(1, 2500, 'dsDNA')).toBeCloseTo(2 * copiesFromMass(1, 5000, 'dsDNA'), 3);
  });

  it('a single strand of the same length weighs half, so gives twice the copies', () => {
    expect(copiesFromMass(1, 1000, 'ssDNA')).toBeCloseTo(2 * copiesFromMass(1, 1000, 'dsDNA'), 3);
  });

  it('round-trips through mass', () => {
    const copies = 3.7e9;
    expect(copiesFromMass(massFromCopies(copies, 1200, 'RNA'), 1200, 'RNA')).toBeCloseTo(copies, 0);
  });

  it('returns 0 for a zero length rather than Infinity', () => {
    expect(copiesFromMass(1, 0, 'dsDNA')).toBe(0);
    expect(massFromCopies(1e6, 0, 'dsDNA')).toBe(0);
  });
});

describe('dilution series for qPCR standards', () => {
  it('builds a tenfold series from a stock', () => {
    // Stock 1e9 copies/µL; top standard 1e7; six points; tenfold; 100 µL each.
    const s = dilutionSeries({ stockPerUl: 1e9, topPerUl: 1e7, points: 6, fold: 10, volumeUl: 100 });
    expect(s.steps.map(x => x.perUl)).toEqual([1e7, 1e6, 1e5, 1e4, 1e3, 1e2]);
  });

  it('makes the top standard from the stock with C1V1, and each later one from the one before', () => {
    const s = dilutionSeries({ stockPerUl: 1e9, topPerUl: 1e7, points: 3, fold: 10, volumeUl: 100 });
    expect(s.steps[0].transferUl).toBeCloseTo(1, 12);        // 1 µL stock + 99 µL
    expect(s.steps[0].diluentUl).toBeCloseTo(99, 12);
    expect(s.steps[1].transferUl).toBeCloseTo(10, 12);       // 10 µL of the previous + 90
    expect(s.steps[1].diluentUl).toBeCloseTo(90, 12);
  });

  it('accounts for the volume each step gives to the next', () => {
    // Every tube but the last loses its transfer volume to the next tube.
    const s = dilutionSeries({ stockPerUl: 1e9, topPerUl: 1e7, points: 3, fold: 10, volumeUl: 100 });
    expect(s.steps[0].leftUl).toBeCloseTo(90, 12);
    expect(s.steps[2].leftUl).toBeCloseTo(100, 12);
  });

  it('refuses a top standard more concentrated than the stock', () => {
    const s = dilutionSeries({ stockPerUl: 1e6, topPerUl: 1e7, points: 3, fold: 10, volumeUl: 100 });
    expect(s.error).toMatch(/stock/i);
    expect(s.steps).toHaveLength(0);
  });

  it('refuses a fold of 1 or less, which is not a dilution', () => {
    expect(dilutionSeries({ stockPerUl: 1e9, topPerUl: 1e7, points: 3, fold: 1, volumeUl: 100 }).error).toBeTruthy();
  });

  it('flags a transfer too small to pipette accurately', () => {
    // 1e11 stock to a 1e7 top standard in 100 µL is 0.01 µL — not pipettable.
    const s = dilutionSeries({ stockPerUl: 1e11, topPerUl: 1e7, points: 3, fold: 10, volumeUl: 100 });
    expect(s.steps[0].transferUl).toBeCloseTo(0.01, 12);
    expect(s.steps[0].tooSmall).toBe(true);
    expect(s.steps[1].tooSmall).toBe(false);
  });
});
