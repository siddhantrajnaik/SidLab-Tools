import { describe, it, expect } from 'vitest';
import {
  NN_PARAMS, NN_INIT_GC, NN_INIT_AT, thermodynamics, effectiveMonovalent,
  calculatePrimerProps, annealingTemp, DEFAULT_SALT,
} from './tm';
import { reverseComplement } from './sequence';

describe('SantaLucia 1998 nearest-neighbour parameters', () => {
  it('covers all 16 dinucleotides', () => {
    expect(Object.keys(NN_PARAMS)).toHaveLength(16);
  });

  it('is symmetric: every dinucleotide equals its reverse complement', () => {
    for (const [pair, v] of Object.entries(NN_PARAMS)) {
      const rc = reverseComplement(pair);
      expect(NN_PARAMS[rc], `${pair} vs ${rc}`).toBeDefined();
      expect(NN_PARAMS[rc].dH, `dH ${pair} vs ${rc}`).toBeCloseTo(v.dH, 9);
      expect(NN_PARAMS[rc].dS, `dS ${pair} vs ${rc}`).toBeCloseTo(v.dS, 9);
    }
  });

  it('uses the published initiation terms', () => {
    expect(NN_INIT_GC).toEqual({ dH: 0.1, dS: -2.8 });
    expect(NN_INIT_AT).toEqual({ dH: 2.3, dS: 4.1 });
  });

  it("reproduces SantaLucia's worked example CGTTGA: ΔH −43.6, ΔS −116.7 (stacking only)", () => {
    // thermodynamics() adds initiation, so subtract the two terminal terms back out:
    // 5' C is a G·C end, 3' A is an A·T end.
    const { dH, dS } = thermodynamics('CGTTGA');
    expect(dH - NN_INIT_GC.dH - NN_INIT_AT.dH).toBeCloseTo(-43.6, 6);
    expect(dS - NN_INIT_GC.dS - NN_INIT_AT.dS).toBeCloseTo(-116.7, 6);
  });
});

describe('salt correction', () => {
  it('converts Mg2+ the way Primer3 does: 3.795·√M == 120·√mM', () => {
    const viaM = effectiveMonovalent({ monovalentMM: 0, mgMM: 1.5, dNTPsMM: 0 }) * 1000;
    expect(viaM).toBeCloseTo(120 * Math.sqrt(1.5), 1);
  });

  it('subtracts chelated Mg2+: only free Mg2+ counts', () => {
    const free = effectiveMonovalent({ monovalentMM: 0, mgMM: 1.5, dNTPsMM: 0.8 }) * 1000;
    expect(free).toBeCloseTo(120 * Math.sqrt(0.7), 1);
  });

  it('never goes negative when dNTPs exceed Mg2+', () => {
    expect(effectiveMonovalent({ monovalentMM: 50, mgMM: 0.5, dNTPsMM: 2 })).toBeCloseTo(0.05, 9);
  });

  it('a standard PCR buffer is ~150 mM monovalent equivalent', () => {
    expect(effectiveMonovalent(DEFAULT_SALT) * 1000).toBeCloseTo(150, 0);
  });
});

describe('nearest-neighbour Tm', () => {
  // Reference values cross-checked against Biopython Tm_NN(saltcorr=5, nn_table=DNA_NN3)
  // at dnac1 = dnac2 = 500 nM.
  const cases: [string, number, number][] = [
    // sequence,               Na-only (50 mM),  with 1.5 mM Mg2+ and 0.8 mM dNTPs
    ['ATGCGTACGTTAGCCTAGCA', 57.6, 63.1],
    ['GCGGTCAGCTTGACCTGAAC', 59.9, 65.3],
    ['AAATTTCACAGGATCATTGA', 48.9, 54.4],
  ];

  it.each(cases)('%s matches Biopython without Mg2+', (seq, naOnly) => {
    const r = calculatePrimerProps(seq, 500, { monovalentMM: 50, mgMM: 0, dNTPsMM: 0 });
    expect(r.tmNN).toBeCloseTo(naOnly, 1);
  });

  it.each(cases)('%s matches Biopython with PCR Mg2+', (seq, _naOnly, withMg) => {
    expect(calculatePrimerProps(seq, 500).tmNN).toBeCloseTo(withMg, 1);
  });

  it('Mg2+ raises Tm by several degrees — omitting it reads low', () => {
    const seq = 'GCGGTCAGCTTGACCTGAAC';
    const noMg = calculatePrimerProps(seq, 500, { monovalentMM: 50, mgMM: 0, dNTPsMM: 0 }).tmNN;
    expect(calculatePrimerProps(seq, 500).tmNN - noMg).toBeGreaterThan(4);
  });

  it('rejects a zero primer concentration instead of returning −295 °C', () => {
    const r = calculatePrimerProps('ATGCGTACGTTAGCCTAGCA', 0);
    expect(r.isValid).toBe(false);
    expect(r.tmNN).toBe(0);
  });

  it('rejects non-ATGC sequences', () => {
    expect(calculatePrimerProps('ATGCNNNN', 500).isValid).toBe(false);
  });

  it('always returns a finite Tm for valid input', () => {
    expect(Number.isFinite(calculatePrimerProps('ATGC', 500).tmNN)).toBe(true);
  });
});

describe('primer properties', () => {
  it('computes GC%', () => {
    expect(calculatePrimerProps('GGCCAATT', 500).gc).toBeCloseTo(50, 9);
  });

  it('oligo MW of ATGC is 1173.84 Da', () => {
    expect(calculatePrimerProps('ATGC', 500).molecularWeight).toBeCloseTo(1173.84, 2);
  });

  it('uses the Wallace rule below 14 nt', () => {
    // ATGCATGCATGC: 6 A/T × 2 + 6 G/C × 4 = 36
    expect(calculatePrimerProps('ATGCATGCATGC', 500).tmBasic).toBeCloseTo(36, 9);
  });
});

describe('annealing temperature', () => {
  const p = (tm: number, length: number) => ({ tmNN: tm, length });

  it('Q5 is Tm + 3 on the lower-Tm primer (NEB M0491)', () => {
    expect(annealingTemp('q5', p(63.1, 20), p(65.3, 20))).toBe(66);
  });

  it('Q5 is capped at 72 °C', () => {
    expect(annealingTemp('q5', p(71, 20), p(75, 20))).toBe(72);
  });

  it('Phusion adds 3 °C only for primers longer than 20 nt', () => {
    expect(annealingTemp('phusion', p(63.1, 20), p(65.3, 20))).toBe(63);
    expect(annealingTemp('phusion', p(63.1, 24), p(65.3, 24))).toBe(66);
  });

  it('Taq is Tm − 5', () => {
    expect(annealingTemp('taq', p(63.1, 20), p(65.3, 20))).toBe(58);
  });

  it('always keys off the lower-Tm primer, whichever side it is on', () => {
    expect(annealingTemp('q5', p(70, 20), p(60, 20))).toBe(annealingTemp('q5', p(60, 20), p(70, 20)));
  });
});
