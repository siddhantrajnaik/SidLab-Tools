/**
 * Nucleic acid copy number, and dilution series for qPCR standards.
 *
 *   copies = mass (g) × N_A / (length × mass per bp or nt)
 *
 * N_A is exact since the 2019 SI redefinition: 6.02214076 × 10^23 mol⁻¹ (NIST CODATA).
 *
 * The per-unit masses are the app's shared averages from lib/sequence.ts, so this tool
 * agrees with the Ligation and DNA/RNA tools. Calculators split between 650 and 660 g/mol
 * per base pair; from the nucleotide residue masses in lib/tm.ts an average base pair is
 * 617.9 g/mol as the free acid and 661.9 as the sodium salt DNA is handled in, which is
 * where 660 sits. The two conventions differ by 1.5%.
 */
import { AVG_MW } from './sequence';
import { BASE_MW } from './tm';
import { ATOMIC_WEIGHTS } from './formula';

export const AVOGADRO = 6.02214076e23;

export type Molecule = 'dsDNA' | 'ssDNA' | 'RNA';

export const MW_PER_UNIT: Record<Molecule, number> = {
  dsDNA: AVG_MW.dsDNAPerBp,
  ssDNA: AVG_MW.ssDNAPerNt,
  RNA: AVG_MW.rnaPerNt,
};

/** Mean mass of an A·T and a G·C pair, as the free acid and as the disodium salt. */
export const averageBasePairMass = () => {
  const freeAcid = (BASE_MW.A + BASE_MW.T + BASE_MW.G + BASE_MW.C) / 2;
  return { freeAcid, sodiumSalt: freeAcid + 2 * (ATOMIC_WEIGHTS.Na - ATOMIC_WEIGHTS.H) };
};

/** Copies in a given mass, ng. */
export const copiesFromMass = (massNg: number, length: number, molecule: Molecule): number =>
  length > 0 ? ((massNg * 1e-9) * AVOGADRO) / (length * MW_PER_UNIT[molecule]) : 0;

/** Mass, ng, of a given number of copies. */
export const massFromCopies = (copies: number, length: number, molecule: Molecule): number =>
  length > 0 ? ((copies * length * MW_PER_UNIT[molecule]) / AVOGADRO) * 1e9 : 0;

export interface SeriesInput {
  stockPerUl: number;
  topPerUl: number;
  points: number;
  fold: number;
  /** Final volume made up in each tube, µL. */
  volumeUl: number;
}

export interface SeriesStep {
  perUl: number;
  /** Volume taken from the stock (first tube) or the previous tube. */
  transferUl: number;
  diluentUl: number;
  /** What is left in the tube once its transfer to the next has been taken. */
  leftUl: number;
  /** Below about 1 µL, pipetting error dominates; dilute in more steps instead. */
  tooSmall: boolean;
}

const MIN_PIPETTE_UL = 1;

export const dilutionSeries = (input: SeriesInput): { steps: SeriesStep[]; error?: string } => {
  const { stockPerUl, topPerUl, fold, volumeUl } = input;
  const points = Math.floor(input.points);
  if (!(stockPerUl > 0 && topPerUl > 0 && volumeUl > 0 && points >= 1)) return { steps: [], error: 'Enter positive values.' };
  if (topPerUl > stockPerUl) return { steps: [], error: 'The top standard cannot be more concentrated than the stock.' };
  if (!(fold > 1)) return { steps: [], error: 'The fold must be greater than 1.' };

  const steps: SeriesStep[] = [];
  for (let i = 0; i < points; i++) {
    const perUl = topPerUl / Math.pow(fold, i);
    const source = i === 0 ? stockPerUl : steps[i - 1].perUl;
    const transferUl = (perUl * volumeUl) / source;
    steps.push({ perUl, transferUl, diluentUl: volumeUl - transferUl, leftUl: volumeUl, tooSmall: transferUl < MIN_PIPETTE_UL });
  }
  // Each tube but the last gives its next neighbour that neighbour's transfer volume.
  for (let i = 0; i < steps.length - 1; i++) steps[i].leftUl = volumeUl - steps[i + 1].transferUl;
  return { steps };
};
