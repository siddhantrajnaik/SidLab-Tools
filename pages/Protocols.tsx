import React, { useState } from 'react';
import { ChevronRight, Printer, FlaskConical, TestTubes } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { Protocol } from '../types';

// Sample Protocol Data (Usually would be imported from a separate JSON/TS file)
const PROTOCOLS: Protocol[] = [
  {
    id: 'pcr-mastermix',
    title: 'PCR Mastermix Setup',
    category: 'Molecular Biology',
    variables: [
      { id: 'samples', label: 'Number of Samples', defaultValue: 10, unit: 'tubes' },
      { id: 'vol', label: 'Reaction Volume', defaultValue: 25, unit: 'μL' }
    ],
    steps: (vars) => [
      { id: 'h1', text: 'Preparation', isHeader: true },
      { id: 's1', text: `Thaw reagents on ice. You are preparing for ${vars.samples} samples (plus 10% overage).` },
      { id: 's2', text: `Label a 1.5mL tube as "Master Mix".` },
      { id: 'h2', text: 'Master Mix Components (per rxn x count)', isHeader: true },
      { id: 's3', text: `Water: ${(18.5 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's4', text: `10x Buffer: ${(2.5 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's5', text: `dNTPs: ${(0.5 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's6', text: `Fwd Primer: ${(1.25 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's7', text: `Rev Primer: ${(1.25 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's8', text: `Taq Polymerase: ${(0.125 * (vars.samples * 1.1)).toFixed(1)} μL` },
      { id: 's9', text: `Aliquot ${(vars.vol - 1)} μL of Master Mix into PCR tubes.` },
      { id: 's10', text: `Add 1 μL of Template DNA to each tube.` },
    ]
  },
  {
    id: 'western-lysis',
    title: 'Western Blot Lysis Buffer',
    category: 'Protein',
    variables: [
      { id: 'bufferVol', label: 'Total Buffer Volume', defaultValue: 10, unit: 'mL' }
    ],
    steps: (vars) => [
      { id: 'h1', text: 'RIPA Buffer Additives', isHeader: true },
      { id: 's1', text: `Prepare ${vars.bufferVol} mL of cold RIPA buffer.` },
      { id: 's2', text: `Add ${(vars.bufferVol * 10).toFixed(1)} μL of PMSF (100x).` },
      { id: 's3', text: `Add ${(vars.bufferVol * 10).toFixed(1)} μL of Protease Inhibitor Cocktail.` },
      { id: 's4', text: `Add ${(vars.bufferVol * 10).toFixed(1)} μL of Sodium Orthovanadate.` },
      { id: 's5', text: `Keep on ice at all times.` },
    ]
  }
];

const Protocols: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, number>>({});

  const activeProtocol = PROTOCOLS.find(p => p.id === selectedId);

  const handleSelect = (p: Protocol) => {
    // Initialize default variables
    const defaults: Record<string, number> = {};
    p.variables.forEach(v => defaults[v.id] = v.defaultValue);
    setVariables(defaults);
    setSelectedId(p.id);
  };

  const handleVarChange = (id: string, val: string) => {
    setVariables(prev => ({
      ...prev,
      [id]: parseFloat(val) || 0
    }));
  };

  if (activeProtocol) {
    const steps = activeProtocol.steps(variables);
    return (
      <div className="space-y-6">
        <PageHeader 
          title={activeProtocol.title} 
          description={activeProtocol.category}
          action={
            <div className="flex space-x-2">
               <Button variant="secondary" onClick={() => setSelectedId(null)} className="print:hidden">Back</Button>
               <Button variant="primary" onClick={() => window.print()} icon={<Printer size={16} />}>Print Protocol</Button>
            </div>
          }
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 print:hidden">
            <Card title="Variables">
               <div className="space-y-4">
                 {activeProtocol.variables.map(v => (
                   <Input 
                     key={v.id}
                     label={v.label}
                     value={variables[v.id]}
                     onChange={(e) => handleVarChange(v.id, e.target.value)}
                     unit={v.unit}
                   />
                 ))}
               </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
             <Card className="min-h-[500px] print:shadow-none print:border-none">
                <div className="space-y-6">
                  {steps.map((step) => {
                    if (step.isHeader) {
                      return (
                        <h3 key={step.id} className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mt-6 first:mt-0">
                          {step.text}
                        </h3>
                      );
                    }
                    return (
                      <div key={step.id} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium mt-0.5 print:border print:border-slate-300 print:bg-white print:text-black">
                           <div className="w-2 h-2 bg-current rounded-full" />
                        </div>
                        <p className="ml-4 text-slate-700 leading-relaxed print:text-black">{step.text}</p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-12 pt-6 border-t border-dashed border-slate-300 hidden print:block">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Generated by LabSuite</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Protocol Engine" description="Select a protocol template to customize variables and generate a printable bench guide." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROTOCOLS.map(p => (
          <button 
            key={p.id} 
            onClick={() => handleSelect(p)}
            className="text-left h-full"
          >
            <Card className="h-full hover:border-indigo-500 transition-colors group relative">
               <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${p.category === 'Protein' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {p.category === 'Protein' ? <FlaskConical size={20} /> : <TestTubes size={20} />}
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{p.category}</span>
               </div>
               <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{p.title}</h3>
               <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-indigo-500" />
               </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Protocols;