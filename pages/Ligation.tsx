import React, { useState } from 'react';
import { RefreshCw, Printer, Link2, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { pmolDsDNA, AVG_MW } from '../lib/sequence';

/**
 * insert mass (ng) = vector mass (ng) × (insert bp / vector bp) × molar ratio
 *
 * The 660 Da/bp average cancels out of the ratio, which is why it does not appear here —
 * it is only needed for the pmol figures alongside.
 */
const insertMassNg = (vectorNg: number, insertBp: number, vectorBp: number, ratio: number) =>
  vectorBp > 0 ? vectorNg * (insertBp / vectorBp) * ratio : 0;

const RATIOS = [1, 2, 3, 5, 7];

const Ligation: React.FC = () => {
  const [vectorBp, setVectorBp] = useState<number | ''>(5000);
  const [vectorNg, setVectorNg] = useState<number | ''>(50);
  const [insertBp, setInsertBp] = useState<number | ''>(1000);
  const [ratio, setRatio] = useState<number | ''>(3);

  const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

  const vBp = safeNum(vectorBp), vNg = safeNum(vectorNg), iBp = safeNum(insertBp), r = safeNum(ratio);
  const valid = vBp > 0 && vNg > 0 && iBp > 0 && r > 0;

  const need = valid ? insertMassNg(vNg, iBp, vBp, r) : 0;
  const vectorPmol = valid ? pmolDsDNA(vNg, vBp) : 0;
  const insertPmol = valid ? pmolDsDNA(need, iBp) : 0;

  const reset = () => { setVectorBp(5000); setVectorNg(50); setInsertBp(1000); setRatio(3); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ligation Calculator"
        description="How much insert to add for a given insert:vector molar ratio."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <Card title="Reaction" action={
            <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Reset
            </Button>
          }>
            <div className="space-y-6">
              <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs mr-2">1</span>
                  Vector
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Length" value={vectorBp} onChange={e => setVectorBp(num(e.target.value))} unit="bp" />
                  <Input label="Mass to use" value={vectorNg} onChange={e => setVectorNg(num(e.target.value))} unit="ng" />
                </div>
              </div>

              <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-800 mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs mr-2">2</span>
                  Insert
                </h4>
                <Input label="Length" value={insertBp} onChange={e => setInsertBp(num(e.target.value))} unit="bp" />
              </div>

              <div>
                <Input
                  label="Insert : Vector molar ratio"
                  value={ratio}
                  onChange={e => setRatio(num(e.target.value))}
                  placeholder="3"
                  unit=": 1"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {RATIOS.map(x => (
                    <button
                      key={x}
                      onClick={() => setRatio(x)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${safeNum(ratio) === x ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {x}:1
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed flex items-start">
                <Info size={14} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                3:1 insert:vector is the usual starting point for a sticky-end ligation; blunt ends
                often work better nearer 5:1. Note this is a <b>molar</b> ratio — because the insert
                is usually shorter than the vector, 3:1 by moles is far less than 3× by mass.
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <Card title="Set-up" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {valid ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Add this much insert</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-900 mr-2">{need.toFixed(1)}</span>
                    <span className="text-lg font-medium text-slate-500">ng</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-3">
                    with <span className="font-bold text-slate-900">{vNg} ng</span> of vector, for a{' '}
                    <span className="font-bold text-slate-900">{r}:1</span> insert:vector molar ratio.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">Vector</p>
                    <p className="text-2xl font-bold text-slate-900">{formatScientific(vectorPmol)}</p>
                    <p className="text-xs text-slate-400">pmol</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-1">Insert</p>
                    <p className="text-2xl font-bold text-slate-900">{formatScientific(insertPmol)}</p>
                    <p className="text-xs text-slate-400">pmol</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3">Other ratios</h4>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Ratio</th>
                          <th className="px-4 py-2 text-right font-semibold">Insert mass</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {RATIOS.map(x => (
                          <tr key={x} className={safeNum(ratio) === x ? 'bg-indigo-50/60 font-bold' : ''}>
                            <td className="px-4 py-2 text-slate-700">{x} : 1</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-900">
                              {insertMassNg(vNg, iBp, vBp, x).toFixed(1)} ng
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-sans font-semibold text-slate-900">Equation</span>
                    <span className="font-bold text-[11px]">ng insert = ng vector × (bp insert / bp vector) × ratio</span>
                  </div>
                  <p>= {vNg} × ({iBp} / {vBp}) × {r}</p>
                  <p>= {need.toFixed(1)} ng</p>
                  <p className="text-slate-400 pt-1">pmol from {AVG_MW.dsDNAPerBp} Da/bp average for dsDNA</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <Link2 size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                <p className="font-medium text-slate-500">Fill in the reaction</p>
                <p className="text-sm mt-2 max-w-[200px]">All four values must be greater than zero.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Ligation;
