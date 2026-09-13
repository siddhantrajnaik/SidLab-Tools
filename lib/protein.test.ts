import { describe, it, expect } from 'vitest';
import {
  RESIDUE_MASS, RESIDUE_FORMULA, WATER_MASS, HYDROPATHY,
  EXT_TRP, EXT_TYR, EXT_CYSTINE,
  cleanProtein, aaCounts, proteinMass, proteinAtoms,
  chargeAtPh, isoelectricPoint, extinctionCoefficient, gravy,
} from './protein';
import { parseFormula } from './formula';

// Reference values from Biopython (Bio.SeqUtils.ProtParam.ProteinAnalysis and
// IsoelectricPoint), which implements the same Bjellqvist, Pace and Kyte-Doolittle
// methods this module targets.
const INSULIN_A = 'GIVEQCCTSICSLYQLENYCN';
const PEPTIDE = 'MKWVTFISLLLLFSSAYSRGVFRR';
const MIXED = 'ACDEFGHIKLMNPQRSTVWY';

describe('residue masses', () => {
  it('covers all 20 standard amino acids', () => {
    expect(Object.keys(RESIDUE_FORMULA)).toHaveLength(20);
    expect(Object.keys(HYDROPATHY)).toHaveLength(20);
  });

  it('derives masses that match the published residue weights', () => {
    // Published average residue masses; derived here from atomic composition.
    const published: Record<string, number> = {
      G: 57.0519, A: 71.0788, S: 87.0782, P: 97.1167, V: 99.1326, T: 101.1051,
      C: 103.1388, L: 113.1594, I: 113.1594, N: 114.1038, D: 115.0886, Q: 128.1307,
      K: 128.1741, E: 129.1155, M: 131.1926, H: 137.1411, F: 147.1766, R: 156.1875,
      Y: 163.1760, W: 186.2132,
    };
    for (const [aa, mass] of Object.entries(published)) {
      expect(RESIDUE_MASS[aa], aa).toBeCloseTo(mass, 1);
    }
  });

  it('uses the same atomic weights as the formula calculator', () => {
    // Alanine residue is C3H5NO; the two paths must agree exactly.
    expect(RESIDUE_MASS.A).toBeCloseTo(parseFormula('C3H5NO').mass, 9);
    expect(WATER_MASS).toBeCloseTo(parseFormula('H2O').mass, 9);
  });

  it('leucine and isoleucine are isomers with identical mass', () => {
    expect(RESIDUE_MASS.L).toBeCloseTo(RESIDUE_MASS.I, 9);
  });
});

describe('sequence handling', () => {
  it('strips whitespace, digits and non-standard letters', () => {
    expect(cleanProtein(' 1 acdef\nGHI ')).toBe('ACDEFGHI');
  });

  it('drops characters that are not standard residues', () => {
    // B, J, O, U, X, Z are not among the 20.
    expect(cleanProtein('ABXJZU')).toBe('A');
  });

  it('counts every residue, including the zeroes', () => {
    const c = aaCounts('AAC');
    expect(c.A).toBe(2);
    expect(c.C).toBe(1);
    expect(c.W).toBe(0);
    expect(Object.keys(c)).toHaveLength(20);
  });
});

describe('molecular weight', () => {
  it.each([
    [INSULIN_A, 2383.696],
    [PEPTIDE, 2878.438],
    [MIXED, 2395.713],
  ])('matches Biopython for %s', (seq, expected) => {
    expect(proteinMass(seq)).toBeCloseTo(expected, 1);
  });

  it('is the sum of residues plus one water', () => {
    expect(proteinMass('A')).toBeCloseTo(RESIDUE_MASS.A + WATER_MASS, 9);
  });

  it('is zero for an empty sequence', () => {
    expect(proteinMass('')).toBe(0);
  });

  it('reports an atomic composition whose mass matches', () => {
    const atoms = proteinAtoms(MIXED);
    const fromAtoms = parseFormula(
      Object.entries(atoms).map(([el, n]) => `${el}${n}`).join('')
    ).mass;
    expect(fromAtoms).toBeCloseTo(proteinMass(MIXED), 6);
  });
});

describe('isoelectric point (Bjellqvist)', () => {
  it.each([
    [PEPTIDE, 11.72],
    [MIXED, 6.79],
  ])('matches Biopython for %s', (seq, expected) => {
    expect(isoelectricPoint(seq)).toBeCloseTo(expected, 1);
  });

  it('finds pI values below 4.05, which Biopython\'s bisection cannot reach', () => {
    // Biopython's IsoelectricPoint.pi() hard-clamps its search to [4.05, 12] and so
    // returns exactly 4.05 for the insulin A chain, which is acidic enough to sit below
    // that floor. Feeding Biopython's own charge function into an unclamped bisection
    // gives 3.795, which is what this implementation returns. The charge really is
    // negative at 4.05, so 4.05 cannot be the pI.
    expect(isoelectricPoint(INSULIN_A)).toBeCloseTo(3.795, 2);
    expect(chargeAtPh(INSULIN_A, 4.05)).toBeLessThan(0);
  });

  it('searches the full 0-14 range', () => {
    // A run of aspartates sits well below 4, and a run of arginines well above 12.
    expect(isoelectricPoint('DDDDDDDDDD')).toBeLessThan(4);
    expect(isoelectricPoint('RRRRRRRRRR')).toBeGreaterThan(12);
  });

  it('net charge is essentially zero at the pI, by definition', () => {
    for (const seq of [INSULIN_A, PEPTIDE, MIXED]) {
      expect(Math.abs(chargeAtPh(seq, isoelectricPoint(seq)))).toBeLessThan(0.01);
    }
  });

  it('charge falls monotonically as pH rises', () => {
    let previous = Infinity;
    for (let pH = 1; pH <= 13; pH++) {
      const c = chargeAtPh(MIXED, pH);
      expect(c).toBeLessThan(previous);
      previous = c;
    }
  });

  it('a poly-lysine peptide is basic, a poly-glutamate one acidic', () => {
    expect(isoelectricPoint('KKKKKKKKKK')).toBeGreaterThan(9);
    expect(isoelectricPoint('EEEEEEEEEE')).toBeLessThan(5);
  });
});

describe('extinction coefficient (Pace et al. 1995)', () => {
  it('uses the published molar absorptivities', () => {
    expect([EXT_TRP, EXT_TYR, EXT_CYSTINE]).toEqual([5500, 1490, 125]);
  });

  it.each([
    [INSULIN_A, 2980, 3230],
    [PEPTIDE, 6990, 6990],
    [MIXED, 6990, 6990],
  ])('matches Biopython for %s (reduced, oxidised)', (seq, reduced, oxidised) => {
    const e = extinctionCoefficient(seq);
    expect(e.reduced).toBe(reduced);
    expect(e.oxidised).toBe(oxidised);
  });

  it('is nTrp*5500 + nTyr*1490 when cysteines are reduced', () => {
    expect(extinctionCoefficient('WY').reduced).toBe(5500 + 1490);
  });

  it('adds 125 per cystine, which needs two cysteines', () => {
    expect(extinctionCoefficient('WCC').oxidised - extinctionCoefficient('WCC').reduced).toBe(125);
    // A single cysteine cannot form a disulfide with itself.
    expect(extinctionCoefficient('WC').cystines).toBe(0);
  });

  it('a protein with no Trp, Tyr or Cys cannot be quantified at 280 nm', () => {
    expect(extinctionCoefficient('AAAGGG').reduced).toBe(0);
  });

  it('reports A280 of a 1 mg/mL solution as ε over molecular weight', () => {
    const e = extinctionCoefficient(PEPTIDE);
    expect(e.a280Reduced).toBeCloseTo(e.reduced / proteinMass(PEPTIDE), 9);
  });
});

describe('GRAVY (Kyte & Doolittle)', () => {
  it.each([
    [INSULIN_A, 0.2143],
    [PEPTIDE, 0.6792],
    [MIXED, -0.49],
  ])('matches Biopython for %s', (seq, expected) => {
    expect(gravy(seq)).toBeCloseTo(expected, 3);
  });

  it('poly-isoleucine is the most hydrophobic, poly-arginine the least', () => {
    expect(gravy('IIII')).toBeCloseTo(4.5, 9);
    expect(gravy('RRRR')).toBeCloseTo(-4.5, 9);
  });

  it('is zero for an empty sequence rather than NaN', () => {
    expect(gravy('')).toBe(0);
  });
});
