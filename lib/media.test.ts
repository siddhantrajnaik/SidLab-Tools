import { describe, it, expect } from 'vitest';
import { ANTIBIOTICS, SELECTION_AGENTS, antibioticById, stockVolumeUl, powderMg, stockForPlates } from './media';

const ab = (id: string) => {
  const a = antibioticById(id);
  if (!a) throw new Error(`no antibiotic ${id}`);
  return a;
};

describe('bacterial antibiotics (Addgene; Gold Biotechnology)', () => {
  // Addgene, "Pouring LB Agar Plates"; Gold Biotechnology, "How to Make Stock Solutions
  // for Antibiotics and Cell Selection Agents". The two agree on every value below.
  it.each([
    ['ampicillin', 100, 100],
    ['carbenicillin', 100, 100],
    ['kanamycin', 50, 50],
    ['chloramphenicol', 25, 25],
    ['spectinomycin', 50, 50],
    ['gentamicin', 10, 10],
    ['tetracycline', 10, 10],
    ['bleomycin', 5, 5],
  ])('%s: %s mg/mL stock, %s µg/mL working', (id, stock, working) => {
    expect(ab(id).stockMgPerMl).toBe(stock);
    expect(ab(id).workingUgPerMl).toBe(working);
  });

  it('every stock is 1000× its working concentration, the convention both sources use', () => {
    // A transcription check: a mistyped stock or working value breaks the ratio.
    for (const a of ANTIBIOTICS) {
      expect((a.stockMgPerMl * 1000) / a.workingUgPerMl, a.id).toBe(1000);
    }
  });

  it('dissolves chloramphenicol in ethanol, as both sources say', () => {
    expect(ab('chloramphenicol').solvent).toMatch(/ethanol/i);
  });

  it('records the sources’ disagreement over tetracycline rather than choosing one', () => {
    // Addgene lists water; Gold Biotechnology says 100% ethanol.
    expect(ab('tetracycline').solventNote).toMatch(/Addgene/);
    expect(ab('tetracycline').solventNote).toMatch(/Gold/);
  });

  it('cites a source for every entry', () => {
    for (const a of ANTIBIOTICS) expect(a.sources.length, a.id).toBeGreaterThan(0);
  });
});

describe('mammalian selection agents', () => {
  it('names the cell line each range was established in, because the range does not transfer', () => {
    for (const s of SELECTION_AGENTS) {
      expect(s.cellLine, s.id).toBeTruthy();
      expect(s.workingUgPerMl[1], s.id).toBeGreaterThanOrEqual(s.workingUgPerMl[0]);
    }
  });

  it.each([
    ['puromycin', 1, 2, '293T'],
    ['blasticidin', 5, 15, '293T'],
    ['hygromycin', 100, 200, '293T'],
    ['g418', 500, 1000, 'HT1080'],
  ])('%s: %s-%s µg/mL in %s (Gold Biotechnology)', (id, low, high, line) => {
    const s = SELECTION_AGENTS.find(x => x.id === id)!;
    expect(s.workingUgPerMl).toEqual([low, high]);
    expect(s.cellLine).toBe(line);
  });
});

describe('volumes and masses', () => {
  it('a 1000× stock is 1 µL per mL of culture', () => {
    expect(stockVolumeUl(100, 100, 1)).toBeCloseTo(1, 12);
    expect(stockVolumeUl(100, 100, 500)).toBeCloseTo(500, 12);
  });

  it('a weaker stock needs proportionally more', () => {
    expect(stockVolumeUl(50, 10, 100)).toBeCloseTo(500, 12);
  });

  it('weighs out the powder for a stock: 100 mg/mL × 10 mL is 1 g', () => {
    expect(powderMg(100, 10)).toBeCloseTo(1000, 12);
  });

  it('covers a batch of plates', () => {
    // 20 plates × 25 mL of ampicillin agar from a 100 mg/mL stock: 500 mL, so 500 µL.
    const r = stockForPlates(20, 25, 100, 100);
    expect(r.agarMl).toBeCloseTo(500, 12);
    expect(r.stockUl).toBeCloseTo(500, 12);
  });

  it('returns 0 rather than Infinity for a zero stock', () => {
    expect(stockVolumeUl(100, 0, 500)).toBe(0);
  });
});
