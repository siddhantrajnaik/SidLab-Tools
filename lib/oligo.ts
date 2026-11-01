/**
 * Single-stranded DNA oligo quantification: nearest-neighbour extinction coefficient at
 * 260 nm, and conversions between OD260 units, nmol, µg and µM.
 *
 * Method: Cantor, Warshaw & Shapiro, Biopolymers 9:1059 (1970) — the nearest-neighbour
 * approach IDT and the other synthesis companies use. For 5'-N1 N2 … Nn-3':
 *
 *   ε260 = 2 × Σ ε(Ni Ni+1)  −  Σ ε(Ni) for the internal bases i = 2 … n−1
 *
 * Values are from TriLink BioTechnologies' table, "An Introduction to Extinction
 * Coefficients and Molecular Weights of Oligos" (trilinkbiotech.com), which lists each
 * dinucleotide per nucleotide (half the pair value — hence the factor of 2). They are in
 * OD units per µmol, i.e. 10^3 M⁻¹cm⁻¹. The table reproduces both TriLink's own worked
 * example and ATDBio's (dAGCGT, 50,200 M⁻¹cm⁻¹) exactly. TriLink notes the method can be off
 * by up to 10% against a measured value.
 *
 * Molecular weight is taken from lib/tm.ts so there is one definition of it.
 */
import { cleanSequence } from './sequence';

/** Per-nucleotide dinucleotide values, OD/µmol, read 5' → 3'. */
export const NN_EXTINCTION: Record<string, number> = {
  AA: 13.7, AC: 10.6, AG: 12.5, AT: 11.4,
  CA: 10.6, CC: 7.3, CG: 9.0, CT: 7.6,
  GA: 12.6, GC: 8.8, GG: 10.8, GT: 10.0,
  TA: 11.7, TC: 8.1, TG: 9.5, TT: 8.4,
};

/** Mononucleotide values, OD/µmol. */
export const MONO_EXTINCTION: Record<string, number> = { A: 15.4, C: 7.4, G: 11.5, T: 8.7 };

/** Molar extinction coefficient at 260 nm, M⁻¹cm⁻¹. Zero if the sequence has no A/C/G/T. */
export const extinction260 = (rawSeq: string): number => {
  const seq = cleanSequence(rawSeq).replace(/[^ACGT]/g, '');
  if (!seq) return 0;
  if (seq.length === 1) return MONO_EXTINCTION[seq] * 1000;
  let pairs = 0;
  for (let i = 0; i < seq.length - 1; i++) pairs += NN_EXTINCTION[seq.slice(i, i + 2)];
  let internal = 0;
  for (let i = 1; i < seq.length - 1; i++) internal += MONO_EXTINCTION[seq[i]];
  return (2 * pairs - internal) * 1000;
};

/** One OD260 unit is the amount giving A260 = 1 in 1 mL at 1 cm: nmol = OD × 10^6 / ε. */
export const nmolFromOD = (od: number, epsilon: number): number => (epsilon > 0 ? (od * 1e6) / epsilon : 0);
export const odFromNmol = (nmol: number, epsilon: number): number => (nmol * epsilon) / 1e6;

export const microgramsFromNmol = (nmol: number, mw: number): number => (nmol * mw) / 1000;
export const nmolFromMicrograms = (ug: number, mw: number): number => (mw > 0 ? (ug * 1000) / mw : 0);

/** Volume to dissolve a dry pellet in for a target concentration: µL = nmol / µM × 1000. */
export const resuspensionVolumeUl = (nmol: number, targetUM: number): number =>
  targetUM > 0 ? (nmol / targetUM) * 1000 : 0;

/** Stock concentration in µM from a measured A260 (Beer-Lambert), allowing for the dilution read. */
export const concentrationFromA260 = (a260: number, epsilon: number, dilutionFactor: number, pathCm: number): number =>
  epsilon > 0 && pathCm > 0 ? ((a260 / (epsilon * pathCm)) * dilutionFactor) * 1e6 : 0;
