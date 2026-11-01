import { describe, it, expect } from 'vitest';
import { SEPARATION_TABLES, DYE_MIGRATION, recommendPercent, agaroseGrams, bufferStockMl, dyeSizes } from './agarose';

describe('separation-range tables', () => {
  it('keeps each published table separate, with its citation', () => {
    expect(SEPARATION_TABLES.map(t => t.id).sort()).toEqual(['ausubel1995', 'sambrook2012']);
    for (const t of SEPARATION_TABLES) expect(t.citation.length, t.id).toBeGreaterThan(10);
  });

  it('carries Green & Sambrook 2012 (Molecular Cloning, 4th ed.) as Thermo Fisher reproduces it', () => {
    const t = SEPARATION_TABLES.find(x => x.id === 'sambrook2012')!;
    const get = (p: number) => t.rows.find(r => r.percent === p)!;
    expect([get(0.5).minBp, get(0.5).maxBp]).toEqual([2000, 50000]);
    expect([get(1.0).minBp, get(1.0).maxBp]).toEqual([400, 8000]);
    expect([get(1.5).minBp, get(1.5).maxBp]).toEqual([200, 3000]);
    expect([get(2.0).minBp, get(2.0).maxBp]).toEqual([100, 2000]);
    expect([get(5.0).minBp, get(5.0).maxBp]).toEqual([10, 300]);
  });

  it('carries Ausubel et al. 1995 (Current Protocols) as Thermo Fisher reproduces it', () => {
    const t = SEPARATION_TABLES.find(x => x.id === 'ausubel1995')!;
    const get = (p: number) => t.rows.find(r => r.percent === p)!;
    expect([get(0.5).minBp, get(0.5).maxBp]).toEqual([1000, 30000]);
    expect([get(1.0).minBp, get(1.0).maxBp]).toEqual([500, 10000]);
    expect([get(1.5).minBp, get(1.5).maxBp]).toEqual([200, 3000]);
  });

  it('records that the two sources disagree, rather than averaging them', () => {
    const s = SEPARATION_TABLES.find(x => x.id === 'sambrook2012')!.rows.find(r => r.percent === 0.5)!;
    const a = SEPARATION_TABLES.find(x => x.id === 'ausubel1995')!.rows.find(r => r.percent === 0.5)!;
    expect(s.maxBp).not.toBe(a.maxBp);
  });

  it('shifts to smaller fragments as the gel gets more concentrated, in every table', () => {
    for (const t of SEPARATION_TABLES) {
      for (let i = 1; i < t.rows.length; i++) {
        expect(t.rows[i].percent, t.id).toBeGreaterThan(t.rows[i - 1].percent);
        expect(t.rows[i].minBp, t.id).toBeLessThanOrEqual(t.rows[i - 1].minBp);
        expect(t.rows[i].maxBp, t.id).toBeLessThanOrEqual(t.rows[i - 1].maxBp);
      }
    }
  });
});

describe('recommendations', () => {
  it('finds the gels whose range contains the fragment, best-centred first', () => {
    // 1 kb sits most centrally on a log scale in Sambrook's 1.5% range, 200-3000:
    // log10 1000 = 3.000 against a range midpoint of 2.889; 1.2% (300-7000) centres on 3.161.
    const recs = recommendPercent(1000, 'sambrook2012');
    expect(recs.length).toBeGreaterThan(1);
    expect(recs.every(r => r.minBp <= 1000 && r.maxBp >= 1000)).toBe(true);
    expect(recs[0].percent).toBe(1.5);
  });

  it('suggests a high-percentage gel for a small PCR product', () => {
    const recs = recommendPercent(150, 'sambrook2012');
    expect(recs[0].percent).toBeGreaterThanOrEqual(2);
  });

  it('can give a different answer from each source, which is why both are shown', () => {
    expect(recommendPercent(40000, 'sambrook2012').map(r => r.percent)).toContain(0.5);
    expect(recommendPercent(40000, 'ausubel1995')).toHaveLength(0);
  });

  it('returns nothing for a fragment no agarose gel in the table resolves', () => {
    expect(recommendPercent(5, 'sambrook2012')).toHaveLength(0);
    expect(recommendPercent(0, 'sambrook2012')).toHaveLength(0);
  });
});

describe('loading dyes (Yilmaz et al. 2012, via Thermo Fisher)', () => {
  it('runs bromophenol blue at 220 bp in 1% TBE and 370 bp in 1% TAE', () => {
    expect(dyeSizes(1.0)).toEqual({ percent: 1.0, bpbTBE: 220, bpbTAE: 370, xcTBE: 3030, xcTAE: 4160 });
  });

  it('every dye appears larger in TAE than in TBE, at every percentage', () => {
    // A property of the published table, and a check on its transcription.
    for (const r of DYE_MIGRATION) {
      expect(r.bpbTAE, `${r.percent}%`).toBeGreaterThan(r.bpbTBE);
      expect(r.xcTAE, `${r.percent}%`).toBeGreaterThan(r.xcTBE);
    }
  });

  it('every dye runs at a smaller apparent size as the gel gets more concentrated', () => {
    for (let i = 1; i < DYE_MIGRATION.length; i++) {
      const [a, b] = [DYE_MIGRATION[i - 1], DYE_MIGRATION[i]];
      expect(b.bpbTBE).toBeLessThan(a.bpbTBE);
      expect(b.bpbTAE).toBeLessThan(a.bpbTAE);
      expect(b.xcTBE).toBeLessThan(a.xcTBE);
      expect(b.xcTAE).toBeLessThan(a.xcTAE);
    }
  });

  it('xylene cyanol always runs slower (larger) than bromophenol blue', () => {
    for (const r of DYE_MIGRATION) expect(r.xcTBE).toBeGreaterThan(r.bpbTBE);
  });

  it('returns undefined for a percentage that is not in the table, rather than guessing', () => {
    expect(dyeSizes(1.1)).toBeUndefined();
  });
});

describe('recipe', () => {
  it('1 g in 100 mL is a 1% gel', () => {
    expect(agaroseGrams(1, 100)).toBeCloseTo(1, 12);
  });

  it('0.8% in 50 mL is 0.4 g', () => {
    expect(agaroseGrams(0.8, 50)).toBeCloseTo(0.4, 12);
  });

  it('50x TAE to 1x in 100 mL is 2 mL', () => {
    expect(bufferStockMl(100, 50, 1)).toBeCloseTo(2, 12);
  });

  it('10x TBE to 0.5x in 200 mL is 10 mL', () => {
    expect(bufferStockMl(200, 10, 0.5)).toBeCloseTo(10, 12);
  });

  it('returns 0 rather than Infinity for a zero stock', () => {
    expect(bufferStockMl(100, 0, 1)).toBe(0);
  });
});
