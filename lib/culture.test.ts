import { describe, it, expect } from 'vitest';
import {
  VESSELS, vesselById, cellsForDensity, seedingPlan, scaleByArea,
  splitRatio, doublingsToRecover, hoursToConfluency,
} from './culture';

const v = (id: string) => {
  const found = vesselById(id);
  if (!found) throw new Error(`no vessel ${id}`);
  return found;
};

describe('vessel table (Thermo Fisher Gibco "Useful numbers for cell culture")', () => {
  it.each([
    ['dish35', 8.8], ['dish60', 21.5], ['dish100', 56.7], ['dish150', 145],
    ['well6', 9.6], ['well12', 3.5], ['well24', 1.9], ['well48', 1.1], ['well96', 0.32], ['well384', 0.084],
    ['t25', 25], ['t75', 75], ['t175', 175], ['t225', 225],
  ])('%s has a growth area of %s cm²', (id, area) => {
    expect(v(id).areaCm2).toBe(area);
  });

  it('does not treat a dish as a circle of its nominal diameter', () => {
    // 100 mm is the outer diameter. pi * 5^2 = 78.5 cm², but the growth surface is 56.7.
    expect(v('dish100').areaCm2).toBeLessThan(Math.PI * 5 * 5 * 0.75);
  });

  it('seeds every vessel at 20-25% of its confluent number, as the published table does', () => {
    // A transcription check: a mistyped seeding or confluency figure — a dropped zero,
    // a misplaced decimal — moves the ratio far outside this band. (Most rows are exactly
    // 0.25; the 12- and 24-well plates and the large flasks are nearer 0.21.)
    for (const vessel of VESSELS) {
      if (vessel.seedingCells && vessel.confluentCells) {
        const ratio = vessel.seedingCells / vessel.confluentCells;
        expect(ratio, vessel.id).toBeGreaterThanOrEqual(0.2);
        expect(ratio, vessel.id).toBeLessThanOrEqual(0.25 + 1e-9);
      }
    }
  });

  it('gives a confluent HeLa density within a factor of two across every vessel', () => {
    // Another transcription check: the table's numbers are all for the same cell line, so
    // per-area density should agree to within the table's rounding — 0.86 x 10^5 /cm² for
    // the 384-well plate up to 1.55 x 10^5 for the 100 mm dish.
    for (const vessel of VESSELS) {
      if (!vessel.confluentCells) continue;
      const perCm2 = vessel.confluentCells / vessel.areaCm2;
      expect(perCm2, vessel.id).toBeGreaterThan(0.8e5);
      expect(perCm2, vessel.id).toBeLessThan(1.6e5);
    }
  });

  it('has a sensible medium range for every vessel', () => {
    for (const vessel of VESSELS) {
      expect(vessel.mediumMl[0], vessel.id).toBeGreaterThan(0);
      expect(vessel.mediumMl[1], vessel.id).toBeGreaterThanOrEqual(vessel.mediumMl[0]);
    }
  });
});

describe('seeding', () => {
  it('converts a density to cells for a vessel', () => {
    expect(cellsForDensity(1e4, 75)).toBe(750000);
  });

  it('plans a whole plate, including the volumes to pipette', () => {
    // 5,000 cells/cm² into all 96 wells, from a 1 x 10^6 /mL suspension, 0.2 mL per well.
    const plan = seedingPlan({ densityPerCm2: 5000, areaCm2: 0.32, vessels: 96, suspensionPerMl: 1e6, workingVolumeMl: 0.2 });
    expect(plan.cellsPerVessel).toBeCloseTo(1600, 9);
    expect(plan.totalCells).toBeCloseTo(153600, 6);
    expect(plan.suspensionPerVesselMl).toBeCloseTo(0.0016, 12);
    expect(plan.mediumPerVesselMl).toBeCloseTo(0.2 - 0.0016, 12);
  });

  it('suspension and medium always add up to the working volume', () => {
    for (const density of [1e3, 1e4, 5e4]) {
      const p = seedingPlan({ densityPerCm2: density, areaCm2: 9.6, vessels: 6, suspensionPerMl: 5e5, workingVolumeMl: 2 });
      expect(p.suspensionPerVesselMl + p.mediumPerVesselMl).toBeCloseTo(2, 12);
    }
  });

  it('warns when the suspension is too dilute to fit in the working volume', () => {
    const p = seedingPlan({ densityPerCm2: 1e5, areaCm2: 9.6, vessels: 1, suspensionPerMl: 1e5, workingVolumeMl: 2 });
    expect(p.suspensionPerVesselMl).toBeCloseTo(9.6, 9);
    expect(p.overfills).toBe(true);
  });

  it('adds pipetting overage to the total, not to each vessel', () => {
    const p = seedingPlan({ densityPerCm2: 1e4, areaCm2: 1.9, vessels: 24, suspensionPerMl: 1e6, workingVolumeMl: 1, overagePercent: 10 });
    expect(p.cellsPerVessel).toBeCloseTo(19000, 9);
    expect(p.totalCells).toBeCloseTo(19000 * 24 * 1.1, 6);
  });

  it('returns zeros rather than NaN or Infinity for empty or zero input', () => {
    const p = seedingPlan({ densityPerCm2: 0, areaCm2: 0, vessels: 0, suspensionPerMl: 0, workingVolumeMl: 0 });
    for (const value of Object.values(p)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('scaling between vessels', () => {
  it('T-25 to T-75 is exactly three times, for cells and for medium', () => {
    expect(scaleByArea(1e6, v('t25').areaCm2, v('t75').areaCm2)).toBeCloseTo(3e6, 9);
    expect(scaleByArea(5, 25, 75)).toBeCloseTo(15, 12);
  });

  it('scales back down by the inverse ratio', () => {
    const up = scaleByArea(1e6, 9.6, 75);
    expect(scaleByArea(up, 75, 9.6)).toBeCloseTo(1e6, 6);
  });

  it('does not divide by zero', () => {
    expect(scaleByArea(1e6, 0, 75)).toBe(0);
  });
});

describe('splitting and recovery', () => {
  it('works out the split ratio from what you have and what you need', () => {
    expect(splitRatio(8.4e6, 0.84e6)).toBeCloseTo(10, 12);
  });

  it('a 1:10 split needs log2(10) ≈ 3.32 doublings to get back to where it was', () => {
    expect(doublingsToRecover(10)).toBeCloseTo(Math.log2(10), 12);
  });

  it('seeding at a quarter of confluency needs exactly two doublings', () => {
    expect(doublingsToRecover(4)).toBeCloseTo(2, 12);
  });

  it('converts doublings to hours at a given doubling time', () => {
    expect(hoursToConfluency(4, 24)).toBeCloseTo(48, 12);
  });

  it('a split ratio of 1 or less needs no growth at all', () => {
    expect(doublingsToRecover(1)).toBe(0);
    expect(doublingsToRecover(0)).toBe(0);
  });
});
