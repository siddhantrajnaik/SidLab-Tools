import React, { useState } from 'react';
import { RefreshCw, Calculator, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific } from '../utils';

type CalcMode = 'log' | 'antilog' | 'converter';
type BaseType = '10' | 'e' | '2' | 'custom';
type ConverterType = 'ph' | 'pka' | 'abs';

interface LogState {
  mode: CalcMode;
  baseType: BaseType;
  customBase: number | '';
  inputValue: number | '';
  converterType: ConverterType;
}

const Logarithm: React.FC = () => {
  const [state, setState] = useState<LogState>({
    mode: 'log',
    baseType: '10',
    customBase: 10,
    inputValue: '',
    converterType: 'ph'
  });

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = (mode: CalcMode) => {
    setState(prev => ({ ...prev, mode, inputValue: '', result: null }));
    setResult(null);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      [name]: name === 'inputValue' || name === 'customBase' 
        ? (value === '' ? '' : parseFloat(value)) 
        : value
    }));
    setResult(null);
    setError(null);
  };

  const calculate = () => {
    setError(null);
    setResult(null);
    const val = safeNum(state.inputValue);
    
    // --- Converter Mode ---
    if (state.mode === 'converter') {
        if (state.inputValue === '') return;
        
        // pH <-> [H+]
        if (state.converterType === 'ph') {
            // Check if input looks like pH (0-14 usually) or Conc (scientific)
            // Heuristic: If val < 14 and > -2, treat as pH. Else treat as M. 
            // But better to just output both directions for clarity.
            // Actually, let's just show both conversions: "If this is pH..." and "If this is [H+]..."
            
            // Case A: Input is pH
            const hFromPh = Math.pow(10, -val);
            
            // Case B: Input is [H+]
            let phFromH = 0;
            let isValidH = val > 0;
            if (isValidH) phFromH = -Math.log10(val);

            setResult(JSON.stringify({
                type: 'ph',
                valA: hFromPh, // [H+] if input is pH
                valB: isValidH ? phFromH : null // pH if input is [H+]
            }));
            return;
        }

        // pKa <-> Ka
        if (state.converterType === 'pka') {
            // Ka = 10^-pKa
            const kaFromPka = Math.pow(10, -val);
            // pKa = -log(Ka)
            let pkaFromKa = 0;
            let isValidKa = val > 0;
            if (isValidKa) pkaFromKa = -Math.log10(val);

            setResult(JSON.stringify({
                type: 'pka',
                valA: kaFromPka,
                valB: isValidKa ? pkaFromKa : null
            }));
            return;
        }

        // Abs <-> %T
        if (state.converterType === 'abs') {
            // %T = 10^(2 - A)
            const tFromA = Math.pow(10, 2 - val);
            // A = 2 - log(%T)
            let aFromT = 0;
            let isValidT = val > 0;
            if (isValidT) aFromT = 2 - Math.log10(val);

            setResult(JSON.stringify({
                type: 'abs',
                valA: tFromA,
                valB: isValidT ? aFromT : null
            }));
            return;
        }
    }

    // --- Math Mode ---
    const base = state.baseType === 'e' ? Math.E : 
                 state.baseType === '2' ? 2 :
                 state.baseType === '10' ? 10 : safeNum(state.customBase);

    if (base <= 0 || base === 1) {
        setError('Base must be positive and not equal to 1.');
        return;
    }

    let res = 0;

    if (state.mode === 'log') {
        if (val <= 0) {
            setError('Logarithm undefined for zero or negative numbers.');
            return;
        }
        res = Math.log(val) / Math.log(base);
    } else {
        // Antilog (Exponential)
        res = Math.pow(base, val);
        
        // Overflow check
        if (!isFinite(res)) {
            setError('Result overflow (too large).');
            return;
        }
    }

    setResult(res.toString());
  };

  const reset = () => {
    setState({
        mode: state.mode,
        baseType: '10',
        customBase: 10,
        inputValue: '',
        converterType: 'ph'
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Logarithm Calculator" 
        description="Compute Logs, Exponents, and common Laboratory conversions (pH, pKa)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls */}
        <div className="lg:col-span-6 space-y-6">
          <Card 
            title="Calculator" 
            action={
             <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
           }
          >
             <div className="space-y-6">
                
                {/* Mode Select */}
                <div className="bg-slate-50 p-1.5 rounded-2xl flex relative">
                     <button
                       onClick={() => handleModeChange('log')}
                       className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${state.mode === 'log' ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Logarithm
                     </button>
                     <button
                       onClick={() => handleModeChange('antilog')}
                       className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${state.mode === 'antilog' ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Antilog
                     </button>
                     <button
                       onClick={() => handleModeChange('converter')}
                       className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${state.mode === 'converter' ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Converters
                     </button>
                </div>

                {state.mode !== 'converter' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <Select label="Base" name="baseType" value={state.baseType} onChange={handleInputChange}>
                                 <option value="10">Base 10 (log)</option>
                                 <option value="e">Base e (ln)</option>
                                 <option value="2">Base 2 (binary)</option>
                                 <option value="custom">Custom Base</option>
                             </Select>
                             {state.baseType === 'custom' && (
                                 <Input 
                                    label="Custom Base" 
                                    name="customBase" 
                                    value={state.customBase} 
                                    onChange={handleInputChange} 
                                    placeholder="e.g. 5"
                                 />
                             )}
                        </div>

                        <Input 
                            label={state.mode === 'log' ? "Input Value (x)" : "Exponent (y)"} 
                            name="inputValue"
                            value={state.inputValue}
                            onChange={handleInputChange}
                            placeholder={state.mode === 'log' ? "e.g. 100" : "e.g. 2"}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Select label="Conversion Type" name="converterType" value={state.converterType} onChange={handleInputChange}>
                             <option value="ph">pH ↔ [H+]</option>
                             <option value="pka">pKa ↔ Ka</option>
                             <option value="abs">Absorbance ↔ %T</option>
                        </Select>

                        <Input 
                            label="Input Value" 
                            name="inputValue"
                            value={state.inputValue}
                            onChange={handleInputChange}
                            placeholder="e.g. 7.4 or 1.2e-5"
                        />
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                <Button onClick={calculate} size="lg" className="w-full bg-violet-600 hover:bg-violet-700 shadow-violet-500/20 text-white">
                    Calculate
                </Button>
             </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-6 space-y-6">
            <Card title="Results" className="h-full bg-slate-50/50 border-2 border-dashed border-slate-200">
                {result ? (
                    <div className="space-y-8 animate-fadeIn">
                        
                        {state.mode !== 'converter' ? (
                            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {state.mode === 'log' ? 'Logarithm Result' : 'Antilog Result'}
                                </h4>
                                <div className="text-5xl font-bold text-violet-600 mb-2">
                                    {formatScientific(parseFloat(result), 4)}
                                </div>
                                <div className="text-slate-400 font-mono text-sm mt-4">
                                    {state.mode === 'log' ? (
                                        <span>
                                            log<sub>{state.baseType === 'e' ? 'e' : state.baseType === 'custom' ? state.customBase : state.baseType}</sub>({state.inputValue}) = {formatScientific(parseFloat(result))}
                                        </span>
                                    ) : (
                                        <span>
                                            {state.baseType === 'e' ? 'e' : state.baseType === 'custom' ? state.customBase : state.baseType}<sup>{state.inputValue}</sup> = {formatScientific(parseFloat(result))}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Converter Output */}
                                {(() => {
                                    const data = JSON.parse(result);
                                    if (data.type === 'ph') {
                                        return (
                                            <>
                                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is pH...</div>
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-lg font-bold text-slate-700">[H⁺] =</span>
                                                        <span className="text-2xl font-bold text-violet-600">{formatScientific(data.valA)} M</span>
                                                    </div>
                                                </div>
                                                {data.valB !== null && (
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is [H⁺]...</div>
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-lg font-bold text-slate-700">pH =</span>
                                                            <span className="text-2xl font-bold text-emerald-600">{data.valB.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    } else if (data.type === 'pka') {
                                        return (
                                            <>
                                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is pKa...</div>
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-lg font-bold text-slate-700">Ka =</span>
                                                        <span className="text-2xl font-bold text-violet-600">{formatScientific(data.valA)}</span>
                                                    </div>
                                                </div>
                                                {data.valB !== null && (
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is Ka...</div>
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-lg font-bold text-slate-700">pKa =</span>
                                                            <span className="text-2xl font-bold text-emerald-600">{data.valB.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    } else if (data.type === 'abs') {
                                        return (
                                            <>
                                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is Absorbance...</div>
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-lg font-bold text-slate-700">%T =</span>
                                                        <span className="text-2xl font-bold text-violet-600">{data.valA.toFixed(1)} %</span>
                                                    </div>
                                                </div>
                                                {data.valB !== null && (
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">If input is %T...</div>
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-lg font-bold text-slate-700">Abs =</span>
                                                            <span className="text-2xl font-bold text-emerald-600">{data.valB.toFixed(3)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    }
                                })()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                        {state.mode === 'converter' ? (
                            <ArrowRightLeft size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        ) : (
                            <Calculator size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        )}
                        <p className="font-medium text-slate-500">Ready to calculate</p>
                        <p className="text-sm mt-2 max-w-[200px]">
                            {state.mode === 'log' ? 'Enter a value to find its logarithm.' : 
                             state.mode === 'antilog' ? 'Enter an exponent to find the value.' : 
                             'Enter a value to convert between lab scales.'}
                        </p>
                    </div>
                )}
            </Card>
        </div>

      </div>
    </div>
  );
};

export default Logarithm;