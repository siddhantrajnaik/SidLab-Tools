import React, { useState } from 'react';
import { RefreshCw, Printer, Dna, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { AVG_MW } from '../lib/sequence';
import { nucleicConcentration, A260_FACTORS } from '../lib/labmath';

/**
 * Absorbance-to-concentration factors at A260 with a 1 cm path length, in ng/µL per
 * absorbance unit. These are the conventional values used by NanoDrop and equivalent
 * instruments.
 */
type Species = 'dsDNA' | 'ssDNA' | 'RNA';

const SPECIES: Record<Species, { label: string; factor: number; mwPerUnit: number; unit: string; idealA260280: [number, number] }> = {
  dsDNA: { label: 'Double-stranded DNA', factor: 50, mwPerUnit: AVG_MW.dsDNAPerBp, unit: 'bp', idealA260280: [1.7, 1.9] },
  ssDNA: { label: 'Single-stranded DNA / oligo', factor: 33, mwPerUnit: AVG_MW.ssDNAPerNt, unit: 'nt', idealA260280: [1.7, 1.9] },
  RNA:   { label: 'RNA', factor: 40, mwPerUnit: AVG_MW.rnaPerNt, unit: 'nt', idealA260280: [1.9, 2.1] },
};

const NucleicAcid: React.FC = () => {
  const [species, setSpecies] = useState<Species>('dsDNA');
  const [a260, setA260] = useState<number | ''>('');
  const [a280, setA280] = useState<number | ''>('');
  const [a230, setA230] = useState<number | ''>('');
  const [dilution, setDilution] = useState<number | ''>(1);
  const [pathLength, setPathLength] = useState<number | ''>(1);
  const [length, setLength] = useState<number | ''>('');

  const cfg = SPECIES[species];
  // Factors come from lib/labmath so the tests guard the same numbers the page uses.
  void A260_FACTORS;
  const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

  const A = safeNum(a260);
  const path = safeNum(pathLength);
  const df = safeNum(dilution);
  const hasA260 = a260 !== '' && A > 0 && path > 0 && df > 0;

  // c (ng/µL) = A260 × factor × dilution / path length
  const concNgUl = hasA260 ? nucleicConcentration(A, species, df, path) : 0;
  const concUgMl = concNgUl; // ng/µL and µg/mL are the same number.

  // Molarity needs the length: mass / (length × average MW per unit).
  const len = safeNum(length);
  const molarity = len > 0 ? (concNgUl * 1e-9 / 1e-6) / (len * cfg.mwPerUnit) : 0; // g/L ÷ (g/mol) = mol/L

  const ratio260280 = a280 !== '' && safeNum(a280) > 0 ? A / safeNum(a280) : null;
  const ratio260230 = a230 !== '' && safeNum(a230) > 0 ? A / safeNum(a230) : null;

  const verdict260280 = ratio260280 === null ? null
    : ratio260280 >= cfg.idealA260280[0] && ratio260280 <= cfg.idealA260280[1]
      ? { ok: true, text: `Clean — within the ${cfg.idealA260280[0]}–${cfg.idealA260280[1]} window for ${species}.` }
      : ratio260280 < cfg.idealA260280[0]
        ? { ok: false, text: 'Low — suggests protein, phenol or other contamination absorbing at 280 nm.' }
        : { ok: false, text: 'High — unusual; check the blank and that the right species is selected.' };

  const verdict260230 = ratio260230 === null ? null
    : ratio260230 >= 2.0 && ratio260230 <= 2.2
      ? { ok: true, text: 'Clean — within the usual 2.0–2.2 window.' }
      : { ok: false, text: 'Outside 2.0–2.2 — often guanidine, phenol, EDTA or carbohydrate carryover.' };

  const reset = () => {
    setA260(''); setA280(''); setA230(''); setDilution(1); setPathLength(1); setLength('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nucleic Acid Quantification"
        description="Concentration and purity of DNA or RNA from absorbance readings."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card title="Readings" action={
            <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Reset
            </Button>
          }>
            <div className="space-y-6">
              <Select label="Sample Type" value={species} onChange={e => setSpecies(e.target.value as Species)}>
                {(Object.keys(SPECIES) as Species[]).map(s => (
                  <option key={s} value={s}>{SPECIES[s].label} — 1 A₂₆₀ = {SPECIES[s].factor} ng/µL</option>
                ))}
              </Select>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Absorbance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="A₂₆₀" value={a260} onChange={e => setA260(num(e.target.value))} placeholder="e.g. 0.85" />
                  <Input label="A₂₈₀ (opt)" value={a280} onChange={e => setA280(num(e.target.value))} placeholder="purity" />
                  <Input label="A₂₃₀ (opt)" value={a230} onChange={e => setA230(num(e.target.value))} placeholder="purity" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Dilution Factor" value={dilution} onChange={e => setDilution(num(e.target.value))} placeholder="1 = undiluted" />
                <Input label="Path Length (cm)" value={pathLength} onChange={e => setPathLength(num(e.target.value))} placeholder="1" unit="cm" />
              </div>

              <Input
                label={`Fragment Length (optional, for molarity)`}
                value={length}
                onChange={e => setLength(num(e.target.value))}
                placeholder={`e.g. 5000`}
                unit={cfg.unit}
              />

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-700 leading-relaxed flex items-start">
                <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                A NanoDrop reports a path-length-corrected A₂₆₀ already, so leave path length at 1.
                Only change it if you are reading raw absorbance from a cuvette of a different depth.
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card title="Results" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {hasA260 ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Concentration</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-900 mr-2">{concNgUl.toFixed(1)}</span>
                    <span className="text-lg font-medium text-slate-500">ng/µL</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-2 space-y-1 font-mono">
                    <p>{concUgMl.toFixed(1)} µg/mL</p>
                    <p>{(concNgUl / 1000).toFixed(4)} µg/µL</p>
                    {len > 0 && <p className="text-slate-900 font-bold">{formatScientific(molarity * 1e9)} nM</p>}
                  </div>
                </div>

                {(verdict260280 || verdict260230) && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Purity</h4>
                    {verdict260280 && (
                      <div className={`p-4 rounded-2xl border text-sm ${verdict260280.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="flex items-center">
                            {verdict260280.ok ? <CheckCircle size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5" />}
                            A₂₆₀/A₂₈₀
                          </span>
                          <span className="font-mono">{ratio260280!.toFixed(2)}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{verdict260280.text}</p>
                      </div>
                    )}
                    {verdict260230 && (
                      <div className={`p-4 rounded-2xl border text-sm ${verdict260230.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="flex items-center">
                            {verdict260230.ok ? <CheckCircle size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5" />}
                            A₂₆₀/A₂₃₀
                          </span>
                          <span className="font-mono">{ratio260230!.toFixed(2)}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{verdict260230.text}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-slate-500 font-mono bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-sans font-semibold text-slate-900">Equation</span>
                    <span className="font-bold">c = A₂₆₀ · f · DF / l</span>
                  </div>
                  <p>f = {cfg.factor} ng/µL per A₂₆₀ ({species})</p>
                  <p>DF = {df} · l = {path} cm</p>
                  {len > 0 && <p>MW ≈ {cfg.mwPerUnit} Da per {cfg.unit}</p>}
                </div>

                {A > 1.0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    A₂₆₀ above ~1.0 is outside the reliably linear range of most spectrophotometers. Dilute and re-read.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <Dna size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                <p className="font-medium text-slate-500">Enter an A₂₆₀ reading</p>
                <p className="text-sm mt-2 max-w-[200px]">Add A₂₈₀ and A₂₃₀ to check the sample for contamination.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NucleicAcid;
