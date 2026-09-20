/**
 * Chemical formula parsing and molecular weight.
 *
 * Atomic weights were extracted programmatically rather than transcribed, from NIST's
 * "Atomic Weights and Isotopic Compositions" (physics.nist.gov) for elements that have a
 * single value, and from CIAAW's Abridged Standard Atomic Weights 2024
 * (ciaaw.org/abridged-atomic-weights.htm) for the fifteen whose isotopic composition
 * varies enough in nature that the standard weight is published as an interval: H, Li, B,
 * C, N, O, Ne, Mg, Si, S, Cl, Ar, Br, Tl and Pb.
 *
 * Those fifteen use CIAAW's *conventional* value — the one to use when the material's
 * origin is unknown, which is the case for anything out of a reagent bottle. Averaging
 * the interval instead is close for most of them and wrong for lithium: [6.938, 6.997]
 * has a midpoint of 6.9675, but commercial lithium is depleted in 6Li and the accepted
 * value is 6.94. The midpoint put LiCl 0.03 g/mol high.
 */

export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008, He: 4.002602, Li: 6.94, Be: 9.012183, B: 10.81, C: 12.011, N: 14.007,
  O: 15.999, F: 18.998403, Ne: 20.18, Na: 22.989769, Mg: 24.305, Al: 26.981538, Si: 28.085,
  P: 30.973762, S: 32.06, Cl: 35.45, Ar: 39.95, K: 39.0983, Ca: 40.078, Sc: 44.955908,
  Ti: 47.867, V: 50.9415, Cr: 51.9961, Mn: 54.938044, Fe: 55.845, Co: 58.933194, Ni: 58.6934,
  Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.921595, Se: 78.971, Br: 79.904,
  Kr: 83.798, Rb: 85.4678, Sr: 87.62, Y: 88.90584, Zr: 91.224, Nb: 92.90637, Mo: 95.95, Tc: 98,
  Ru: 101.07, Rh: 102.9055, Pd: 106.42, Ag: 107.8682, Cd: 112.414, In: 114.818, Sn: 118.71,
  Sb: 121.76, Te: 127.6, I: 126.90447, Xe: 131.293, Cs: 132.905452, Ba: 137.327, La: 138.90547,
  Ce: 140.116, Pr: 140.90766, Nd: 144.242, Pm: 145, Sm: 150.36, Eu: 151.964, Gd: 157.25,
  Tb: 158.92535, Dy: 162.5, Ho: 164.93033, Er: 167.259, Tm: 168.93422, Yb: 173.054,
  Lu: 174.9668, Hf: 178.49, Ta: 180.94788, W: 183.84, Re: 186.207, Os: 190.23, Ir: 192.217,
  Pt: 195.084, Au: 196.966569, Hg: 200.592, Tl: 204.38, Pb: 207.2, Bi: 208.9804, Po: 209,
  At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Th: 232.0377, Pa: 231.03588, U: 238.02891,
  Np: 237, Pu: 244,
};

export interface ParsedFormula {
  /** Element symbol to atom count. */
  atoms: Record<string, number>;
  /** Molecular weight in g/mol, 0 when the formula is empty or invalid. */
  mass: number;
  error?: string;
}

/**
 * Parse a chemical formula into element counts.
 *
 * Handles nested groups — Ca(OH)2, K3[Fe(CN)6] — and hydrates written with a dot or a
 * middle dot, as in CuSO4·5H2O. Element symbols are case sensitive, as chemistry
 * requires: Co is cobalt, CO is carbon monoxide.
 */
export const parseFormula = (input: string): ParsedFormula => {
  const text = (input || '').replace(/\s+/g, '');
  if (!text) return { atoms: {}, mass: 0 };

  // A hydrate dot multiplies everything that follows it, so split there first.
  const parts = text.split(/[·.*]/);
  const total: Record<string, number> = {};

  for (const part of parts) {
    if (!part) continue;
    // A leading integer multiplies the whole part: the "5" of 5H2O.
    const lead = part.match(/^(\d+)(.*)$/);
    const multiplier = lead ? parseInt(lead[1], 10) : 1;
    const body = lead ? lead[2] : part;
    if (!body) return { atoms: {}, mass: 0, error: `Nothing to multiply in "${part}"` };

    const parsed = parseGroup(body);
    if (parsed.error) return { atoms: {}, mass: 0, error: parsed.error };
    for (const [el, n] of Object.entries(parsed.atoms)) {
      total[el] = (total[el] || 0) + n * multiplier;
    }
  }

  const unknown = Object.keys(total).find(el => !(el in ATOMIC_WEIGHTS));
  if (unknown) return { atoms: {}, mass: 0, error: `Unknown element "${unknown}"` };

  const mass = Object.entries(total).reduce((sum, [el, n]) => sum + ATOMIC_WEIGHTS[el] * n, 0);
  return { atoms: total, mass };
};

/** Parse one bracket-balanced group, recursing into nested brackets. */
const parseGroup = (text: string): { atoms: Record<string, number>; error?: string } => {
  const atoms: Record<string, number> = {};
  let i = 0;

  const add = (el: string, n: number) => { atoms[el] = (atoms[el] || 0) + n; };
  const readCount = (): number => {
    const m = text.slice(i).match(/^\d+/);
    if (!m) return 1;
    i += m[0].length;
    return parseInt(m[0], 10);
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '(' || ch === '[') {
      const close = ch === '(' ? ')' : ']';
      let depth = 1;
      const start = ++i;
      while (i < text.length && depth > 0) {
        if (text[i] === ch) depth++;
        else if (text[i] === close) depth--;
        if (depth > 0) i++;
      }
      if (depth !== 0) return { atoms: {}, error: `Unclosed "${ch}"` };
      const inner = parseGroup(text.slice(start, i));
      if (inner.error) return inner;
      i++; // step past the closing bracket
      const n = readCount();
      for (const [el, c] of Object.entries(inner.atoms)) add(el, c * n);
      continue;
    }

    if (ch === ')' || ch === ']') return { atoms: {}, error: `Unmatched "${ch}"` };

    const sym = text.slice(i).match(/^[A-Z][a-z]?/);
    if (!sym) return { atoms: {}, error: `Unexpected "${ch}"` };
    i += sym[0].length;
    add(sym[0], readCount());
  }

  return { atoms };
};

/** Element counts rendered back as a formula, in Hill order (C, then H, then alphabetical). */
export const formatFormula = (atoms: Record<string, number>): string => {
  const keys = Object.keys(atoms).filter(k => atoms[k] > 0);
  const rest = keys.filter(k => k !== 'C' && k !== 'H').sort();
  const ordered = [...(atoms.C ? ['C'] : []), ...(atoms.H ? ['H'] : []), ...rest];
  return ordered.map(el => (atoms[el] === 1 ? el : `${el}${atoms[el]}`)).join('');
};

/** Percentage by mass contributed by each element, heaviest first. */
export const massPercent = (atoms: Record<string, number>): { element: string; percent: number; mass: number }[] => {
  const total = Object.entries(atoms).reduce((s, [el, n]) => s + (ATOMIC_WEIGHTS[el] || 0) * n, 0);
  if (total <= 0) return [];
  return Object.entries(atoms)
    .map(([element, n]) => {
      const mass = (ATOMIC_WEIGHTS[element] || 0) * n;
      return { element, mass, percent: (mass / total) * 100 };
    })
    .sort((a, b) => b.percent - a.percent);
};
