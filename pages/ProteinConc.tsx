import React, { useState } from 'react';
import { Dna, Printer, RefreshCw, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific } from '../utils';

type ExtinctionUnit = 'molar' | 'mass';

interface ProteinState {
  absorbance: number | '';
  extCoef: number | '';
  extUnit: ExtinctionUnit;
  pathLength: number | '';
  mw: number | '';
}

const ProteinConc: React.FC = () => {
  const [values, setValues] = useState<ProteinState>({
    absorbance: '',
    extCoef: '',
    extUnit: 'molar', // 'molar' = M-1 cm-1, 'mass' = (mg/mL)-1 cm-1
    pathLength: 1,
    mw: ''
  });

  const [result, setResult] = useState<{
    molar: number | null; // in M
    mass: number | null;  // in mg/mL
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: name === 'extUnit' ? value : (value === '' ? '' : parseFloat(value))
    }));
    setResult(null);
    setError(null);
  };

  const calculate = () => {
    const A = safeNum(values.absorbance);
    const E = safeNum(values.extCoef);
    const L = safeNum(values.pathLength);
    const MW = values.mw === '' ? null : safeNum(values.mw);

    if (A <= 0 || E <= 0 || L <= 0) {
      setError('Absorbance, Extinction Coefficient, and Path Length must be greater than 0.');
      return;
    }

    let molarConc: number | null = null;
    let massConc: number | null = null;

    if (values.extUnit === 'molar') {
      // Formula: c (M) = A / (E * l)
      molarConc = A / (E * L);
      
      // If MW exists, convert to mg/mL
      // c (mg/mL) = c (M) * MW (g/mol)
      if (MW) {
        massConc = molarConc * MW;
      }
    } else {
      // Formula: c (mg/mL) = A / (E * l)
      massConc = A / (E * L);

      // If MW exists, convert to M
      // c (M) = c (mg/mL) / MW (g/mol)
      if (MW) {
        molarConc = massConc / MW;
      }
    }

    setResult({ molar: molarConc, mass: massConc });
  };

  const handleReset = () => {
    setValues({
      absorbance: '',
      extCoef: '',
      extUnit: 'molar',
      pathLength: 1,
      mw: ''
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Protein Concentration" 
        description="Calculate protein concentration from A280 absorbance using the Beer-Lambert Law."
        action={
           <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <Card title="Parameters" action={
             <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500">
               <RefreshCw size={16} className="mr-2"/> Reset
             </Button>
          }>
            <div className="space-y-6">
                
                {/* Section 1: Absorbance */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div className="flex items-center space-x-2 mb-3">
                       <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md">1</span>
                       <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Absorbance</h4>
                   </div>
                   <Input 
                        label="Absorbance (A280)" 
                        name="absorbance"
                        value={values.absorbance}
                        onChange={handleChange}
                        placeholder="e.g. 0.500"
                   />
                </div>

                {/* Section 2: Extinction Coefficient */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div className="flex items-center space-x-2 mb-3">
                       <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md">2</span>
                       <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Extinction Coefficient (ε)</h4>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="sm:col-span-2">
                           <Input 
                                label="Value" 
                                name="extCoef"
                                value={values.extCoef}
                                onChange={handleChange}
                                placeholder="e.g. 43824 or 1.5"
                           />
                       </div>
                       <Select 
                            label="Unit" 
                            name="extUnit" 
                            value={values.extUnit} 
                            onChange={handleChange}
                       >
                            <option value="molar">M⁻¹ cm⁻¹</option>
                            <option value="mass">(mg/mL)⁻¹ cm⁻¹</option>
                       </Select>
                   </div>
                   <p className="text-xs text-slate-500 mt-2 flex items-center">
                        <Info size={12} className="mr-1"/> 
                        {values.extUnit === 'molar' 
                            ? 'Molar extinction coefficient (usually large, e.g., 40,000)' 
                            : 'Mass extinction coefficient (Abs of 1mg/mL, usually small, e.g., 0.5 - 2.0)'}
                   </p>
                </div>

                {/* Section 3 & 4: Path Length & MW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div className="flex items-center space-x-2 mb-3">
                            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md">3</span>
                            <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Path Length</h4>
                         </div>
                         <Input 
                             label="Length (cm)" 
                             name="pathLength"
                             value={values.pathLength}
                             onChange={handleChange}
                             placeholder="Standard is 1 cm"
                         />
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div className="flex items-center space-x-2 mb-3">
                            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md">4</span>
                            <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Mol. Weight</h4>
                         </div>
                         <Input 
                             label="MW (Da or g/mol)" 
                             name="mw"
                             value={values.mw}
                             onChange={handleChange}
                             placeholder="Optional"
                         />
                     </div>
                </div>

                {error && (
                    <div className="flex items-center p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                <Button onClick={calculate} size="lg" className="w-full shadow-xl shadow-slate-900/10" variant="primary">
                    Calculate Concentration
                </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-5 space-y-6">
            <Card title="Results" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
                {result ? (
                    <div className="space-y-8 animate-fadeIn">
                        
                        {/* Primary Result */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Calculated Concentration</h4>
                            
                            {result.mass !== null && (
                                <div className="flex justify-between items-end border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                    <span className="text-3xl font-bold text-slate-900">{formatScientific(result.mass)}</span>
                                    <span className="text-lg font-medium text-slate-500 mb-1">mg/mL</span>
                                </div>
                            )}

                            {result.molar !== null && (
                                <div className="space-y-2 pt-2">
                                     <div className="flex justify-between items-center">
                                        <span className="text-xl font-bold text-slate-700">{formatScientific(result.molar * 1e6)}</span>
                                        <span className="text-sm font-medium text-slate-400">µM</span>
                                     </div>
                                     <div className="flex justify-between items-center text-sm">
                                        <span className="font-mono text-slate-500">{formatScientific(result.molar)} M</span>
                                        <span className="text-slate-400">Molar</span>
                                     </div>
                                </div>
                            )}
                            
                            {/* Missing conversion warning */}
                            {(result.molar === null || result.mass === null) && (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
                                    Enter Molecular Weight to see both mg/mL and µM conversions.
                                </div>
                            )}
                        </div>

                        {/* Formula Used */}
                        <div className="text-sm text-slate-500 font-mono bg-white p-4 rounded-xl border border-slate-100">
                             <div className="flex justify-between mb-2 pb-2 border-b border-slate-100">
                                <span className="font-sans font-semibold text-slate-900">Beer-Lambert Law</span>
                                <span className="font-bold">A = εcl</span>
                             </div>
                             <div className="space-y-2 text-xs">
                                <p>c = A / (ε × l)</p>
                                <div className="pl-2 border-l-2 border-slate-200 space-y-1">
                                    <p>A = {values.absorbance}</p>
                                    <p>ε = {values.extCoef} {values.extUnit === 'molar' ? 'M⁻¹cm⁻¹' : '(mg/mL)⁻¹cm⁻¹'}</p>
                                    <p>l = {values.pathLength} cm</p>
                                </div>
                             </div>
                        </div>

                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                        <Dna size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                        <p className="font-medium text-slate-500">Ready to calculate</p>
                        <p className="text-sm mt-2 max-w-[200px]">Enter absorbance and coefficients to determine protein concentration.</p>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ProteinConc;