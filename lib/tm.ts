/**
 * Oligonucleotide thermodynamics: nearest-neighbour Tm and polymerase annealing rules.
 *
 * Kept out of the page component so the numbers can be tested directly — this is the
 * calculation that was previously reading ~12 °C low.
 */
import { cleanSequence } from './sequence';

export interface PrimerResult {
  seq: string;
  cleanSeq: string;
  length: number;
  gc: number;
  tmBasic: number;
  tmNN: number;
  molecularWeight: number;
  isValid: boolean;
  error?: string;
}

/** SantaLucia 1998 unified nearest-neighbour parameters (kcal/mol and cal/mol·K). */
export const NN_PARAMS: Record<string, { dH: number; dS: number }> = {
  AA: { dH: -7.9, dS: -22.2 }, TT: { dH: -7.9, dS: -22.2 },
  AT: { dH: -7.2, dS: -20.4 }, TA: { dH: -7.2, dS: -21.3 },
  CA: { dH: -8.5, dS: -22.7 }, TG: { dH: -8.5, dS: -22.7 },
  GT: { dH: -8.4, dS: -22.4 }, AC: { dH: -8.4, dS: -22.4 },
  CT: { dH: -7.8, dS: -21.0 }, AG: { dH: -7.8, dS: -21.0 },
  GA: { dH: -8.2, dS: -22.2 }, TC: { dH: -8.2, dS: -22.2 },
  CG: { dH: -10.6, dS: -27.2 }, GC: { dH: -9.8, dS: -24.4 },
  GG: { dH: -8.0, dS: -19.9 }, CC: { dH: -8.0, dS: -19.9 },
};

export const NN_INIT_GC = { dH: 0.1, dS: -2.8 };
export const NN_INIT_AT = { dH: 2.3, dS: 4.1 };

/** Per-base molecular weights for a 5'-OH oligo, in Da. */
const BASE_MW = { A: 313.2, C: 289.2, G: 329.2, T: 304.2 } as const;
const OLIGO_MW_OFFSET = -61.96;

export interface SaltConditions {
  /** Na+ / K+, mM. */
  monovalentMM: number;
  /** Mg2+, mM. */
  mgMM: number;
  /** Total dNTPs, mM. */
  dNTPsMM: number;
}

/** A standard PCR: 50 mM monovalent, 1.5 mM Mg2+, 200 µM of each dNTP. */
export const DEFAULT_SALT: SaltConditions = { monovalentMM: 50, mgMM: 1.5, dNTPsMM: 0.8 };

/**
 * Effective monovalent cation concentration in mol/L.
 *
 * dNTPs chelate Mg2+ roughly 1:1, so only free Mg2+ counts; it is converted to a
 * monovalent equivalent by [MVC] = 3.795·√[Mg2+] (von Ahsen, Wittwer & Schütz,
 * Brief Bioinform 12(5):514-517, 2011, Eq. 2 — the conversion Primer3 codes as
 * 120·√mM). Valid below 8 mM Mg2+.
 */
export const effectiveMonovalent = (salt: SaltConditions): number => {
  const freeMgM = Math.max(0, salt.mgMM - salt.dNTPsMM) / 1000;
  return salt.monovalentMM / 1000 + 3.795 * Math.sqrt(freeMgM);
};

/** Summed nearest-neighbour enthalpy and entropy, including initiation terms. */
export const thermodynamics = (cleanSeq: string): { dH: number; dS: number } => {
  let dH = 0;
  let dS = 0;
  for (const base of [cleanSeq[0], cleanSeq[cleanSeq.length - 1]]) {
    const init = base === 'G' || base === 'C' ? NN_INIT_GC : NN_INIT_AT;
    dH += init.dH;
    dS += init.dS;
  }
  for (let i = 0; i < cleanSeq.length - 1; i++) {
    const pair = NN_PARAMS[cleanSeq.slice(i, i + 2)];
    if (pair) { dH += pair.dH; dS += pair.dS; }
  }
  return { dH, dS };
};

export const calculatePrimerProps = (
  rawSeq: string,
  primerConcNm: number,
  salt: SaltConditions = DEFAULT_SALT
): PrimerResult => {
  const cleanSeq = cleanSequence(rawSeq);
  const base = { seq: rawSeq, cleanSeq, length: cleanSeq.length, gc: 0, tmBasic: 0, tmNN: 0, molecularWeight: 0 };

  if (!cleanSeq) return { ...base, length: 0, isValid: false };
  if (/[^ATGC]/.test(cleanSeq)) return { ...base, isValid: false, error: 'Contains non-ATGC' };

  const length = cleanSeq.length;
  const n = (re: RegExp) => (cleanSeq.match(re) || []).length;
  const g = n(/G/g), c = n(/C/g), a = n(/A/g), t = n(/T/g);
  const gc = ((g + c) / length) * 100;
  const molecularWeight =
    a * BASE_MW.A + c * BASE_MW.C + g * BASE_MW.G + t * BASE_MW.T + OLIGO_MW_OFFSET;

  // Wallace rule below 14 nt, salt-adjusted GC formula above it.
  const tmBasic = length < 14 ? (a + t) * 2 + (g + c) * 4 : 64.9 + (41 * (g + c - 16.4)) / length;

  const withBasics = { ...base, length, gc, tmBasic, molecularWeight };

  if (!(primerConcNm > 0)) {
    return { ...withBasics, isValid: false, error: 'Primer concentration must be > 0 nM' };
  }

  const mvc = effectiveMonovalent(salt);
  if (!(mvc > 0)) return { ...withBasics, isValid: false, error: 'Salt concentration must be > 0' };

  const { dH, dS } = thermodynamics(cleanSeq);

  // The SantaLucia parameters are for 1 M NaCl and the salt effect is entropic, so the
  // correction goes on dS rather than onto Tm:
  //     dS[salt] = dS[1 M NaCl] + 0.368·(N − 1)·ln[MVC]      (same ref, Eq. 1)
  const dSsalt = dS + 0.368 * (length - 1) * Math.log(mvc);

  const R = 1.987;
  // Non-self-complementary duplex with both strands at C: the CT/4 term becomes C/2, and
  // the value supplied is the concentration of each primer.
  const k = (primerConcNm * 1e-9) / 2;
  const tmNN = (dH * 1000) / (dSsalt + R * Math.log(k)) - 273.15;

  if (!isFinite(tmNN)) {
    return { ...withBasics, isValid: false, error: 'Tm could not be computed for this sequence' };
  }

  return { ...withBasics, tmNN, isValid: true };
};

export type Polymerase = 'taq' | 'q5' | 'phusion';

/**
 * Recommended annealing temperature, keyed off the lower-Tm primer.
 *
 * - Q5: 3 °C above that Tm, capped at 72 °C (NEB Q5 protocol, M0491/M0492).
 * - Phusion: +3 °C for primers longer than 20 nt, else the Tm itself, capped at 72 °C
 *   (Thermo Phusion product information sheet).
 * - Taq: the long-standing Tm − 5 °C rule of thumb.
 */
export const annealingTemp = (
  polymerase: Polymerase,
  fwd: { tmNN: number; length: number },
  rev: { tmNN: number; length: number }
): number => {
  const limiting = fwd.tmNN <= rev.tmNN ? fwd : rev;
  const tm = limiting.tmNN;
  if (polymerase === 'q5') return Math.min(72, Math.round(tm + 3));
  if (polymerase === 'phusion') return Math.min(72, Math.round(tm + (limiting.length > 20 ? 3 : 0)));
  return Math.round(tm - 5);
};
