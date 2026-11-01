import React, { useState } from 'react';
import { Printer, Info, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import {
  growthRate, doublingTime, generations, hoursToReach, backDilution, cellsFromOD, OD600_ECOLI_CELLS_PER_ML,
} from '../lib/growth';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const duration = (h: number) => {
  const total = Math.round(h * 60);
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
};
const clockIn = (h: number) =>
  new Date(Date.now() + h * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const GrowthCalculator: React.FC = () => {
  const [od1, setOd1] = useState<number | ''>(0.1);
  const [od2, setOd2] = useState<number | ''>(0.4);
  const [mins, setMins] = useState<number | ''>(60);

  const [odNow, setOdNow] = useState<number | ''>(0.15);
  const [odTarget, setOdTarget] = useState<number | ''>(0.6);
  const [tdMin, setTdMin] = useState<number | ''>(30);

  const [overnight, setOvernight] = useState<number | ''>(3);
  const [readyIn, setReadyIn] = useState<number | ''>(3);
  const [cultureMl, setCultureMl] = useState<number | ''>(50);

  const [odRead, setOdRead] = useState<number | ''>(0.3);
  const [readDilution, setReadDilution] = useState<number | ''>(1);
  const [factor, setFactor] = useState<number | ''>(OD600_ECOLI_CELLS_PER_ML);

  const hours = safeNum(mins) / 60;
  const mu = growthRate(safeNum(od1), safeNum(od2), hours);
  const td = doublingTime(safeNum(od1), safeNum(od2), hours);
  const gens = generations(safeNum(od1), safeNum(od2));

  const tdHours = safeNum(tdMin) / 60;
  const wait = hoursToReach(safeNum(odNow), safeNum(odTarget), tdHours);
  const plan = backDilution(safeNum(overnight), safeNum(odTarget), safeNum(readyIn), tdHours);
  const inoculumMl = plan.dilutionFactor > 0 ? safeNum(cultureMl) / plan.dilutionFactor : 0;

  const useMeasured = () => td > 0 && setTdMin(Number((td * 60).toFixed(1)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bacterial Growth"
        description="Doubling time from two OD readings, when you will reach a target OD, and how to back-dilute."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Doubling time">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="First OD600" value={od1} onChange={e => setOd1(num(e.target.value))} />
              <Input label="Second OD600" value={od2} onChange={e => setOd2(num(e.target.value))} />
              <Input label="Interval" value={mins} onChange={e => setMins(num(e.target.value))} unit="min" />
            </div>
            {td > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Doubling</p>
                    <p className="text-2xl font-bold text-emerald-700">{(td * 60).toFixed(1)}<span className="text-sm font-medium"> min</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rate <span className="normal-case">μ</span></p>
                    <p className="text-2xl font-bold text-slate-800">{mu.toFixed(3)}<span className="text-sm font-medium"> h⁻¹</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Generations</p>
                    <p className="text-2xl font-bold text-slate-800">{gens.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500">μ = ln({safeNum(od2)} / {safeNum(od1)}) ÷ {hours.toFixed(2)} h · td = ln 2 / μ</p>
                <Button variant="outline" size="sm" onClick={useMeasured}>Use this doubling time below</Button>
              </>
            ) : (
              <p className="text-sm text-slate-400">Enter two readings with the second higher than the first.</p>
            )}
          </div>
        </Card>

        <Card title="When will it reach the target?">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="OD now" value={odNow} onChange={e => setOdNow(num(e.target.value))} />
              <Input label="Target OD" value={odTarget} onChange={e => setOdTarget(num(e.target.value))} />
              <Input label="Doubling time" value={tdMin} onChange={e => setTdMin(num(e.target.value))} unit="min" />
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center">
              <Clock className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
              {wait > 0 ? (
                <p className="text-sm text-emerald-900">
                  About <span className="font-bold text-lg text-emerald-700">{duration(wait)}</span> — come back around <span className="font-bold">{clockIn(wait)}</span>
                </p>
              ) : (
                <p className="text-sm text-emerald-900">Already at or past the target.</p>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500">t = log₂({safeNum(odTarget)} / {safeNum(odNow)}) × {safeNum(tdMin)} min</p>
          </div>
        </Card>

        <Card title="Back-dilute to be ready on time">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Overnight OD" value={overnight} onChange={e => setOvernight(num(e.target.value))} />
              <Input label="Ready in" value={readyIn} onChange={e => setReadyIn(num(e.target.value))} unit="h" />
              <Input label="Culture" value={cultureMl} onChange={e => setCultureMl(num(e.target.value))} unit="mL" />
            </div>
            <p className="text-xs text-slate-500">Uses the target OD and doubling time from the card above.</p>
            {plan.feasible ? (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm text-emerald-900">
                  Dilute <span className="font-bold text-lg text-emerald-700">1 : {plan.dilutionFactor.toFixed(0)}</span> —{' '}
                  {inoculumMl < 1 ? `${(inoculumMl * 1000).toFixed(0)} µL` : `${inoculumMl.toFixed(2)} mL`} of overnight into {safeNum(cultureMl)} mL
                </p>
                <p className="text-xs text-emerald-700 mt-1">Start at OD {plan.startOD.toFixed(3)}</p>
              </div>
            ) : (
              <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                It cannot get there in time from this overnight without being concentrated. Allow longer.
              </div>
            )}
            <p className="text-xs text-slate-500">
              Assumes it grows from the moment it is diluted. Cells taken from a stationary overnight usually lag
              first, so start early or check the OD on the way.
            </p>
          </div>
        </Card>

        <Card title="OD600 to cells/mL">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="OD600 read" value={odRead} onChange={e => setOdRead(num(e.target.value))} />
              <Input label="Read at" value={readDilution} onChange={e => setReadDilution(num(e.target.value))} unit="× dil." />
              <Input label="Cells per OD" value={factor} onChange={e => setFactor(num(e.target.value))} />
            </div>
            <p className="text-sm text-slate-700">
              ≈ <span className="font-bold text-lg text-emerald-700">{formatScientific(cellsFromOD(safeNum(odRead), safeNum(factor), safeNum(readDilution)), 2)}</span> cells/mL
            </p>
            <div className="flex items-start text-xs text-slate-500 leading-relaxed">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
              <p>
                The default, OD 1.0 ≈ 8 × 10⁸ cells/mL, is Agilent's figure for E. coli. It is an empirical correlation
                that changes with strain, growth phase, medium and instrument — calibrate against plate counts if the
                number matters. OD stops being proportional to cell density as cultures get dense, so read a dilution
                that falls in your spectrophotometer's linear range and enter that dilution here.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GrowthCalculator;
