/**
 * Competent-cell transformation efficiency, in transformants (cfu) per µg of plasmid.
 *
 *   efficiency = colonies / µg of DNA on the plate
 *   µg on the plate = µg transformed × (volume plated / recovery volume) / dilution
 *
 * Checked against two manufacturers' worked examples: NEB's FAQ for C2925 (100 pg pUC19,
 * 1 mL recovery, 100 µL plated, 20 colonies → 2 × 10^6 cfu/µg) and Thermo Fisher's manual
 * for Library Efficiency DH5α (50 pg pUC19, 1 mL, 100 µL of a 1:10 dilution, 100 colonies
 * → 2 × 10^8 cfu/µg). NEB notes efficiency is highest with 100 pg-1 ng of supercoiled
 * pUC19 and that figures are only comparable under matched conditions.
 */

export interface PlatingSetup {
  /** DNA added to the cells, ng. */
  dnaNg: number;
  /** Total volume after recovery outgrowth, µL. */
  recoveryUl: number;
  /** Volume spread on the plate, µL. */
  platedUl: number;
  /** Fold dilution of the recovery before plating; 1 if plated neat. */
  dilution: number;
}

export const dnaPlatedUg = (s: PlatingSetup): number => {
  if (!(s.dnaNg > 0 && s.recoveryUl > 0 && s.platedUl > 0)) return 0;
  const fraction = Math.min(1, s.platedUl / s.recoveryUl);
  const dilution = s.dilution > 0 ? s.dilution : 1;
  return (s.dnaNg / 1000) * fraction / dilution;
};

export const transformationEfficiency = (s: PlatingSetup & { colonies: number }): number => {
  const ug = dnaPlatedUg(s);
  return ug > 0 ? Math.max(0, s.colonies) / ug : 0;
};

/** Colonies a given efficiency should produce on this plate. */
export const expectedColonies = (efficiency: number, s: PlatingSetup): number =>
  Math.max(0, efficiency) * dnaPlatedUg(s);
