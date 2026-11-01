/**
 * Bacterial growth from OD600: growth rate, doubling time, time to a target OD, and
 * back-dilution to have a culture ready at a given time.
 *
 * All of it assumes exponential growth, in which OD rises as OD0 × 2^(t / td). That holds
 * through mid-log phase only — not during the lag after dilution, and not as the culture
 * approaches stationary phase — and only while OD is proportional to cell density, which
 * on any spectrophotometer stops being true as cultures get dense. Read dense cultures
 * diluted, and multiply back.
 */

/**
 * OD600 of 1.0 ≈ 8 × 10^8 cells/mL for E. coli — Agilent, "E. coli Cell Culture
 * Concentration from OD600" calculator (agilent.com/store/biocalculators). The factor is
 * an empirical correlation that varies with strain, growth phase, medium and instrument;
 * calibrate against plate counts for anything quantitative.
 */
export const OD600_ECOLI_CELLS_PER_ML = 8e8;

const positive = (...xs: number[]) => xs.every(x => Number.isFinite(x) && x > 0);

/** Specific growth rate μ = ln(OD2 / OD1) / Δt, per hour. Zero unless the culture grew. */
export const growthRate = (od1: number, od2: number, hours: number): number =>
  positive(od1, od2, hours) && od2 > od1 ? Math.log(od2 / od1) / hours : 0;

/** Doubling time td = ln 2 / μ, in hours. */
export const doublingTime = (od1: number, od2: number, hours: number): number => {
  const mu = growthRate(od1, od2, hours);
  return mu > 0 ? Math.LN2 / mu : 0;
};

/** Generations elapsed: log2(OD2 / OD1). */
export const generations = (od1: number, od2: number): number =>
  positive(od1, od2) && od2 > od1 ? Math.log2(od2 / od1) : 0;

/** Hours from the current OD to a target at a given doubling time. */
export const hoursToReach = (odNow: number, odTarget: number, doublingHours: number): number =>
  positive(odNow, odTarget, doublingHours) && odTarget > odNow ? Math.log2(odTarget / odNow) * doublingHours : 0;

export interface BackDilution {
  /** OD to start the culture at. */
  startOD: number;
  /** How much to dilute the overnight: 1 : dilutionFactor. */
  dilutionFactor: number;
  /** False when reaching the target in time would mean diluting by less than 1×. */
  feasible: boolean;
}

/**
 * Dilute an overnight so it reaches a target OD after a given time: the start OD must be
 * target / 2^(hours / td), so the overnight is diluted by its OD over that. Assumes no lag
 * phase — after a large back-dilution there usually is one, so start a little early.
 */
export const backDilution = (overnightOD: number, targetOD: number, hours: number, doublingHours: number): BackDilution => {
  if (!positive(overnightOD, targetOD, doublingHours) || hours < 0) {
    return { startOD: 0, dilutionFactor: 0, feasible: false };
  }
  const startOD = targetOD / Math.pow(2, hours / doublingHours);
  const dilutionFactor = overnightOD / startOD;
  return { startOD, dilutionFactor, feasible: dilutionFactor >= 1 };
};

/** Approximate cells/mL from an OD600 reading taken on a 1 : dilution sample. */
export const cellsFromOD = (od: number, cellsPerOD: number, dilution = 1): number =>
  Math.max(0, od) * Math.max(0, cellsPerOD) * Math.max(0, dilution);
