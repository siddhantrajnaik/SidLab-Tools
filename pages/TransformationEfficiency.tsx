import React, { useState } from 'react';
import { Printer, Info } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { transformationEfficiency, dnaPlatedUg, expectedColonies } from '../lib/transformation';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

const TransformationEfficiency: React.FC = () => {
  const [colonies, setColonies] = useState<number | ''>(20);
  const [dnaPg, setDnaPg] = useState<number | ''>(100);
  const [recovery, setRecovery] = useState<number | ''>(1000);
  const [plated, setPlated] = useState<number | ''>(100);
  const [dilution, setDilution] = useState<number | ''>(1);
  const [rated, setRated] = useState<number | ''>(1e9);

  const setup = { dnaNg: safeNum(dnaPg) / 1000, recoveryUl: safeNum(recovery), platedUl: safeNum(plated), dilution: safeNum(dilution) || 1 };
  const eff = transformationEfficiency({ ...setup, colonies: safeNum(colonies) });
  const ugPlated = dnaPlatedUg(setup);
  const expect = expectedColonies(safeNum(rated), setup);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transformation Efficiency"
        description="Transformants per µg from a colony count, and how many colonies a batch of cells should give."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card title="What you did">
            <div className="grid grid-cols-2 gap-4">
              <Input label="DNA transformed" value={dnaPg} onChange={e => setDnaPg(num(e.target.value))} unit="pg" />
              <Input label="Recovery volume" value={recovery} onChange={e => setRecovery(num(e.target.value))} unit="µL" />
              <Input label="Volume plated" value={plated} onChange={e => setPlated(num(e.target.value))} unit="µL" />
              <Input label="Diluted before plating" value={dilution} onChange={e => setDilution(num(e.target.value))} unit="×" />
              <Input label="Colonies counted" value={colonies} onChange={e => setColonies(num(e.target.value))} />
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Recovery volume is cells plus outgrowth medium — 50 µL cells + 950 µL SOC is 1000 µL. Enter 1 for
              "diluted" if you plated straight from the recovery.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title="Efficiency" className="bg-slate-50/50 border-dashed border-2 border-slate-200">
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transformation efficiency</p>
                <p className="text-4xl font-bold text-cyan-700">{formatScientific(eff, 2)} <span className="text-lg font-medium text-slate-400">cfu/µg</span></p>
              </div>
              <div className="font-mono text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                <p>DNA on plate = {safeNum(dnaPg)} pg × ({safeNum(plated)} / {safeNum(recovery)}) ÷ {setup.dilution} = {formatScientific(ugPlated, 3)} µg</p>
                <p>efficiency = {safeNum(colonies)} colonies ÷ {formatScientific(ugPlated, 3)} µg</p>
              </div>
              <div className="flex items-start text-xs text-slate-500 leading-relaxed">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                <p>
                  Matches NEB's and Thermo Fisher's worked examples. Efficiency is only comparable under the same conditions —
                  NEB rates its cells with 100 pg–1 ng of supercoiled pUC19, and ligation products or large plasmids transform
                  far less efficiently.
                </p>
              </div>
            </div>
          </Card>

          <Card title="What should I expect?">
            <Input label="Rated efficiency of the cells" value={rated} onChange={e => setRated(num(e.target.value))} unit="cfu/µg" />
            <p className="text-sm text-slate-700 mt-4">
              With this setup, cells rated at {formatScientific(safeNum(rated), 1)} cfu/µg should give about{' '}
              <span className="font-bold text-cyan-700">{expect < 10 ? expect.toFixed(1) : Math.round(expect).toLocaleString()}</span> colonies.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransformationEfficiency;
