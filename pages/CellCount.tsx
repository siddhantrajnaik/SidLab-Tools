import React, { useState } from 'react';
import { RefreshCw, Printer, Microscope, Activity, Droplet } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';

interface CellState {
  liveCount: number | '';
  deadCount: number | '';
  squaresCounted: number;
  dilutionFactor: number;
  totalVolume: number | ''; // in mL
}

const CellCount: React.FC = () => {
  const [state, setState] = useState<CellState>({
    liveCount: '',
    deadCount: '',
    squaresCounted: 4,
    dilutionFactor: 2, // Default 1:1 mixture with Trypan Blue
    totalVolume: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      [e.target.name]: e.target.value === '' ? '' : parseFloat(e.target.value)
    }));
  };

  const handleReset = () => {
    setState({
      liveCount: '',
      deadCount: '',
      squaresCounted: 4,
      dilutionFactor: 2,
      totalVolume: '',
    });
  };

  // --- Calculations ---
  
  const live = safeNum(state.liveCount);
  const dead = safeNum(state.deadCount);
  const squares = safeNum(state.squaresCounted);
  const df = safeNum(state.dilutionFactor);
  const vol = safeNum(state.totalVolume);

  // Validation
  const isValid = squares > 0 && live >= 0 && dead >= 0 && df > 0;

  // Formula: (Cells / Squares) * Dilution * 10,000
  // 10,000 comes from 1/(10^-4 mL)
  const chamberVolFactor = 10000;
  
  const liveConc = isValid ? (live / squares) * df * chamberVolFactor : 0;
  const deadConc = isValid ? (dead / squares) * df * chamberVolFactor : 0;
  const totalConc = liveConc + deadConc;

  const totalCells = totalConc * vol; // Total yield if volume provided
  
  const totalCounted = live + dead;
  const viability = totalCounted > 0 ? (live / totalCounted) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Hemocytometer Counter" 
        description="Calculate cell concentration and viability using standard Neubauer chambers."
        action={
             <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print Report</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Counts & Parameters" action={
             <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
          }>
             <div className="space-y-6">
                
                {/* Section 1: Raw Counts */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center space-x-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-lime-200 text-lime-800 flex items-center justify-center text-xs font-bold">1</span>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Raw Counts</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Live Cells" 
                            name="liveCount" 
                            value={state.liveCount} 
                            onChange={handleChange} 
                            placeholder="Counted"
                        />
                        <Input 
                            label="Dead Cells (Opt)" 
                            name="deadCount" 
                            value={state.deadCount} 
                            onChange={handleChange} 
                            placeholder="Blue stained"
                        />
                    </div>
                </div>

                {/* Section 2: Settings */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center space-x-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">2</span>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Chamber Settings</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="# Squares Counted" 
                            name="squaresCounted" 
                            value={state.squaresCounted} 
                            onChange={handleChange} 
                            placeholder="Standard: 4"
                        />
                        <Input 
                            label="Dilution Factor" 
                            name="dilutionFactor" 
                            value={state.dilutionFactor} 
                            onChange={handleChange} 
                            placeholder="e.g. 2 for 1:1"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                       * Standard Neubauer volume is 0.1 µL ($10^{-4}$ mL) per large square.
                       <br/>
                       * Dilution Factor 2 means 1 part cells + 1 part dye.
                    </p>
                </div>

                {/* Section 3: Yield */}
                <div className="pt-2">
                     <Input 
                        label="Total Suspension Volume (mL)" 
                        name="totalVolume"
                        value={state.totalVolume}
                        onChange={handleChange}
                        placeholder="Optional for Yield"
                        rightElement={<span className="text-xs font-bold text-slate-500">mL</span>}
                    />
                </div>
             </div>
          </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
           <Card title="Analysis Results" className="h-full bg-slate-50/50 border-2 border-dashed border-slate-200">
              {isValid && live > 0 ? (
                  <div className="space-y-8 animate-fadeIn">
                      
                      {/* Primary Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Live Concentration */}
                          <div className="bg-white p-6 rounded-3xl border border-lime-100 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <Microscope size={64} className="text-lime-500" />
                              </div>
                              <p className="text-sm font-bold text-lime-700 uppercase tracking-wider mb-2">Live Concentration</p>
                              <div className="flex items-baseline">
                                  <span className="text-4xl font-bold text-slate-900 mr-2">{formatScientific(liveConc)}</span>
                              </div>
                              <span className="text-slate-500 font-medium">cells / mL</span>
                          </div>

                          {/* Viability */}
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                              <div className="flex justify-between items-start mb-2">
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Viability</p>
                                  <Activity size={20} className={viability > 90 ? "text-emerald-500" : viability > 70 ? "text-yellow-500" : "text-red-500"} />
                              </div>
                              <div className="flex items-baseline">
                                  <span className={`text-4xl font-bold ${viability > 90 ? "text-emerald-600" : "text-slate-900"}`}>{viability.toFixed(1)}</span>
                                  <span className="text-xl font-bold text-slate-400 ml-1">%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                                  <div className={`h-full rounded-full ${viability > 90 ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${viability}%` }}></div>
                              </div>
                          </div>
                      </div>

                      {/* Yield Section */}
                      {vol > 0 && (
                          <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div>
                                  <p className="text-sm font-bold text-slate-500 uppercase">Total Yield</p>
                                  <p className="text-slate-400 text-xs mt-1">Based on {vol} mL volume</p>
                              </div>
                              <div className="text-right">
                                  <span className="text-3xl font-bold text-indigo-600">{formatScientific(totalCells)}</span>
                                  <span className="text-sm font-bold text-indigo-300 ml-2">Cells</span>
                              </div>
                          </div>
                      )}

                      {/* Breakdown */}
                      <div className="bg-slate-100 p-5 rounded-xl text-xs font-mono text-slate-600 space-y-2">
                          <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2">Calculation Logic</div>
                          <p>Avg/Square = {live} / {squares} = {(live/squares).toFixed(2)}</p>
                          <p>Conc = Avg × Dilution ({df}) × 10,000</p>
                          <p>     = {(live/squares).toFixed(2)} × {df} × 10,000</p>
                          <p>     = {formatScientific(liveConc)} cells/mL</p>
                      </div>

                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                          <Droplet size={32} className="text-lime-300" />
                      </div>
                      <p className="font-medium text-slate-500">Ready to Count</p>
                      <p className="text-sm mt-2 max-w-[200px]">Enter your live counts and chamber settings to calculate concentration.</p>
                  </div>
              )}
           </Card>
        </div>
      </div>
    </div>
  );
};

export default CellCount;