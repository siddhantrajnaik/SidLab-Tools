import React, { useState } from 'react';
import { Printer, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum } from '../utils';
import { SEPARATION_TABLES, DYE_MIGRATION, recommendPercent, agaroseGrams, bufferStockMl, dyeSizes } from '../lib/agarose';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const bp = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString()} kb` : `${n} bp`);

const AgaroseGel: React.FC = () => {
  const [size, setSize] = useState<number | ''>(1000);
  const [percent, setPercent] = useState<number | ''>(1);
  const [volume, setVolume] = useState<number | ''>(50);
  const [buffer, setBuffer] = useState<'TAE' | 'TBE'>('TAE');
  const [stockX, setStockX] = useState<number | ''>(50);
  const [workingX, setWorkingX] = useState<number | ''>(1);

  const switchBuffer = (b: 'TAE' | 'TBE') => {
    setBuffer(b);
    setStockX(b === 'TAE' ? 50 : 10);
  };

  const dyes = dyeSizes(safeNum(percent));
  const grams = agaroseGrams(safeNum(percent), safeNum(volume));
  const stockMl = bufferStockMl(safeNum(volume), safeNum(stockX), safeNum(workingX));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agarose Gel"
        description="Which percentage resolves your fragment, the recipe, and where the loading dyes will run."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card title="Fragment">
            <Input label="Size to resolve" value={size} onChange={e => setSize(num(e.target.value))} unit="bp" />
            <div className="mt-6 space-y-5">
              {SEPARATION_TABLES.map(t => {
                const recs = recommendPercent(safeNum(size), t.id);
                return (
                  <div key={t.id}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.label}</p>
                    {recs.length ? (
                      <div className="flex flex-wrap gap-2">
                        {recs.map((r, i) => (
                          <button key={r.percent} onClick={() => setPercent(r.percent)}
                            className={`px-3 py-2 rounded-xl border text-left transition-all ${
                              i === 0 ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
                            <span className="block text-sm font-bold">{r.percent}%</span>
                            <span className={`block text-[11px] font-mono ${i === 0 ? 'text-orange-50' : 'text-slate-400'}`}>{bp(r.minBp)}–{bp(r.maxBp)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No gel in this table covers {bp(safeNum(size))}.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-start text-xs text-slate-500 leading-relaxed mt-6">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
              <p>
                The two references disagree — Green &amp; Sambrook give 0.5% a 2–50 kb range, Ausubel et al. 1–30 kb — so
                both are shown rather than averaged. Highlighted is the gel where your fragment sits nearest the middle of
                the range on a log scale.
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title="Recipe">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Agarose" value={percent} onChange={e => setPercent(num(e.target.value))} unit="% w/v" />
                <Input label="Gel volume" value={volume} onChange={e => setVolume(num(e.target.value))} unit="mL" />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['TAE', 'TBE'] as const).map(b => (
                  <button key={b} onClick={() => switchBuffer(b)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${buffer === b ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}>
                    {b}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label={`${buffer} stock`} value={stockX} onChange={e => setStockX(num(e.target.value))} unit="×" />
                <Input label="Working strength" value={workingX} onChange={e => setWorkingX(num(e.target.value))} unit="×" />
              </div>
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                <p className="text-sm text-orange-900">
                  <span className="font-bold text-xl text-orange-700">{grams.toFixed(2)} g</span> agarose in{' '}
                  <span className="font-bold">{stockMl.toFixed(1)} mL</span> {safeNum(stockX)}× {buffer} made up to {safeNum(volume)} mL with water
                </p>
                <p className="text-xs font-mono text-orange-700 mt-2">
                  g = {safeNum(percent)} × {safeNum(volume)} / 100 · stock = {safeNum(volume)} × {safeNum(workingX)} / {safeNum(stockX)}
                </p>
              </div>
              <p className="text-xs text-slate-500">Use the same buffer, at the same strength, in the tank as in the gel.</p>
            </div>
          </Card>

          <Card title="Where the dyes run">
            {dyes ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bromophenol blue</p>
                  <p className="text-2xl font-bold text-sky-600">{bp(buffer === 'TAE' ? dyes.bpbTAE : dyes.bpbTBE)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Xylene cyanol FF</p>
                  <p className="text-2xl font-bold text-teal-600">{bp(buffer === 'TAE' ? dyes.xcTAE : dyes.xcTBE)}</p>
                </div>
                <p className="col-span-2 text-xs text-slate-500">
                  Apparent co-migration sizes in {safeNum(percent)}% agarose, {buffer}. A fragment the size of a dye is hidden
                  under it — stop the run before your band reaches the front.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                The published table has rows for {DYE_MIGRATION.map(r => `${r.percent}%`).join(', ')} only; it isn't interpolated.
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Dye sizes from Yilmaz, Ozic &amp; Gok (2012), via Thermo Fisher. Separation ranges from Green &amp; Sambrook,
              Molecular Cloning 4th ed. (2012), and Ausubel et al., Current Protocols (1995), both via Thermo Fisher.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgaroseGel;
