import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ArrowRight, XCircle, Activity, TestTubes, Droplets, Scale, Beaker } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum, formatScientific } from '../utils';

type OopsMode = 'prep' | 'concentration' | 'ph' | 'moi';
type Severity = 'minor' | 'moderate' | 'critical' | 'fatal';
type PrepType = 'mass' | 'volume';

interface OopsState {
  mode: OopsMode;
  
  // Prep Error (New)
  prepType: PrepType;
  prepMassTarget: number | '';
  prepMassActual: number | '';
  prepVolTarget: number | '';
  prepVolActual: number | '';
  prepSoluteMass: number | ''; // Mass of solute present when volume error occurred

  // Concentration
  targetConc: number | '';
  actualConc: number | ''; 
  currentVol: number | '';
  
  // pH
  targetPh: number | '';
  actualPh: number | '';
  
  // MOI
  targetMoi: number | '';
  cellCount: number | '';
  virusTiter: number | ''; // pfu/mL
  virusVolAdded: number | ''; // uL
}

const OopsCalculator: React.FC = () => {
  const [state, setState] = useState<OopsState>({
    mode: 'prep',
    prepType: 'mass',
    prepMassTarget: '', prepMassActual: '', prepVolTarget: '', prepVolActual: '', prepSoluteMass: '',
    targetConc: '', actualConc: '', currentVol: '',
    targetPh: '', actualPh: '',
    targetMoi: '', cellCount: '', virusTiter: '', virusVolAdded: ''
  });

  const [result, setResult] = useState<{
    errorPercent: number;
    severity: Severity;
    header: string;
    message: string;
    correction: React.ReactNode;
    actionType: 'dilute' | 'add' | 'remake' | 'ok';
  } | null>(null);

  const handleModeChange = (m: OopsMode) => {
    setState(prev => ({ ...prev, mode: m }));
    setResult(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, [e.target.name]: e.target.value === '' ? '' : parseFloat(e.target.value) }));
    setResult(null);
  };

  const calculate = () => {
    const { mode } = state;
    let errorPct = 0;
    let severity: Severity = 'minor';
    let header = '';
    let message = '';
    let correction: React.ReactNode = '';
    let actionType: 'dilute' | 'add' | 'remake' | 'ok' = 'ok';

    // --- PREP ERROR LOGIC (Practical) ---
    if (mode === 'prep') {
        if (state.prepType === 'mass') {
            // Added too much/little mass
            const desired = safeNum(state.prepMassTarget);
            const actual = safeNum(state.prepMassActual);
            const plannedVol = safeNum(state.prepVolTarget);

            if (!desired || !actual || !plannedVol) return;

            errorPct = ((actual - desired) / desired) * 100;

            if (Math.abs(errorPct) < 1) {
                header = "Within Tolerance";
                message = "The mass difference is negligible.";
                actionType = 'ok';
            } else if (errorPct > 0) {
                // Added too much solute -> Too Concentrated
                // Fix: Increase total volume
                // Ratio: Actual / Desired
                const newTotalVol = plannedVol * (actual / desired);
                const volToAdd = newTotalVol - plannedVol;

                header = "Added Too Much Powder";
                message = `You added ${actual}g instead of ${desired}g (${errorPct.toFixed(1)}% extra).`;
                correction = (
                    <span>
                        Increase the total solution volume to <strong className="text-blue-600">{formatScientific(newTotalVol)} units</strong>.
                        <br/>
                        <span className="text-sm text-slate-500 mt-2 block">
                            Add roughly <strong>{formatScientific(volToAdd)} units</strong> of solvent to your current preparation.
                        </span>
                    </span>
                );
                actionType = 'dilute';
            } else {
                // Added too little solute -> Too Dilute
                // Fix: Add more solute
                const missing = desired - actual;
                header = "Added Too Little Powder";
                message = `You added ${actual}g instead of ${desired}g.`;
                correction = (
                    <span>
                        Simply add <strong className="text-emerald-600">{formatScientific(missing)}g</strong> more solute to the mix.
                    </span>
                );
                actionType = 'add';
            }
        } else {
            // Volume Error (Added too much/little liquid)
            const desiredVol = safeNum(state.prepVolTarget);
            const actualVol = safeNum(state.prepVolActual);
            const soluteMass = safeNum(state.prepSoluteMass);

            if (!desiredVol || !actualVol || !soluteMass) return;

            errorPct = ((actualVol - desiredVol) / desiredVol) * 100;

            if (Math.abs(errorPct) < 1) {
                header = "Volume OK";
                message = "The volume is correct.";
                actionType = 'ok';
            } else if (errorPct > 0) {
                // Too much liquid -> Too Dilute
                // Fix: Add more solute to maintain concentration for the new larger volume
                // Target Conc = Mass / DesiredVol
                // New Mass Needed = Target Conc * ActualVol
                const targetConc = soluteMass / desiredVol;
                const newMassNeeded = targetConc * actualVol;
                const massToAdd = newMassNeeded - soluteMass;

                header = "Overshot Volume";
                message = `You filled to ${actualVol} instead of ${desiredVol}. The solution is dilute.`;
                correction = (
                    <span>
                         Compensate by adding <strong className="text-emerald-600">{formatScientific(massToAdd)} units</strong> more solute (mass).
                         <br/>
                         <span className="text-xs text-slate-400 mt-1 block">
                            This creates a larger volume of the correct concentration.
                         </span>
                    </span>
                );
                actionType = 'add';
            } else {
                // Too little liquid -> Too Concentrated
                // Fix: Add liquid
                const volToAdd = desiredVol - actualVol;
                header = "Undershot Volume";
                message = `You have ${actualVol} but need ${desiredVol}.`;
                correction = (
                    <span>
                        Add <strong className="text-blue-600">{formatScientific(volToAdd)} units</strong> of solvent to reach the target volume.
                    </span>
                );
                actionType = 'dilute';
            }
        }
    }

    // --- CONCENTRATION LOGIC ---
    if (mode === 'concentration') {
        const target = safeNum(state.targetConc);
        const actual = safeNum(state.actualConc);
        const vol = safeNum(state.currentVol);

        if (!target || !actual || !vol) return;

        errorPct = ((actual - target) / target) * 100;
        
        if (Math.abs(errorPct) < 1) {
             header = "Perfect Match";
             message = "The concentration is effectively accurate.";
             correction = "No adjustment needed.";
             actionType = 'ok';
        } else if (errorPct > 0) {
             // Too Concentrated (Added too much solute)
             // Formula: C1V1 = C2V2 => Actual * Vol = Target * FinalVol
             const finalVol = (actual * vol) / target;
             const addVol = finalVol - vol;
             
             header = "Too Concentrated";
             message = `You are ${errorPct.toFixed(1)}% over target.`;
             correction = (
                <span>
                    Add <strong className="text-blue-600">{formatScientific(addVol)} units</strong> of solvent to your current {vol} units. 
                    <br/><span className="text-sm text-slate-500 mt-1 block">Final Total Volume: {formatScientific(finalVol)}</span>
                </span>
             );
             actionType = 'dilute';
        } else {
             // Too Dilute (Added too much water)
             // We need to add mass to the current volume to bring it UP to target.
             const missingAmount = (target * vol) - (actual * vol);
             
             header = "Too Dilute";
             message = `You are ${Math.abs(errorPct).toFixed(1)}% under target.`;
             correction = (
                 <span>
                    Add <strong className="text-emerald-600">{formatScientific(missingAmount)} units</strong> of solute (mass/moles) directly to your current solution.
                    <br/><span className="text-sm text-slate-500 mt-1 block">Do not add more liquid. Dissolve gently.</span>
                 </span>
             );
             actionType = 'add';
        }
    }

    // --- pH LOGIC ---
    if (mode === 'ph') {
        const target = safeNum(state.targetPh);
        const actual = safeNum(state.actualPh);
        if (!target || !actual) return;

        const diff = actual - target; // + means too basic, - means too acidic
        errorPct = (Math.abs(diff) / target) * 100; 

        if (Math.abs(diff) < 0.05) {
             header = "pH Acceptable";
             message = `pH ${actual} is within acceptable range.`;
             correction = "No adjustment needed.";
             actionType = 'ok';
        } else if (diff > 0) {
             // Too Basic
             header = "Too Basic (High pH)";
             message = `Overshot by ${diff.toFixed(2)} units.`;
             if (diff > 2) {
                 correction = "Critical error (>100x [H+]). Adding enough acid to fix this will significantly alter salt concentration/ionic strength. Remake recommended.";
                 actionType = 'remake';
             } else {
                 correction = "Add Acid (HCl) dropwise. Calculate volume based on acid molarity if known, otherwise titrate slowly.";
                 actionType = 'add';
             }
        } else {
             // Too Acidic
             header = "Too Acidic (Low pH)";
             message = `Undershot by ${Math.abs(diff).toFixed(2)} units.`;
             if (Math.abs(diff) > 2) {
                 correction = "Critical error. Adding base will alter ionic strength significantly. Remake recommended.";
                 actionType = 'remake';
             } else {
                 correction = "Add Base (NaOH) dropwise. Watch for temperature spikes.";
                 actionType = 'add';
             }
        }
    }

    // --- MOI LOGIC ---
    if (mode === 'moi') {
        const target = safeNum(state.targetMoi);
        const cells = safeNum(state.cellCount);
        const titer = safeNum(state.virusTiter); 
        const volAddeduL = safeNum(state.virusVolAdded);
        
        if (!target || !cells || !titer || !volAddeduL) return;

        const volAddedmL = volAddeduL / 1000;
        const actualMoi = (titer * volAddedmL) / cells;
        
        errorPct = ((actualMoi - target) / target) * 100;

        if (Math.abs(errorPct) < 10) {
             header = "MOI Acceptable";
             message = `Actual MOI ${actualMoi.toFixed(2)} is close to target.`;
             correction = "Proceed.";
             actionType = 'ok';
        } else if (errorPct > 0) {
            header = "MOI Too High";
            message = `Actual: ${actualMoi.toFixed(2)} (Target: ${target})`;
            correction = "Wash cells immediately if not incubated. Otherwise, note toxicity potential.";
            actionType = 'remake'; 
        } else {
            header = "MOI Too Low";
            message = `Actual: ${actualMoi.toFixed(2)} (Target: ${target})`;
            const vTotalmL = (target * cells) / titer;
            const vTotaluL = vTotalmL * 1000;
            const missing = vTotaluL - volAddeduL;
            correction = <span>Add <strong className="text-emerald-600">{formatScientific(missing)} μL</strong> more virus stock.</span>;
            actionType = 'add';
        }
    }

    // Determine Severity
    const absErr = Math.abs(errorPct);
    if (actionType === 'remake') severity = 'fatal';
    else if (absErr < 5) severity = 'minor';
    else if (absErr < 20) severity = 'moderate';
    else severity = 'critical';

    setResult({ errorPercent: errorPct, severity, header, message, correction, actionType });
  };

  const getSeverityColor = (s: Severity) => {
      switch(s) {
          case 'minor': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'critical': return 'bg-orange-100 text-orange-800 border-orange-200';
          case 'fatal': return 'bg-red-100 text-red-800 border-red-200';
      }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Oops Calculator" 
        description="Salvage logic for common laboratory mistakes."
      />

      {/* Mode Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
            { id: 'prep', label: 'Weigh/Vol Error', icon: Scale },
            { id: 'concentration', label: 'Conc. Fix', icon: Droplets },
            { id: 'ph', label: 'pH Adjust', icon: Activity },
            { id: 'moi', label: 'Virus MOI', icon: TestTubes }
        ].map(m => (
            <button
                key={m.id}
                onClick={() => handleModeChange(m.id as OopsMode)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-2 relative overflow-hidden
                    ${state.mode === m.id 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105 z-10' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-pink-300 hover:text-pink-600'
                    }`}
            >
                <m.icon size={24} />
                <span className="font-semibold text-xs uppercase tracking-wide">{m.label}</span>
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
           <Card title="Diagnose">
              <div className="space-y-6 animate-fadeIn">
                 
                 {/* MODE: Prep Error */}
                 {state.mode === 'prep' && (
                     <>
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                            <button 
                                onClick={() => { setState(s => ({...s, prepType: 'mass'})); setResult(null); }}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${state.prepType === 'mass' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}
                            >
                                Mass Error
                            </button>
                            <button 
                                onClick={() => { setState(s => ({...s, prepType: 'volume'})); setResult(null); }}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${state.prepType === 'volume' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}
                            >
                                Volume Error
                            </button>
                        </div>

                        {state.prepType === 'mass' ? (
                            <>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                                    <strong>Scenario:</strong> You were supposed to add <b>X</b> grams, but you accidentally added <b>Y</b> grams.
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Wanted Mass" name="prepMassTarget" value={state.prepMassTarget} onChange={handleChange} placeholder="e.g. 422g" unit="g/mg"/>
                                    <Input label="Added Mass" name="prepMassActual" value={state.prepMassActual} onChange={handleChange} placeholder="e.g. 436g" unit="g/mg"/>
                                </div>
                                <Input label="Planned Total Volume" name="prepVolTarget" value={state.prepVolTarget} onChange={handleChange} placeholder="The volume you intended to make" unit="mL/L"/>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-800 leading-relaxed">
                                    <strong>Scenario:</strong> You filled the beaker to <b>X</b> mL instead of <b>Y</b> mL (overshot volume).
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Wanted Volume" name="prepVolTarget" value={state.prepVolTarget} onChange={handleChange} placeholder="e.g. 400" unit="mL"/>
                                    <Input label="Added Volume" name="prepVolActual" value={state.prepVolActual} onChange={handleChange} placeholder="e.g. 500" unit="mL"/>
                                </div>
                                <Input label="Solute Mass in Solution" name="prepSoluteMass" value={state.prepSoluteMass} onChange={handleChange} placeholder="Total mass of powder currently inside" unit="g/mg"/>
                            </>
                        )}
                     </>
                 )}

                 {state.mode === 'concentration' && (
                     <>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4 text-xs text-blue-800">
                            <strong>Use Case:</strong> You have a solution of unknown error and you measured the actual concentration (e.g. via OD).
                        </div>
                        <Input label="Target Concentration" name="targetConc" value={state.targetConc} onChange={handleChange} placeholder="e.g. 50 mM" />
                        <Input label="Actual Concentration" name="actualConc" value={state.actualConc} onChange={handleChange} placeholder="Measured Conc" />
                        <Input label="Current Volume" name="currentVol" value={state.currentVol} onChange={handleChange} placeholder="Total Vol" />
                     </>
                 )}

                 {state.mode === 'ph' && (
                     <>
                        <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 mb-4 text-xs text-pink-800">
                             <strong>Use Case:</strong> You overshot your pH adjustment.
                        </div>
                        <Input label="Target pH" name="targetPh" value={state.targetPh} onChange={handleChange} placeholder="e.g. 7.4" />
                        <Input label="Actual pH" name="actualPh" value={state.actualPh} onChange={handleChange} placeholder="Reading" />
                     </>
                 )}

                 {state.mode === 'moi' && (
                     <>
                        <Input label="Target MOI" name="targetMoi" value={state.targetMoi} onChange={handleChange} placeholder="e.g. 5" />
                        <Input label="Number of Cells" name="cellCount" value={state.cellCount} onChange={handleChange} placeholder="Total cells" />
                        <Input label="Viral Titer (pfu/mL)" name="virusTiter" value={state.virusTiter} onChange={handleChange} placeholder="Stock conc" />
                        <Input label="Virus Vol Added (µL)" name="virusVolAdded" value={state.virusVolAdded} onChange={handleChange} placeholder="Added vol" />
                     </>
                 )}

                 <Button onClick={calculate} size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20" icon={<AlertTriangle size={18}/>}>
                    Calculate Fix
                 </Button>
              </div>
           </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
           {result ? (
               <Card title="Correction Plan" className={`h-full border-2 ${result.severity === 'fatal' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                  <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getSeverityColor(result.severity)}`}>
                             {result.severity} Issue
                          </span>
                      </div>

                      <div className="text-center py-6">
                         {result.actionType === 'ok' && <CheckCircle className="mx-auto h-16 w-16 text-emerald-400 mb-4" />}
                         {result.actionType === 'dilute' && <Droplets className="mx-auto h-16 w-16 text-blue-400 mb-4" />}
                         {result.actionType === 'add' && <RefreshCw className="mx-auto h-16 w-16 text-emerald-500 mb-4" />}
                         {result.actionType === 'remake' && <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />}
                         
                         <h3 className="text-xl font-bold text-slate-900">{result.header}</h3>
                         <p className="text-slate-500 mt-2">{result.message}</p>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-2 flex items-center">
                              <ArrowRight className="mr-2 h-4 w-4 text-red-500" />
                              Fix
                          </h4>
                          <div className="text-slate-800 text-lg leading-relaxed">
                              {result.correction}
                          </div>
                      </div>

                      {result.severity === 'critical' || result.severity === 'fatal' ? (
                          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                              <b>Warning:</b> Large corrections introduce errors. For sensitive experiments, start over.
                          </div>
                      ) : null}
                  </div>
               </Card>
           ) : (
               <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] p-12 bg-slate-50/50">
                  <RefreshCw size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                  <p className="font-medium text-slate-500">Waiting for Data</p>
                  <p className="text-sm mt-2 max-w-[250px]">Select a mode and enter your mistake to generate a correction protocol.</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default OopsCalculator;