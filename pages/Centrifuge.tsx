import React, { useState } from 'react';
import { RefreshCw, Printer, Info, AlertTriangle, Repeat } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { rcfFromRpm, rpmFromRcf } from '../lib/labmath';

type Solve = 'rcf' | 'rpm';
type RadiusUnit = 'cm' | 'mm';

const Centrifuge: React.FC = () => {
  const [solveFor, setSolveFor] = useState<Solve>('rcf');
  const [radius, setRadius] = useState<number | ''>(8.5);
  const [radiusUnit, setRadiusUnit] = useState<RadiusUnit>('cm');
  const [rpm, setRpm] = useState<number | ''>(13000);
  const [rcf, setRcf] = useState<number | ''>(16000);

  // Second rotor, for carrying a published RCF across to a different machine.
  const [radius2, setRadius2] = useState<number | ''>(16);

  const radiusCm = safeNum(radius) * (radiusUnit === 'mm' ? 0.1 : 1);
  const radius2Cm = safeNum(radius2) * (radiusUnit === 'mm' ? 0.1 : 1);
  const valid = radiusCm > 0;

  const resultRcf = solveFor === 'rcf' ? rcfFromRpm(safeNum(rpm), radiusCm) : safeNum(rcf);
  const resultRpm = solveFor === 'rpm' ? rpmFromRcf(safeNum(rcf), radiusCm) : safeNum(rpm);

  // Same g-force on a rotor of a different radius.
  const equivalentRpm = radius2Cm > 0 ? rpmFromRcf(resultRcf, radius2Cm) : 0;

  const reset = () => {
    setRadius(8.5); setRadiusUnit('cm'); setRpm(13000); setRcf(16000); setRadius2(16);
  };

  const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centrifuge Converter"
        description="Convert between RPM and relative centrifugal force, and move a protocol between rotors."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <Card title="Rotor & Speed" action={
            <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Reset
            </Button>
          }>
            <div className="space-y-6">
              <div className="bg-slate-50 p-1.5 rounded-2xl flex">
                {([['rcf', 'RPM → RCF'], ['rpm', 'RCF → RPM']] as [Solve, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setSolveFor(m)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${solveFor === m ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Input
                label="Rotor Radius"
                value={radius}
                onChange={e => setRadius(num(e.target.value))}
                placeholder="e.g. 8.5"
                rightElement={
                  <select
                    value={radiusUnit}
                    onChange={e => setRadiusUnit(e.target.value as RadiusUnit)}
                    className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer py-1"
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                  </select>
                }
              />

              {solveFor === 'rcf' ? (
                <Input label="Speed (RPM)" value={rpm} onChange={e => setRpm(num(e.target.value))} placeholder="e.g. 13000" unit="rpm" />
              ) : (
                <Input label="Required Force (RCF)" value={rcf} onChange={e => setRcf(num(e.target.value))} placeholder="e.g. 16000" unit="× g" />
              )}

              {!valid && (
                <div className="flex items-center p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Rotor radius must be greater than 0.
                </div>
              )}

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
                <div className="flex items-center mb-1 font-bold uppercase tracking-wide">
                  <Info size={14} className="mr-2" /> Which radius?
                </div>
                Use the radius your protocol refers to, measured from the axis to the point of
                interest — usually r<sub>max</sub>, the bottom of the tube. Radius differs between
                rotors, so the same RPM is not the same force on a different machine. Your rotor's
                r<sub>max</sub> is in its manual.
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <Card title="Result" className="bg-slate-50/50 border-dashed border-2 border-slate-200">
            {valid ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {solveFor === 'rcf' ? 'Relative Centrifugal Force' : 'Rotor Speed'}
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-900 mr-2">
                      {solveFor === 'rcf'
                        ? Math.round(resultRcf).toLocaleString()
                        : Math.round(resultRpm).toLocaleString()}
                    </span>
                    <span className="text-lg font-medium text-slate-500">
                      {solveFor === 'rcf' ? '× g' : 'rpm'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {solveFor === 'rcf'
                      ? `${safeNum(rpm).toLocaleString()} rpm at ${radiusCm} cm`
                      : `${safeNum(rcf).toLocaleString()} × g at ${radiusCm} cm`}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center text-sm">
                    <Repeat size={16} className="mr-2 text-amber-500" /> Same force, different rotor
                  </h4>
                  <Input
                    label="Other rotor radius"
                    value={radius2}
                    onChange={e => setRadius2(num(e.target.value))}
                    unit={radiusUnit}
                  />
                  {radius2Cm > 0 && (
                    <p className="text-sm text-slate-600 mt-3">
                      To get the same <span className="font-bold">{Math.round(resultRcf).toLocaleString()} × g</span> on a
                      rotor of radius {radius2Cm} cm, spin at{' '}
                      <span className="font-bold text-amber-600">{Math.round(equivalentRpm).toLocaleString()} rpm</span>.
                    </p>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-mono bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-sans font-semibold text-slate-900">Equation</span>
                    <span className="font-bold">RCF = 1.118×10⁻⁵ · r · N²</span>
                  </div>
                  <p>r = {radiusCm} cm (radius)</p>
                  <p>N = {Math.round(resultRpm).toLocaleString()} rpm</p>
                  <p>RCF = {formatScientific(resultRcf)} × g</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <Repeat size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                <p className="font-medium text-slate-500">Enter a rotor radius</p>
                <p className="text-sm mt-2 max-w-[220px]">RPM alone is meaningless without it — the same speed is a different force on every rotor.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Centrifuge;
