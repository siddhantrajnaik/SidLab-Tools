import { describe, it, expect } from 'vitest';
import {
  RCF_CONSTANT, rcfFromRpm, rpmFromRcf,
  gelRecipe, gelPercentFromVolume,
  beerLambert, A260_FACTORS, nucleicConcentration,
  ligationInsertMass,
  c1v1, massFromMolarity, molarityFromMass, volumeFromMass, percentOf,
  cellsPerMl, viability,
  phStrongAcid, phStrongBase, phWeakAcid, phBuffer,
  percentTfromA, aFromPercentT,
} from './labmath';
import { AVG_MW, pmolDsDNA } from './sequence';

describe('centrifugation', () => {
  it('derives the RCF constant from (2π/60)² / (g × 100)', () => {
    expect(RCF_CONSTANT).toBeCloseTo(Math.pow((2 * Math.PI) / 60, 2) / (9.80665 * 100), 8);
  });

  it('converts a standard microfuge run: 13,000 rpm at 8.5 cm ≈ 16,060 × g', () => {
    expect(rcfFromRpm(13000, 8.5)).toBeCloseTo(16060, 0);
  });

  it('round-trips rpm → rcf → rpm', () => {
    expect(rpmFromRcf(rcfFromRpm(13000, 8.5), 8.5)).toBeCloseTo(13000, 6);
  });

  it('drops required rpm by √2 when the radius doubles', () => {
    expect(rpmFromRcf(rcfFromRpm(10000, 8), 16)).toBeCloseTo(10000 / Math.SQRT2, 6);
  });

  it('returns 0 rpm rather than Infinity for a zero radius', () => {
    expect(rpmFromRcf(3000, 0)).toBe(0);
  });
});

describe('SDS-PAGE gels (Bio-Rad Bulletin 6201, Table 2)', () => {
  // Reference column: 15 mL of 7.5% resolving gel from 30% stock.
  const res = gelRecipe(15, 7.5, 30, false);

  it('acrylamide 3.75 mL', () => expect(res.acrylamide).toBeCloseTo(3.75, 6));
  it('1.5 M Tris 3.75 mL (one quarter)', () => expect(res.buffer).toBeCloseTo(3.75, 6));
  it('10% SDS 150 µL (1/100)', () => expect(res.sds * 1000).toBeCloseTo(150, 6));
  it('10% APS 75 µL (1/200, not 1/100)', () => expect(res.aps * 1000).toBeCloseTo(75, 6));
  it('resolving TEMED 7.5 µL (1/2000, not 1/1000)', () => expect(res.temed * 1000).toBeCloseTo(7.5, 6));
  it('water fills the remainder, ≈7.28 mL', () => expect(res.water).toBeCloseTo(7.28, 1));

  it('12% column: 6.0 mL acrylamide, ≈5.03 mL water', () => {
    const g = gelRecipe(15, 12, 30, false);
    expect(g.acrylamide).toBeCloseTo(6.0, 6);
    expect(g.water).toBeCloseTo(5.03, 1);
  });

  it('stacking gel takes twice the TEMED: 15 µL per 15 mL', () => {
    expect(gelRecipe(15, 4, 30, true).temed * 1000).toBeCloseTo(15, 6);
  });

  it('components always sum to the requested total', () => {
    const g = gelRecipe(10, 10, 30, false);
    expect(g.water + g.buffer + g.acrylamide + g.sds + g.aps + g.temed).toBeCloseTo(10, 6);
  });

  it('clamps water at zero when the target percentage leaves no room', () => {
    expect(gelRecipe(10, 29, 30, false).water).toBe(0);
  });

  it('reverses: 3.333 mL of 30% stock in 10 mL is a 10% gel', () => {
    expect(gelPercentFromVolume(10 / 3, 10, 30)).toBeCloseTo(10, 6);
  });
});

describe('spectrophotometry', () => {
  it('Beer-Lambert: A 0.5, ε 43824, l 1 → 11.41 µM', () => {
    expect(beerLambert(0.5, 43824, 1) * 1e6).toBeCloseTo(11.41, 2);
  });

  it('converts molar to mg/mL through MW (25 kDa)', () => {
    expect(beerLambert(0.5, 43824, 1) * 25000).toBeCloseTo(0.2852, 4);
  });

  it('uses the conventional A260 factors', () => {
    expect(A260_FACTORS).toEqual({ dsDNA: 50, ssDNA: 33, RNA: 40 });
  });

  it('A260 of 1.0 gives 50 / 33 / 40 ng/µL', () => {
    expect(nucleicConcentration(1, 'dsDNA')).toBeCloseTo(50, 6);
    expect(nucleicConcentration(1, 'ssDNA')).toBeCloseTo(33, 6);
    expect(nucleicConcentration(1, 'RNA')).toBeCloseTo(40, 6);
  });

  it('applies dilution factor and path length', () => {
    expect(nucleicConcentration(0.85, 'dsDNA', 10)).toBeCloseTo(425, 6);
    expect(nucleicConcentration(0.5, 'dsDNA', 1, 0.1)).toBeCloseTo(250, 6);
  });

  it('converts absorbance to %T and back', () => {
    expect(percentTfromA(1)).toBeCloseTo(10, 6);
    expect(aFromPercentT(50)).toBeCloseTo(0.301, 3);
    expect(aFromPercentT(percentTfromA(0.75))).toBeCloseTo(0.75, 6);
  });
});

describe('ligation', () => {
  it('50 ng of 5 kb vector + 1 kb insert at 3:1 needs 30 ng', () => {
    expect(ligationInsertMass(50, 1000, 5000, 3)).toBeCloseTo(30, 6);
  });

  it('equal lengths at 3:1 is three times the vector mass', () => {
    expect(ligationInsertMass(50, 5000, 5000, 3)).toBeCloseTo(150, 6);
  });

  it('the masses it returns really are the requested molar ratio', () => {
    const vectorNg = 50, vectorBp = 5000, insertBp = 1000, ratio = 3;
    const insertNg = ligationInsertMass(vectorNg, insertBp, vectorBp, ratio);
    expect(pmolDsDNA(insertNg, insertBp) / pmolDsDNA(vectorNg, vectorBp)).toBeCloseTo(ratio, 9);
  });

  it('uses 660 Da/bp for dsDNA pmol', () => {
    expect(AVG_MW.dsDNAPerBp).toBe(660);
    expect(pmolDsDNA(50, 5000)).toBeCloseTo(0.01515, 5);
  });
});

describe('solutions', () => {
  it('C1V1: 10 mL of 5 mM from a 100 mM stock needs 0.5 mL', () => {
    // Base units: mol/L and L.
    expect(c1v1.v1(100e-3, 5e-3, 10e-3) / 1e-3).toBeCloseTo(0.5, 9);
  });

  it('C1V1 solves every term consistently', () => {
    const [c1, v1, c2, v2] = [0.1, 0.005, 0.05, 0.01];
    expect(c1v1.v1(c1, c2, v2)).toBeCloseTo(v1, 9);
    expect(c1v1.c1(v1, c2, v2)).toBeCloseTo(c1, 9);
    expect(c1v1.v2(c1, v1, c2)).toBeCloseTo(v2, 9);
    expect(c1v1.c2(c1, v1, v2)).toBeCloseTo(c2, 9);
  });

  it('molarity: 1 L of 1 M NaCl is 58.44 g, and back again', () => {
    expect(massFromMolarity(1, 1, 58.44)).toBeCloseTo(58.44, 9);
    expect(molarityFromMass(58.44, 1, 58.44)).toBeCloseTo(1, 9);
    expect(volumeFromMass(58.44, 1, 58.44)).toBeCloseTo(1, 9);
  });

  it('percent: 5 g in 100 mL is 5% w/v', () => {
    expect(percentOf(5, 100)).toBeCloseTo(5, 9);
    expect(percentOf(10, 200)).toBeCloseTo(5, 9);
  });
});

describe('cell counting', () => {
  it('100 cells over 4 squares at 1:1 trypan is 5×10⁵ cells/mL', () => {
    expect(cellsPerMl(100, 4, 2)).toBeCloseTo(5e5, 6);
  });

  it('viability is live over total', () => {
    expect(viability(90, 10)).toBeCloseTo(90, 9);
    expect(viability(0, 0)).toBe(0);
  });
});

describe('pH', () => {
  it('0.01 M strong acid is pH 2.00', () => expect(phStrongAcid(0.01)).toBeCloseTo(2, 9));
  it('0.01 M strong base is pH 12.00', () => expect(phStrongBase(0.01)).toBeCloseTo(12, 9));
  it('0.1 M acetic acid (pKa 4.76) is pH 2.88', () => {
    expect(phWeakAcid(0.1, 4.76)).toBeCloseTo(2.88, 2);
  });
  it('Henderson-Hasselbalch: equimolar buffer sits at the pKa', () => {
    expect(phBuffer(7.21, 1, 1)).toBeCloseTo(7.21, 9);
  });
  it('a 2:1 base:acid ratio adds log10(2) ≈ 0.30', () => {
    expect(phBuffer(4.76, 2, 1)).toBeCloseTo(5.06, 2);
  });
});
