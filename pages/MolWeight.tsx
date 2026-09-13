import React, { useMemo, useState } from 'react';
import { RefreshCw, Printer, Beaker, AlertTriangle, ArrowRight } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { parseFormula, formatFormula, massPercent } from '../lib/formula';
import { massFromMolarity } from '../lib/labmath';

/** Reagents that turn up constantly at the bench, as a starting point. */
const COMMON = [
  { label: 'NaCl', formula: 'NaCl' },
  { label: 'Tris base', formula: 'C4H11NO3' },
  { label: 'HEPES', formula: 'C8H18N2O4S' },
  { label: 'EDTA·2Na·2H₂O', formula: 'C10H14N2Na2O8·2H2O' },
  { label: 'Glucose', formula: 'C6H12O6' },
  { label: 'KH₂PO₄', formula: 'KH2PO4' },
  { label: 'Na₂HPO₄', formula: 'Na2HPO4' },
  { label: 'MgCl₂·6H₂O', formula: 'MgCl2·6H2O' },
  { label: 'CuSO₄·5H₂O', formula: 'CuSO4·5H2O' },
  { label: 'Glycine', formula: 'C2H5NO2' },
];

const MolWeight: React.FC = () => {
  const [formula, setFormula] = useState('C4H11NO3');
  const [molarity, setMolarity] = useState<number | ''>(1);
  const [volume, setVolume] = useState<number | ''>(100);

  const parsed = useMemo(() => parseFormula(formula), [formula]);
  const rows = useMemo(() => massPercent(parsed.atoms), [parsed]);

  const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

  // Volume is entered in mL, so convert to litres for the mass calculation.
  const grams = parsed.mass > 0
    ? massFromMolarity(safeNum(molarity), safeNum(volume) / 1000, parsed.mass)
    : 0;

  const atomCount = Object.values(parsed.atoms).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Molecular Weight"
        description="Molecular weight from a chemical formula, and how much to weigh out."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <Card title="Formula" action={
            <Button variant="ghost" size="sm" onClick={() => setFormula('')} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Clear
            </Button>
          }>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-900 ml-1 mb-2 block">Chemical Formula</label>
                <input
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                  spellCheck={false}
                  placeholder="e.g. C6H12O6, Ca(OH)2, CuSO4·5H2O"
                  className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3.5 px-4 text-slate-900 font-mono text-lg focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
                <p className="text-xs text-slate-500 mt-2 ml-1 leading-relaxed">
                  Case matters — <span className="font-mono">Co</span> is cobalt,{' '}
                  <span className="font-mono">CO</span> is carbon monoxide. Brackets nest, and a dot
                  starts a hydrate: <span className="font-mono">CuSO4·5H2O</span>.
                </p>
              </div>

              {parsed.error && (
                <div className="flex items-center p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> {parsed.error}
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Common reagents</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON.map(c => (
                    <button
                      key={c.label}
                      onClick={() => setFormula(c.formula)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        formula === c.formula
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3">Weigh out</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Concentration" value={molarity} onChange={e => setMolarity(num(e.target.value))} unit="M" />
                  <Input label="Volume" value={volume} onChange={e => setVolume(num(e.target.value))} unit="mL" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <Card title="Result" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {parsed.mass > 0 ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Molecular Weight</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-900 mr-2">{parsed.mass.toFixed(3)}</span>
                    <span className="text-lg font-medium text-slate-500">g/mol</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 font-mono">
                    {formatFormula(parsed.atoms)} · {atomCount} atoms
                  </p>
                </div>

                {safeNum(molarity) > 0 && safeNum(volume) > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Weigh out</p>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-rose-600 mr-2">{formatScientific(grams, 4)}</span>
                      <span className="text-lg font-medium text-slate-500">g</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      for {volume} mL of {molarity} M
                    </p>
                    <p className="text-xs text-slate-400 mt-3 font-mono">
                      {molarity} mol/L × {safeNum(volume) / 1000} L × {parsed.mass.toFixed(3)} g/mol
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3">Composition</h4>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Element</th>
                          <th className="px-4 py-2 text-right font-semibold">Atoms</th>
                          <th className="px-4 py-2 text-right font-semibold">g/mol</th>
                          <th className="px-4 py-2 text-right font-semibold">% mass</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map(r => (
                          <tr key={r.element}>
                            <td className="px-4 py-2 font-mono font-bold text-slate-700">{r.element}</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-600">{parsed.atoms[r.element]}</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-600">{r.mass.toFixed(3)}</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-900 font-bold">{r.percent.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 px-1">
                    Atomic weights from NIST. Elements whose isotopic composition varies in nature
                    are given as an interval; the midpoint is used.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <Beaker size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                <p className="font-medium text-slate-500">Enter a formula</p>
                <p className="text-sm mt-2 max-w-[220px]">Then pair it with a concentration and volume to get the mass to weigh out.</p>
                <div className="mt-4 flex items-center text-xs text-slate-400">
                  <span className="font-mono">C6H12O6</span>
                  <ArrowRight size={12} className="mx-2" />
                  <span>180.156 g/mol</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MolWeight;
