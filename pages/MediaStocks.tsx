import React, { useState } from 'react';
import { Printer, AlertTriangle, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum } from '../utils';
import { ANTIBIOTICS, SELECTION_AGENTS, antibioticById, stockVolumeUl, powderMg, stockForPlates } from '../lib/media';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const ul = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} mL` : `${v.toFixed(v < 10 ? 2 : 1)} µL`);

const MediaStocks: React.FC = () => {
  const [id, setId] = useState('ampicillin');
  const a = antibioticById(id)!;

  const [stock, setStock] = useState<number | ''>(a.stockMgPerMl);
  const [working, setWorking] = useState<number | ''>(a.workingUgPerMl);
  const [culture, setCulture] = useState<number | ''>(500);
  const [stockVol, setStockVol] = useState<number | ''>(10);
  const [plates, setPlates] = useState<number | ''>(20);
  const [perPlate, setPerPlate] = useState<number | ''>(25);

  // Mammalian
  const [mStock, setMStock] = useState<number | ''>(10);
  const [mWorking, setMWorking] = useState<number | ''>(2);
  const [mVol, setMVol] = useState<number | ''>(10);

  const pick = (next: string) => {
    const n = antibioticById(next);
    if (!n) return;
    setId(next);
    setStock(n.stockMgPerMl);
    setWorking(n.workingUgPerMl);
  };

  const add = stockVolumeUl(safeNum(working), safeNum(stock), safeNum(culture));
  const batch = stockForPlates(safeNum(plates), safeNum(perPlate), safeNum(working), safeNum(stock));
  const edited = safeNum(stock) !== a.stockMgPerMl || safeNum(working) !== a.workingUgPerMl;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Antibiotic Stocks"
        description="Working concentrations, how much stock to add, and how to make the stock."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <Card title="Bacterial selection">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2 text-left font-semibold">Antibiotic</th>
                    <th className="py-2 text-right font-semibold">Stock</th>
                    <th className="py-2 text-right font-semibold">Working</th>
                    <th className="py-2 text-left font-semibold pl-4">Solvent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ANTIBIOTICS.map(x => (
                    <tr key={x.id} onClick={() => pick(x.id)}
                      className={`cursor-pointer ${x.id === id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                      <td className="py-2 font-medium text-slate-800">{x.name}</td>
                      <td className="py-2 text-right font-mono text-slate-600">{x.stockMgPerMl} mg/mL</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">{x.workingUgPerMl} µg/mL</td>
                      <td className="py-2 pl-4 text-slate-600">
                        {x.solvent}{x.solventNote && <span className="text-amber-600 font-bold"> *</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              From Addgene ("Pouring LB Agar Plates") and Gold Biotechnology, which agree on every concentration here.
              Both make stocks at 1000×, so the working concentration is a 1 : 1000 dilution. Store stocks at −20 °C
              (Gold Biotechnology). Add antibiotic to agar only once it has cooled to about 60 °C (Addgene).
            </p>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card title={a.name}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Stock" value={stock} onChange={e => setStock(num(e.target.value))} unit="mg/mL" />
                <Input label="Working" value={working} onChange={e => setWorking(num(e.target.value))} unit="µg/mL" />
              </div>
              {edited && <p className="text-xs text-slate-500">Using your own values instead of the table's.</p>}
              {a.solventNote && (
                <div className="flex items-start p-3 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-100">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> {a.solventNote}
                </div>
              )}
              {a.note && <p className="text-xs text-slate-500">{a.note}</p>}

              <hr className="border-slate-100" />
              <Input label="Culture volume" value={culture} onChange={e => setCulture(num(e.target.value))} unit="mL" />
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                <p className="text-sm text-sky-900">Add <span className="font-bold text-xl text-sky-700">{ul(add)}</span> of stock</p>
                <p className="text-xs font-mono text-sky-700 mt-1">{safeNum(working)} µg/mL × {safeNum(culture)} mL ÷ {safeNum(stock)} mg/mL</p>
              </div>
            </div>
          </Card>

          <Card title="Plates">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Plates" value={plates} onChange={e => setPlates(num(e.target.value))} />
              <Input label="Agar per plate" value={perPlate} onChange={e => setPerPlate(num(e.target.value))} unit="mL" />
            </div>
            <p className="text-sm text-slate-700 mt-4">
              {batch.agarMl.toFixed(0)} mL agar, plus <span className="font-bold text-sky-700">{ul(batch.stockUl)}</span> of {a.name.toLowerCase()} stock
            </p>
          </Card>

          <Card title="Making the stock">
            <Input label="Stock volume" value={stockVol} onChange={e => setStockVol(num(e.target.value))} unit="mL" />
            <p className="text-sm text-slate-700 mt-4">
              Dissolve <span className="font-bold text-sky-700">{powderMg(safeNum(stock), safeNum(stockVol)).toFixed(0)} mg</span> in {safeNum(stockVol)} mL {a.solvent.toLowerCase()}.
            </p>
            <p className="text-xs text-slate-500 mt-2">If the label gives potency (µg per mg) below 1000, weigh proportionally more.</p>
          </Card>
        </div>
      </div>

      <Card title="Mammalian selection agents">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2 text-left font-semibold">Agent</th>
                  <th className="py-2 text-right font-semibold">Reported range</th>
                  <th className="py-2 text-left font-semibold pl-4">In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SELECTION_AGENTS.map(s => (
                  <tr key={s.id}>
                    <td className="py-2 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2 text-right font-mono text-slate-900">{s.workingUgPerMl[0]}–{s.workingUgPerMl[1]} µg/mL</td>
                    <td className="py-2 pl-4 text-slate-600">{s.cellLine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-start p-4 mt-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              These ranges were reported for the lines shown (Gold Biotechnology, Table 1) and do not transfer.
              Determine the concentration for your own cells with a kill curve.
            </div>
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Stock" value={mStock} onChange={e => setMStock(num(e.target.value))} unit="mg/mL" />
              <Input label="Working" value={mWorking} onChange={e => setMWorking(num(e.target.value))} unit="µg/mL" />
              <Input label="Medium" value={mVol} onChange={e => setMVol(num(e.target.value))} unit="mL" />
            </div>
            <p className="text-sm text-slate-700">Add <span className="font-bold text-sky-700">{ul(stockVolumeUl(safeNum(mWorking), safeNum(mStock), safeNum(mVol)))}</span> of stock</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MediaStocks;
