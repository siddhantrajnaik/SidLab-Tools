import React, { useState } from 'react';
import { Printer, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import {
  VESSELS, vesselById, seedingPlan, scaleByArea, splitRatio, doublingsToRecover, hoursToConfluency,
} from '../lib/culture';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const vol = (ml: number) => (ml < 1 ? `${(ml * 1000).toFixed(ml < 0.01 ? 2 : 1)} µL` : `${ml.toFixed(2)} mL`);
const cells = (n: number) => (n >= 1e4 ? formatScientific(n, 2) : Math.round(n).toLocaleString());

const VesselGrid: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
    {VESSELS.map(v => (
      <button
        key={v.id}
        onClick={() => onChange(v.id)}
        className={`px-2 py-2 rounded-xl border text-left transition-all ${
          v.id === value ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-slate-200 hover:border-rose-300'}`}
      >
        <span className="block text-xs font-bold">{v.name}</span>
        <span className={`block text-[11px] font-mono ${v.id === value ? 'text-rose-50' : 'text-slate-400'}`}>{v.areaCm2} cm²</span>
      </button>
    ))}
  </div>
);

const SeedingCalculator: React.FC = () => {
  // Seeding
  const [vesselId, setVesselId] = useState('well96');
  const [area, setArea] = useState<number | ''>(0.32);
  const [count, setCount] = useState<number | ''>(96);
  const [density, setDensity] = useState<number | ''>(10000);
  const [suspension, setSuspension] = useState<number | ''>(1000000);
  const [working, setWorking] = useState<number | ''>(0.2);
  const [overage, setOverage] = useState<number | ''>(10);

  // Scale-up
  const [fromId, setFromId] = useState('t25');
  const [toId, setToId] = useState('t75');
  const [fromQty, setFromQty] = useState<number | ''>(700000);

  // Split
  const [have, setHave] = useState<number | ''>(8400000);
  const [need, setNeed] = useState<number | ''>(840000);
  const [td, setTd] = useState<number | ''>(24);

  const pickVessel = (id: string) => {
    const v = vesselById(id);
    if (!v) return;
    setVesselId(id);
    setArea(v.areaCm2);
    setCount(v.wells ?? 1);
    setWorking(v.mediumMl[1]);
  };

  const vessel = vesselById(vesselId);
  const plan = seedingPlan({
    densityPerCm2: safeNum(density), areaCm2: safeNum(area), vessels: safeNum(count),
    suspensionPerMl: safeNum(suspension), workingVolumeMl: safeNum(working), overagePercent: safeNum(overage),
  });
  const areaEdited = vessel && safeNum(area) !== vessel.areaCm2;

  const from = vesselById(fromId)!;
  const to = vesselById(toId)!;
  const scaled = scaleByArea(safeNum(fromQty), from.areaCm2, to.areaCm2);

  const ratio = splitRatio(safeNum(have), safeNum(need));
  const doublings = doublingsToRecover(ratio);
  const hours = hoursToConfluency(ratio, safeNum(td));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cell Seeding"
        description="Seeding volumes for any vessel, scale-up between vessels, and split ratios."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <Card title="Vessel">
            <VesselGrid value={vesselId} onChange={pickVessel} />
            <div className="grid grid-cols-2 gap-4 mt-5">
              <Input label="Growth area (each)" value={area} onChange={e => setArea(num(e.target.value))} unit="cm²" />
              <Input label={vessel?.kind === 'plate' ? 'Wells to seed' : 'Number of vessels'} value={count} onChange={e => setCount(num(e.target.value))} />
            </div>
            {areaEdited && (
              <p className="text-xs text-slate-500 mt-2">Using your area instead of Thermo's {vessel!.areaCm2} cm² — other manufacturers' vessels differ slightly.</p>
            )}
          </Card>

          <Card title="Seeding">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Target density" value={density} onChange={e => setDensity(num(e.target.value))} unit="/cm²" />
              <Input label="Suspension" value={suspension} onChange={e => setSuspension(num(e.target.value))} unit="cells/mL" />
              <Input label="Final volume (each)" value={working} onChange={e => setWorking(num(e.target.value))} unit="mL" />
              <Input label="Overage" value={overage} onChange={e => setOverage(num(e.target.value))} unit="%" />
            </div>
            {vessel?.seedingCells && (
              <p className="text-xs text-slate-500 mt-3">
                Thermo suggests about {cells(vessel.seedingCells)} per {vessel.kind === 'plate' ? 'well' : 'vessel'} for HeLa
                ({cells(vessel.seedingCells / vessel.areaCm2)}/cm²), reaching {cells(vessel.confluentCells!)} at confluency.
                Medium {vessel.mediumMl[0] === vessel.mediumMl[1] ? vessel.mediumMl[0] : `${vessel.mediumMl[0]}–${vessel.mediumMl[1]}`} mL.
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-6">
          <Card title="Pipetting" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Suspension each</p>
                  <p className="text-2xl font-bold text-rose-600">{vol(plan.suspensionPerVesselMl)}</p>
                  <p className="text-xs text-slate-500 mt-1">{cells(plan.cellsPerVessel)} cells</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medium each</p>
                  <p className="text-2xl font-bold text-slate-800">{vol(Math.max(0, plan.mediumPerVesselMl))}</p>
                  <p className="text-xs text-slate-500 mt-1">to a final {vol(safeNum(working))}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Make up in total</p>
                <p className="text-lg font-bold text-slate-900">
                  {cells(plan.totalCells)} cells in {vol(plan.totalSuspensionMl)} of suspension
                </p>
                <p className="text-xs text-slate-500 mt-1">for {safeNum(count)} × {vol(safeNum(working))}, plus {safeNum(overage)}% overage</p>
              </div>

              {plan.overfills && (
                <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  The suspension is too dilute — it needs more than the final volume. Spin the cells down and
                  resuspend at a higher concentration.
                </div>
              )}

              <div className="font-mono text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                <p>cells = {safeNum(density).toLocaleString()} /cm² × {safeNum(area)} cm²</p>
                <p>volume = cells ÷ {safeNum(suspension).toLocaleString()} /mL</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Scale between vessels">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">From</span>
                <select value={fromId} onChange={e => setFromId(e.target.value)} className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 text-sm">
                  {VESSELS.map(v => <option key={v.id} value={v.id}>{v.name} ({v.areaCm2} cm²)</option>)}
                </select>
              </label>
              <ArrowRight className="mb-3 text-slate-400" size={18} />
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">To</span>
                <select value={toId} onChange={e => setToId(e.target.value)} className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 text-sm">
                  {VESSELS.map(v => <option key={v.id} value={v.id}>{v.name} ({v.areaCm2} cm²)</option>)}
                </select>
              </label>
            </div>
            <Input label={`Amount in the ${from.name}`} value={fromQty} onChange={e => setFromQty(num(e.target.value))} unit="cells, mL…" />
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
              <p className="text-sm text-rose-900">
                <span className="font-bold text-lg">{scaled >= 1e4 ? formatScientific(scaled, 3) : scaled.toFixed(2)}</span> in the {to.name}
              </p>
              <p className="text-xs font-mono text-rose-700 mt-1">× {to.areaCm2} / {from.areaCm2} = × {(to.areaCm2 / from.areaCm2).toFixed(3)}</p>
            </div>
            <p className="text-xs text-slate-500">Anything proportional to growth area scales the same way: cell number, medium, trypsin, transfection reagent.</p>
          </div>
        </Card>

        <Card title="Split ratio">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Cells you have" value={have} onChange={e => setHave(num(e.target.value))} />
              <Input label="Cells to seed" value={need} onChange={e => setNeed(num(e.target.value))} />
            </div>
            <Input label="Doubling time" value={td} onChange={e => setTd(num(e.target.value))} unit="h" />
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
              <p className="text-sm text-rose-900">Split <span className="font-bold text-lg">1:{ratio.toFixed(1)}</span></p>
              <p className="text-xs text-rose-700 mt-1">
                {doublings.toFixed(2)} doublings to recover — about {hours.toFixed(0)} h at a {safeNum(td)} h doubling time
              </p>
            </div>
            <div className="flex items-start text-xs text-slate-500">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
              Assumes exponential growth from the moment of plating. Freshly split cells usually lag before
              they divide, so this is the soonest they could be back — not a promise.
            </div>
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
        Vessel areas, media volumes and HeLa seeding numbers from Thermo Fisher's Gibco "Useful numbers for cell
        culture". Corning's equivalent vessels differ slightly (its 100 mm dish is 55 cm² against Thermo's 56.7) —
        edit the area if you use another brand.
      </p>
    </div>
  );
};

export default SeedingCalculator;
