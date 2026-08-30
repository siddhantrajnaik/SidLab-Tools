import { describe, it, expect } from 'vitest';
import {
  cleanSequence, complement, reverseComplement, translate, GENETIC_CODE,
  gcFraction, composition, pmolDsDNA, AVG_MW,
} from './sequence';

describe('cleaning', () => {
  it('strips digits, whitespace and line breaks, and upper-cases', () => {
    expect(cleanSequence('  1 atg\ncgt 61 \tAAA ')).toBe('ATGCGTAAA');
  });
  it('returns an empty string for input with no letters', () => {
    expect(cleanSequence('123 ---')).toBe('');
  });
});

describe('complement and reverse complement', () => {
  it('reverse complements a known sequence', () => {
    expect(reverseComplement('ATGGCGTAA')).toBe('TTACGCCAT');
  });
  it('complements without reversing', () => {
    expect(complement('ATGGCGTAA')).toBe('TACCGCATT');
  });
  it('is its own inverse', () => {
    const s = 'ATGCGTACGTTAGCCTAGCA';
    expect(reverseComplement(reverseComplement(s))).toBe(s);
  });
  it('handles IUPAC ambiguity codes', () => {
    // R (A/G) complements to Y (T/C), W and S are self-complementary.
    expect(complement('RYKMSWBVDHN')).toBe('YRMKSWVBHDN');
  });
  it('maps unknown characters to N rather than dropping them', () => {
    expect(complement('AZT')).toBe('TNA');
  });
});

describe('genetic code', () => {
  it('has all 64 codons', () => {
    expect(Object.keys(GENETIC_CODE)).toHaveLength(64);
  });

  it('has exactly three stop codons: TAA, TAG, TGA', () => {
    const stops = Object.entries(GENETIC_CODE).filter(([, aa]) => aa === '*').map(([c]) => c);
    expect(stops.sort()).toEqual(['TAA', 'TAG', 'TGA']);
  });

  it('has one start codon mapping to methionine', () => {
    expect(GENETIC_CODE.ATG).toBe('M');
    expect(Object.entries(GENETIC_CODE).filter(([, aa]) => aa === 'M')).toHaveLength(1);
  });

  it('encodes tryptophan only at TGG', () => {
    expect(Object.entries(GENETIC_CODE).filter(([, aa]) => aa === 'W')).toEqual([['TGG', 'W']]);
  });

  it('covers all 20 amino acids plus stop', () => {
    expect(new Set(Object.values(GENETIC_CODE)).size).toBe(21);
  });

  it('uses only A, C, G and T', () => {
    for (const codon of Object.keys(GENETIC_CODE)) expect(codon).toMatch(/^[ACGT]{3}$/);
  });
});

describe('translation', () => {
  it('translates frame 0', () => {
    expect(translate('ATGGCGTAA')).toBe('MA*');
  });
  it('translates offset frames', () => {
    expect(translate('ATGGCGTAA', 1)).toBe('WR');
    expect(translate('ATGGCGTAA', 2)).toBe('GV');
  });
  it('translates the reverse strand via reverse complement', () => {
    expect(translate(reverseComplement('ATGGCGTAA'))).toBe('LRH');
  });
  it('drops a trailing partial codon', () => {
    expect(translate('ATGGC')).toBe('M');
  });
  it('treats U as T so RNA input works', () => {
    expect(translate('AUGGCGUAA')).toBe('MA*');
  });
  it('yields X for a codon containing an ambiguity code', () => {
    expect(translate('ATGNNN')).toBe('MX');
  });
});

describe('composition', () => {
  it('counts each base and the remainder', () => {
    const c = composition('AATTGGCCN');
    expect(c).toMatchObject({ a: 2, t: 2, g: 2, c: 2, other: 1, length: 9 });
  });
  it('computes GC fraction over A/T/G/C only, ignoring Ns', () => {
    expect(gcFraction('GGCC')).toBeCloseTo(1, 9);
    expect(gcFraction('ATGC')).toBeCloseTo(0.5, 9);
    expect(gcFraction('ATGCNNNN')).toBeCloseTo(0.5, 9);
  });
  it('returns 0 GC for an empty sequence rather than NaN', () => {
    expect(gcFraction('')).toBe(0);
  });
});

describe('mass and moles', () => {
  it('uses conventional average molecular weights', () => {
    expect(AVG_MW).toEqual({ dsDNAPerBp: 660, ssDNAPerNt: 330, rnaPerNt: 340 });
  });
  it('50 ng of a 5 kb plasmid is 0.0152 pmol', () => {
    expect(pmolDsDNA(50, 5000)).toBeCloseTo(0.01515, 5);
  });
  it('returns 0 for a zero-length fragment rather than Infinity', () => {
    expect(pmolDsDNA(50, 0)).toBe(0);
  });
});
