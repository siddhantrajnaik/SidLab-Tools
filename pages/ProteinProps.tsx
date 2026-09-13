import React, { useMemo, useState } from 'react';
import { RefreshCw, Printer, Dna, Info } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/UI';
import {
  cleanProtein, aaCounts, proteinMass, proteinAtoms, AA_NAMES,
  isoelectricPoint, chargeAtPh, extinctionCoefficient, gravy, chargedFraction,
} from '../lib/protein';
import { formatFormula } from '../lib/formula';

/** Bovine insulin A chain and a signal peptide: one acidic, one basic. */
const EXAMPLES = [
  { label: 'Insulin A chain', seq: 'GIVEQCCTSICSLYQLENYCN' },
  { label: 'Serum albumin signal', seq: 'MKWVTFISLLLLFSSAYSRGVFRR' },
  { label: 'All 20 residues', seq: 'ACDEFGHIKLMNPQRSTVWY' },
];

const Stat: React.FC<{ label: string; value: string; unit?: string; hint?: string }> = ({ label, value, unit, hint }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-baseline">
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      {unit && <span className="text-sm font-medium text-slate-500 ml-1.5">{unit}</span>}
    </div>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const ProteinProps: React.FC = () => {
  const [raw, setRaw] = useState(EXAMPLES[1].seq);

  const seq = useMemo(() => cleanProtein(raw), [raw]);
  const counts = useMemo(() => aaCounts(seq), [seq]);
  const ext = useMemo(() => extinctionCoefficient(seq), [seq]);
  const mass = proteinMass(seq);
  const pI = seq ? isoelectricPoint(seq) : 0;

  // Residues that were typed but are not among the 20 standard ones.
  const dropped = (raw.toUpperCase().match(/[A-Z]/g) || []).length - seq.length;

  const ordered = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Protein Properties"
        description="Molecular weight, pI, extinction coefficient and hydropathy from a sequence."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Sequence" action={
            <Button variant="ghost" size="sm" onClick={() => setRaw('')} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Clear
            </Button>
          }>
            <div className="space-y-5">
              <textarea
                value={raw}
                onChange={e => setRaw(e.target.value)}
                spellCheck={false}
                rows={7}
                placeholder="Paste a one-letter amino acid sequence. FASTA headers, numbers and spaces are ignored."
                className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3.5 px-4 text-slate-900 font-mono text-sm leading-relaxed focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">{seq.length} residues</span>
                {dropped > 0 && (
                  <span className="text-amber-600 font-medium">
                    {dropped} non-standard character{dropped === 1 ? '' : 's'} ignored
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Examples</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map(e => (
                    <button
                      key={e.label}
                      onClick={() => setRaw(e.seq)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        seq === e.seq
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {seq && (
            <Card title="Composition">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-sm">
                {ordered.filter(aa => counts[aa] > 0).map(aa => (
                  <div key={aa} className="flex items-baseline justify-between border-b border-slate-50 py-1">
                    <span className="font-mono font-bold text-slate-700">{aa}</span>
                    <span className="text-[11px] text-slate-400 mr-auto ml-1.5">{AA_NAMES[aa]}</span>
                    <span className="font-mono text-slate-900 font-bold">{counts[aa]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4 font-mono">
                {formatFormula(proteinAtoms(seq))}
              </p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title="Result" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {seq ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Stat label="Molecular weight" value={mass.toFixed(2)} unit="Da" hint={`${(mass / 1000).toFixed(2)} kDa`} />
                  <Stat label="Isoelectric point" value={pI.toFixed(2)} hint={`net charge ${chargeAtPh(seq, 7).toFixed(1)} at pH 7`} />
                  <Stat label="GRAVY" value={gravy(seq).toFixed(3)} hint={gravy(seq) > 0 ? 'hydrophobic overall' : 'hydrophilic overall'} />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">A280 quantification</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Feed the molar coefficient straight into the Protein Concentration tool.
                      </p>
                    </div>
                  </div>

                  {ext.reduced === 0 ? (
                    <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                      <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      No Trp, Tyr or Cys — this protein does not absorb at 280 nm, so A280 cannot
                      be used to quantify it. Use a Bradford or BCA assay instead.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-1">Cys reduced</p>
                        <p className="text-2xl font-bold text-amber-600">{ext.reduced.toLocaleString()} <span className="text-sm font-medium text-slate-400">M⁻¹cm⁻¹</span></p>
                        <p className="text-xs text-slate-500 mt-1">A280 of 1 mg/mL = {ext.a280Reduced.toFixed(3)}</p>
                      </div>
                      {ext.cystines > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1">
                            Cys as {ext.cystines} cystine{ext.cystines === 1 ? '' : 's'}
                          </p>
                          <p className="text-2xl font-bold text-slate-700">{ext.oxidised.toLocaleString()} <span className="text-sm font-medium text-slate-400">M⁻¹cm⁻¹</span></p>
                          <p className="text-xs text-slate-500 mt-1">A280 of 1 mg/mL = {ext.a280Oxidised.toFixed(3)}</p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 leading-relaxed sm:pt-5">
                          {counts.C === 0
                            ? 'No cysteines, so nothing changes on oxidation — this one coefficient is the whole story.'
                            : 'A single cysteine cannot pair into a cystine, so the oxidised coefficient is the same.'}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-4 font-mono">
                    ε = {counts.W}×5500 + {counts.Y}×1490 + {ext.cystines}×125
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Net charge against pH</p>
                  <div className="flex items-end gap-1 h-24">
                    {Array.from({ length: 28 }, (_, i) => {
                      const pH = (i + 1) * 0.5;
                      const q = chargeAtPh(seq, pH);
                      const scale = Math.max(1, Math.abs(chargeAtPh(seq, 0.5)), Math.abs(chargeAtPh(seq, 14)));
                      const height = Math.min(48, (Math.abs(q) / scale) * 48);
                      return (
                        <div key={pH} className="flex-1 flex flex-col justify-center h-full" title={`pH ${pH}: ${q.toFixed(2)}`}>
                          <div className="h-1/2 flex items-end">
                            {q > 0 && <div className="w-full rounded-t bg-sky-400" style={{ height: `${height}px` }} />}
                          </div>
                          <div className="h-px bg-slate-200" />
                          <div className="h-1/2 flex items-start">
                            {q < 0 && <div className="w-full rounded-b bg-rose-400" style={{ height: `${height}px` }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                    <span>pH 0.5</span>
                    <span className="font-bold text-slate-600">pI {pI.toFixed(2)}</span>
                    <span>pH 14</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    A protein is least soluble at its pI, where it carries no net charge.{' '}
                    {(chargedFraction(seq) * 100).toFixed(0)}% of these residues are ionisable.
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                  Extinction coefficients from Pace et al., Protein Sci 4:2411 (1995). pI from the
                  Bjellqvist pKa set used by ExPASy Compute pI/Mw. Hydropathy from Kyte &amp; Doolittle
                  (1982). Residue masses are derived from NIST atomic weights, so they agree with the
                  Molecular Weight tool exactly.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <Dna size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                <p className="font-medium text-slate-500">Paste a sequence</p>
                <p className="text-sm mt-2 max-w-[260px]">
                  One-letter codes. You get the weight, the pI, and the extinction coefficient the
                  A280 calculation needs.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProteinProps;
