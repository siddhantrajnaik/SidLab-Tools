import { describe, it, expect } from 'vitest';
import {
  BUFFERS, bufferById, pKaAt, dpKadT, usefulRange, baseFraction,
  bufferRecipe, phAfterTempChange, suggestBuffers, T_REF,
} from './buffers';

const get = (id: string) => {
  const b = bufferById(id);
  if (!b) throw new Error(`no buffer ${id}`);
  return b;
};

describe('the table itself', () => {
  it('has no duplicate ids', () => {
    expect(new Set(BUFFERS.map(b => b.id)).size).toBe(BUFFERS.length);
  });

  it('is ordered by pKa, so a picker reads sensibly', () => {
    const pKas = BUFFERS.map(b => b.pKa25);
    // Acetate and citrate pKa2 are within 0.01 of each other; allow that much slack.
    for (let i = 1; i < pKas.length; i++) expect(pKas[i]).toBeGreaterThan(pKas[i - 1] - 0.01);
  });

  it('carries the NIST selected values for the buffers most often used', () => {
    // Goldberg, Kishore & Lennen 2002, Section 8: pK, dH/(kJ/mol), dCp/(J/K/mol)
    // at T = 298.15 K, I = 0.
    const published: Record<string, [number, number, number]> = {
      tris: [8.072, 47.45, -59],
      hepes: [7.564, 20.4, 47],
      mops: [7.184, 21.1, -5],
      mes: [6.270, 14.8, 5],
      pipes: [7.141, 11.2, -2],
      phosphate2: [7.198, 3.6, -230],
      acetate: [4.756, -0.41, -142],
      bicine: [8.334, 26.34, 0],
      tricine: [8.135, 31.37, -53],
      caps: [10.499, 48.1, 57],
    };
    for (const [id, [pK, dH, dCp]] of Object.entries(published)) {
      const b = get(id);
      expect([b.pKa25, b.dH, b.dCp], id).toEqual([pK, dH, dCp]);
    }
  });
});

describe('pKa against temperature', () => {
  it('returns the tabulated value at the reference temperature', () => {
    for (const b of BUFFERS) expect(pKaAt(b, T_REF - 273.15), b.id).toBeCloseTo(b.pKa25, 9);
  });

  // Measured pK values from the same review's per-buffer tables, which are independent of
  // the three numbers the model is built from. Bates & Hetzer 1961 for Tris; Vega & Bates
  // 1976 for HEPES.
  it.each([
    ['tris', 0, 8.8500],
    ['tris', 20, 8.2138],
    ['tris', 35, 7.8031],
    ['tris', 50, 7.4365],
    ['hepes', 5, 7.818],
    ['hepes', 20, 7.629],
    ['hepes', 40, 7.393],
    ['hepes', 50, 7.283],
    ['ches', 5, 9.8897],
    ['ches', 37, 9.1236],
    ['ches', 50, 8.8551],
  ])('reproduces the measured pK of %s at %i degrees C', (id, tempC, measured) => {
    expect(pKaAt(get(id), tempC)).toBeCloseTo(measured, 2);
  });

  it('rises as it gets colder for every endothermic ionization', () => {
    for (const b of BUFFERS) {
      if (b.dH <= 0) continue;
      expect(pKaAt(b, 4), b.id).toBeGreaterThan(pKaAt(b, 37));
    }
  });

  it('puts a Tris buffer titrated to 8.0 at the bench well off target in the cold room', () => {
    // The classic mistake. Tris moves about -0.028 pH per degree, so 21 degrees of
    // cooling is worth more than half a pH unit.
    expect(phAfterTempChange(get('tris'), 8.0, 25, 4)).toBeCloseTo(8.6, 1);
  });

  it('barely moves HEPES or phosphate over the same swing', () => {
    expect(Math.abs(phAfterTempChange(get('hepes'), 7.4, 25, 4) - 7.4)).toBeLessThan(0.3);
    expect(Math.abs(phAfterTempChange(get('phosphate2'), 7.4, 25, 4) - 7.4)).toBeLessThan(0.1);
  });

  it('is symmetric: preparing warm then cooling undoes itself', () => {
    const there = phAfterTempChange(get('tris'), 8.0, 25, 4);
    expect(phAfterTempChange(get('tris'), there, 4, 25)).toBeCloseTo(8.0, 9);
  });
});

describe('dpKa/dT', () => {
  // Published temperature coefficients, in pH units per degree C, from Beynon & Easterby,
  // "Buffer Solutions: The Basics" (IRL Press, 1996). These come from a different body of
  // measurements than the NIST enthalpies, so they agree in sign and magnitude rather than
  // exactly; the tolerance below is what that difference actually amounts to.
  it.each([
    ['tris', -0.028],
    ['phosphate2', -0.0028],
    ['hepes', -0.014],
    ['aces', -0.02],
    ['bicine', -0.018],
    ['tricine', -0.021],
    ['taps', -0.02],
  ])('derives the published coefficient for %s', (id, published) => {
    expect(dpKadT(get(id))).toBeCloseTo(published, 2);
    expect(Math.abs(dpKadT(get(id)) - published)).toBeLessThan(0.005);
  });

  it('gives CHES a steeper slope than Beynon & Easterby, and the measurements agree', () => {
    // Beynon & Easterby list -0.018 for CHES, which this module does not reproduce: from
    // the NIST enthalpy it comes out at -0.0232. Roy et al. 1997, the study NIST selected,
    // measured pK = 9.5132 at 20 degrees C and 9.2790 at 30, a slope of -0.0234 per
    // degree. The measurements decide it; the code is right and the secondary table is
    // not, so this is asserted against the measured slope instead.
    const measuredSlope = (9.2790 - 9.5132) / 10;
    expect(dpKadT(get('ches'))).toBeCloseTo(measuredSlope, 3);
  });

  it('matches Tris almost exactly, where the two sources agree', () => {
    expect(dpKadT(get('tris'))).toBeCloseTo(-0.028, 3);
  });

  it('is the slope of pKaAt, as a numerical derivative confirms', () => {
    for (const b of BUFFERS) {
      const numeric = (pKaAt(b, 25.5) - pKaAt(b, 24.5)) / 1;
      expect(dpKadT(b, 25), b.id).toBeCloseTo(numeric, 5);
    }
  });

  it('shows why Good designed these buffers: acetate and phosphate hardly move', () => {
    expect(Math.abs(dpKadT(get('acetate')))).toBeLessThan(0.001);
    expect(Math.abs(dpKadT(get('phosphate2')))).toBeLessThan(0.005);
  });
});

describe('recipes', () => {
  it('is half acid and half base at the pKa', () => {
    const b = get('hepes');
    const r = bufferRecipe(b, pKaAt(b, 25), 25, 0.1, 1);
    expect(r.acidMol).toBeCloseTo(0.05, 9);
    expect(r.baseMol).toBeCloseTo(0.05, 9);
    expect(r.ratio).toBeCloseTo(1, 9);
  });

  it('the two forms always add up to the total moles asked for', () => {
    for (const pH of [5, 6, 7, 8, 9]) {
      const r = bufferRecipe(get('tris'), pH, 25, 0.05, 0.5);
      expect(r.acidMol + r.baseMol).toBeCloseTo(0.025, 9);
    }
  });

  it('follows Henderson-Hasselbalch: one pH unit above the pKa is 10:1 base to acid', () => {
    const b = get('mops');
    const r = bufferRecipe(b, pKaAt(b, 25) + 1, 25, 0.1, 1);
    expect(r.ratio).toBeCloseTo(10, 6);
  });

  it('flags a target pH more than one unit from the pKa', () => {
    expect(bufferRecipe(get('tris'), 8.0, 25, 0.1, 1).inRange).toBe(true);
    expect(bufferRecipe(get('tris'), 6.0, 25, 0.1, 1).inRange).toBe(false);
  });

  it('uses the pKa at the working temperature, not at 25', () => {
    const cold = bufferRecipe(get('tris'), 8.0, 4, 0.1, 1);
    const warm = bufferRecipe(get('tris'), 8.0, 25, 0.1, 1);
    // Colder means a higher pKa, so more of the buffer must be in the basic form.
    expect(cold.baseMol).toBeLessThan(warm.baseMol);
  });

  it('peaks in buffer capacity at the pKa, at 2.303*C/4', () => {
    const b = get('hepes');
    const at = bufferRecipe(b, pKaAt(b, 25), 25, 0.1, 1).capacity;
    expect(at).toBeCloseTo((Math.LN10 * 0.1) / 4, 9);
    expect(bufferRecipe(b, pKaAt(b, 25) + 1, 25, 0.1, 1).capacity).toBeLessThan(at);
  });

  it('handles an empty volume without producing NaN', () => {
    const r = bufferRecipe(get('tris'), 8, 25, 0, 0);
    expect(r.acidMol).toBe(0);
    expect(r.baseMol).toBe(0);
  });
});

describe('suggestions', () => {
  it('offers HEPES, MOPS and phosphate around pH 7.4 and puts the closest first', () => {
    const ids = suggestBuffers(7.4, 25).map(b => b.id);
    expect(ids).toContain('hepes');
    expect(ids).toContain('mops');
    expect(ids).toContain('phosphate2');
    expect(ids[0]).toBe('tes'); // pKa 7.550, the nearest of the set
  });

  it('offers nothing outside the range any of these buffers cover', () => {
    expect(suggestBuffers(1, 25)).toHaveLength(0);
    expect(suggestBuffers(13, 25)).toHaveLength(0);
  });

  it('changes its answer with temperature, which is the point', () => {
    // At 4 degrees Tris has moved up past 8.6, so it no longer covers pH 7.5.
    expect(suggestBuffers(7.5, 25).map(b => b.id)).toContain('tris');
    expect(suggestBuffers(7.5, 4).map(b => b.id)).not.toContain('tris');
  });

  it('every suggestion really does have the target inside its useful range', () => {
    for (const b of suggestBuffers(8.0, 25)) {
      const [low, high] = usefulRange(b, 25);
      expect(8.0, b.id).toBeGreaterThanOrEqual(low);
      expect(8.0, b.id).toBeLessThanOrEqual(high);
    }
  });
});

describe('base fraction', () => {
  it('is a half at the pKa, and saturates either side', () => {
    expect(baseFraction(7, 7)).toBeCloseTo(0.5, 9);
    expect(baseFraction(11, 7)).toBeGreaterThan(0.999);
    expect(baseFraction(3, 7)).toBeLessThan(0.001);
  });
});
