/**
 * Shared nucleic-acid helpers.
 *
 * Reverse-complement logic was previously duplicated across the primer and restriction
 * pages; this is the single copy.
 */

/** Strip anything that is not a letter (digits, whitespace, FASTA line breaks) and upper-case. */
export const cleanSequence = (seq: string): string => seq.replace(/[^a-zA-Z]/g, '').toUpperCase();

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', U: 'A', N: 'N',
  // IUPAC ambiguity codes, complemented as their base sets require.
  R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K',
  B: 'V', V: 'B', D: 'H', H: 'D',
};

export const complementBase = (base: string): string => COMPLEMENT[base] ?? 'N';

export const complement = (seq: string): string =>
  seq.split('').map(complementBase).join('');

export const reverseComplement = (seq: string): string =>
  seq.split('').reverse().map(complementBase).join('');

/**
 * The standard genetic code (NCBI translation table 1). '*' marks a stop codon.
 */
export const GENETIC_CODE: Record<string, string> = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L',
  CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S',
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*',
  CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W',
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

/** Translate a DNA sequence from `frame` (0, 1 or 2). Unknown codons become 'X'. */
export const translate = (seq: string, frame = 0): string => {
  const dna = cleanSequence(seq).replace(/U/g, 'T');
  let out = '';
  for (let i = frame; i + 3 <= dna.length; i += 3) {
    out += GENETIC_CODE[dna.slice(i, i + 3)] ?? 'X';
  }
  return out;
};

/** Fractional GC content (0-1) over A/T/G/C only. */
export const gcFraction = (seq: string): number => {
  const s = cleanSequence(seq);
  const gc = (s.match(/[GC]/g) || []).length;
  const at = (s.match(/[AT]/g) || []).length;
  return gc + at === 0 ? 0 : gc / (gc + at);
};

/** Base composition counts, including anything non-ATGC as `other`. */
export const composition = (seq: string) => {
  const s = cleanSequence(seq);
  const count = (re: RegExp) => (s.match(re) || []).length;
  const a = count(/A/g), t = count(/T/g), g = count(/G/g), c = count(/C/g), u = count(/U/g);
  return { a, t, g, c, u, other: s.length - (a + t + g + c + u), length: s.length };
};

/**
 * Average molecular weights used for nucleic-acid mass/mole conversions.
 * These are the conventional approximations, not exact per-sequence masses.
 */
export const AVG_MW = {
  /** Da per base pair of double-stranded DNA. */
  dsDNAPerBp: 660,
  /** Da per nucleotide of single-stranded DNA. */
  ssDNAPerNt: 330,
  /** Da per nucleotide of RNA. */
  rnaPerNt: 340,
};

/** pmol of dsDNA in a given mass. */
export const pmolDsDNA = (massNg: number, lengthBp: number): number =>
  lengthBp > 0 ? (massNg * 1000) / (lengthBp * AVG_MW.dsDNAPerBp) : 0;
