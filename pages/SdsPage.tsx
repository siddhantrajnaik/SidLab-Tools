import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum } from '../utils';
import { gelRecipe, gelPercentFromVolume } from '../lib/labmath';

// --- Logic Helpers ---

// Keeps an empty field empty instead of snapping it to 0, so decimals can be typed.
const numOrEmpty = (v: string): number | '' => (v === '' ? '' : parseFloat(v));

const PRESETS = [
  { label: 'Mini Gel (0.75mm)', resolving: 5.0, stacking: 2.0 },
  { label: 'Mini Gel (1.0mm)', resolving: 7.5, stacking: 3.0 },
  { label: 'Mini Gel (1.5mm)', resolving: 10.0, stacking: 4.0 },
  { label: 'Midi Gel (1.0mm)', resolving: 20.0, stacking: 8.0 },
];

const SdsPage: React.FC = () => {
  const [mode, setMode] = useState<'cast' | 'reverse'>('cast');
  
  // --- Cast Mode State ---
  const [stockConc, setStockConc] = useState<number>(30); // 30% or 40%
  const [resPercent, setResPercent] = useState<number | ''>(10);
  const [resVol, setResVol] = useState<number | ''>(7.5);
  const [stackPercent, setStackPercent] = useState<number | ''>(5);
  const [stackVol, setStackVol] = useState<number | ''>(3);
  
  // --- Reverse Mode State ---
  const [revAcrylVol, setRevAcrylVol] = useState<number | ''>('');
  const [revTotalVol, setRevTotalVol] = useState<number | ''>('');
  const [revStockConc, setRevStockConc] = useState<number>(30);

  const applyPreset = (presetIdx: number) => {
    setResVol(PRESETS[presetIdx].resolving);
    setStackVol(PRESETS[presetIdx].stacking);
  };

  const resRecipe = gelRecipe(safeNum(resVol), safeNum(resPercent), stockConc, false);
  const stackRecipe = gelRecipe(safeNum(stackVol), safeNum(stackPercent), stockConc, true);
  
  const revResult = gelPercentFromVolume(safeNum(revAcrylVol), safeNum(revTotalVol), revStockConc);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="SDS-PAGE Calculator" 
        description="Formulate Resolving and Stacking gels using standard Laemmli buffers."
        action={
             <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print Recipe</Button>
        }
      />

      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 p-1 rounded-xl inline-flex">
            <button 
                onClick={() => setMode('cast')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'cast' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Cast Gel (Forward)
            </button>
            <button 
                onClick={() => setMode('reverse')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'reverse' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Check % (Reverse)
            </button>
        </div>
      </div>

      {mode === 'cast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* INPUTS */}
            <div className="lg:col-span-5 space-y-6">
                <Card title="Gel Configuration">
                    <div className="space-y-6">
                        {/* Global Settings */}
                        <div>
                            <label className="text-sm font-semibold text-slate-900 mb-2 block">Acrylamide Stock Solution</label>
                            <div className="flex gap-4">
                                <label className="flex items-center space-x-2 border p-3 rounded-xl flex-1 cursor-pointer bg-slate-50 hover:bg-white hover:border-teal-200 transition-colors">
                                    <input type="radio" checked={stockConc === 30} onChange={() => setStockConc(30)} className="text-teal-600 focus:ring-teal-500" />
                                    <span className="font-medium text-slate-700">30% Stock</span>
                                </label>
                                <label className="flex items-center space-x-2 border p-3 rounded-xl flex-1 cursor-pointer bg-slate-50 hover:bg-white hover:border-teal-200 transition-colors">
                                    <input type="radio" checked={stockConc === 40} onChange={() => setStockConc(40)} className="text-teal-600 focus:ring-teal-500" />
                                    <span className="font-medium text-slate-700">40% Stock</span>
                                </label>
                            </div>
                        </div>

                        {/* Presets */}
                        <div>
                            <label className="text-sm font-semibold text-slate-900 mb-2 block">Plate Size Preset</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESETS.map((p, idx) => (
                                    <button 
                                        key={p.label} 
                                        onClick={() => applyPreset(idx)}
                                        className="text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-all text-left"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Resolving Gel Inputs */}
                        <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                             <h4 className="font-bold text-teal-800 mb-3 flex items-center">
                                 <span className="w-6 h-6 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-xs mr-2">1</span>
                                 Resolving (Lower) Gel
                             </h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <Input label="Percentage (%)" value={resPercent} onChange={e => setResPercent(numOrEmpty(e.target.value))} />
                                 <Input label="Volume (mL)" value={resVol} onChange={e => setResVol(numOrEmpty(e.target.value))} />
                             </div>
                             {(safeNum(resPercent) > stockConc) && (
                                 <p className="text-xs text-red-500 mt-2 font-medium">Target % cannot exceed Stock %</p>
                             )}
                        </div>

                        {/* Stacking Gel Inputs */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                             <h4 className="font-bold text-slate-800 mb-3 flex items-center">
                                 <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-2">2</span>
                                 Stacking (Upper) Gel
                             </h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <Input label="Percentage (%)" value={stackPercent} onChange={e => setStackPercent(numOrEmpty(e.target.value))} />
                                 <Input label="Volume (mL)" value={stackVol} onChange={e => setStackVol(numOrEmpty(e.target.value))} />
                             </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* OUTPUTS */}
            <div className="lg:col-span-7">
                <Card title="Preparation Recipe" className="h-full border-t-4 border-t-teal-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                    <th className="px-4 py-3">Component</th>
                                    <th className="px-4 py-3 text-right bg-teal-50/50 text-teal-900 border-b-2 border-teal-200">Resolving ({resPercent}%)</th>
                                    <th className="px-4 py-3 text-right">Stacking ({stackPercent}%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">H₂O (Water)</td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20">{resRecipe.water.toFixed(2)} mL</td>
                                    <td className="px-4 py-3 text-right font-mono">{stackRecipe.water.toFixed(2)} mL</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        Acrylamide ({stockConc}%)
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20 font-bold text-teal-700">{resRecipe.acrylamide.toFixed(2)} mL</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{stackRecipe.acrylamide.toFixed(2)} mL</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        Tris Buffer
                                        <div className="text-[10px] text-slate-400 font-normal">Resolving: 1.5M pH 8.8<br/>Stacking: 0.5M pH 6.8</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20">{resRecipe.buffer.toFixed(2)} mL</td>
                                    <td className="px-4 py-3 text-right font-mono">{stackRecipe.buffer.toFixed(2)} mL</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">SDS (10%)</td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20">{(resRecipe.sds * 1000).toFixed(0)} µL</td>
                                    <td className="px-4 py-3 text-right font-mono">{(stackRecipe.sds * 1000).toFixed(0)} µL</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">APS (10%)</td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20">{(resRecipe.aps * 1000).toFixed(0)} µL</td>
                                    <td className="px-4 py-3 text-right font-mono">{(stackRecipe.aps * 1000).toFixed(0)} µL</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        TEMED
                                        <div className="text-[10px] text-slate-400 font-normal">Stacking gel gets 2× (slower to set)</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono bg-teal-50/20">{(resRecipe.temed * 1000).toFixed(1)} µL</td>
                                    <td className="px-4 py-3 text-right font-mono">{(stackRecipe.temed * 1000).toFixed(1)} µL</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                    <td className="px-4 py-3">Total Volume</td>
                                    <td className="px-4 py-3 text-right">{resRecipe.total.toFixed(2)} mL</td>
                                    <td className="px-4 py-3 text-right">{stackRecipe.total.toFixed(2)} mL</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {(resRecipe.water <= 0 || stackRecipe.water <= 0) && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
                            Invalid Recipe ({resRecipe.water <= 0 ? 'resolving' : 'stacking'} gel): the target percentage leaves no room for water at this stock concentration.
                        </div>
                    )}
                </Card>
            </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <Card title="Reverse Calculator: Calculate Gel %">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select label="Stock Concentration" value={revStockConc} onChange={(e) => setRevStockConc(parseInt(e.target.value))}>
                            <option value={30}>30% Stock</option>
                            <option value={40}>40% Stock</option>
                        </Select>
                        <div className="hidden md:block"></div>

                        <Input 
                            label="Acrylamide Vol Added" 
                            value={revAcrylVol} 
                            onChange={(e) => setRevAcrylVol(numOrEmpty(e.target.value))} 
                            unit="mL"
                            placeholder="Volume"
                        />
                        <Input 
                            label="Total Gel Volume" 
                            value={revTotalVol} 
                            onChange={(e) => setRevTotalVol(numOrEmpty(e.target.value))} 
                            unit="mL"
                            placeholder="Total"
                        />
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-between border border-slate-200">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Resulting Percentage</h4>
                            <p className="text-slate-400 text-xs">Based on {revStockConc}% stock</p>
                        </div>
                        <div className="text-4xl font-bold text-teal-600">
                            {revResult > 0 ? revResult.toFixed(2) : '--'}
                            <span className="text-lg text-slate-400 font-medium ml-1">%</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default SdsPage;