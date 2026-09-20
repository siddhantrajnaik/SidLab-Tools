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
// Gel electrophoresis
// ---------------------------------------------------------------------------

/**
 * Relative migration of a DNA fragment, 0 at the well and 1 at the dye front.
 *
 * Across a gel's resolving range, migration distance is linear in log10(size) — which is
 * why fragment sizes are read off a semi-log standard curve. Positioning bands linearly
 * in size instead crushes everything small into the bottom of the lane and spreads the
 * large fragments apart, which is the opposite of how a gel actually looks.
 *
 * `maxBp` and `minBp` bound the resolving range; anything outside is clamped, since in
 * practice it either stays in the well or runs off the end.
 */
export const gelMigration = (bp: number, maxBp: number, minBp: number): number => {
  if (bp <= 0 || minBp <= 0 || maxBp <= minBp) return 0;
  const clamped = Math.min(Math.max(bp, minBp), maxBp);
  return (Math.log10(maxBp) - Math.log10(clamped)) / (Math.log10(maxBp) - Math.log10(minBp));
};

/** A 1 kb ladder, for the marker lane. */
export const LADDER_1KB = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 500];

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

/**
 * Ion product of water at 25 degrees C. Every function below is a 25 degrees C
 * calculation because of it — Kw rises with temperature, so neutral water is pH 6.14 at
 * 100 degrees C, not 7.
 */
export const KW_25C = 1.0e-14;

const phFromH = (h: number): number => -Math.log10(h);

/**
 * Strong monoprotic acid.
 *
 * Not simply -log10(C): below about 10^-6 M the hydrogen ion already present in water is
 * no longer negligible, and ignoring it puts the answer on the wrong side of neutral —
 * 10^-8 M HCl comes out as pH 8, a base. Charge balance gives [H+] = C + Kw/[H+], so
 *
 *   [H+] = (C + sqrt(C^2 + 4*Kw)) / 2
 *
 * which reduces to -log10(C) whenever C dominates. Worked example and the same quadratic:
 * ChemTeam, "A trick pH question" (chemteam.info/AcidBase/Trick-pH-question.html).
 */
export const phStrongAcid = (molarity: number): number => {
  const c = Math.max(0, molarity);
  return phFromH((c + Math.sqrt(c * c + 4 * KW_25C)) / 2);
};

/** Strong monoprotic base, the same balance solved for hydroxide. */
export const phStrongBase = (molarity: number): number => {
  const c = Math.max(0, molarity);
  const oh = (c + Math.sqrt(c * c + 4 * KW_25C)) / 2;
  return phFromH(KW_25C / oh);
};

/**
 * Weak monoprotic acid, solved rather than approximated.
 *
 * The familiar pH = (pKa - log10 C)/2 assumes the acid barely dissociates, which fails
 * as soon as Ka approaches C: 10^-4 M of a pKa 3 acid is nearly half dissociated and the
 * approximation is half a pH unit out. This solves the charge balance
 *
 *   [H+] = [OH-] + [A-] = Kw/[H+] + C*Ka/(Ka + [H+])
 *
 * by bisection, so it stays correct for a strong-ish acid, a very dilute one, and a very
 * weak one alike — the last two tending to neutral from the acid side rather than
 * crossing it.
 */
export const phWeakAcid = (molarity: number, pKa: number): number => {
  const c = Math.max(0, molarity);
  const ka = Math.pow(10, -pKa);
  // Positive when the pH guess is too acidic, negative when too basic.
  const excess = (ph: number): number => {
    const h = Math.pow(10, -ph);
    return h - KW_25C / h - (c * ka) / (ka + h);
  };
  let low = -2;   // 100 M of a fully dissociated acid
  let high = 16;  // well past neutral; a pure acid can never reach it
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (excess(mid) > 0) low = mid; else high = mid;
  }
  return (low + high) / 2;
};

/** Henderson-Hasselbalch: pH = pKa + log₁₀([A⁻]/[HA]). */
export const phBuffer = (pKa: number, base: number, acid: number): number =>
  pKa + Math.log10(base / acid);

// ---------------------------------------------------------------------------
// Absorbance / transmittance
// ---------------------------------------------------------------------------

export const percentTfromA = (absorbance: number): number => Math.pow(10, 2 - absorbance);
export const aFromPercentT = (percentT: number): number => 2 - Math.log10(percentT);
