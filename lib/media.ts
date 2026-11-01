/**
 * Antibiotic stocks and selection agents.
 *
 * Sources:
 *  - Addgene, "Pouring LB Agar Plates" (addgene.org/protocols/pouring-lb-agar-plates).
 *  - Gold Biotechnology, "How to Make Stock Solutions for Antibiotics and Cell Selection
 *    Agents" (goldbio.com), Table 1.
 * The two agree on every bacterial stock and working concentration listed here, and both
 * make stocks at 1000× so that the working concentration is a 1:1000 dilution. They
 * disagree on one solvent (tetracycline), which is recorded rather than resolved.
 *
 * Mammalian selection concentrations depend heavily on the cell line. Gold Biotechnology
 * gives each range for a named line; it is a starting point for a kill curve, not a dose.
 */

export interface Antibiotic {
  id: string;
  name: string;
  stockMgPerMl: number;
  workingUgPerMl: number;
  solvent: string;
  /** Present where the sources disagree about the solvent. */
  solventNote?: string;
  note?: string;
  sources: string[];
}

const ADDGENE = 'Addgene, Pouring LB Agar Plates';
const GOLDBIO = 'Gold Biotechnology, Stock Solutions for Antibiotics and Cell Selection Agents';

export const ANTIBIOTICS: Antibiotic[] = [
  { id: 'ampicillin', name: 'Ampicillin', stockMgPerMl: 100, workingUgPerMl: 100, solvent: 'Water', sources: [ADDGENE, GOLDBIO] },
  {
    id: 'carbenicillin', name: 'Carbenicillin', stockMgPerMl: 100, workingUgPerMl: 100, solvent: 'Water', sources: [ADDGENE, GOLDBIO],
    note: 'Addgene notes it can replace ampicillin and is more stable, but costs more.',
  },
  { id: 'kanamycin', name: 'Kanamycin', stockMgPerMl: 50, workingUgPerMl: 50, solvent: 'Water', sources: [ADDGENE, GOLDBIO] },
  { id: 'chloramphenicol', name: 'Chloramphenicol', stockMgPerMl: 25, workingUgPerMl: 25, solvent: '100% ethanol', sources: [ADDGENE, GOLDBIO] },
  { id: 'spectinomycin', name: 'Spectinomycin', stockMgPerMl: 50, workingUgPerMl: 50, solvent: 'Water', sources: [ADDGENE, GOLDBIO] },
  { id: 'gentamicin', name: 'Gentamicin', stockMgPerMl: 10, workingUgPerMl: 10, solvent: 'Water', sources: [ADDGENE, GOLDBIO] },
  {
    id: 'tetracycline', name: 'Tetracycline', stockMgPerMl: 10, workingUgPerMl: 10, solvent: 'Water or ethanol',
    solventNote: 'Addgene lists water; Gold Biotechnology says 100% ethanol because of poor water solubility. Check which salt form your bottle is.',
    sources: [ADDGENE, GOLDBIO],
  },
  { id: 'bleomycin', name: 'Bleomycin (Bleocin)', stockMgPerMl: 5, workingUgPerMl: 5, solvent: 'Water', sources: [ADDGENE, GOLDBIO] },
  { id: 'coumermycin', name: 'Coumermycin', stockMgPerMl: 25, workingUgPerMl: 25, solvent: 'DMSO', sources: [ADDGENE] },
];

export interface SelectionAgent {
  id: string;
  name: string;
  workingUgPerMl: [number, number];
  /** The line the range was established in. */
  cellLine: string;
  source: string;
}

export const SELECTION_AGENTS: SelectionAgent[] = [
  { id: 'puromycin', name: 'Puromycin', workingUgPerMl: [1, 2], cellLine: '293T', source: GOLDBIO },
  { id: 'blasticidin', name: 'Blasticidin', workingUgPerMl: [5, 15], cellLine: '293T', source: GOLDBIO },
  { id: 'hygromycin', name: 'Hygromycin B', workingUgPerMl: [100, 200], cellLine: '293T', source: GOLDBIO },
  { id: 'g418', name: 'G418 (Geneticin)', workingUgPerMl: [500, 1000], cellLine: 'HT1080', source: GOLDBIO },
];

export const antibioticById = (id: string): Antibiotic | undefined => ANTIBIOTICS.find(a => a.id === id);

/**
 * Stock to add, µL: working (µg/mL) × culture (mL) ÷ stock (mg/mL). The units work out
 * because 1 mg/mL is 1 µg/µL.
 */
export const stockVolumeUl = (workingUgPerMl: number, stockMgPerMl: number, cultureMl: number): number =>
  stockMgPerMl > 0 ? (workingUgPerMl * cultureMl) / stockMgPerMl : 0;

/** Powder to weigh for a stock, mg. */
export const powderMg = (stockMgPerMl: number, volumeMl: number): number => Math.max(0, stockMgPerMl * volumeMl);

/** Agar and stock needed for a batch of plates. */
export const stockForPlates = (plates: number, mlPerPlate: number, workingUgPerMl: number, stockMgPerMl: number) => {
  const agarMl = Math.max(0, plates) * Math.max(0, mlPerPlate);
  return { agarMl, stockUl: stockVolumeUl(workingUgPerMl, stockMgPerMl, agarMl) };
};
