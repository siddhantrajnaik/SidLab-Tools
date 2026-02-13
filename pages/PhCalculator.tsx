import React, { useState } from 'react';
import { Activity, Droplet, FlaskConical, Calculator } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific } from '../utils';

const COMMON_BUFFERS = [
  { name: 'Tris (25°C)', pKa: 8.06 },
  { name: 'HEPES (25°C)', pKa: 7.48 },
  { name: 'Phosphate (pKa2)', pKa: 7.21 },
  { name: 'MOPS (25°C)', pKa: 7.20 },
  { name: 'Acetate', pKa: 4.76 },
  { name: 'Citrate (pKa3)', pKa: 6.40 },
];

const PhCalculator: React.FC = () => {
  // --- Strong Acid/Base State ---
  const [strongType, setStrongType] = useState<'acid' | 'base'>('acid');
  const [strongConc, setStrongConc] = useState<number | string>('');
  const [strongResult, setStrongResult] = useState<{ pH: string; pOH: string; hConc: string } | null>(null);

  // --- Weak Acid State ---
  const [weakConc, setWeakConc] = useState<number | string>('');
  const [weakPKa, setWeakPKa] = useState<number | string>('');
  const [weakResult, setWeakResult] = useState<{ pH: string; pOH: string; hConc: string } | null>(null);

  // --- Buffer State ---
  const [bufferPKa, setBufferPKa] = useState<number | string>('');
  const [acidConc, setAcidConc] = useState<number | string>('');
  const [baseConc, setBaseConc] = useState<number | string>('');
  const [bufferResult, setBufferResult] = useState<{ pH: string; pOH: string; hConc: string } | null>(null);

  // --- Calculation Logic ---

  const calculateStrong = () => {
    const c = safeNum(strongConc);
    if (c <= 0) return;

    let pH = 0;
    if (strongType === 'acid') {
      pH = -Math.log10(c);
    } else {
      const pOH = -Math.log10(c);
      pH = 14 - pOH;
    }

    setStrongResult({
      pH: pH.toFixed(2),
      pOH: (14 - pH).toFixed(2),
      hConc: formatScientific(Math.pow(10, -pH))
    });
  };

  const calculateWeak = () => {
    const c = safeNum(weakConc);
    const pka = safeNum(weakPKa);
    if (c <= 0) return;

    // Approximation: [H+] = sqrt(Ka * C)
    // pH = 0.5 * (pKa - log[C])
    const pH = 0.5 * (pka - Math.log10(c));

    setWeakResult({
      pH: pH.toFixed(2),
      pOH: (14 - pH).toFixed(2),
      hConc: formatScientific(Math.pow(10, -pH))
    });
  };

  const calculateBuffer = () => {
    const pka = safeNum(bufferPKa);
    const acid = safeNum(acidConc);
    const base = safeNum(baseConc);
    if (acid <= 0 || base <= 0) return;

    // Henderson-Hasselbalch: pH = pKa + log([A-]/[HA])
    const pH = pka + Math.log10(base / acid);

    setBufferResult({
      pH: pH.toFixed(2),
      pOH: (14 - pH).toFixed(2),
      hConc: formatScientific(Math.pow(10, -pH))
    });
  };

  const loadPreset = (pKa: number) => {
    setBufferPKa(pKa);
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="pH Calculator" 
        description="Calculate pH for strong acids, weak acids, and buffer solutions."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Section 1: Strong Acid/Base */}
        <Card title="Strong Acid / Base" className="flex flex-col h-full border-t-4 border-t-pink-500">
           <div className="space-y-6 flex-1">
             <div className="bg-pink-50 p-4 rounded-xl text-sm text-pink-800 leading-relaxed">
               Assumes complete dissociation. <br/>
               <span className="font-mono text-xs">pH = -log[H⁺]</span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Select label="Type" value={strongType} onChange={(e) => setStrongType(e.target.value as any)}>
                   <option value="acid">Strong Acid</option>
                   <option value="base">Strong Base</option>
                </Select>
                <Input 
                  label="Concentration" 
                  value={strongConc} 
                  onChange={(e) => setStrongConc(e.target.value)} 
                  unit="M"
                  placeholder="e.g. 0.01"
                />
             </div>

             <Button onClick={calculateStrong} className="w-full" icon={<Calculator size={16}/>}>Calculate pH</Button>

             {strongResult && (
               <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">pH</span>
                    <span className="text-2xl font-bold text-slate-900">{strongResult.pH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">pOH</span>
                    <span className="font-mono text-slate-700">{strongResult.pOH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">[H⁺]</span>
                    <span className="font-mono text-slate-700">{strongResult.hConc} M</span>
                  </div>
               </div>
             )}
           </div>
        </Card>

        {/* Section 2: Weak Acid */}
        <Card title="Weak Acid (via pKa)" className="flex flex-col h-full border-t-4 border-t-emerald-500">
           <div className="space-y-6 flex-1">
             <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 leading-relaxed">
               Uses standard approximation.<br/>
               <span className="font-mono text-xs">pH ≈ ½(pKa - log[C])</span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Concentration" 
                  value={weakConc} 
                  onChange={(e) => setWeakConc(e.target.value)} 
                  unit="M"
                  placeholder="0.1"
                />
                <Input 
                  label="pKa" 
                  value={weakPKa} 
                  onChange={(e) => setWeakPKa(e.target.value)} 
                  placeholder="e.g. 4.76"
                />
             </div>

             <Button onClick={calculateWeak} className="w-full" variant="primary" icon={<FlaskConical size={16}/>}>Calculate pH</Button>

             {weakResult && (
               <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">pH</span>
                    <span className="text-2xl font-bold text-slate-900">{weakResult.pH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">pOH</span>
                    <span className="font-mono text-slate-700">{weakResult.pOH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">[H⁺]</span>
                    <span className="font-mono text-slate-700">{weakResult.hConc} M</span>
                  </div>
               </div>
             )}
           </div>
        </Card>

        {/* Section 3: Buffer */}
        <Card title="Buffer Calculation" className="flex flex-col h-full border-t-4 border-t-blue-500">
           <div className="space-y-6 flex-1">
             <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 leading-relaxed">
               Henderson-Hasselbalch Eq.<br/>
               <span className="font-mono text-xs">pH = pKa + log([Base]/[Acid])</span>
             </div>

             {/* Presets Panel */}
             <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_BUFFERS.map(b => (
                    <button 
                        key={b.name}
                        onClick={() => loadPreset(b.pKa)}
                        className="px-2 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-md hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                        {b.name}
                    </button>
                ))}
             </div>

             <div className="space-y-4">
                <Input 
                  label="pKa" 
                  value={bufferPKa} 
                  onChange={(e) => setBufferPKa(e.target.value)} 
                  placeholder="e.g. 7.21"
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="[Acid] (HA)" 
                      value={acidConc} 
                      onChange={(e) => setAcidConc(e.target.value)} 
                      unit="M"
                      placeholder="Conc"
                    />
                    <Input 
                      label="[Base] (A⁻)" 
                      value={baseConc} 
                      onChange={(e) => setBaseConc(e.target.value)} 
                      unit="M"
                      placeholder="Conc"
                    />
                </div>
             </div>

             <Button onClick={calculateBuffer} className="w-full" variant="primary" icon={<Activity size={16}/>}>Calculate pH</Button>

             {bufferResult && (
               <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">pH</span>
                    <span className="text-2xl font-bold text-slate-900">{bufferResult.pH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">pOH</span>
                    <span className="font-mono text-slate-700">{bufferResult.pOH}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">[H⁺]</span>
                    <span className="font-mono text-slate-700">{bufferResult.hConc} M</span>
                  </div>
               </div>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
};

export default PhCalculator;