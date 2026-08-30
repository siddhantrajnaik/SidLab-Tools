/**
 * Oligo secondary structure: self-dimers, cross-dimers and hairpins.
 *
 * These are the most common reasons a PCR fails despite a perfectly good Tm, so the
 * designer screens for them before recommending a pair.
 *
 * Method: slide the two strands against each other, take the most stable contiguous
 * run of complementary bases, and score it with the SantaLucia 1998 nearest-neighbour
 * stacking parameters as ΔG°37 = ΔH − T·ΔS at T = 310.15 K.
 *
 * This is a stacking-energy heuristic over contiguous pairing, not a full partition
 * function like mfold/UNAFold: it does not model bulges, internal loops, or the entropic
 * cost of a hairpin loop. Because it omits the destabilising loop term it errs toward
 * reporting structures as *more* stable than they are, which is the safe direction for a
 * warning. Treat the numbers as a screen, not a prediction.
 */
import { NN_PARAMS, NN_INIT_GC, NN_INIT_AT } from './tm';
import { cleanSequence } from './sequence';

/** Body temperature of the standard tables, in kelvin. */
const T37 = 310.15;

/** ΔG°37 in kcal/mol from ΔH (kcal/mol) and ΔS (cal/mol·K). */
export const dG37 = (dH: number, dS: number): number => dH - (T37 * dS) / 1000;

const PAIRS: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
const isPair = (x: string, y: string) => PAIRS[x] === y;

/**
 * IDT's published rules of thumb: any hairpin, self-dimer or hetero-dimer should be
 * weaker (more positive) than −9 kcal/mol, and structures involving the 3' end are held
 * to a stricter −5 kcal/mol because polymerase can extend from a paired 3' terminus.
 */
export const DG_LIMIT_INTERNAL = -9;
export const DG_LIMIT_THREE_PRIME = -5;

export type Severity = 'ok' | 'warn' | 'bad';

export interface Structure {
  /** ΔG°37 of the most stable run found, kcal/mol. 0 means nothing pairs. */
  dG: number;
  /** Number of base pairs in that run. */
  pairs: number;
  /** True when the run reaches into the last 5 bases of either strand's 3' end. */
  involves3Prime: number extends never ? never : boolean;
  /** Three lines ready to render in a monospace block. */
  diagram: string[];
  severity: Severity;
}

const EMPTY: Structure = { dG: 0, pairs: 0, involves3Prime: false, diagram: [], severity: 'ok' };

export const severityOf = (dG: number, involves3Prime: boolean): Severity => {
  const limit = involves3Prime ? DG_LIMIT_THREE_PRIME : DG_LIMIT_INTERNAL;
  if (dG > limit) return 'ok';
  // One and a half times past the limit is where a structure stops being a caution.
  return dG > limit * 1.5 ? 'warn' : 'bad';
};

/** ΔG of a contiguous duplex run, given the top-strand bases it spans. */
const runEnergy = (topRun: string): number => {
  if (topRun.length < 2) return 0;
  let dH = 0;
  let dS = 0;
  for (const base of [topRun[0], topRun[topRun.length - 1]]) {
    const init = base === 'G' || base === 'C' ? NN_INIT_GC : NN_INIT_AT;
    dH += init.dH;
    dS += init.dS;
  }
  for (let i = 0; i < topRun.length - 1; i++) {
    const nn = NN_PARAMS[topRun.slice(i, i + 2)];
    if (nn) { dH += nn.dH; dS += nn.dS; }
  }
  return dG37(dH, dS);
};

const THREE_PRIME_WINDOW = 5;

/**
 * Best (most stable) duplex between two oligos.
 *
 * `b` is pairing with `a` in antiparallel orientation, so it is walked in reverse.
 * Pass the same sequence twice for a self-dimer.
 */
export const worstDuplex = (aRaw: string, bRaw: string): Structure => {
  const a = cleanSequence(aRaw);
  const b = cleanSequence(bRaw);
  if (a.length < 2 || b.length < 2 || /[^ATGC]/.test(a) || /[^ATGC]/.test(b)) return EMPTY;

  const bRev = b.split('').reverse().join(''); // b written 3'→5'
  let best: Structure = EMPTY;

  for (let shift = -(b.length - 1); shift <= a.length - 1; shift++) {
    // Walk the overlap, tracking contiguous runs of complementary bases.
    let runStart = -1;
    const closeRun = (endExclusive: number) => {
      if (runStart < 0) return;
      const len = endExclusive - runStart;
      if (len >= 2) {
        const topRun = a.slice(runStart, endExclusive);
        const dG = runEnergy(topRun);
        // Does the run touch either 3' end? a's 3' end is its last base; b's 3' end is
        // bRev's first, which sits at alignment index -shift.
        const aThree = endExclusive > a.length - THREE_PRIME_WINDOW;
        const bStartInA = -shift; // index in `a` coordinates where b's 3' terminus lies
        const bThree = runStart <= bStartInA + THREE_PRIME_WINDOW - 1 && endExclusive > bStartInA;
        const involves3Prime = aThree || bThree;
        if (dG < best.dG) {
          best = {
            dG,
            pairs: len,
            involves3Prime,
            diagram: diagramFor(a, b, shift, runStart, endExclusive),
            severity: severityOf(dG, involves3Prime),
          };
        }
      }
      runStart = -1;
    };

    for (let i = 0; i < a.length; i++) {
      const j = i + shift;
      const paired = j >= 0 && j < bRev.length && isPair(a[i], bRev[j]);
      if (paired) { if (runStart < 0) runStart = i; }
      else closeRun(i);
    }
    closeRun(a.length);
  }

  return best;
};

/** Render the alignment as three monospace lines. */
const diagramFor = (a: string, b: string, shift: number, from: number, to: number): string[] => {
  const bRev = b.split('').reverse().join('');
  // Alignment index space runs from min(0, -shift) to max(a.length, bRev.length - shift).
  const left = Math.min(0, -shift);
  const pad = (n: number) => ' '.repeat(Math.max(0, n));

  const topLine = `5'-${pad(0 - left)}${a}-3'`;
  const botLine = `3'-${pad(-shift - left)}${bRev}-5'`;
  // Ticks sit under the paired region, offset by the "5'-" prefix and the top padding.
  const tickPad = 3 + (0 - left) + from;
  const bars = `${pad(tickPad)}${'|'.repeat(to - from)}`;
  return [topLine, bars, botLine];
};

export const selfDimer = (seq: string): Structure => worstDuplex(seq, seq);
export const crossDimer = (a: string, b: string): Structure => worstDuplex(a, b);

/**
 * Most stable hairpin: an inverted repeat within one oligo, separated by a loop of at
 * least three bases (the minimum a nucleic-acid loop can close).
 */
export const MIN_LOOP = 3;

export const hairpin = (raw: string): Structure => {
  const seq = cleanSequence(raw);
  if (seq.length < 2 * 2 + MIN_LOOP || /[^ATGC]/.test(seq)) return EMPTY;

  let best: Structure = EMPTY;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + MIN_LOOP + 1; j < seq.length; j++) {
      // Grow a stem outward from (i, j) while the bases pair.
      let len = 0;
      while (
        i + len < j - len &&
        j - len < seq.length &&
        j - len - (i + len) - 1 >= MIN_LOOP &&
        isPair(seq[i + len], seq[j - len])
      ) len++;
      if (len < 2) continue;

      const stem = seq.slice(i, i + len);
      const dG = runEnergy(stem);
      const involves3Prime = j >= seq.length - THREE_PRIME_WINDOW;
      if (dG < best.dG) {
        const loop = seq.slice(i + len, j - len + 1);
        best = {
          dG,
          pairs: len,
          involves3Prime,
          diagram: [
            `5'-${seq.slice(0, i)}${stem}`,
            `   ${' '.repeat(i)}${'|'.repeat(len)}   loop ${loop.length} nt`,
            `3'-${seq.slice(j + 1).split('').reverse().join('')}${seq.slice(j - len + 1, j + 1).split('').reverse().join('')}`,
          ],
          severity: severityOf(dG, involves3Prime),
        };
      }
    }
  }
  return best;
};

/** Worst severity across a set of structures, for a single pass/fail on a pair. */
export const worstSeverity = (...s: Structure[]): Severity =>
  s.some(x => x.severity === 'bad') ? 'bad'
    : s.some(x => x.severity === 'warn') ? 'warn'
      : 'ok';

/**
 * Penalty added to a candidate pair's score. Structures that would kill a reaction cost
 * far more than a couple of degrees of Tm mismatch, so the weights are deliberately large.
 */
export const structurePenalty = (s: Structure): number => {
  if (s.severity === 'ok') return 0;
  const limit = s.involves3Prime ? DG_LIMIT_THREE_PRIME : DG_LIMIT_INTERNAL;
  const excess = limit - s.dG; // how far past the limit, in kcal/mol
  return excess * (s.involves3Prime ? 4 : 2);
};
