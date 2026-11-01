/**
 * Cell culture seeding, scaling and splitting.
 *
 * Vessel figures are from Thermo Fisher's Gibco "Useful numbers for cell culture" table
 * (thermofisher.com, Gibco Cell Culture Basics), which is for Thermo/Nunc vessels. Its
 * seeding and confluency numbers are, in its own words, for HeLa cells: they are a
 * starting point and differ by cell line.
 *
 * Growth area depends on the manufacturer. Corning lists its 35, 60 and 100 mm dishes at
 * about 8-9, 21 and 55 cm², against Thermo's 8.8, 21.5 and 56.7 — close, but not the same
 * vessel. Areas can be overridden in the UI for that reason.
 *
 * Note that a dish's growth area is not pi × (nominal diameter / 2)²: 100 mm is the outer
 * diameter, and the growth surface of a 100 mm dish is 56.7 cm², not 78.5.
 */

export type VesselKind = 'plate' | 'dish' | 'flask';

export interface Vessel {
  id: string;
  name: string;
  kind: VesselKind;
  /** Growth area per well, dish or flask, cm². */
  areaCm2: number;
  /** Recommended growth medium per well, dish or flask, mL. */
  mediumMl: [number, number];
  /** Thermo's suggested seeding number per well/dish/flask (HeLa). */
  seedingCells?: number;
  /** Cells at confluency per well/dish/flask (HeLa). */
  confluentCells?: number;
  /** Wells on the plate, for multiwell plates. */
  wells?: number;
}

export const VESSELS: Vessel[] = [
  { id: 'well96', name: '96-well', kind: 'plate', wells: 96, areaCm2: 0.32, mediumMl: [0.1, 0.2], seedingCells: 0.01e6, confluentCells: 0.04e6 },
  { id: 'well384', name: '384-well', kind: 'plate', wells: 384, areaCm2: 0.084, mediumMl: [0.08, 0.08], seedingCells: 0.0018e6, confluentCells: 0.0072e6 },
  { id: 'well48', name: '48-well', kind: 'plate', wells: 48, areaCm2: 1.1, mediumMl: [0.2, 0.4], seedingCells: 0.03e6, confluentCells: 0.12e6 },
  { id: 'well24', name: '24-well', kind: 'plate', wells: 24, areaCm2: 1.9, mediumMl: [0.5, 1.0], seedingCells: 0.05e6, confluentCells: 0.24e6 },
  { id: 'well12', name: '12-well', kind: 'plate', wells: 12, areaCm2: 3.5, mediumMl: [1, 2], seedingCells: 0.1e6, confluentCells: 0.5e6 },
  { id: 'well6', name: '6-well', kind: 'plate', wells: 6, areaCm2: 9.6, mediumMl: [1, 3], seedingCells: 0.3e6, confluentCells: 1.2e6 },
  { id: 'dish35', name: '35 mm dish', kind: 'dish', areaCm2: 8.8, mediumMl: [2, 2], seedingCells: 0.3e6, confluentCells: 1.2e6 },
  { id: 'dish60', name: '60 mm dish', kind: 'dish', areaCm2: 21.5, mediumMl: [5, 5], seedingCells: 0.8e6, confluentCells: 3.2e6 },
  { id: 'dish100', name: '100 mm dish', kind: 'dish', areaCm2: 56.7, mediumMl: [12, 12], seedingCells: 2.2e6, confluentCells: 8.8e6 },
  { id: 'dish150', name: '150 mm dish', kind: 'dish', areaCm2: 145, mediumMl: [30, 30], seedingCells: 5.0e6, confluentCells: 20.0e6 },
  { id: 't25', name: 'T-25 flask', kind: 'flask', areaCm2: 25, mediumMl: [3, 5], seedingCells: 0.7e6, confluentCells: 2.8e6 },
  { id: 't75', name: 'T-75 flask', kind: 'flask', areaCm2: 75, mediumMl: [8, 15], seedingCells: 2.1e6, confluentCells: 8.4e6 },
  { id: 't175', name: 'T-175 flask', kind: 'flask', areaCm2: 175, mediumMl: [35, 53], seedingCells: 4.9e6, confluentCells: 23.3e6 },
  { id: 't225', name: 'T-225 flask', kind: 'flask', areaCm2: 225, mediumMl: [45, 68], seedingCells: 6.3e6, confluentCells: 30e6 },
];

export const vesselById = (id: string): Vessel | undefined => VESSELS.find(v => v.id === id);

const finite = (n: number): number => (Number.isFinite(n) ? n : 0);

export const cellsForDensity = (densityPerCm2: number, areaCm2: number): number =>
  finite(Math.max(0, densityPerCm2) * Math.max(0, areaCm2));

export interface SeedingInput {
  densityPerCm2: number;
  /** Area of one well, dish or flask. */
  areaCm2: number;
  /** How many wells, dishes or flasks. */
  vessels: number;
  /** Concentration of the cell suspension you are seeding from, cells/mL. */
  suspensionPerMl: number;
  /** Final volume in each well, dish or flask, mL. */
  workingVolumeMl: number;
  /** Extra made up to cover pipetting losses, %. Applied to the total only. */
  overagePercent?: number;
}

export interface SeedingPlan {
  cellsPerVessel: number;
  totalCells: number;
  suspensionPerVesselMl: number;
  mediumPerVesselMl: number;
  /** Total suspension to draw up, overage included. */
  totalSuspensionMl: number;
  /** True when the suspension is too dilute to fit in the working volume. */
  overfills: boolean;
}

export const seedingPlan = (input: SeedingInput): SeedingPlan => {
  const n = Math.max(0, Math.floor(input.vessels));
  const overage = 1 + Math.max(0, input.overagePercent ?? 0) / 100;
  const cellsPerVessel = cellsForDensity(input.densityPerCm2, input.areaCm2);
  const suspensionPerVesselMl = input.suspensionPerMl > 0 ? cellsPerVessel / input.suspensionPerMl : 0;
  const working = Math.max(0, input.workingVolumeMl);
  return {
    cellsPerVessel,
    totalCells: finite(cellsPerVessel * n * overage),
    suspensionPerVesselMl: finite(suspensionPerVesselMl),
    mediumPerVesselMl: finite(working - suspensionPerVesselMl),
    totalSuspensionMl: finite(suspensionPerVesselMl * n * overage),
    overfills: suspensionPerVesselMl > working,
  };
};

/** Carry a cell number, volume or anything else proportional to area from one vessel to another. */
export const scaleByArea = (quantity: number, fromAreaCm2: number, toAreaCm2: number): number =>
  fromAreaCm2 > 0 ? finite((quantity * toAreaCm2) / fromAreaCm2) : 0;

/** "1:N" — how many times the cells you have exceed the cells you need. */
export const splitRatio = (cellsAvailable: number, cellsNeeded: number): number =>
  cellsNeeded > 0 ? finite(cellsAvailable / cellsNeeded) : 0;

/** Doublings for a culture split 1:N to regrow to its starting density: log2(N). */
export const doublingsToRecover = (ratio: number): number => (ratio > 1 ? Math.log2(ratio) : 0);

/**
 * Hours for a culture split 1:N to get back to confluency, assuming exponential growth at
 * a constant doubling time and no lag phase after plating — real cultures lag, often by
 * a day, so treat this as a lower bound.
 */
export const hoursToConfluency = (ratio: number, doublingTimeHours: number): number =>
  finite(doublingsToRecover(ratio) * Math.max(0, doublingTimeHours));
