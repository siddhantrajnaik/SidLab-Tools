import { describe, it, expect } from 'vitest';
import { ENZYMES, findSites, digest, isPalindromic, overhangLabel, type Enzyme } from './restriction';
import { reverseComplement } from './sequence';

const byName = (n: string): Enzyme => {
  const e = ENZYMES.find(x => x.name === n);
  if (!e) throw new Error(`no enzyme ${n}`);
  return e;
};

describe('enzyme table (REBASE)', () => {
  it('has unique names', () => {
    expect(new Set(ENZYMES.map(e => e.name)).size).toBe(ENZYMES.length);
  });

  it('uses only unambiguous bases in every recognition site', () => {
    for (const e of ENZYMES) expect(e.site, e.name).toMatch(/^[ACGT]+$/);
  });

  it('includes non-palindromic Type IIS enzymes', () => {
    const asym = ENZYMES.filter(e => !isPalindromic(e.site)).map(e => e.name);
    expect(asym).toEqual(expect.arrayContaining(['BsaI', 'BsmBI', 'BbsI', 'SapI']));
  });

  it('keeps the palindromic identity cutTop + cutBottom = site length', () => {
    // For a palindrome the two strands are equivalent, so the cuts must be symmetric
    // about the middle. This catches a mistyped offset.
    for (const e of ENZYMES.filter(x => isPalindromic(x.site))) {
      expect(e.cutTop + e.cutBottom, e.name).toBe(e.site.length);
    }
  });

  it('places Type IIS cuts beyond the recognition site', () => {
    for (const e of ENZYMES.filter(x => !isPalindromic(x.site))) {
      expect(e.cutTop, e.name).toBeGreaterThanOrEqual(e.site.length);
    }
  });

  it('matches REBASE for the classic overhangs', () => {
    expect(byName('EcoRI')).toMatchObject({ site: 'GAATTC', cutTop: 1, cutBottom: 5 }); // G^AATTC
    expect(byName('PstI')).toMatchObject({ site: 'CTGCAG', cutTop: 5, cutBottom: 1 });  // CTGCA^G
    expect(byName('EcoRV')).toMatchObject({ site: 'GATATC', cutTop: 3, cutBottom: 3 }); // GAT^ATC, blunt
    expect(byName('BsaI')).toMatchObject({ site: 'GGTCTC', cutTop: 7, cutBottom: 11 }); // GGTCTC(1/5)
  });

  it('describes overhangs the right way round', () => {
    // EcoRI leaves a 4-base 5' overhang; PstI a 4-base 3' overhang; EcoRV blunt ends.
    expect(overhangLabel(byName('EcoRI').cutBottom - byName('EcoRI').cutTop)).toBe("4 nt 5' overhang");
    expect(overhangLabel(byName('PstI').cutBottom - byName('PstI').cutTop)).toBe("4 nt 3' overhang");
    expect(overhangLabel(0)).toBe('blunt');
  });
});

describe('finding sites', () => {
  const pad = (n: number) => 'A'.repeat(n);

  it('finds a palindromic site once, not twice', () => {
    // A top-strand-only scan and a both-strand scan must agree for a palindrome.
    const seq = pad(20) + 'GAATTC' + pad(20);
    const sites = findSites(seq, [byName('EcoRI')]);
    expect(sites).toHaveLength(1);
    expect(sites[0].start).toBe(20);
    expect(sites[0].cut).toBe(21); // G^AATTC
  });

  it('finds a non-palindromic site on the forward strand', () => {
    const seq = pad(20) + 'GGTCTC' + pad(20);
    const [s] = findSites(seq, [byName('BsaI')]);
    expect(s.strand).toBe('top');
    expect(s.cut).toBe(20 + 7);        // cuts 1 nt past the site
    expect(s.cutBottom).toBe(20 + 11); // 4-base 5' overhang
    expect(s.overhang).toBe(4);
  });

  it('finds a non-palindromic site on the reverse strand — the old scan missed these', () => {
    const seq = pad(20) + reverseComplement('GGTCTC') + pad(20);
    const sites = findSites(seq, [byName('BsaI')]);
    expect(sites).toHaveLength(1);
    expect(sites[0].strand).toBe('bottom');
    // Reading right-to-left, the enzyme cuts upstream of the site in our coordinates.
    expect(sites[0].cut).toBe(20 + 6 - 11);
    expect(sites[0].cutBottom).toBe(20 + 6 - 7);
  });

  it('finds both orientations when both are present', () => {
    const seq = pad(20) + 'GGTCTC' + pad(40) + reverseComplement('GGTCTC') + pad(20);
    const sites = findSites(seq, [byName('BsaI')]);
    expect(sites).toHaveLength(2);
    expect(sites.map(s => s.strand).sort()).toEqual(['bottom', 'top']);
  });

  it('drops a Type IIS cut that falls off the end of a linear molecule', () => {
    // The site sits at the very end, so its downstream cut has nothing to cut.
    expect(findSites('AAAA' + 'GGTCTC', [byName('BsaI')])).toHaveLength(0);
  });

  it('finds a site straddling the origin of a circular molecule', () => {
    // GAATTC split across the join: TTC…GAA
    const plasmid = 'TTC' + pad(40) + 'GAA';
    expect(findSites(plasmid, [byName('EcoRI')], false)).toHaveLength(0);
    expect(findSites(plasmid, [byName('EcoRI')], true)).toHaveLength(1);
  });

  it('finds every occurrence, not just the first', () => {
    const seq = 'GAATTC' + pad(10) + 'GAATTC' + pad(10) + 'GAATTC';
    expect(findSites(seq, [byName('EcoRI')])).toHaveLength(3);
  });

  it('ignores whitespace, digits and case in the input', () => {
    expect(findSites('1 gaattc\n', [byName('EcoRI')])).toHaveLength(1);
  });

  it('returns nothing for an empty sequence', () => {
    expect(findSites('', ENZYMES)).toHaveLength(0);
  });
});

describe('digestion', () => {
  it('an uncut linear molecule is one full-length fragment', () => {
    expect(digest([], 1000)).toEqual([{ start: 0, end: 1000, length: 1000 }]);
  });

  it('one cut gives two linear fragments that sum to the whole', () => {
    const f = digest([300], 1000);
    expect(f.map(x => x.length)).toEqual([300, 700]);
    expect(f.reduce((s, x) => s + x.length, 0)).toBe(1000);
  });

  it('n cuts give n + 1 linear fragments', () => {
    expect(digest([100, 400, 700], 1000)).toHaveLength(4);
  });

  it('n cuts give n circular fragments', () => {
    expect(digest([100, 400, 700], 1000, true)).toHaveLength(3);
  });

  it('a single cut linearises a circle into one full-length fragment', () => {
    const f = digest([250], 1000, true);
    expect(f).toHaveLength(1);
    expect(f[0].length).toBe(1000);
  });

  it('circular fragments sum to the full length, including the wrap', () => {
    const f = digest([100, 400, 700], 1000, true);
    expect(f.reduce((s, x) => s + x.length, 0)).toBe(1000);
  });

  it('two enzymes cutting at the same position do not make a 0 bp fragment', () => {
    for (const circular of [false, true]) {
      expect(digest([500, 500], 1000, circular).every(f => f.length > 0)).toBe(true);
    }
  });
});
