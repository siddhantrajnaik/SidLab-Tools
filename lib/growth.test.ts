import { describe, it, expect } from 'vitest';
import {
  growthRate, doublingTime, generations, hoursToReach, backDilution, cellsFromOD,
  OD600_ECOLI_CELLS_PER_ML,
} from './growth';

describe('growth rate and doubling time', () => {
  it('a culture that doubles in 30 minutes has a 30 minute doubling time', () => {
    expect(doublingTime(0.1, 0.2, 0.5)).toBeCloseTo(0.5, 12);
  });

  it('three doublings in 1.5 h is a 30 minute doubling time, and three generations', () => {
    expect(doublingTime(0.05, 0.4, 1.5)).toBeCloseTo(0.5, 12);
    expect(generations(0.05, 0.4)).toBeCloseTo(3, 12);
  });

  it('specific growth rate and doubling time are reciprocal through ln 2', () => {
    const mu = growthRate(0.1, 0.35, 1.2);
    expect(mu * doublingTime(0.1, 0.35, 1.2)).toBeCloseTo(Math.LN2, 12);
  });

  it('returns 0 instead of NaN or Infinity when nothing grew, time did not pass, or an OD is missing', () => {
    for (const [a, b, t] of [[0.2, 0.2, 1], [0.2, 0.1, 1], [0.1, 0.2, 0], [0, 0.2, 1], [0.1, 0, 1], [0.1, 0.2, -1]]) {
      expect(Number.isFinite(growthRate(a, b, t))).toBe(true);
      expect(Number.isFinite(doublingTime(a, b, t))).toBe(true);
    }
    expect(doublingTime(0.2, 0.1, 1)).toBe(0);
  });
});

describe('time to a target OD', () => {
  it('from 0.15 to 0.6 is two doublings', () => {
    expect(hoursToReach(0.15, 0.6, 0.5)).toBeCloseTo(1, 12);
  });

  it('is zero if you are already there', () => {
    expect(hoursToReach(0.8, 0.6, 0.5)).toBe(0);
  });

  it('does not divide by a zero doubling time', () => {
    expect(hoursToReach(0.1, 0.6, 0)).toBe(0);
  });
});

describe('back-dilution', () => {
  it('a 1:100 dilution needs log2(100) ≈ 6.64 doublings to recover', () => {
    // Overnight at OD 4, diluted so it is back to OD 4 after 6.64 doublings.
    const r = backDilution(4, 4, 6.643856189774724, 1);
    expect(r.dilutionFactor).toBeCloseTo(100, 6);
  });

  it('plans a culture to be ready at a time', () => {
    // OD 3 overnight; want OD 0.6 in 3 h at a 30 min doubling time: 6 doublings (64×).
    const r = backDilution(3, 0.6, 3, 0.5);
    expect(r.startOD).toBeCloseTo(0.6 / 64, 12);
    expect(r.dilutionFactor).toBeCloseTo(3 / (0.6 / 64), 9);
  });

  it('says so when the culture cannot get there in time without concentrating it', () => {
    const r = backDilution(0.2, 0.6, 0.5, 0.5);
    expect(r.dilutionFactor).toBeLessThan(1);
    expect(r.feasible).toBe(false);
  });
});

describe('OD600 to cell number', () => {
  it('uses Agilent’s factor for E. coli: OD 1.0 = 8 × 10^8 cells/mL', () => {
    expect(OD600_ECOLI_CELLS_PER_ML).toBe(8e8);
    expect(cellsFromOD(0.5, OD600_ECOLI_CELLS_PER_ML)).toBeCloseTo(4e8, 0);
  });

  it('corrects for the dilution the reading was taken at', () => {
    expect(cellsFromOD(0.3, 8e8, 10)).toBeCloseTo(2.4e9, 0);
  });
});
