import React, { useState } from 'react';
import { Printer, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum } from '../utils';
import { ISOTOPES, isotopeById, halfLifeDays, fractionRemaining, activityAt, daysUntilFraction, daysBetween } from '../lib/decay';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const today = () => new Date().toISOString().slice(0, 10);
const unitName = { h: 'h', d: 'd', a: 'y' } as const;
const span = (days: number) =>
  !isFinite(days) ? '∞' : days < 2 ? `${(days * 24).toFixed(1)} h` : days < 730 ? `${days.toFixed(1)} d` : `${(days / 365.242198).toFixed(2)} y`;

const DecayCalculator: React.FC = () => {
  const [id, setId] = useState('P32');
  const [a0, setA0] = useState<number | ''>(250);
  const [unit, setUnit] = useState('µCi');
  const [refDate, setRefDate] = useState(today());
  const [useDate, setUseDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10);
  });
  const [needed, setNeeded] = useState<number | ''>(50);

  const iso = isotopeById(id)!;
  const tHalf = halfLifeDays(iso);
  const elapsed = daysBetween(new Date(refDate + 'T00:00:00'), new Date(useDate + 'T00:00:00'));
  const frac = fractionRemaining(elapsed, tHalf);
  const now = activityAt(safeNum(a0), elapsed, tHalf);
  const scale = frac > 0 ? 1 / frac : 0;
  const lastUsable = safeNum(a0) > 0 && safeNum(needed) > 0 ? daysUntilFraction(safeNum(needed) / safeNum(a0), tHalf) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Radioactive Decay"
        description="Activity on any date from a calibration date, and how much more to use to make up for decay."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Isotope">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ISOTOPES.map(i => (
                <button key={i.id} onClick={() => setId(i.id)}
                  className={`px-2 py-2 rounded-xl border text-left transition-all ${i.id === id ? 'bg-lime-600 text-white border-lime-600' : 'bg-white border-slate-200 hover:border-lime-300'}`}>
                  <span className="block text-sm font-bold">{i.name}</span>
                  <span className={`block text-[10px] font-mono ${i.id === id ? 'text-lime-50' : 'text-slate-400'}`}>{i.halfLife} {unitName[i.unit]}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {iso.name}: T½ = {iso.halfLife} ± {iso.uncertainty} {unitName[iso.unit]}, {iso.decayMode}. DDEP recommended value.
            </p>
          </Card>

          <Card title="Calibration">
            <div className="space-y-4">
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <Input label="Activity on the reference date" value={a0} onChange={e => setA0(num(e.target.value))} />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900 ml-1">Unit</span>
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-3 text-sm">
                    {['µCi', 'mCi', 'MBq', 'kBq', 'Bq', 'cpm', 'dpm'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900 ml-1">Reference date</span>
                  <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900 ml-1">Date of use</span>
                  <input type="date" value={useDate} onChange={e => setUseDate(e.target.value)} className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-3 text-sm" />
                </label>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title="On the date of use" className="bg-slate-50/50 border-dashed border-2 border-slate-200">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Activity</p>
                  <p className="text-2xl font-bold text-lime-700">{now.toPrecision(4)} <span className="text-sm font-medium text-slate-400">{unit}</span></p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-slate-800">{(frac * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Use more by</p>
                  <p className="text-2xl font-bold text-slate-800">× {scale.toFixed(3)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {elapsed >= 0 ? `${span(elapsed)} after` : `${span(-elapsed)} before`} the reference date — {(elapsed / tHalf).toFixed(2)} half-lives.
                A protocol written for 1 µL of fresh {iso.name} now needs {scale.toFixed(2)} µL for the same activity.
              </p>
              <p className="text-xs font-mono text-slate-500 bg-white p-4 rounded-xl border border-slate-100">
                A = {safeNum(a0)} × 2^(−{elapsed.toFixed(2)} d / {tHalf.toFixed(3)} d)
              </p>
            </div>
          </Card>

          <Card title="How long will it last?">
            <Input label="Activity you need" value={needed} onChange={e => setNeeded(num(e.target.value))} unit={unit} />
            <p className="text-sm text-slate-700 mt-4">
              {lastUsable > 0
                ? <>Falls to {safeNum(needed)} {unit} after <span className="font-bold text-lime-700">{span(lastUsable)}</span> — around{' '}
                    {new Date(new Date(refDate + 'T00:00:00').getTime() + lastUsable * 86400000).toLocaleDateString()}.</>
                : 'The reference activity is already at or below what you need.'}
            </p>
            <div className="flex items-start text-xs text-slate-500 leading-relaxed mt-4">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
              Half-lives are the recommended values of the Decay Data Evaluation Project (DDEP, via LNHB), which NIST
              lists as superseding its own table. Years are converted at DDEP's 365.242198 days. Physical decay only —
              radiolysis can degrade a labelled compound faster than its isotope decays.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DecayCalculator;
