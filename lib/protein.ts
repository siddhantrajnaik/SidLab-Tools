/**
 * Protein properties from an amino acid sequence.
 *
 * Residue masses are not tabulated here — they are derived from each residue's atomic
 * composition using the same NIST atomic weights as the formula calculator, so the two
 * tools cannot drift apart. A residue is the free amino acid minus one water.
 *
 * Sources:
 *  - Extinction coefficient: Pace, Vajdos, Fee, Grimsley & Gray, Protein Sci 4:2411-2423
 *    (1995), as used by ExPASy ProtParam: e(280) = nTrp*5500 + nTyr*1490 + nCystine*125.
 *  - pI: Bjellqvist et al., Electrophoresis 1993;14:1023-1031 and 1994;15:529-539 — the
 *    set ExPASy Compute pI/Mw uses, including the residue-specific terminal overrides.
 *  - GRAVY: Kyte & Doolittle, J Mol Biol 157:105-132 (1982).
 */
import { ATOMIC_WEIGHTS } from './formula';

/** Atomic composition of each residue (free amino acid less one water). */
export const RESIDUE_FORMULA: Record<string, Record<string, number>> = {
  G: { C: 2, H: 3, N: 1, O: 1 },
  A: { C: 3, H: 5, N: 1, O: 1 },
  S: { C: 3, H: 5, N: 1, O: 2 },
  P: { C: 5, H: 7, N: 1, O: 1 },
  V: { C: 5, H: 9, N: 1, O: 1 },
  T: { C: 4, H: 7, N: 1, O: 2 },
  C: { C: 3, H: 5, N: 1, O: 1, S: 1 },
  L: { C: 6, H: 11, N: 1, O: 1 },
  I: { C: 6, H: 11, N: 1, O: 1 },
  N: { C: 4, H: 6, N: 2, O: 2 },
  D: { C: 4, H: 5, N: 1, O: 3 },
  Q: { C: 5, H: 8, N: 2, O: 2 },
  K: { C: 6, H: 12, N: 2, O: 1 },
  E: { C: 5, H: 7, N: 1, O: 3 },
  M: { C: 5, H: 9, N: 1, O: 1, S: 1 },
  H: { C: 6, H: 7, N: 3, O: 1 },
  F: { C: 9, H: 9, N: 1, O: 1 },
  R: { C: 6, H: 12, N: 4, O: 1 },
  Y: { C: 9, H: 9, N: 1, O: 2 },
  W: { C: 11, H: 10, N: 2, O: 1 },
};

const massOf = (atoms: Record<string, number>) =>
  Object.entries(atoms).reduce((s, [el, n]) => s + ATOMIC_WEIGHTS[el] * n, 0);

/** Average residue masses, derived rather than transcribed. */
export const RESIDUE_MASS: Record<string, number> = Object.fromEntries(
  Object.entries(RESIDUE_FORMULA).map(([aa, atoms]) => [aa, massOf(atoms)])
);

export const WATER_MASS = massOf({ H: 2, O: 1 });

export const AA_NAMES: Record<string, string> = {
  A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly',
  H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser',
  T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val',
};

/** Kyte & Doolittle hydropathy. */
export const HYDROPATHY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

/** Molar absorptivity at 280 nm in water, M^-1 cm^-1 (Pace et al. 1995). */
export const EXT_TRP = 5500;
export const EXT_TYR = 1490;
export const EXT_CYSTINE = 125;

// Bjellqvist pKa values, as used by ExPASy Compute pI/Mw.
const POSITIVE_PK: Record<string, number> = { Nterm: 7.5, K: 10.0, R: 12.0, H: 5.98 };
const NEGATIVE_PK: Record<string, number> = { Cterm: 3.55, D: 4.05, E: 4.45, C: 9.0, Y: 10.0 };
/** The C-terminal residue shifts the C-terminal pKa for these residues. */
const PK_CTERMINAL: Record<string, number> = { D: 4.55, E: 4.75 };
/** Likewise the N-terminal residue shifts the N-terminal pKa. */
const PK_NTERMINAL: Record<string, number> = {
  A: 7.59, M: 7.0, S: 6.93, P: 8.36, T: 6.82, V: 7.44, E: 7.7,
};

/** Keep only the 20 standard one-letter codes. */
export const cleanProtein = (seq: string): string =>
  (seq || '').toUpperCase().replace(/[^A-Z]/g, '').split('').filter(c => c in RESIDUE_FORMULA).join('');

export const aaCounts = (seq: string): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const aa of Object.keys(RESIDUE_FORMULA)) counts[aa] = 0;
  for (const c of cleanProtein(seq)) counts[c]++;
  return counts;
};

/** Average molecular weight of the polypeptide, in Da. */
export const proteinMass = (seq: string): number => {
  const clean = cleanProtein(seq);
  if (!clean) return 0;
  return [...clean].reduce((s, aa) => s + RESIDUE_MASS[aa], 0) + WATER_MASS;
};

/** Total atomic composition of the polypeptide, including the terminal water. */
export const proteinAtoms = (seq: string): Record<string, number> => {
  const clean = cleanProtein(seq);
  if (!clean) return {};
  const atoms: Record<string, number> = { H: 2, O: 1 };
  for (const aa of clean) {
    for (const [el, n] of Object.entries(RESIDUE_FORMULA[aa])) atoms[el] = (atoms[el] || 0) + n;
  }
  return atoms;
};

/**
 * Net charge at a given pH, summing the Henderson-Hasselbalch contribution of every
 * ionisable group.
 */
export const chargeAtPh = (seq: string, pH: number): number => {
  const clean = cleanProtein(seq);
  if (!clean) return 0;
  const counts = aaCounts(clean);

  const nTermPk = PK_NTERMINAL[clean[0]] ?? POSITIVE_PK.Nterm;
  const cTermPk = PK_CTERMINAL[clean[clean.length - 1]] ?? NEGATIVE_PK.Cterm;

  let charge = 1 / (1 + Math.pow(10, pH - nTermPk));
  for (const aa of ['K', 'R', 'H']) {
    charge += counts[aa] / (1 + Math.pow(10, pH - POSITIVE_PK[aa]));
  }

  charge -= 1 / (1 + Math.pow(10, cTermPk - pH));
  for (const aa of ['D', 'E', 'C', 'Y']) {
    charge -= counts[aa] / (1 + Math.pow(10, NEGATIVE_PK[aa] - pH));
  }

  return charge;
};

/** Isoelectric point: the pH where net charge is zero, found by bisection. */
export const isoelectricPoint = (seq: string): number => {
  const clean = cleanProtein(seq);
  if (!clean) return 0;
  let low = 0;
  let high = 14;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const c = chargeAtPh(clean, mid);
    if (Math.abs(c) < 1e-9) return mid;
    if (c > 0) low = mid; else high = mid;
  }
  return (low + high) / 2;
};

export interface Extinction {
  /** Assuming all cysteines are paired into cystines. */
  reduced: number;
  oxidised: number;
  /** A(280) of a 1 mg/mL solution, ε divided by molecular weight. */
  a280Reduced: number;
  a280Oxidised: number;
  cystines: number;
}

/** Molar extinction coefficient at 280 nm (Pace et al. 1995). */
export const extinctionCoefficient = (seq: string): Extinction => {
  const counts = aaCounts(seq);
  const mass = proteinMass(seq);
  const cystines = Math.floor(counts.C / 2);
  const reduced = counts.W * EXT_TRP + counts.Y * EXT_TYR;
  const oxidised = reduced + cystines * EXT_CYSTINE;
  return {
    reduced,
    oxidised,
    cystines,
    a280Reduced: mass > 0 ? reduced / mass : 0,
    a280Oxidised: mass > 0 ? oxidised / mass : 0,
  };
};

/** Grand average of hydropathicity: mean Kyte-Doolittle value over the sequence. */
export const gravy = (seq: string): number => {
  const clean = cleanProtein(seq);
  if (!clean) return 0;
  return [...clean].reduce((s, aa) => s + HYDROPATHY[aa], 0) / clean.length;
};

/** Fraction of residues carrying a charge at neutral pH, a rough solubility hint. */
export const chargedFraction = (seq: string): number => {
  const clean = cleanProtein(seq);
  if (!clean) return 0;
  const counts = aaCounts(clean);
  const charged = counts.D + counts.E + counts.K + counts.R + counts.H;
  return charged / clean.length;
};
