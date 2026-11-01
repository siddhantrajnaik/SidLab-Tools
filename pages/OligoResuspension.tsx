import React, { useMemo, useState } from 'react';
import { Printer, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { cleanSequence } from '../lib/sequence';
import { oligoMolecularWeight } from '../lib/tm';
import {
  extinction260, nmolFromOD, odFromNmol, microgramsFromNmol, nmolFromMicrograms,
  resuspensionVolumeUl, concentrationFromA260,
} from '../lib/oligo';

type Amount = 'nmol' | 'od' | 'ug';
const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

const Stat: React.FC<{ label: string; value: string; unit: string; strong?: boolean }> = ({ label, value, unit, strong }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-bold ${strong ? 'text-indigo-600' : 'text-slate-900'}`}>
      {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
    </p>
  </div>
);

const OligoResuspension: React.FC = () => {
  const [seq, setSeq] = useState('AGCTAAGTCACTGCCATTGA');
  const [amount, setAmount] = useState<number | ''>(25);
  const [amountUnit, setAmountUnit] = useState<Amount>('nmol');
  const [target, setTarget] = useState<number | ''>(100);
  const [working, setWorking] = useState<number | ''>(10);
  const [workingVol, setWorkingVol] = useState<number | ''>(100);
  const [a260, setA260] = useState<number | ''>('');
  const [dilution, setDilution] = useState<number | ''>(100);
  const [path, setPath] = useState<number | ''>(1);

  const clean = useMemo(() => cleanSequence(seq).replace(/[^ACGT]/g, ''), [seq]);
  const eps = extinction260(clean);
  const mw = oligoMolecularWeight(clean);

  const nmol = amountUnit === 'nmol' ? safeNum(amount)
    : amountUnit === 'od' ? nmolFromOD(safeNum(amount), eps)
    : nmolFromMicrograms(safeNum(amount), mw);
  const volUl = resuspensionVolumeUl(nmol, safeNum(target));
  const stockUl = safeNum(target) > 0 ? (safeNum(working) * safeNum(workingVol)) / safeNum(target) : 0;
  const measured = a260 === '' ? null : concentrationFromA260(safeNum(a260), eps, safeNum(dilution), safeNum(path));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oligo Resuspension"
        description="Extinction coefficient, OD / nmol / µg conversion, and how much buffer to add."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Oligo">
            <label className="block">
              <span className="text-sm font-semibold text-slate-900 ml-1">Sequence, 5′ → 3′</span>
              <textarea value={seq} onChange={e => setSeq(e.target.value)} rows={3} spellCheck={false}
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 font-mono text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </label>
            <p className="text-xs text-slate-500 mt-2">{clean.length} nt. Unmodified DNA only — dyes, phosphorothioates and other modifications change both ε and MW.</p>
          </Card>

          <Card title="What's on the tube">
            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['nmol', 'od', 'ug'] as Amount[]).map(u => (
                  <button key={u} onClick={() => setAmountUnit(u)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${amountUnit === u ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                    {u === 'od' ? 'OD₂₆₀' : u === 'ug' ? 'µg' : 'nmol'}
                  </button>
                ))}
              </div>
              <Input label="Amount" value={amount} onChange={e => setAmount(num(e.target.value))} unit={amountUnit === 'od' ? 'OD' : amountUnit === 'ug' ? 'µg' : 'nmol'} />
              <Input label="Target stock" value={target} onChange={e => setTarget(num(e.target.value))} unit="µM" />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title="Resuspend" className="bg-slate-50/50 border-dashed border-2 border-slate-200">
            {clean ? (
              <div className="space-y-5">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Add</p>
                  <p className="text-4xl font-bold text-indigo-700">{volUl.toFixed(1)} <span className="text-lg font-medium">µL</span></p>
                  <p className="text-sm text-indigo-900 mt-1">of buffer for a {safeNum(target)} µM stock</p>
                  <p className="text-xs font-mono text-indigo-700 mt-3">{nmol.toFixed(2)} nmol ÷ {safeNum(target)} µM × 1000</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Stat label="nmol" value={nmol.toFixed(2)} unit="nmol" />
                  <Stat label="OD₂₆₀ units" value={odFromNmol(nmol, eps).toFixed(2)} unit="OD" />
                  <Stat label="Mass" value={microgramsFromNmol(nmol, mw).toFixed(1)} unit="µg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Stat label="ε₂₆₀" value={eps.toLocaleString()} unit="M⁻¹cm⁻¹" strong />
                  <Stat label="Molecular weight" value={mw.toFixed(1)} unit="g/mol" />
                </div>
                <div className="flex items-start text-xs text-slate-500 leading-relaxed">
                  <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                  Nearest-neighbour method (Cantor, Warshaw &amp; Shapiro 1970), values from TriLink's table. It
                  reproduces TriLink's and ATDBio's published examples exactly, but can be up to 10% from a
                  measured value — use the measured-A260 panel below if you need better.
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-12">Enter a DNA sequence.</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Working dilution">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Working" value={working} onChange={e => setWorking(num(e.target.value))} unit="µM" />
                  <Input label="Volume" value={workingVol} onChange={e => setWorkingVol(num(e.target.value))} unit="µL" />
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-bold text-indigo-600">{stockUl.toFixed(1)} µL</span> stock +{' '}
                  <span className="font-bold">{Math.max(0, safeNum(workingVol) - stockUl).toFixed(1)} µL</span> buffer
                </p>
              </div>
            </Card>

            <Card title="Check a measured A260">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input label="A260" value={a260} onChange={e => setA260(num(e.target.value))} />
                  <Input label="Dilution" value={dilution} onChange={e => setDilution(num(e.target.value))} unit="×" />
                  <Input label="Path" value={path} onChange={e => setPath(num(e.target.value))} unit="cm" />
                </div>
                {measured !== null && (
                  <p className="text-sm text-slate-700">
                    Stock is <span className="font-bold text-indigo-600">{measured >= 1e4 ? formatScientific(measured, 3) : measured.toFixed(1)} µM</span>
                  </p>
                )}
                <p className="text-xs text-slate-500">A NanoDrop pedestal is often reported normalised to 1 cm — check before entering 0.1.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OligoResuspension;
