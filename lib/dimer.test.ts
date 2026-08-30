import { describe, it, expect } from 'vitest';
import {
  dG37, selfDimer, crossDimer, hairpin, worstDuplex, severityOf, structurePenalty,
  DG_LIMIT_INTERNAL, DG_LIMIT_THREE_PRIME, MIN_LOOP,
} from './dimer';
import { NN_PARAMS } from './tm';

describe('free energy', () => {
  it('ΔG°37 = ΔH − T·ΔS at 310.15 K', () => {
    expect(dG37(-7.9, -22.2)).toBeCloseTo(-7.9 - (310.15 * -22.2) / 1000, 9);
  });

  // SantaLucia 1998 publishes ΔH, ΔS and ΔG°37 together, but tabulates ΔH and ΔS
  // rounded to one decimal. Recomputing ΔG from those rounded values therefore cannot
  // land exactly on the published ΔG — AA/TT needs ΔS = −22.25 to give −1.00, and the
  // table says −22.2. The residual is under 0.02 kcal/mol across the table, which is
  // still tight enough to catch a wrong temperature or a sign error.
  it.each([
    ['AA', -1.00],
    ['CG', -2.17],
    ['GC', -2.24],
    ['GG', -1.84],
  ])('recomputes the published ΔG°37 for %s to within table rounding', (pair, published) => {
    const { dH, dS } = NN_PARAMS[pair];
    expect(dG37(dH, dS)).toBeCloseTo(published, 1);
    expect(Math.abs(dG37(dH, dS) - published)).toBeLessThan(0.02);
  });

  it('uses 37 °C, not 25 °C — the wrong temperature would show up here', () => {
    // At 298.15 K the AA stack would come out near −1.28 instead of −1.01.
    expect(dG37(-7.9, -22.2)).toBeGreaterThan(-1.1);
  });
});

describe('self-dimer', () => {
  it('finds a strong dimer in a self-complementary oligo', () => {
    // A palindrome pairs with itself along its whole length.
    const s = selfDimer('GGGGCCCC');
    expect(s.pairs).toBeGreaterThanOrEqual(8);
    expect(s.dG).toBeLessThan(DG_LIMIT_INTERNAL);
    expect(s.severity).toBe('bad');
  });

  it('leaves a well-behaved primer alone', () => {
    const s = selfDimer('ATGCGTACGTTAGCCTAGCA');
    expect(s.dG).toBeGreaterThan(DG_LIMIT_INTERNAL);
    expect(s.severity).toBe('ok');
  });

  it('flags a 3′-end dimer, which polymerase can extend', () => {
    // The last bases are self-complementary, so the 3' terminus pairs.
    const s = selfDimer('ATATATATATGCGCGCGC');
    expect(s.involves3Prime).toBe(true);
  });

  it('reports nothing for a sequence that cannot pair with itself', () => {
    expect(selfDimer('AAAAAAAA').pairs).toBe(0);
    expect(selfDimer('AAAAAAAA').dG).toBe(0);
  });

  it('is symmetric: a self-dimer is a duplex of the sequence with itself', () => {
    const seq = 'GGGGCCCC';
    expect(selfDimer(seq).dG).toBeCloseTo(worstDuplex(seq, seq).dG, 9);
  });

  it('produces a three-line diagram when a structure is found', () => {
    const d = selfDimer('GGGGCCCC').diagram;
    expect(d).toHaveLength(3);
    expect(d[0]).toContain("5'-");
    expect(d[2]).toContain("3'-");
    expect(d[1]).toContain('|');
  });
});

describe('cross-dimer', () => {
  it('finds pairing between two complementary primers', () => {
    const s = crossDimer('GGGGCCCCAA', 'GGGGCCCCTT');
    expect(s.pairs).toBeGreaterThanOrEqual(4);
    expect(s.dG).toBeLessThan(0);
  });

  it('finds nothing between two poly-A oligos', () => {
    expect(crossDimer('AAAAAAAA', 'AAAAAAAA').pairs).toBe(0);
  });

  it('rejects sequences containing non-ATGC characters', () => {
    expect(crossDimer('ATGCNNNN', 'ATGCGGGG').pairs).toBe(0);
  });
});

describe('hairpin', () => {
  it('finds a stem-loop with a complementary stem and a spacer', () => {
    // GCGCGC ... GCGCGC as an inverted repeat around a 4 nt loop.
    const h = hairpin('GGGGCCTTTTGGCCCC');
    expect(h.pairs).toBeGreaterThanOrEqual(4);
    expect(h.dG).toBeLessThan(0);
  });

  it('will not close a loop shorter than the physical minimum', () => {
    // Stem candidates exist but every loop would be under MIN_LOOP.
    expect(MIN_LOOP).toBe(3);
    expect(hairpin('GCGC').pairs).toBe(0);
  });

  it('leaves an unstructured oligo alone', () => {
    expect(hairpin('ATATATATATATATAT').severity).toBe('ok');
  });

  it('returns nothing for a sequence too short to fold', () => {
    expect(hairpin('ATG').pairs).toBe(0);
  });
});

describe('thresholds', () => {
  it('uses IDT’s published limits', () => {
    expect(DG_LIMIT_INTERNAL).toBe(-9);
    expect(DG_LIMIT_THREE_PRIME).toBe(-5);
  });

  it('holds 3′ structures to the stricter limit', () => {
    // −7 is fine internally but not at the 3' end.
    expect(severityOf(-7, false)).toBe('ok');
    expect(severityOf(-7, true)).not.toBe('ok');
  });

  it('escalates from warn to bad as ΔG gets more negative', () => {
    expect(severityOf(-10, false)).toBe('warn');
    expect(severityOf(-20, false)).toBe('bad');
  });

  it('costs nothing to score a clean structure', () => {
    expect(structurePenalty({ dG: 0, pairs: 0, involves3Prime: false, diagram: [], severity: 'ok' })).toBe(0);
  });

  it('penalises 3′ structures harder than internal ones of the same excess', () => {
    const internal = structurePenalty({ dG: -11, pairs: 6, involves3Prime: false, diagram: [], severity: 'warn' });
    const threeP = structurePenalty({ dG: -7, pairs: 6, involves3Prime: true, diagram: [], severity: 'warn' });
    // Both sit 2 kcal/mol past their own limit, but the 3' one costs more.
    expect(threeP).toBeGreaterThan(internal);
  });
});
