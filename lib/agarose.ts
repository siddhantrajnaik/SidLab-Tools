/**
 * Agarose gel percentage, recipe and loading-dye migration.
 *
 * Published separation ranges genuinely disagree, so each source is kept as its own table
 * rather than blended into one: Green & Sambrook give 0.5% agarose a 2-50 kb range, Ausubel
 * et al. 1-30 kb. Both tables are as Thermo Fisher reproduces them:
 *  - Green MR, Sambrook J, Molecular Cloning: A Laboratory Manual, 4th ed. (CSHL Press,
 *    2012), pp. 81-156 — via Thermo Fisher, "Steps in Nucleic Acid Gel Electrophoresis",
 *    Tables 2 and 3.
 *  - Ausubel FM et al., Current Protocols in Molecular Biology (1995) — via Thermo Fisher,
 *    "Gel Electrophoresis Tables" (Ambion technical resources). Its 3-4% row is for
 *    sieving agarose, so it is not carried here as standard agarose.
 *
 * Dye apparent sizes: Yilmaz M, Ozic C, Gok I, "Principles of Nucleic Acid Separation by
 * Agarose Gel Electrophoresis", in Magdeldin S (ed.), Gel Electrophoresis: Principles and
 * Basics (InTech, 2012), pp. 33-40 — via the same Thermo Fisher page, Table 7.
 */

export interface RangeRow { percent: number; minBp: number; maxBp: number }

export interface SeparationTable {
  id: 'sambrook2012' | 'ausubel1995';
  label: string;
  citation: string;
  rows: RangeRow[];
}

export const SEPARATION_TABLES: SeparationTable[] = [
  {
    id: 'sambrook2012',
    label: 'Green & Sambrook 2012',
    citation: 'Green & Sambrook, Molecular Cloning, 4th ed. (2012), via Thermo Fisher',
    rows: [
      { percent: 0.5, minBp: 2000, maxBp: 50000 },
      { percent: 0.6, minBp: 1000, maxBp: 20000 },
      { percent: 0.7, minBp: 800, maxBp: 12000 },
      { percent: 0.8, minBp: 800, maxBp: 10000 },
      { percent: 0.9, minBp: 600, maxBp: 10000 },
      { percent: 1.0, minBp: 400, maxBp: 8000 },
      { percent: 1.2, minBp: 300, maxBp: 7000 },
      { percent: 1.5, minBp: 200, maxBp: 3000 },
      { percent: 2.0, minBp: 100, maxBp: 2000 },
      { percent: 3.0, minBp: 25, maxBp: 1000 },
      { percent: 4.0, minBp: 10, maxBp: 500 },
      { percent: 5.0, minBp: 10, maxBp: 300 },
    ],
  },
  {
    id: 'ausubel1995',
    label: 'Ausubel et al. 1995',
    citation: 'Ausubel et al., Current Protocols in Molecular Biology (1995), via Thermo Fisher',
    rows: [
      { percent: 0.5, minBp: 1000, maxBp: 30000 },
      { percent: 0.7, minBp: 800, maxBp: 12000 },
      { percent: 1.0, minBp: 500, maxBp: 10000 },
      { percent: 1.2, minBp: 400, maxBp: 7000 },
      { percent: 1.5, minBp: 200, maxBp: 3000 },
    ],
  },
];

/**
 * Gels whose range contains the fragment, ordered by how centrally it falls on a log
 * scale — gels resolve proportionally, so the middle of the range is in log terms.
 */
export const recommendPercent = (bp: number, tableId: SeparationTable['id']): RangeRow[] => {
  const table = SEPARATION_TABLES.find(t => t.id === tableId);
  if (!table || !(bp > 0)) return [];
  const offset = (r: RangeRow) => Math.abs(Math.log10(bp) - (Math.log10(r.minBp) + Math.log10(r.maxBp)) / 2);
  return table.rows
    .filter(r => bp >= r.minBp && bp <= r.maxBp)
    .sort((a, b) => offset(a) - offset(b));
};

export interface DyeRow { percent: number; bpbTBE: number; bpbTAE: number; xcTBE: number; xcTAE: number }

/** Apparent co-migration size, bp, of bromophenol blue and xylene cyanol FF. */
export const DYE_MIGRATION: DyeRow[] = [
  { percent: 0.5, bpbTBE: 750, bpbTAE: 1150, xcTBE: 13000, xcTAE: 16700 },
  { percent: 0.6, bpbTBE: 540, bpbTAE: 850, xcTBE: 8820, xcTAE: 11600 },
  { percent: 0.7, bpbTBE: 410, bpbTAE: 660, xcTBE: 6400, xcTAE: 8500 },
  { percent: 0.8, bpbTBE: 320, bpbTAE: 530, xcTBE: 4830, xcTAE: 6500 },
  { percent: 0.9, bpbTBE: 260, bpbTAE: 440, xcTBE: 3770, xcTAE: 5140 },
  { percent: 1.0, bpbTBE: 220, bpbTAE: 370, xcTBE: 3030, xcTAE: 4160 },
  { percent: 1.2, bpbTBE: 160, bpbTAE: 275, xcTBE: 2070, xcTAE: 2890 },
  { percent: 1.5, bpbTBE: 110, bpbTAE: 190, xcTBE: 1300, xcTAE: 1840 },
  { percent: 2.0, bpbTBE: 65, bpbTAE: 120, xcTBE: 710, xcTAE: 1040 },
  { percent: 3.0, bpbTBE: 30, bpbTAE: 60, xcTBE: 300, xcTAE: 460 },
  { percent: 4.0, bpbTBE: 18, bpbTAE: 40, xcTBE: 170, xcTAE: 260 },
  { percent: 5.0, bpbTBE: 12, bpbTAE: 27, xcTBE: 105, xcTAE: 165 },
];

/** The published row for exactly this percentage; no interpolation between rows. */
export const dyeSizes = (percent: number): DyeRow | undefined =>
  DYE_MIGRATION.find(r => Math.abs(r.percent - percent) < 1e-9);

/** Agarose is w/v: grams = percent × volume (mL) / 100. */
export const agaroseGrams = (percent: number, volumeMl: number): number =>
  Math.max(0, percent) * Math.max(0, volumeMl) / 100;

/** Running-buffer stock to add: volume × working X / stock X. */
export const bufferStockMl = (volumeMl: number, stockX: number, workingX: number): number =>
  stockX > 0 ? (Math.max(0, volumeMl) * Math.max(0, workingX)) / stockX : 0;
