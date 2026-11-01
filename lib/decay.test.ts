import { describe, it, expect } from 'vitest';
import {
  ISOTOPES, isotopeById, DAYS_PER_YEAR, halfLifeDays, fractionRemaining, activityAt,
  decayCorrect, daysUntilFraction, daysBetween, decayConstantPerDay,
} from './decay';

const iso = (id: string) => {
  const i = isotopeById(id);
  if (!i) throw new Error(`no isotope ${id}`);
  return i;
};

describe('half-lives (DDEP recommended values, via LNHB)', () => {
  it.each([
    ['P32', 14.273, 'd'], ['P33', 25.38, 'd'], ['S35', 87.25, 'd'], ['I125', 59.388, 'd'],
    ['I131', 8.0233, 'd'], ['Cr51', 27.704, 'd'], ['Ca45', 162.64, 'd'],
    ['H3', 12.312, 'a'], ['C14', 5700, 'a'], ['F18', 1.8289, 'h'],
  ])('%s is %s %s', (id, value, unit) => {
    expect(iso(id).halfLife).toBe(value);
    expect(iso(id).unit).toBe(unit);
  });

  it('carries the published standard uncertainty for each', () => {
    // e.g. 32P 14.273(7) d — the uncertainty is in the last digits.
    expect(iso('P32').uncertainty).toBe(0.007);
    expect(iso('S35').uncertainty).toBe(0.15);
    expect(iso('H3').uncertainty).toBe(0.025);
    for (const i of ISOTOPES) expect(i.uncertainty, i.id).toBeGreaterThan(0);
  });

  it('converts years with DDEP’s 365.242198 days', () => {
    expect(DAYS_PER_YEAR).toBe(365.242198);
    expect(halfLifeDays(iso('H3'))).toBeCloseTo(12.312 * 365.242198, 9);
  });

  it('converts hours to days', () => {
    expect(halfLifeDays(iso('F18'))).toBeCloseTo(1.8289 / 24, 12);
  });
});

describe('decay', () => {
  it('halves in one half-life and quarters in two', () => {
    const t = halfLifeDays(iso('P32'));
    expect(fractionRemaining(t, t)).toBeCloseTo(0.5, 12);
    expect(fractionRemaining(2 * t, t)).toBeCloseTo(0.25, 12);
  });

  it('is unchanged at time zero', () => {
    expect(fractionRemaining(0, 14.273)).toBe(1);
  });

  it('agrees with the exponential form A = A0·e^(−λt), λ = ln 2 / T½', () => {
    const t = 30, half = 87.25;
    expect(fractionRemaining(t, half)).toBeCloseTo(Math.exp(-decayConstantPerDay(half) * t), 12);
  });

  it('scales an activity', () => {
    expect(activityAt(250, 14.273, 14.273)).toBeCloseTo(125, 9);
  });

  it('decay-correcting a measurement back undoes the decay', () => {
    const measured = activityAt(250, 40, 59.388);
    expect(decayCorrect(measured, 40, 59.388)).toBeCloseTo(250, 9);
  });

  it('after ten half-lives, about 0.1% is left', () => {
    expect(fractionRemaining(10 * 14.273, 14.273)).toBeCloseTo(1 / 1024, 12);
  });

  it('finds when a stock falls to a given fraction', () => {
    expect(daysUntilFraction(0.25, 14.273)).toBeCloseTo(2 * 14.273, 9);
    expect(daysUntilFraction(1, 14.273)).toBe(0);
  });

  it('returns sensible values rather than NaN for degenerate input', () => {
    expect(fractionRemaining(10, 0)).toBe(0);
    expect(daysUntilFraction(0, 14.273)).toBe(Infinity);
    expect(daysUntilFraction(-1, 14.273)).toBe(0);
  });
});

describe('dates', () => {
  it('counts days between two dates, including part days', () => {
    expect(daysBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-15T12:00:00Z'))).toBeCloseTo(14.5, 12);
  });

  it('is negative when the second date is earlier, which decays the activity forwards', () => {
    expect(daysBetween(new Date('2026-01-15T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).toBeCloseTo(-14, 12);
  });
});
