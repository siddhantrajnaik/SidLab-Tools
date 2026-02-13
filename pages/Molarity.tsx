import React, { useState } from 'react';
import { RefreshCw, Printer, FlaskConical, Beaker, Check, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { usePersistedState, safeNum, formatScientific, UNITS } from '../utils';

// Predefined Chemicals
interface Chemical {
  name: string;
  mw: number | '';
  n: number;
}

const CHEMICALS: Chemical[] = [
  { name: 'Custom', mw: '', n: 1 },
  { name: 'NaCl (Sodium Chloride)', mw: 58.44, n: 1 },
  { name: 'Tris-Base', mw: 121.14, n: 1 },
  { name: 'Tris-HCl', mw: 157.60, n: 1 },
  { name: 'EDTA (Disodium)', mw: 372.24, n: 2 }, // Often used as chelator, n varies, but common context
  { name: 'HEPES', mw: 238.30, n: 1 },
  { name: 'NaOH (Sodium Hydroxide)', mw: 40.00, n: 1 },
  { name: 'HCl (Hydrochloric Acid)', mw: 36.46, n: 1 },
  { name: 'H2SO4 (Sulfuric Acid)', mw: 98.08, n: 2 },
  { name: 'Glucose', mw: 180.16, n: 1 },
];

interface MolarityStateV2 {
  mw: number | '';
  nFactor: number;
  mass: number | '';
  massUnit: keyof typeof UNITS.mass;
  volume: number | '';
  volumeUnit: keyof typeof UNITS.volume;
  molarity: number | '';
  molarityUnit: keyof typeof UNITS.concentration;
  lastSolvedFor: 'mass' | 'volume' | 'molarity' | null;
}

const Molarity: React.FC = () => {
  const [state, setState] = usePersistedState<MolarityStateV2>('labsuite_molarity_v2', {
    mw: '',
    nFactor: 1,
    mass: '',
    massUnit: 'g',
    volume: '',
    volumeUnit: 'mL',
    molarity: '',
    molarityUnit: 'mM',
    lastSolvedFor: null,
  });

  const [selectedChem, setSelectedChem] = useState('Custom');
  const [error, setError] = useState<string | null>(null);

  const handleChemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedChem(name);
    const chem = CHEMICALS.find(c => c.name === name);
    if (chem && name !== 'Custom') {
      setState(prev => ({
        ...prev,
        mw: chem.mw,
        nFactor: chem.n,
        // Reset inputs on chem change for safety? No, keep them.
      }));
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value),
      lastSolvedFor: null // Clear result indicator on edit
    }));
    setError(null);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const calculate = () => {
    setError(null);
    const { mw, mass, volume, molarity, massUnit, volumeUnit, molarityUnit } = state;
    const mwNum = safeNum(mw);

    if (!mwNum || mwNum <= 0) {
        setError('Molecular Weight is required and must be > 0');
        return;
    }

    // Convert knowns to Base Units (g, L, M)
    const massBase = mass !== '' ? safeNum(mass) * UNITS.mass[massUnit] : null;
    const volBase = volume !== '' ? safeNum(volume) * UNITS.volume[volumeUnit] : null;
    const molBase = molarity !== '' ? safeNum(molarity) * UNITS.concentration[molarityUnit] : null;

    let solved = false;
    let updates: Partial<MolarityStateV2> = {};

    // Logic: Identify missing field
    // 1. Solve for Mass: Mass = M * V * MW
    if (massBase === null && volBase !== null && molBase !== null) {
        const calculatedMassBase = molBase * volBase * mwNum;
        const calculatedMass = calculatedMassBase / UNITS.mass[massUnit];
        updates = { mass: calculatedMass, lastSolvedFor: 'mass' };
        solved = true;
    }
    // 2. Solve for Molarity: M = Mass / (MW * V)
    else if (molBase === null && massBase !== null && volBase !== null) {
        if (volBase === 0) { setError("Volume cannot be zero"); return; }
        const calculatedMolBase = massBase / (mwNum * volBase);
        const calculatedMol = calculatedMolBase / UNITS.concentration[molarityUnit];
        updates = { molarity: calculatedMol, lastSolvedFor: 'molarity' };
        solved = true;
    }
    // 3. Solve for Volume: V = Mass / (MW * M)
    else if (volBase === null && massBase !== null && molBase !== null) {
        if (molBase === 0) { setError("Concentration cannot be zero"); return; }
        const calculatedVolBase = massBase / (mwNum * molBase);
        const calculatedVol = calculatedVolBase / UNITS.volume[volumeUnit];
        updates = { volume: calculatedVol, lastSolvedFor: 'volume' };
        solved = true;
    } 
    else {
        setError("Please fill in exactly 3 fields (MW + 2 others) to calculate the 4th.");
    }

    if (solved) {
        setState(prev => ({ ...prev, ...updates }));
    }
  };

  const reset = () => {
    setState({
        mw: '',
        nFactor: 1,
        mass: '',
        massUnit: 'g',
        volume: '',
        volumeUnit: 'mL',
        molarity: '',
        molarityUnit: 'mM',
        lastSolvedFor: null,
    });
    setSelectedChem('Custom');
    setError(null);
  };

  // Derived Values for Display
  const normality = (state.molarity !== '' && state.nFactor) 
    ? formatScientific(safeNum(state.molarity) * state.nFactor) 
    : '-';
    
  const normalityUnit = state.molarityUnit.replace('M', 'N');

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Molarity & Normality" 
        description="Professional calculator with unit conversion, chemical presets, and step-by-step breakdown."
        action={
             <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Calculator Input */}
        <div className="lg:col-span-7 space-y-6">
           <Card title="Parameters" action={
             <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
           }>
             <div className="space-y-6">
                {/* Chemical Preset Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Chemical Preset" value={selectedChem} onChange={handleChemChange}>
                        {CHEMICALS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="MW (g/mol)" 
                            name="mw" 
                            value={state.mw} 
                            onChange={handleValueChange} 
                            placeholder="e.g. 58.44"
                        />
                        <Input 
                            label="n-factor" 
                            name="nFactor" 
                            value={state.nFactor} 
                            onChange={handleValueChange} 
                            placeholder="1"
                        />
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Core Inputs */}
                <div className="space-y-5">
                    <Input 
                        label="Mass / Weight" 
                        name="mass"
                        value={state.mass}
                        onChange={handleValueChange}
                        placeholder={state.lastSolvedFor === 'mass' ? "Calculated" : "Enter mass"}
                        className={state.lastSolvedFor === 'mass' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                        rightElement={
                            <select 
                                name="massUnit" 
                                value={state.massUnit} 
                                onChange={handleUnitChange}
                                className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer py-1"
                            >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="mg">mg</option>
                                <option value="µg">µg</option>
                            </select>
                        }
                    />

                    <Input 
                        label="Volume" 
                        name="volume"
                        value={state.volume}
                        onChange={handleValueChange}
                        placeholder={state.lastSolvedFor === 'volume' ? "Calculated" : "Enter volume"}
                        className={state.lastSolvedFor === 'volume' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                        rightElement={
                            <select 
                                name="volumeUnit" 
                                value={state.volumeUnit} 
                                onChange={handleUnitChange}
                                className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer py-1"
                            >
                                <option value="L">L</option>
                                <option value="mL">mL</option>
                                <option value="µL">µL</option>
                            </select>
                        }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="Molarity" 
                            name="molarity"
                            value={state.molarity}
                            onChange={handleValueChange}
                            placeholder={state.lastSolvedFor === 'molarity' ? "Calculated" : "Enter Conc"}
                            className={state.lastSolvedFor === 'molarity' ? "ring-2 ring-emerald-500/20 rounded-2xl bg-emerald-50/30" : ""}
                            rightElement={
                                <select 
                                    name="molarityUnit" 
                                    value={state.molarityUnit} 
                                    onChange={handleUnitChange}
                                    className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer py-1"
                                >
                                    <option value="M">M</option>
                                    <option value="mM">mM</option>
                                    <option value="µM">µM</option>
                                    <option value="nM">nM</option>
                                </select>
                            }
                        />
                        
                         {/* Normality Display */}
                        <div className="flex flex-col space-y-2 opacity-75">
                             <label className="text-sm font-semibold text-slate-500 ml-1">Normality (N)</label>
                             <div className="relative rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 text-slate-700 font-mono sm:text-sm flex items-center justify-between pr-4">
                                <span>{normality}</span>
                                <span className="text-slate-400 font-bold text-xs">{normalityUnit}</span>
                             </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center p-3 rounded-xl bg-red-50 text-red-700 text-sm">
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
        
        {/* Results & Steps Panel */}
        <div className="lg:col-span-5 space-y-6">
            <Card title="Step-by-Step Guide" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
                {state.lastSolvedFor ? (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex items-start space-x-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                                <FlaskConical size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Result</h4>
                                <p className="text-slate-600 mt-1">
                                    {state.lastSolvedFor === 'mass' && `Weigh ${formatScientific(safeNum(state.mass))} ${state.massUnit} of ${selectedChem !== 'Custom' ? selectedChem : 'solute'}.`}
                                    {state.lastSolvedFor === 'volume' && `Add solvent to reach ${formatScientific(safeNum(state.volume))} ${state.volumeUnit}.`}
                                    {state.lastSolvedFor === 'molarity' && `Final concentration is ${formatScientific(safeNum(state.molarity))} ${state.molarityUnit}.`}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">Calculation Logic</h4>
                            
                            <div className="text-sm space-y-3 font-mono text-slate-600">
                                <p className="flex justify-between">
                                    <span>Formula:</span>
                                    <span className="font-bold text-slate-800">Mass (g) = M (mol/L) × V (L) × MW</span>
                                </p>
                                
                                {state.lastSolvedFor === 'mass' && (
                                    <>
                                        <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                                            <p className="mb-1 text-slate-400">1. Convert inputs to base units:</p>
                                            <p>Vol = {state.volume} {state.volumeUnit} × {UNITS.volume[state.volumeUnit]} = {formatScientific(safeNum(state.volume) * UNITS.volume[state.volumeUnit])} L</p>
                                            <p>Conc = {state.molarity} {state.molarityUnit} × {UNITS.concentration[state.molarityUnit]} = {formatScientific(safeNum(state.molarity) * UNITS.concentration[state.molarityUnit])} mol/L</p>
                                        </div>
                                        <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                                             <p className="mb-1 text-slate-400">2. Solve for Grams:</p>
                                             <p>{formatScientific(safeNum(state.molarity) * UNITS.concentration[state.molarityUnit])} × {formatScientific(safeNum(state.volume) * UNITS.volume[state.volumeUnit])} × {state.mw} = {formatScientific((safeNum(state.molarity) * UNITS.concentration[state.molarityUnit]) * (safeNum(state.volume) * UNITS.volume[state.volumeUnit]) * safeNum(state.mw))} g</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {state.nFactor > 1 && (
                            <div className="bg-blue-50 p-4 rounded-2xl text-sm text-blue-800">
                                <span className="font-bold block mb-1">Normality Check:</span>
                                Since n-factor is {state.nFactor}, the Normality is {state.nFactor}× the Molarity.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                        <Beaker size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        <p className="font-medium text-slate-500">Ready to calculate</p>
                        <p className="text-sm mt-2 max-w-[200px]">Enter any 3 values to automatically solve for the 4th.</p>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Molarity;