import React, { useMemo, useState } from 'react';
import { RefreshCw, Printer, Thermometer, AlertTriangle, FlaskConical } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum } from '../utils';
import {
  BUFFERS, bufferById, pKaAt, dpKadT, bufferRecipe, phAfterTempChange, suggestBuffers, baseFraction,
} from '../lib/buffers';

const BufferSelector: React.FC = () => {
  const [targetPh, setTargetPh] = useState<number | ''>(7.4);
  const [workingC, setWorkingC] = useState<number | ''>(25);
  const [molarity, setMolarity] = useState<number | ''>(50);
  const [volume, setVolume] = useState<number | ''>(500);
  const [selectedId, setSelectedId] = useState('hepes');
  const [useC, setUseC] = useState<number | ''>(4);

  const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

  const pH = safeNum(targetPh);
  const tempC = safeNum(workingC);

  const suggestions = useMemo(() => suggestBuffers(pH, tempC), [pH, tempC]);
  const selected = bufferById(selectedId) ?? BUFFERS[0];

  // Molarity is entered in mM and volume in mL.
  const recipe = bufferRecipe(selected, pH, tempC, safeNum(molarity) / 1000, safeNum(volume) / 1000);
  const shifted = phAfterTempChange(selected, pH, tempC, safeNum(useC));
  const drift = shifted - pH;

  const reset = () => {
    setTargetPh(7.4); setWorkingC(25); setMolarity(50); setVolume(500);
    setSelectedId('hepes'); setUseC(4);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buffer Selector"
        description="Pick a buffer for a target pH, get the recipe, and see what temperature does to it."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Target" action={
            <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Reset
            </Button>
          }>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Target pH" value={targetPh} onChange={e => setTargetPh(num(e.target.value))} />
                <Input label="Titrate at" value={workingC} onChange={e => setWorkingC(num(e.target.value))} unit="°C" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Concentration" value={molarity} onChange={e => setMolarity(num(e.target.value))} unit="mM" />
                <Input label="Volume" value={volume} onChange={e => setVolume(num(e.target.value))} unit="mL" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Buffers covering pH {pH.toFixed(2)} at {tempC}°C
                </p>
                {suggestions.length === 0 ? (
                  <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    No buffer in this table has a pKa within one unit of pH {pH.toFixed(2)}. The set
                    spans roughly pH 2 to 11.5.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {suggestions.map(b => {
                      const pKa = pKaAt(b, tempC);
                      const active = b.id === selectedId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white border-slate-200 hover:border-teal-300'}`}
                        >
                          <span className="font-bold text-sm">{b.name}</span>
                          <span className={`font-mono text-xs ${active ? 'text-teal-50' : 'text-slate-500'}`}>
                            pKa {pKa.toFixed(2)} · {dpKadT(b, tempC) >= 0 ? '+' : ''}{dpKadT(b, tempC).toFixed(3)}/°C
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Ordered by how close the pKa is to your target. A buffer works within about one
                  pH unit of its pKa; outside that it runs out of capacity.
                </p>
              </div>
            </div>
          </Card>

          <Card title="All buffers">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2 text-left font-semibold">Buffer</th>
                    <th className="py-2 text-right font-semibold">pKa 25°C</th>
                    <th className="py-2 text-right font-semibold">pKa {tempC}°C</th>
                    <th className="py-2 text-right font-semibold">ΔpKa/°C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BUFFERS.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={`cursor-pointer ${b.id === selectedId ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-1.5 font-medium text-slate-700">{b.name}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">{b.pKa25.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-900 font-bold">{pKaAt(b, tempC).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">{dpKadT(b, tempC).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card title={`${selected.name} recipe`} className="bg-slate-50/50 border-dashed border-2 border-slate-200">
            <div className="space-y-6">
              {!recipe.inRange && (
                <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  pH {pH.toFixed(2)} is more than a unit from {selected.name}'s pKa of{' '}
                  {recipe.pKa.toFixed(2)} at {tempC}°C. It will barely buffer here.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Acidic form</p>
                  <p className="text-2xl font-bold text-slate-900">{(recipe.acidMol * 1000).toFixed(2)} <span className="text-sm font-medium text-slate-500">mmol</span></p>
                  <p className="text-xs text-slate-500 mt-1">{((1 - baseFraction(pH, recipe.pKa)) * 100).toFixed(1)}% of the buffer</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Basic form</p>
                  <p className="text-2xl font-bold text-teal-600">{(recipe.baseMol * 1000).toFixed(2)} <span className="text-sm font-medium text-slate-500">mmol</span></p>
                  <p className="text-xs text-slate-500 mt-1">base : acid = {recipe.ratio.toFixed(2)} : 1</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Working</p>
                <p className="font-mono text-sm text-slate-700">
                  pH = pKa + log₁₀([base]/[acid]) = {recipe.pKa.toFixed(3)} + log₁₀({recipe.ratio.toFixed(3)}) = {pH.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  Buffer capacity β = {recipe.capacity.toFixed(4)} mol·L⁻¹ per pH unit — the most a{' '}
                  {safeNum(molarity)} mM buffer can give is {(Math.LN10 * safeNum(molarity) / 1000 / 4).toFixed(4)}, at its pKa.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  In practice you dissolve {(((recipe.acidMol + recipe.baseMol) * 1000)).toFixed(2)} mmol of
                  either form in a little under {safeNum(volume)} mL, titrate to pH {pH.toFixed(2)} at{' '}
                  {tempC}°C, then make up to volume.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center mb-3">
                  <Thermometer size={16} className="text-slate-400 mr-2" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Temperature shift</p>
                </div>
                <div className="flex items-end gap-4">
                  <div className="w-28">
                    <Input label="Used at" value={useC} onChange={e => setUseC(num(e.target.value))} unit="°C" />
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm text-slate-600">
                      Titrated to <span className="font-bold">pH {pH.toFixed(2)}</span> at {tempC}°C, this buffer
                      actually sits at{' '}
                      <span className={`font-bold text-xl ${Math.abs(drift) > 0.2 ? 'text-rose-600' : 'text-teal-600'}`}>
                        pH {shifted.toFixed(2)}
                      </span>{' '}
                      at {safeNum(useC)}°C.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.abs(drift) < 0.05
                        ? 'A negligible shift — this buffer is nearly temperature-independent.'
                        : `A drift of ${drift > 0 ? '+' : ''}${drift.toFixed(2)} pH units. The acid/base ratio is fixed once the buffer is made, so the pH follows the pKa.`}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                pKa is computed at each temperature from the van 't Hoff equation using the standard
                enthalpy and heat capacity of ionization, not interpolated from a single coefficient.
                All values from Goldberg, Kishore &amp; Lennen, J. Phys. Chem. Ref. Data 31:231 (2002),
                a NIST critical evaluation.
              </p>
            </div>
          </Card>

          <Card title="Why this matters">
            <div className="flex items-start text-sm text-slate-600 leading-relaxed">
              <FlaskConical size={18} className="text-slate-300 mr-3 mt-0.5 flex-shrink-0" />
              <p>
                Tris moves about −0.028 pH units per °C. A Tris buffer titrated to pH 8.0 on the
                bench is close to pH 8.6 in a 4 °C cold room, and closer to pH 7.7 in a 37 °C
                incubator — a whole unit of swing across a single experiment. HEPES and phosphate
                move a fifth and a tenth as far, which is exactly why Good set out to find them.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BufferSelector;
