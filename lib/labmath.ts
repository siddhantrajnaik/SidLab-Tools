/**
 * Pure calculation helpers shared by the calculator pages.
 *
 * Everything here is deliberately free of React so the numbers can be tested directly.
 * Each block cites the source its constants come from.
 */

// ---------------------------------------------------------------------------
// Centrifugation
// ---------------------------------------------------------------------------

/**
 * RCF = 1.118 × 10⁻⁵ · r(cm) · N²
 * The constant is (2π/60)² / (9.80665 × 100): rpm to rad/s, divided by standard gravity,
 * with the radius in centimetres.
 */
export const RCF_CONSTANT = 1.118e-5;

export const rcfFromRpm = (rpm: number, radiusCm: number): number =>
  RCF_CONSTANT * radiusCm * rpm * rpm;

export const rpmFromRcf = (rcf: number, radiusCm: number): number =>
  radiusCm > 0 ? Math.sqrt(rcf / (RCF_CONSTANT * radiusCm)) : 0;

// ---------------------------------------------------------------------------
// SDS-PAGE gels
// ---------------------------------------------------------------------------

export interface GelRecipe {
  water: number;
  buffer: number;
  acrylamide: number;
  sds: number;
  aps: number;
  temed: number;
  total: number;
}

/**
 * Ratios follow Bio-Rad's handcasting table (Bulletin 6201, Table 2): per 15 mL,
 * 3.75 mL Tris (1/4), 150 µL 10% SDS (1/100), 75 µL 10% APS (1/200), and TEMED at
 * 7.5 µL for the resolving gel (1/2000) or 15 µL for the 4% stacking gel (1/1000).
 * The stacking gel gets twice the TEMED because it polymerises more slowly.
 */
export const gelRecipe = (
  totalVol: number,
  targetPercent: number,
  stockPercent: number,
  isStacking: boolean
): GelRecipe => {
  if (totalVol <= 0 || stockPercent <= 0) {
    return { water: 0, buffer: 0, acrylamide: 0, sds: 0, aps: 0, temed: 0, total: 0 };
  }
  const acrylamide = (targetPercent / stockPercent) * totalVol;
  const buffer = totalVol / 4;
  const sds = totalVol / 100;
  const aps = totalVol / 200;
  const temed = isStacking ? totalVol / 1000 : totalVol / 2000;
  const water = totalVol - (acrylamide + buffer + sds + aps + temed);
  return { water: water < 0 ? 0 : water, buffer, acrylamide, sds, aps, temed, total: totalVol };
};

/** Percentage of a cast gel, given how much acrylamide stock went in. */
export const gelPercentFromVolume = (acrylVol: number, totalVol: number, stockPercent: number): number =>
  totalVol > 0 ? (acrylVol * stockPercent) / totalVol : 0;

// ---------------------------------------------------------------------------
// Spectrophotometry
// ---------------------------------------------------------------------------

/** Beer-Lambert: c = A / (ε · l). Units follow whichever ε is supplied. */
export const beerLambert = (absorbance: number, extinction: number, pathCm: number): number =>
  extinction > 0 && pathCm > 0 ? absorbance / (extinction * pathCm) : 0;

/** ng/µL per A260 unit at a 1 cm path, the conventional NanoDrop factors. */
export const A260_FACTORS = { dsDNA: 50, ssDNA: 33, RNA: 40 } as const;

export type NucleicSpecies = keyof typeof A260_FACTORS;

/** c (ng/µL) = A260 · factor · dilution / path length. */
export const nucleicConcentration = (
  a260: number,
  species: NucleicSpecies,
  dilution = 1,
  pathCm = 1
): number => (pathCm > 0 ? (a260 * A260_FACTORS[species] * dilution) / pathCm : 0);

// ---------------------------------------------------------------------------
// Ligation
// ---------------------------------------------------------------------------

/**
 * ng insert = ng vector · (bp insert / bp vector) · molar ratio
 * The 660 Da/bp average cancels out of the ratio, so it never appears here.
 */
export const ligationInsertMass = (
  vectorNg: number,
  insertBp: number,
  vectorBp: number,
  molarRatio: number
): number => (vectorBp > 0 ? vectorNg * (insertBp / vectorBp) * molarRatio : 0);

// ---------------------------------------------------------------------------
// Solutions
// ---------------------------------------------------------------------------

/** C1·V1 = C2·V2, solved for whichever term is missing. All in consistent base units. */
export const c1v1 = {
  v1: (c1: number, c2: number, v2: number) => (c1 !== 0 ? (c2 * v2) / c1 : NaN),
  c1: (v1: number, c2: number, v2: number) => (v1 !== 0 ? (c2 * v2) / v1 : NaN),
  v2: (c1: number, v1: number, c2: number) => (c2 !== 0 ? (c1 * v1) / c2 : NaN),
  c2: (c1: number, v1: number, v2: number) => (v2 !== 0 ? (c1 * v1) / v2 : NaN),
};

/** Mass (g) = molarity (mol/L) · volume (L) · molecular weight (g/mol). */
export const massFromMolarity = (molarity: number, volumeL: number, mw: number): number =>
  molarity * volumeL * mw;

export const molarityFromMass = (massG: number, volumeL: number, mw: number): number =>
  mw > 0 && volumeL > 0 ? massG / (mw * volumeL) : 0;

export const volumeFromMass = (massG: number, molarity: number, mw: number): number =>
  mw > 0 && molarity > 0 ? massG / (mw * molarity) : 0;

/** Percent = (solute / total) × 100, in whatever matched units the mode requires. */
export const percentOf = (solute: number, total: number): number =>
  total !== 0 ? (solute / total) * 100 : NaN;

// ---------------------------------------------------------------------------
// Cell counting
// ---------------------------------------------------------------------------

/**
 * cells/mL = (count / squares) · dilution · 10⁴
 * The 10⁴ is 1 / 10⁻⁴ mL, the volume above one large Neubauer square.
 */
export const HEMOCYTOMETER_FACTOR = 10_000;

export const cellsPerMl = (count: number, squares: number, dilution: number): number =>
  squares > 0 ? (count / squares) * dilution * HEMOCYTOMETER_FACTOR : 0;

export const viability = (live: number, dead: number): number =>
  live + dead > 0 ? (live / (live + dead)) * 100 : 0;

// ---------------------------------------------------------------------------
// pH
// ---------------------------------------------------------------------------

/** Strong monoprotic acid: pH = −log₁₀[H⁺]. */
export const phStrongAcid = (molarity: number): number => -Math.log10(molarity);

/** Strong monoprotic base, via pOH. */
export const phStrongBase = (molarity: number): number => 14 - -Math.log10(molarity);

/** Weak acid approximation: pH ≈ ½(pKa − log₁₀C). */
export const phWeakAcid = (molarity: number, pKa: number): number =>
  0.5 * (pKa - Math.log10(molarity));

/** Henderson-Hasselbalch: pH = pKa + log₁₀([A⁻]/[HA]). */
export const phBuffer = (pKa: number, base: number, acid: number): number =>
  pKa + Math.log10(base / acid);

// ---------------------------------------------------------------------------
// Absorbance / transmittance
// ---------------------------------------------------------------------------

export const percentTfromA = (absorbance: number): number => Math.pow(10, 2 - absorbance);
export const aFromPercentT = (percentT: number): number => 2 - Math.log10(percentT);
