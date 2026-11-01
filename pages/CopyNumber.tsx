import React, { useState } from 'react';
import { Printer, AlertTriangle, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { copiesFromMass, massFromCopies, dilutionSeries, MW_PER_UNIT, Molecule } from '../lib/copynumber';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const ul = (v: number) => `${v.toFixed(v < 10 ? 2 : 1)} µL`;

const CopyNumber: React.FC = () => {
  const [molecule, setMolecule] = useState<Molecule>('dsDNA');
  const [length, setLength] = useState<number | ''>(5000);
  const [conc, setConc] = useState<number | ''>(50);
  const [copiesWanted, setCopiesWanted] = useState<number | ''>(1e6);

  const [top, setTop] = useState<number | ''>(1e7);
  const [points, setPoints] = useState<number | ''>(7);
  const [fold, setFold] = useState<number | ''>(10);
  const [vol, setVol] = useState<number | ''>(100);

  const unit = molecule === 'dsDNA' ? 'bp' : 'nt';
  // Concentration is ng/µL, so copies per µL is copies in one µL's worth of mass.
  const perUl = copiesFromMass(safeNum(conc), safeNum(length), molecule);
  const ngForWanted = massFromCopies(safeNum(copiesWanted), safeNum(length), molecule);
  const series = dilutionSeries({ stockPerUl: perUl, topPerUl: safeNum(top), points: safeNum(points), fold: safeNum(fold), volumeUl: safeNum(vol) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Copy Number"
        description="Copies from mass, mass for a copy number, and a dilution series for qPCR standards."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card title="Template">
            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['dsDNA', 'ssDNA', 'RNA'] as Molecule[]).map(m => (
                  <button key={m} onClick={() => setMolecule(m)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${molecule === m ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Length" value={length} onChange={e => setLength(num(e.target.value))} unit={unit} />
                <Input label="Concentration" value={conc} onChange={e => setConc(num(e.target.value))} unit="ng/µL" />
              </div>
              <Input label="Copies wanted" value={copiesWanted} onChange={e => setCopiesWanted(num(e.target.value))} />
              <div className="flex items-start text-xs text-slate-500 leading-relaxed">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                <p>
                  Uses {MW_PER_UNIT[molecule]} g/mol per {unit}, the same average the Ligation and DNA/RNA tools use.
                  Some calculators use 650 for dsDNA; the two differ by 1.5%. An average base pair is 617.9 g/mol
                  as the free acid and 661.9 as the sodium salt.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card title="Copies" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stock</p>
                  <p className="text-3xl font-bold text-violet-600">{formatScientific(perUl, 3)}</p>
                  <p className="text-xs text-slate-500 mt-1">copies per µL</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">For {formatScientific(safeNum(copiesWanted), 2)} copies</p>
                  <p className="text-3xl font-bold text-slate-800">{ngForWanted < 0.01 ? `${(ngForWanted * 1000).toPrecision(3)} pg` : `${ngForWanted.toPrecision(3)} ng`}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {perUl > 0 ? `${(safeNum(copiesWanted) / perUl).toPrecision(3)} µL of stock` : '—'}
                    {perUl > 0 && safeNum(copiesWanted) / perUl < 1 && <span className="text-amber-700"> — too little to pipette; dilute the stock first</span>}
                  </p>
                </div>
              </div>
              <p className="text-xs font-mono text-slate-500 bg-white p-4 rounded-xl border border-slate-100">
                copies = mass (g) × 6.02214076 × 10²³ / ({safeNum(length).toLocaleString()} {unit} × {MW_PER_UNIT[molecule]} g/mol)
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Standard curve dilution series">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 content-start">
            <Input label="Top standard" value={top} onChange={e => setTop(num(e.target.value))} unit="/µL" />
            <Input label="Points" value={points} onChange={e => setPoints(num(e.target.value))} />
            <Input label="Fold" value={fold} onChange={e => setFold(num(e.target.value))} unit="×" />
            <Input label="Each tube" value={vol} onChange={e => setVol(num(e.target.value))} unit="µL" />
          </div>
          <div className="lg:col-span-8">
            {series.error ? (
              <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" /> {series.error}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-2 text-left font-semibold">Tube</th>
                      <th className="py-2 text-right font-semibold">Copies/<span className="normal-case">µL</span></th>
                      <th className="py-2 text-right font-semibold">Take</th>
                      <th className="py-2 text-left font-semibold pl-3">from</th>
                      <th className="py-2 text-right font-semibold">+ diluent</th>
                      <th className="py-2 text-right font-semibold">Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {series.steps.map((s, i) => (
                      <tr key={i} className={s.tooSmall ? 'bg-amber-50' : ''}>
                        <td className="py-2 font-bold text-slate-700">{i + 1}</td>
                        <td className="py-2 text-right font-mono">{s.perUl.toExponential(2)}</td>
                        <td className={`py-2 text-right font-mono font-bold ${s.tooSmall ? 'text-amber-700' : 'text-violet-600'}`}>{ul(s.transferUl)}</td>
                        <td className="py-2 pl-3 text-slate-500">{i === 0 ? 'stock' : `tube ${i}`}</td>
                        <td className="py-2 text-right font-mono">{ul(s.diluentUl)}</td>
                        <td className="py-2 text-right font-mono text-slate-500">{ul(s.leftUl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {series.steps.some(s => s.tooSmall) && (
                  <p className="text-xs text-amber-700 mt-3">
                    Highlighted transfers are under 1 µL, where pipetting error dominates. Make an intermediate dilution of the stock first.
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-3">"Left" is what remains once the next tube has been made from it.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CopyNumber;
