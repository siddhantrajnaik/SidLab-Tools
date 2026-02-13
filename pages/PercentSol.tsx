import React, { useState, useEffect } from 'react';
import { Percent, Scale, Beaker, RefreshCw, Printer, Info, ArrowRight, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific, UNITS } from '../utils';

type Mode = 'wv' | 'vv' | 'ww';

interface PercentState {
  mode: Mode;
  solute: number | '';
  soluteUnit: string;
  total: number | '';
  totalUnit: string;
  percent: number | '';
  density: number | ''; // g/mL
  lastSolvedFor: 'solute' | 'total' | 'percent' | null;
}

const PercentSol: React.FC = () => {
  const [state, setState] = useState<PercentState>({
    mode: 'wv',
    solute: '',
    soluteUnit: 'g',
    total: '',
    totalUnit: 'mL',
    percent: '',
    density: 1,
    lastSolvedFor: null,
  });

  const [error, setError] = useState<string | null>(null);

  // Update units when mode changes
  useEffect(() => {
    setState(prev => {
      let newSoluteUnit = prev.soluteUnit;
      let newTotalUnit = prev.totalUnit;

      if (prev.mode === 'vv') {
        if (UNITS.mass[newSoluteUnit as keyof typeof UNITS.mass]) newSoluteUnit = 'mL';
      } else {
        // w/v or w/w
        if (UNITS.volume[newSoluteUnit as keyof typeof UNITS.volume]) newSoluteUnit = 'g';
      }

      return {
        ...prev,
        soluteUnit: newSoluteUnit,
        totalUnit: newTotalUnit,
        lastSolvedFor: null,
        solute: '',
        total: '',
        percent: ''
      };
    });
    setError(null);
  }, [state.mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      [name]: (name === 'soluteUnit' || name === 'totalUnit') ? value : (value === '' ? '' : parseFloat(value)),
      lastSolvedFor: null // Reset result state on edit
    }));
    setError(null);
  };

  const setMode = (mode: Mode) => {
    setState(prev => ({ ...prev, mode }));
  };

  const isTotalVolume = (unit: string) => !!UNITS.volume[unit as keyof typeof UNITS.volume];
  const isTotalMass = (unit: string) => !!UNITS.mass[unit as keyof typeof UNITS.mass];

  const calculate = () => {
    setError(null);
    const { mode, solute, soluteUnit, total, totalUnit, percent, density } = state;
    
    const count = [solute, total, percent].filter(v => v !== '').length;
    if (count !== 2) {
      setError('Please fill exactly 2 fields (Solute, Total, or %) to solve for the 3rd.');
      return;
    }

    // Normalize inputs to base units: g and mL
    const soluteVal = safeNum(solute);
    const totalVal = safeNum(total);
    const pctVal = safeNum(percent);
    const rho = safeNum(density); // g/mL

    // Validation
    if (percent !== '' && (pctVal <= 0 || pctVal > 100)) {
        setError('Percentage must be between 0 and 100.');
        return;
    }
    if (mode === 'ww' && isTotalVolume(totalUnit) && rho <= 0) {
        setError('Density must be greater than 0 to convert solution volume to mass.');
        return;
    }

    // 1. Convert Solute to Base (g or mL)
    let soluteBase = soluteVal;
    if (mode === 'vv') {
        soluteBase = soluteVal * (UNITS.volume[soluteUnit as keyof typeof UNITS.volume] || 1) / UNITS.volume.mL; // to mL
    } else {
        soluteBase = soluteVal * (UNITS.mass[soluteUnit as keyof typeof UNITS.mass] || 1); // to g
    }

    // 2. Convert Total Solution to Base (g or mL)
    // Note: For calculation, we need the denominator in the specific unit type of the mode (Vol for w/v, v/v; Mass for w/w)
    let totalBase = totalVal; 
    let totalBaseIsMass = false;

    if (isTotalVolume(totalUnit)) {
        // Input is Volume
        let volInML = totalVal * (UNITS.volume[totalUnit as keyof typeof UNITS.volume] || 1) / UNITS.volume.mL;
        
        if (mode === 'ww') {
            // Need Mass for w/w calculation
            totalBase = volInML * rho; // g
            totalBaseIsMass = true;
        } else {
            totalBase = volInML; // mL
        }
    } else {
        // Input is Mass
        let massInG = totalVal * (UNITS.mass[totalUnit as keyof typeof UNITS.mass] || 1);
        
        if (mode === 'ww') {
            totalBase = massInG;
            totalBaseIsMass = true;
        } else {
            // Need Volume for w/v or v/v
            // Technically possible if they give mass of solution for w/v, but rare. 
            // We assume input unit matches mode requirement usually, or use density.
            // For simplicity in this advanced calculator, if they ask for w/v but give solution mass, we need density.
            // Let's assume for w/v and v/v, user provides Volume. If not, we'd need density.
            // To keep it safe, if mode is w/v or v/v, ensure Total is Volume.
            if (rho > 0) {
                 totalBase = massInG / rho; // mL
            } else {
                 setError('Cannot calculate w/v or v/v from a solution mass without density.');
                 return;
            }
        }
    }

    let updates: Partial<PercentState> = {};

    // FORMULAS:
    // P = (Solute / Total) * 100
    // Solute = (P / 100) * Total
    // Total = Solute / (P / 100)

    // A. Solve for Percent
    if (percent === '') {
        if (totalBase === 0) { setError('Total amount cannot be zero.'); return; }
        const p = (soluteBase / totalBase) * 100;
        updates = { percent: parseFloat(p.toFixed(4)), lastSolvedFor: 'percent' };
    }
    // B. Solve for Solute
    else if (solute === '') {
        const sBase = (pctVal / 100) * totalBase;
        // Convert back to selected unit
        let sFinal = 0;
        if (mode === 'vv') {
             // sBase is mL. Convert to soluteUnit.
             // factor = UNITS.volume[unit] (in L). mL is 1e-3. 
             // value = sBase (mL) * (1e-3 L/mL) / factor
             sFinal = sBase * 1e-3 / (UNITS.volume[soluteUnit as keyof typeof UNITS.volume] || 1e-3);
        } else {
             // sBase is g.
             sFinal = sBase / (UNITS.mass[soluteUnit as keyof typeof UNITS.mass] || 1);
        }
        updates = { solute: parseFloat(sFinal.toPrecision(6)), lastSolvedFor: 'solute' };
    }
    // C. Solve for Total
    else if (total === '') {
        if (pctVal === 0) { setError('Percentage cannot be zero when solving for total.'); return; }
        const tBase = soluteBase / (pctVal / 100);
        
        // Convert tBase back to totalUnit
        // Check if tBase is Mass (g) or Vol (mL) based on Mode logic above? 
        // Logic: P = S/T => T = S/P. T has same dimension as denominator of mode.
        // w/v => T is Vol (mL). w/w => T is Mass (g). v/v => T is Vol (mL).
        
        let tFinal = 0;
        
        if (mode === 'ww') {
            // tBase is Mass (g).
            if (isTotalVolume(totalUnit)) {
                // User wants result in Volume (mL/L), but we have Mass. Use Density.
                 if (rho <= 0) { setError('Need density to calculate volume for w/w.'); return; }
                 const volmL = tBase / rho;
                 tFinal = volmL * 1e-3 / (UNITS.volume[totalUnit as keyof typeof UNITS.volume] || 1e-3);
            } else {
                 // User wants Mass
                 tFinal = tBase / (UNITS.mass[totalUnit as keyof typeof UNITS.mass] || 1);
            }
        } else {
             // w/v or v/v. tBase is Vol (mL).
             if (isTotalMass(totalUnit)) {
                 // User wants Mass. Use Density.
                 if (rho <= 0) { setError('Need density to calculate mass for w/v or v/v.'); return; }
                 const massG = tBase * rho;
                 tFinal = massG / (UNITS.mass[totalUnit as keyof typeof UNITS.mass] || 1);
             } else {
                 // User wants Vol
                 tFinal = tBase * 1e-3 / (UNITS.volume[totalUnit as keyof typeof UNITS.volume] || 1e-3);
             }
        }
        updates = { total: parseFloat(tFinal.toPrecision(6)), lastSolvedFor: 'total' };
    }

    setState(prev => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setState({
        mode: state.mode, // keep mode
        solute: '',
        soluteUnit: state.mode === 'vv' ? 'mL' : 'g',
        total: '',
        totalUnit: 'mL',
        percent: '',
        density: 1,
        lastSolvedFor: null,
    });
    setError(null);
  };

  const isWWVol = state.mode === 'ww' && isTotalVolume(state.totalUnit);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Percent Solution Calculator" 
        description="Calculate w/v, v/v, and w/w solutions with density correction."
        action={
             <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls */}
        <div className="lg:col-span-7 space-y-6">
          <Card 
            title="Parameters" 
            action={
             <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
           }
          >
             <div className="space-y-6">
                
                {/* Mode Select */}
                <div className="bg-slate-50 p-1.5 rounded-2xl flex relative">
                   {(['wv', 'vv', 'ww'] as Mode[]).map((m) => (
                     <button
                       key={m}
                       onClick={() => setMode(m)}
                       className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${state.mode === m ? 'bg-white text-pink-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       {m === 'wv' && '% w/v'}
                       {m === 'vv' && '% v/v'}
                       {m === 'ww' && '% w/w'}
                     </button>
                   ))}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Solute */}
                    <Input 
                        label={state.mode === 'vv' ? "Solute Volume" : "Solute Mass"}
                        name="solute"
                        value={state.solute}
                        onChange={handleChange}
                        placeholder={state.lastSolvedFor === 'solute' ? "Calculated" : "Amount"}
                        className={state.lastSolvedFor === 'solute' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                        rightElement={
                            <select name="soluteUnit" value={state.soluteUnit} onChange={handleChange} className="bg-transparent border-none text-sm font-semibold text-slate-600 py-1 cursor-pointer">
                                {state.mode === 'vv' ? (
                                    <>
                                        <option value="mL">mL</option>
                                        <option value="µL">µL</option>
                                        <option value="L">L</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="g">g</option>
                                        <option value="mg">mg</option>
                                        <option value="µg">µg</option>
                                        <option value="kg">kg</option>
                                    </>
                                )}
                            </select>
                        }
                    />

                    {/* Total Solution */}
                    <div className="space-y-4">
                        <Input 
                            label="Total Solution (Final)"
                            name="total"
                            value={state.total}
                            onChange={handleChange}
                            placeholder={state.lastSolvedFor === 'total' ? "Calculated" : "Total Amount"}
                            className={state.lastSolvedFor === 'total' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select name="totalUnit" value={state.totalUnit} onChange={handleChange} className="bg-transparent border-none text-sm font-semibold text-slate-600 py-1 cursor-pointer">
                                    <optgroup label="Volume">
                                        <option value="mL">mL</option>
                                        <option value="L">L</option>
                                        <option value="µL">µL</option>
                                    </optgroup>
                                    <optgroup label="Mass">
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                    </optgroup>
                                </select>
                            }
                        />

                        {/* Density Input - Show if calculating w/w with volume, OR if unit types mismatch for w/v */}
                        {isWWVol && (
                             <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-fadeIn">
                                 <div className="flex items-center mb-2">
                                     <Info size={14} className="text-blue-500 mr-2" />
                                     <span className="text-xs font-bold text-blue-700 uppercase">Density Required</span>
                                 </div>
                                 <p className="text-xs text-blue-600 mb-3">
                                     You are calculating <b>% w/w</b> but specified a <b>Volume</b>. 
                                     Density is needed to convert volume to mass.
                                 </p>
                                 <Input 
                                    label="Density (ρ)" 
                                    name="density" 
                                    value={state.density} 
                                    onChange={handleChange} 
                                    placeholder="1.0"
                                    unit="g/mL"
                                />
                             </div>
                        )}
                    </div>

                    {/* Percentage */}
                    <Input 
                        label="Percentage (%)"
                        name="percent"
                        value={state.percent}
                        onChange={handleChange}
                        placeholder={state.lastSolvedFor === 'percent' ? "Calculated" : "e.g. 10"}
                        className={state.lastSolvedFor === 'percent' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                    />
                </div>

                {error && (
                    <div className="flex items-center p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                <Button onClick={calculate} size="lg" className="w-full shadow-xl shadow-slate-900/10" variant="pink">
                    Calculate
                </Button>
             </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-5 space-y-6">
            <Card title="Guide" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
                {state.lastSolvedFor ? (
                    <div className="space-y-6 animate-fadeIn">
                        
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                                <Beaker className="mr-2 text-pink-500" size={20} />
                                Preparation Steps
                            </h4>
                            <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
                                {state.lastSolvedFor === 'solute' && (
                                    <>
                                        <p>1. Measure <span className="font-bold text-slate-900">{formatScientific(safeNum(state.solute))} {state.soluteUnit}</span> of solute.</p>
                                        <p>
                                            {state.mode === 'ww' 
                                                ? `2. Add solvent until the total mass reaches ` 
                                                : `2. Add solvent until the total volume reaches `}
                                            <span className="font-bold text-slate-900">{formatScientific(safeNum(state.total))} {state.totalUnit}</span>.
                                        </p>
                                    </>
                                )}
                                {state.lastSolvedFor === 'total' && (
                                    <p>Using <span className="font-bold text-slate-900">{state.solute} {state.soluteUnit}</span> of solute allows you to prepare <span className="font-bold text-slate-900">{formatScientific(safeNum(state.total))} {state.totalUnit}</span> of {state.percent}% solution.</p>
                                )}
                                {state.lastSolvedFor === 'percent' && (
                                    <p>The resulting concentration is <span className="font-bold text-slate-900">{formatScientific(safeNum(state.percent))}% {state.mode === 'wv' ? 'w/v' : state.mode === 'vv' ? 'v/v' : 'w/w'}</span>.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 rounded-xl text-xs font-mono text-slate-600 space-y-2">
                             <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2">Math Breakdown</div>
                             {state.mode === 'wv' && <p>Percent (w/v) = (Mass Solute [g] / Vol Solution [mL]) × 100</p>}
                             {state.mode === 'vv' && <p>Percent (v/v) = (Vol Solute [mL] / Vol Solution [mL]) × 100</p>}
                             {state.mode === 'ww' && <p>Percent (w/w) = (Mass Solute [g] / Mass Solution [g]) × 100</p>}
                             
                             {isWWVol && (
                                 <p className="text-blue-600 mt-2">
                                     * Mass Solution = Vol ({state.total} {state.totalUnit}) × ρ ({state.density} g/mL)
                                 </p>
                             )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                        <Percent size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        <p className="font-medium text-slate-500">Ready to calculate</p>
                        <p className="text-sm mt-2 max-w-[200px]">Select a mode (w/v, v/v, or w/w) and fill in 2 values.</p>
                    </div>
                )}
            </Card>
        </div>

      </div>
    </div>
  );
};

export default PercentSol;