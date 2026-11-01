/**
 * Radioactive decay for the isotopes a life-science lab actually uses.
 *
 * Half-lives are the recommended values of the Decay Data Evaluation Project (DDEP), the
 * international evaluation hosted by LNHB (lnhb.fr/nuclides/<nuclide>_tables.pdf). NIST
 * notes on its own former half-life table that DDEP now supersedes it. Uncertainties are
 * the published standard uncertainties.
 *
 * DDEP converts between years and days with 1 a = 365.242198 d (as reproduced in NPL
 * Report IR 6, "Recommended Nuclear Decay Data").
 *
 *   A(t) = A0 · 2^(−t / T½) = A0 · e^(−λt),   λ = ln 2 / T½
 */

export const DAYS_PER_YEAR = 365.242198;

export type HalfLifeUnit = 'h' | 'd' | 'a';

export interface Isotope {
  id: string;
  name: string;
  halfLife: number;
  unit: HalfLifeUnit;
  /** Standard uncertainty, in the same unit. */
  uncertainty: number;
  /** Decay mode as DDEP gives it. */
  decayMode: string;
}

export const ISOTOPES: Isotope[] = [
  { id: 'P32', name: '³²P', halfLife: 14.273, unit: 'd', uncertainty: 0.007, decayMode: 'β⁻' },
  { id: 'P33', name: '³³P', halfLife: 25.38, unit: 'd', uncertainty: 0.05, decayMode: 'β⁻' },
  { id: 'S35', name: '³⁵S', halfLife: 87.25, unit: 'd', uncertainty: 0.15, decayMode: 'β⁻' },
  { id: 'I125', name: '¹²⁵I', halfLife: 59.388, unit: 'd', uncertainty: 0.028, decayMode: 'EC' },
  { id: 'I131', name: '¹³¹I', halfLife: 8.0233, unit: 'd', uncertainty: 0.0019, decayMode: 'β⁻' },
  { id: 'Cr51', name: '⁵¹Cr', halfLife: 27.704, unit: 'd', uncertainty: 0.004, decayMode: 'EC' },
  { id: 'Ca45', name: '⁴⁵Ca', halfLife: 162.64, unit: 'd', uncertainty: 0.11, decayMode: 'β⁻' },
  { id: 'H3', name: '³H', halfLife: 12.312, unit: 'a', uncertainty: 0.025, decayMode: 'β⁻' },
  { id: 'C14', name: '¹⁴C', halfLife: 5700, unit: 'a', uncertainty: 30, decayMode: 'β⁻' },
  { id: 'F18', name: '¹⁸F', halfLife: 1.8289, unit: 'h', uncertainty: 0.00023, decayMode: 'β⁺, EC' },
];

export const isotopeById = (id: string): Isotope | undefined => ISOTOPES.find(i => i.id === id);

export const halfLifeDays = (i: Isotope): number =>
  i.unit === 'a' ? i.halfLife * DAYS_PER_YEAR : i.unit === 'h' ? i.halfLife / 24 : i.halfLife;

export const decayConstantPerDay = (halfLifeDaysValue: number): number =>
  halfLifeDaysValue > 0 ? Math.LN2 / halfLifeDaysValue : 0;

/** Fraction left after t days. */
export const fractionRemaining = (days: number, halfLifeDaysValue: number): number =>
  halfLifeDaysValue > 0 ? Math.pow(2, -days / halfLifeDaysValue) : 0;

/** Activity after t days, in the unit A0 was given in. */
export const activityAt = (a0: number, days: number, halfLifeDaysValue: number): number =>
  a0 * fractionRemaining(days, halfLifeDaysValue);

/** Activity t days earlier, from one measured now — the inverse of activityAt. */
export const decayCorrect = (measured: number, days: number, halfLifeDaysValue: number): number =>
  halfLifeDaysValue > 0 ? measured * Math.pow(2, days / halfLifeDaysValue) : 0;

/** Days until the activity falls to a fraction of what it is now. */
export const daysUntilFraction = (fraction: number, halfLifeDaysValue: number): number => {
  if (fraction >= 1 || fraction < 0) return 0;
  if (fraction === 0) return Infinity;
  return -Math.log2(fraction) * halfLifeDaysValue;
};

export const daysBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / 86400000;
