/**
 * Buffer selection and recipes, with a real temperature model.
 *
 * A buffer's pKa is not a constant — it moves with temperature, and for Tris it moves
 * enough to ruin an experiment: a Tris buffer titrated to pH 8.0 on the bench reads about
 * pH 8.6 in a 4 degrees C cold room. Most tables paper over this with a single
 * "dpKa/dT" coefficient. This module instead carries the underlying thermodynamics and
 * computes pKa at any temperature, which is both more accurate and self-checking.
 *
 * Source for every number below: Goldberg, Kishore & Lennen, "Thermodynamic Quantities
 * for the Ionization Reactions of Buffers", J. Phys. Chem. Ref. Data 31(2):231-370 (2002)
 * -- a NIST critical evaluation. Section 8 of that review tabulates, for each ionization
 * reaction at T = 298.15 K and I = 0: pK, the standard molar enthalpy of ionization
 * dH (kJ/mol) and the standard molar heat capacity change dCp (J/K/mol). Those three
 * numbers are what is stored here.
 *
 * The temperature model is the integrated van 't Hoff equation with a constant dCp:
 *
 *   pK(T) = pK(Tr) + [ (dH - dCp*Tr)(1/T - 1/Tr) - dCp*ln(T/Tr) ] / (R*ln10)
 *
 * It is validated in the tests against pK values measured at other temperatures in the
 * same review -- Tris at 0, 20 and 35 degrees C, HEPES at 5 and 50 -- which it reproduces
 * to within 0.005 pH units.
 */

/** Gas constant, J/(K*mol), as used in the source review. */
export const R_GAS = 8.31451;
/** Reference temperature of the tabulated values, K. */
export const T_REF = 298.15;
const R_LN10 = R_GAS * Math.LN10;

export const kelvin = (celsius: number): number => celsius + 273.15;

export interface Buffer {
  id: string;
  name: string;
  /** pK of the buffering ionization at 25 degrees C, I = 0. */
  pKa25: number;
  /** Standard molar enthalpy of that ionization, kJ/mol. */
  dH: number;
  /** Standard molar heat capacity change, J/(K*mol). */
  dCp: number;
  /** What you titrate with to move towards the basic form. */
  note?: string;
}

/**
 * Buffers a molecular biology bench actually reaches for, in pKa order.
 *
 * Polyprotic acids appear once per useful ionization, because each one buffers a
 * different part of the pH scale: phosphate at pH 7 is the H2PO4- / HPO4^2- pair, and
 * that pair's pK is 7.198, not phosphate's first or third.
 */
export const BUFFERS: Buffer[] = [
  { id: 'citrate1', name: 'Citrate (pKa1)', pKa25: 3.128, dH: 4.07, dCp: -131 },
  { id: 'succinate1', name: 'Succinate (pKa1)', pKa25: 4.207, dH: 3.0, dCp: -121 },
  { id: 'citrate2', name: 'Citrate (pKa2)', pKa25: 4.761, dH: 2.23, dCp: -178 },
  { id: 'acetate', name: 'Acetate', pKa25: 4.756, dH: -0.41, dCp: -142 },
  { id: 'succinate2', name: 'Succinate (pKa2)', pKa25: 5.636, dH: -0.5, dCp: -217 },
  { id: 'mes', name: 'MES', pKa25: 6.270, dH: 14.8, dCp: 5 },
  { id: 'citrate3', name: 'Citrate (pKa3)', pKa25: 6.396, dH: -3.38, dCp: -254 },
  { id: 'bistris', name: 'Bis-Tris', pKa25: 6.484, dH: 28.4, dCp: -7 },
  { id: 'aces', name: 'ACES', pKa25: 6.847, dH: 30.43, dCp: -49 },
  { id: 'mopso', name: 'MOPSO', pKa25: 6.90, dH: 25.0, dCp: 38 },
  { id: 'imidazole', name: 'Imidazole', pKa25: 6.993, dH: 36.64, dCp: -9 },
  { id: 'pipes', name: 'PIPES', pKa25: 7.141, dH: 11.2, dCp: -2 },
  { id: 'mops', name: 'MOPS', pKa25: 7.184, dH: 21.1, dCp: -5 },
  { id: 'bes', name: 'BES', pKa25: 7.187, dH: 24.25, dCp: -2 },
  { id: 'phosphate2', name: 'Phosphate (pKa2)', pKa25: 7.198, dH: 3.6, dCp: -230 },
  { id: 'tes', name: 'TES', pKa25: 7.550, dH: 32.13, dCp: 0 },
  { id: 'hepes', name: 'HEPES', pKa25: 7.564, dH: 20.4, dCp: 47 },
  { id: 'heppso', name: 'HEPPSO', pKa25: 8.042, dH: 23.70, dCp: 47 },
  { id: 'tris', name: 'Tris', pKa25: 8.072, dH: 47.45, dCp: -59 },
  { id: 'tricine', name: 'Tricine', pKa25: 8.135, dH: 31.37, dCp: -53 },
  { id: 'glygly', name: 'Glycylglycine', pKa25: 8.265, dH: 43.4, dCp: -16 },
  { id: 'bicine', name: 'Bicine', pKa25: 8.334, dH: 26.34, dCp: 0 },
  { id: 'taps', name: 'TAPS', pKa25: 8.44, dH: 40.4, dCp: 15 },
  { id: 'borate', name: 'Borate', pKa25: 9.237, dH: 13.8, dCp: -240 },
  { id: 'ammonia', name: 'Ammonia', pKa25: 9.245, dH: 51.95, dCp: 8 },
  { id: 'ches', name: 'CHES', pKa25: 9.394, dH: 39.55, dCp: 9 },
  { id: 'glycine2', name: 'Glycine (pKa2)', pKa25: 9.780, dH: 44.2, dCp: -57 },
  { id: 'carbonate2', name: 'Carbonate (pKa2)', pKa25: 10.329, dH: 14.70, dCp: -249 },
  { id: 'caps', name: 'CAPS', pKa25: 10.499, dH: 48.1, dCp: 57 },
];

export const bufferById = (id: string): Buffer | undefined => BUFFERS.find(b => b.id === id);

/**
 * pKa at an arbitrary temperature, from the integrated van 't Hoff equation with a
 * constant heat capacity change. dH is stored in kJ/mol and converted here.
 */
export const pKaAt = (buffer: Buffer, tempC: number): number => {
  const T = kelvin(tempC);
  if (T <= 0) return buffer.pKa25;
  const dH = buffer.dH * 1000;
  const shift =
    ((dH - buffer.dCp * T_REF) * (1 / T - 1 / T_REF) - buffer.dCp * Math.log(T / T_REF)) / R_LN10;
  return buffer.pKa25 + shift;
};

/**
 * Slope of that curve, in pH units per degree C -- the "dpKa/dT" that buffer tables
 * quote. Here it falls out of the enthalpy rather than being a separate tabulated number:
 * dpK/dT = -dH(T) / (R*ln10*T^2), with dH(T) = dH(Tr) + dCp*(T - Tr).
 */
export const dpKadT = (buffer: Buffer, tempC = 25): number => {
  const T = kelvin(tempC);
  const dH = buffer.dH * 1000 + buffer.dCp * (T - T_REF);
  return -dH / (R_LN10 * T * T);
};

/** Conventional useful range: one pH unit either side of the pKa at that temperature. */
export const usefulRange = (buffer: Buffer, tempC = 25): [number, number] => {
  const pKa = pKaAt(buffer, tempC);
  return [pKa - 1, pKa + 1];
};

/** Fraction of the buffer in its basic form at a given pH (Henderson-Hasselbalch). */
export const baseFraction = (pH: number, pKa: number): number =>
  1 / (1 + Math.pow(10, pKa - pH));

export interface BufferRecipe {
  /** pKa of the chosen buffer at the working temperature. */
  pKa: number;
  /** Moles of the acidic and basic forms needed. */
  acidMol: number;
  baseMol: number;
  /** [base]/[acid], the ratio the Henderson-Hasselbalch equation gives. */
  ratio: number;
  /** True when the target pH sits within one unit of the pKa. */
  inRange: boolean;
  /** Buffer capacity, mol per litre per pH unit, at the target pH. */
  capacity: number;
}

/**
 * How much of each form to weigh out.
 *
 * Both forms are given because that is how a buffer is actually made when you have the
 * acid and the salt on the shelf (e.g. KH2PO4 and K2HPO4). Titrating one form with a
 * strong acid or base to the target pH gets you to the same place.
 */
export const bufferRecipe = (
  buffer: Buffer,
  targetPh: number,
  tempC: number,
  molarity: number,
  volumeL: number
): BufferRecipe => {
  const pKa = pKaAt(buffer, tempC);
  const fBase = baseFraction(targetPh, pKa);
  const total = Math.max(0, molarity) * Math.max(0, volumeL);
  return {
    pKa,
    acidMol: total * (1 - fBase),
    baseMol: total * fBase,
    ratio: fBase >= 1 ? Infinity : fBase / (1 - fBase),
    inRange: Math.abs(targetPh - pKa) <= 1,
    // van Slyke: beta = 2.303 * C * Ka[H+] / (Ka + [H+])^2, which reduces to
    // 2.303 * C * f * (1 - f) with f the fraction in the basic form.
    capacity: Math.LN10 * Math.max(0, molarity) * fBase * (1 - fBase),
  };
};

/**
 * The pH a buffer will actually have at a different temperature from the one it was
 * titrated at. The acid/base ratio is fixed once the buffer is made, so the pH tracks the
 * pKa exactly: pH(T2) = pH(T1) + pKa(T2) - pKa(T1).
 */
export const phAfterTempChange = (
  buffer: Buffer,
  phAtPrep: number,
  prepC: number,
  useC: number
): number => phAtPrep + pKaAt(buffer, useC) - pKaAt(buffer, prepC);

/** Buffers whose range covers a target pH at a given temperature, best-centred first. */
export const suggestBuffers = (targetPh: number, tempC = 25): Buffer[] =>
  BUFFERS
    .map(b => ({ b, offset: Math.abs(targetPh - pKaAt(b, tempC)) }))
    .filter(x => x.offset <= 1)
    .sort((a, b) => a.offset - b.offset)
    .map(x => x.b);
