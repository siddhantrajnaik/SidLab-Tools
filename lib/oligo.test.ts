import { describe, it, expect } from 'vitest';
import {
  NN_EXTINCTION, MONO_EXTINCTION, extinction260, nmolFromOD, odFromNmol, microgramsFromNmol,
  nmolFromMicrograms, resuspensionVolumeUl, concentrationFromA260,
} from './oligo';
import { oligoMolecularWeight } from './tm';

describe('nearest-neighbour extinction coefficient at 260 nm', () => {
  it('covers all sixteen dinucleotides and four bases', () => {
    expect(Object.keys(NN_EXTINCTION)).toHaveLength(16);
    expect(Object.keys(MONO_EXTINCTION)).toHaveLength(4);
  });

  // Two manufacturers' worked examples, computed independently of each other.
  it('matches ATDBio’s example: dAGCGT is 50,200 M⁻¹cm⁻¹', () => {
    expect(extinction260('AGCGT')).toBeCloseTo(50200, 6);
  });

  it('matches TriLink’s example: AGCTAAGTCACTGCCATTGA is 195.5 OD/µmol', () => {
    expect(extinction260('AGCTAAGTCACTGCCATTGA')).toBeCloseTo(195500, 6);
  });

  it('uses the base value for a single nucleotide', () => {
    expect(extinction260('A')).toBeCloseTo(15400, 9);
    expect(extinction260('T')).toBeCloseTo(8700, 9);
  });

  it('is not symmetric under reversal, because the table is not', () => {
    // ApG (12.5) and GpA (12.6) differ, so a sequence and its reverse need not agree —
    // a reminder to read the sequence 5' to 3'.
    expect(NN_EXTINCTION.AG).not.toBe(NN_EXTINCTION.GA);
    expect(extinction260('AGCGT')).not.toBeCloseTo(extinction260('TGCGA'), 0);
  });

  it('ignores case, spaces and line breaks', () => {
    expect(extinction260('agc gt\n')).toBeCloseTo(extinction260('AGCGT'), 9);
  });

  it('is zero for an empty or non-DNA sequence rather than NaN', () => {
    expect(extinction260('')).toBe(0);
    expect(extinction260('XYZ')).toBe(0);
  });
});

describe('quantity conversions', () => {
  const seq = 'AGCTAAGTCACTGCCATTGA';
  const eps = 195500;

  it('molecular weight matches TriLink’s 6101.0 g/mol for the same oligo', () => {
    expect(oligoMolecularWeight(seq)).toBeCloseTo(6101.0, 0);
  });

  it('reproduces TriLink’s 32.4 OD → µmol → µg example', () => {
    const nmol = nmolFromOD(32.4, eps);
    expect(nmol / 1000).toBeCloseTo(0.166, 3);
    // TriLink rounds to 0.166 µmol before multiplying and prints 1012.8 µg; carrying the
    // unrounded 0.16573 µmol through gives 1011.1.
    expect(microgramsFromNmol(nmol, oligoMolecularWeight(seq))).toBeCloseTo(1011.1, 0);
  });

  it('round-trips nmol → OD → nmol and nmol → µg → nmol exactly', () => {
    const mw = oligoMolecularWeight(seq);
    expect(nmolFromOD(odFromNmol(25, eps), eps)).toBeCloseTo(25, 12);
    expect(nmolFromMicrograms(microgramsFromNmol(25, mw), mw)).toBeCloseTo(25, 12);
  });

  it('1 OD of this oligo is 1/195.5 µmol', () => {
    expect(nmolFromOD(1, eps)).toBeCloseTo(1e6 / 195500, 9);
  });
});

describe('resuspension', () => {
  it('25 nmol to 100 µM needs 250 µL', () => {
    expect(resuspensionVolumeUl(25, 100)).toBeCloseTo(250, 12);
  });

  it('halving the target concentration doubles the volume', () => {
    expect(resuspensionVolumeUl(25, 50)).toBeCloseTo(2 * resuspensionVolumeUl(25, 100), 12);
  });

  it('returns 0 for a zero target rather than Infinity', () => {
    expect(resuspensionVolumeUl(25, 0)).toBe(0);
  });
});

describe('concentration from a measured A260', () => {
  const eps = 195500;
  it('applies Beer-Lambert with the dilution factor', () => {
    // A260 of 0.391 on a 1:100 dilution of the 195,500 oligo, 1 cm path: 200 µM stock.
    expect(concentrationFromA260(0.391, eps, 100, 1)).toBeCloseTo(200, 6);
  });

  it('the same A260 over a 0.1 cm path means ten times the concentration', () => {
    expect(concentrationFromA260(0.391, eps, 1, 0.1)).toBeCloseTo(10 * concentrationFromA260(0.391, eps, 1, 1), 9);
  });

  it('returns 0 for a zero extinction coefficient or path', () => {
    expect(concentrationFromA260(0.5, 0, 1, 1)).toBe(0);
    expect(concentrationFromA260(0.5, eps, 1, 0)).toBe(0);
  });
});
