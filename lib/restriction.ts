/**
 * Restriction site finding and virtual digestion.
 *
 * Enzyme specifications are taken from REBASE (rebase.neb.com), the canonical restriction
 * enzyme database, and were extracted from its bionet listing rather than transcribed by
 * hand.
 *
 * Coordinates: `cutTop` and `cutBottom` are both measured from the 5' end of the
 * recognition site on the top strand, and count the bases *before* the cut. So EcoRI
 * (G^AATTC) has cutTop 1 and cutBottom 5, leaving a 4-base 5' overhang. For Type IIS
 * enzymes the cut lies beyond the site, so the offsets simply exceed the site length.
 */
import { cleanSequence, reverseComplement } from './sequence';

export interface Enzyme {
  name: string;
  site: string;
  cutTop: number;
  cutBottom: number;
}

export const ENZYMES: Enzyme[] = [
  { name: 'EcoRI', site: 'GAATTC', cutTop: 1, cutBottom: 5 },
  { name: 'BamHI', site: 'GGATCC', cutTop: 1, cutBottom: 5 },
  { name: 'HindIII', site: 'AAGCTT', cutTop: 1, cutBottom: 5 },
  { name: 'NotI', site: 'GCGGCCGC', cutTop: 2, cutBottom: 6 },
  { name: 'XbaI', site: 'TCTAGA', cutTop: 1, cutBottom: 5 },
  { name: 'SpeI', site: 'ACTAGT', cutTop: 1, cutBottom: 5 },
  { name: 'PstI', site: 'CTGCAG', cutTop: 5, cutBottom: 1 },
  { name: 'SalI', site: 'GTCGAC', cutTop: 1, cutBottom: 5 },
  { name: 'EcoRV', site: 'GATATC', cutTop: 3, cutBottom: 3 },
  { name: 'XhoI', site: 'CTCGAG', cutTop: 1, cutBottom: 5 },
  { name: 'KpnI', site: 'GGTACC', cutTop: 5, cutBottom: 1 },
  { name: 'SacI', site: 'GAGCTC', cutTop: 5, cutBottom: 1 },
  { name: 'SmaI', site: 'CCCGGG', cutTop: 3, cutBottom: 3 },
  { name: 'NcoI', site: 'CCATGG', cutTop: 1, cutBottom: 5 },
  { name: 'NdeI', site: 'CATATG', cutTop: 2, cutBottom: 4 },
  { name: 'BglII', site: 'AGATCT', cutTop: 1, cutBottom: 5 },
  { name: 'NheI', site: 'GCTAGC', cutTop: 1, cutBottom: 5 },
  { name: 'AgeI', site: 'ACCGGT', cutTop: 1, cutBottom: 5 },
  { name: 'MluI', site: 'ACGCGT', cutTop: 1, cutBottom: 5 },
  { name: 'SphI', site: 'GCATGC', cutTop: 5, cutBottom: 1 },
  { name: 'ApaI', site: 'GGGCCC', cutTop: 5, cutBottom: 1 },
  { name: 'PvuII', site: 'CAGCTG', cutTop: 3, cutBottom: 3 },
  { name: 'HpaI', site: 'GTTAAC', cutTop: 3, cutBottom: 3 },
  { name: 'StuI', site: 'AGGCCT', cutTop: 3, cutBottom: 3 },
  { name: 'AflII', site: 'CTTAAG', cutTop: 1, cutBottom: 5 },
  { name: 'AvrII', site: 'CCTAGG', cutTop: 1, cutBottom: 5 },
  { name: 'SacII', site: 'CCGCGG', cutTop: 4, cutBottom: 2 },
  { name: 'DraI', site: 'TTTAAA', cutTop: 3, cutBottom: 3 },
  // Type IIS: asymmetric sites that cut downstream. These are the reason both strands
  // must be scanned — a top-strand-only search misses every site on the reverse strand.
  { name: 'BsaI', site: 'GGTCTC', cutTop: 7, cutBottom: 11 },
  { name: 'BsmBI', site: 'CGTCTC', cutTop: 7, cutBottom: 11 },
  { name: 'BbsI', site: 'GAAGAC', cutTop: 8, cutBottom: 12 },
  { name: 'SapI', site: 'GCTCTTC', cutTop: 8, cutBottom: 11 },
];

export const isPalindromic = (site: string): boolean => reverseComplement(site) === site;

export interface Site {
  enzyme: Enzyme;
  strand: 'top' | 'bottom';
  /** 0-based index where the recognition sequence starts on the top strand. */
  start: number;
  /** Top-strand cut position: the number of bases before the cut. */
  cut: number;
  /** Bottom-strand cut position, in the same coordinate frame. */
  cutBottom: number;
  /** cutBottom − cut. Positive is a 5' overhang, negative a 3' overhang, 0 is blunt. */
  overhang: number;
}

/**
 * All sites for the given enzymes.
 *
 * Palindromic sites are found once by a top-strand scan. Non-palindromic sites must also
 * be searched for as their reverse complement, and their cut coordinates mirrored: a site
 * occupying top-strand positions [p, p+L-1] on the bottom strand has its enzyme reading
 * right-to-left, so the enzyme's top-strand cut lands on our bottom strand and vice versa.
 */
export const findSites = (sequence: string, enzymes: Enzyme[], isCircular = false): Site[] => {
  const seq = cleanSequence(sequence);
  const len = seq.length;
  if (!len) return [];

  const longest = Math.max(...enzymes.map(e => e.site.length), 0);
  // On a circular molecule a site can straddle the origin, so scan a wrapped copy.
  const search = isCircular ? seq + seq.slice(0, Math.max(0, longest - 1)) : seq;

  const sites: Site[] = [];

  const record = (enzyme: Enzyme, p: number, strand: 'top' | 'bottom') => {
    const L = enzyme.site.length;
    const rawCut = strand === 'top' ? p + enzyme.cutTop : p + L - enzyme.cutBottom;
    const rawBottom = strand === 'top' ? p + enzyme.cutBottom : p + L - enzyme.cutTop;
    // A Type IIS cut can fall off the end of a linear molecule; there is nothing to cut.
    if (!isCircular && (rawCut < 0 || rawCut > len || rawBottom < 0 || rawBottom > len)) return;
    sites.push({
      enzyme,
      strand,
      start: p % len,
      cut: ((rawCut % len) + len) % len,
      cutBottom: ((rawBottom % len) + len) % len,
      overhang: rawBottom - rawCut,
    });
  };

  for (const enzyme of enzymes) {
    const patterns: [string, 'top' | 'bottom'][] = isPalindromic(enzyme.site)
      ? [[enzyme.site, 'top']]
      : [[enzyme.site, 'top'], [reverseComplement(enzyme.site), 'bottom']];

    for (const [pattern, strand] of patterns) {
      let p = search.indexOf(pattern);
      while (p !== -1) {
        if (p < len) record(enzyme, p, strand);
        p = search.indexOf(pattern, p + 1);
      }
    }
  }

  return sites.sort((a, b) => a.cut - b.cut || a.enzyme.name.localeCompare(b.enzyme.name));
};

export interface Fragment {
  start: number;
  end: number;
  length: number;
}

/** Fragments produced by cutting at the given top-strand positions. */
export const digest = (cutPositions: number[], length: number, isCircular = false): Fragment[] => {
  if (length <= 0) return [];
  const cuts = [...new Set(cutPositions)].sort((a, b) => a - b);
  if (!cuts.length) return [{ start: 0, end: length, length }];

  if (isCircular) {
    // n cuts give n fragments; the last runs from the final cut round to the first.
    return cuts.map((c, i) => {
      const next = cuts[(i + 1) % cuts.length];
      return {
        start: c,
        end: next,
        length: i === cuts.length - 1 ? length - c + cuts[0] : next - c,
      };
    });
  }

  const bounds = [...new Set([0, ...cuts, length])].sort((a, b) => a - b);
  return bounds.slice(0, -1).map((start, i) => ({
    start,
    end: bounds[i + 1],
    length: bounds[i + 1] - start,
  }));
};

/** How an end looks after cutting, for display. */
export const overhangLabel = (overhang: number): string =>
  overhang === 0 ? 'blunt' : `${Math.abs(overhang)} nt ${overhang > 0 ? "5'" : "3'"} overhang`;
