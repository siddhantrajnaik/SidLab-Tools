import React, { useState } from 'react';
import { RefreshCw, Download, Printer, Droplets, ArrowRight, Beaker, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { usePersistedState, safeNum, downloadCSV, formatScientific, UNITS } from '../utils';

interface DilutionStateV2 {
  c1: number | '';
  c1Unit: keyof typeof UNITS.concentration;
  v1: number | '';
  v1Unit: keyof typeof UNITS.volume;
  c2: number | '';
  c2Unit: keyof typeof UNITS.concentration;
  v2: number | '';
  v2Unit: keyof typeof UNITS.volume;
  lastSolvedFor: 'c1' | 'v1' | 'c2' | 'v2' | null;
}

const Dilution: React.FC = () => {
  const [values, setValues] = usePersistedState<DilutionStateV2>('labsuite_dilution_v2', {
    c1: '',
    c1Unit: 'mM',
    v1: '',
    v1Unit: 'mL',
    c2: '',
    c2Unit: 'mM',
    v2: '',
    v2Unit: 'mL',
    lastSolvedFor: null,
  });

  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const { c1, v1, c2, v2, c1Unit, v1Unit, c2Unit, v2Unit } = values;

    // Check filled fields
    const filledCount = [c1, v1, c2, v2].filter(v => v !== '').length;
    if (filledCount !== 3) {
      setError('Please fill exactly 3 fields to calculate the 4th.');
      return;
    }

    // Convert knowns to Base Units (M, L)
    // Note: We only convert valid numbers.
    const c1Base = c1 !== '' ? safeNum(c1) * UNITS.concentration[c1Unit] : null;
    const v1Base = v1 !== '' ? safeNum(v1) * UNITS.volume[v1Unit] : null;
    const c2Base = c2 !== '' ? safeNum(c2) * UNITS.concentration[c2Unit] : null;
    const v2Base = v2 !== '' ? safeNum(v2) * UNITS.volume[v2Unit] : null;

    let updates: Partial<DilutionStateV2> = {};

    // C1V1 = C2V2
    // Solve for V1: V1 = (C2 * V2) / C1
    if (v1Base === null && c1Base !== null && c2Base !== null && v2Base !== null) {
      if (c1Base === 0) { setError('Stock concentration (C1) cannot be zero.'); return; }
      const resBase = (c2Base * v2Base) / c1Base;
      updates = { v1: resBase / UNITS.volume[v1Unit], lastSolvedFor: 'v1' };
    }
    // Solve for C1: C1 = (C2 * V2) / V1
    else if (c1Base === null && v1Base !== null && c2Base !== null && v2Base !== null) {
      if (v1Base === 0) { setError('Stock volume (V1) cannot be zero.'); return; }
      const resBase = (c2Base * v2Base) / v1Base;
      updates = { c1: resBase / UNITS.concentration[c1Unit], lastSolvedFor: 'c1' };
    }
    // Solve for V2: V2 = (C1 * V1) / C2
    else if (v2Base === null && c1Base !== null && v1Base !== null && c2Base !== null) {
      if (c2Base === 0) { setError('Target concentration (C2) cannot be zero.'); return; }
      const resBase = (c1Base * v1Base) / c2Base;
      updates = { v2: resBase / UNITS.volume[v2Unit], lastSolvedFor: 'v2' };
    }
    // Solve for C2: C2 = (C1 * V1) / V2
    else if (c2Base === null && c1Base !== null && v1Base !== null && v2Base !== null) {
       if (v2Base === 0) { setError('Target volume (V2) cannot be zero.'); return; }
       const resBase = (c1Base * v1Base) / v2Base;
       updates = { c2: resBase / UNITS.concentration[c2Unit], lastSolvedFor: 'c2' };
    }

    if (updates.v1 !== undefined || updates.c1 !== undefined || updates.v2 !== undefined || updates.c2 !== undefined) {
        setValues(prev => ({ ...prev, ...updates }));
    }
  };

  const handleReset = () => {
    setValues({
      c1: '', c1Unit: 'mM',
      v1: '', v1Unit: 'mL',
      c2: '', c2Unit: 'mM',
      v2: '', v2Unit: 'mL',
      lastSolvedFor: null,
    });
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.endsWith('Unit')) {
        setValues(prev => ({ ...prev, [name]: value }));
    } else {
        setValues(prev => ({
            ...prev,
            [name]: value === '' ? '' : parseFloat(value),
            lastSolvedFor: null
        }));
    }
    setError(null);
  };

  const handleExport = () => {
    const data = [
      ['Parameter', 'Value', 'Unit'],
      ['Stock Conc (C1)', values.c1, values.c1Unit],
      ['Stock Vol (V1)', values.v1, values.v1Unit],
      ['Target Conc (C2)', values.c2, values.c2Unit],
      ['Target Vol (V2)', values.v2, values.v2Unit],
    ];
    downloadCSV('dilution_calculation', [], data);
  };

  // Helper for select styles
  const selectClass = "bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer py-1 pr-8";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dilution Calculator" 
        description="Precision C1V1 calculator with automatic unit conversion."
        action={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport} icon={<Download size={16} />}>Export</Button>
            <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card title="Configuration" action={
             <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
          }>
            <div className="space-y-8">
                {/* Stock Solution */}
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center mb-4 text-blue-800">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 font-bold text-sm">1</div>
                        <h3 className="font-bold text-lg">Stock Solution</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="Concentration (C1)" 
                            name="c1" 
                            value={values.c1} 
                            onChange={handleChange}
                            placeholder={values.lastSolvedFor === 'c1' ? 'Calculated' : 'e.g. 100'}
                            className={values.lastSolvedFor === 'c1' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select name="c1Unit" value={values.c1Unit} onChange={handleChange} className={selectClass}>
                                    {Object.keys(UNITS.concentration).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            }
                        />
                        <Input 
                            label="Volume (V1)" 
                            name="v1" 
                            value={values.v1} 
                            onChange={handleChange}
                            placeholder={values.lastSolvedFor === 'v1' ? 'Calculated' : 'Required Vol'}
                            className={values.lastSolvedFor === 'v1' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select name="v1Unit" value={values.v1Unit} onChange={handleChange} className={selectClass}>
                                    {Object.keys(UNITS.volume).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            }
                        />
                    </div>
                </div>

                <div className="flex justify-center -my-4 relative z-10">
                     <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100 text-slate-400">
                        <ArrowRight size={20} className="transform rotate-90 sm:rotate-0" />
                     </div>
                </div>

                {/* Target Solution */}
                <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center mb-4 text-emerald-800">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 font-bold text-sm">2</div>
                        <h3 className="font-bold text-lg">Target Solution</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="Concentration (C2)" 
                            name="c2" 
                            value={values.c2} 
                            onChange={handleChange}
                            placeholder={values.lastSolvedFor === 'c2' ? 'Calculated' : 'Desired Conc'}
                            className={values.lastSolvedFor === 'c2' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select name="c2Unit" value={values.c2Unit} onChange={handleChange} className={selectClass}>
                                    {Object.keys(UNITS.concentration).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            }
                        />
                        <Input 
                            label="Volume (V2)" 
                            name="v2" 
                            value={values.v2} 
                            onChange={handleChange}
                            placeholder={values.lastSolvedFor === 'v2' ? 'Calculated' : 'Total Vol'}
                            className={values.lastSolvedFor === 'v2' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select name="v2Unit" value={values.v2Unit} onChange={handleChange} className={selectClass}>
                                    {Object.keys(UNITS.volume).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            }
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                <Button onClick={calculate} size="lg" className="w-full shadow-xl shadow-slate-900/10">
                    Calculate
                </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-5 space-y-6">
            <Card title="Preparation Guide" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
                {values.lastSolvedFor ? (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex items-start space-x-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                                <Droplets size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg mb-2">Instructions</h4>
                                <div className="space-y-4 text-slate-600 leading-relaxed">
                                    {values.lastSolvedFor === 'v1' && (
                                        <>
                                            <p>1. Measure <span className="font-bold text-slate-900">{formatScientific(safeNum(values.v1))} {values.v1Unit}</span> of the stock solution.</p>
                                            <p>2. Add solvent (e.g., water) to bring the total volume up to <span className="font-bold text-slate-900">{formatScientific(safeNum(values.v2))} {values.v2Unit}</span>.</p>
                                        </>
                                    )}
                                    {values.lastSolvedFor === 'c2' && (
                                        <p>Mixing <span className="font-bold text-slate-900">{values.v1} {values.v1Unit}</span> of stock with solvent to reaching <span className="font-bold text-slate-900">{values.v2} {values.v2Unit}</span> creates a <span className="font-bold text-slate-900">{formatScientific(safeNum(values.c2))} {values.c2Unit}</span> solution.</p>
                                    )}
                                    {/* Handle other cases if needed, but V1 is most common */}
                                    {values.lastSolvedFor !== 'v1' && values.lastSolvedFor !== 'c2' && (
                                       <p>Result: <span className="font-bold text-slate-900">{formatScientific(safeNum(values[values.lastSolvedFor]))} {values[`${values.lastSolvedFor}Unit` as keyof DilutionStateV2]}</span></p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-slate-500 font-mono bg-white p-4 rounded-xl border border-slate-100">
                             <div className="flex justify-between mb-2 pb-2 border-b border-slate-100">
                                <span>Equation</span>
                                <span className="font-bold">C₁V₁ = C₂V₂</span>
                             </div>
                             <div className="space-y-1">
                                <p>C₁ (Stock) = {values.c1} {values.c1Unit}</p>
                                <p>V₁ (Stock Vol) = {formatScientific(safeNum(values.v1))} {values.v1Unit}</p>
                                <p>C₂ (Final) = {values.c2} {values.c2Unit}</p>
                                <p>V₂ (Final Vol) = {values.v2} {values.v2Unit}</p>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                        <Beaker size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        <p className="font-medium text-slate-500">Ready to calculate</p>
                        <p className="text-sm mt-2 max-w-[200px]">Fill any 3 fields. We handle the units automatically.</p>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Dilution;