import React, { useState } from 'react';
import { Activity, FlaskConical, Calculator } from 'lucide-react';
import { PageHeader, Card, Input, Button, Select } from '../components/UI';
import { safeNum, formatScientific } from '../utils';
import { phStrongAcid, phStrongBase, phWeakAcid, phBuffer } from '../lib/labmath';
import { bufferById } from '../lib/buffers';

// Presets come from the same NIST-sourced table the Buffer Selector uses, so the two
// tools cannot quote different pKa values for the same buffer — they did, by 0.08 for
// HEPES, when this page kept its own list.
const PRESET_IDS = ['acetate', 'citrate3', 'mes', 'phosphate2', 'mops', 'hepes', 'tris', 'tricine', 'ches'];
const COMMON_BUFFERS = PRESET_IDS
  .map(id => bufferById(id))
  .filter((b): b is NonNullable<typeof b> => !!b);

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

  const [errors, setErrors] = useState<{ strong?: string; weak?: string; buffer?: string }>({});

  // --- Calculation Logic ---

  const calculateStrong = () => {
    const c = safeNum(strongConc);
    if (strongConc === '' || c <= 0) {
      setStrongResult(null);
      setErrors(e => ({ ...e, strong: 'Enter a concentration greater than 0 M.' }));
      return;
    }
    setErrors(e => ({ ...e, strong: undefined }));

    const pH = strongType === 'acid' ? phStrongAcid(c) : phStrongBase(c);

    setStrongResult({
      pH: pH.toFixed(2),
      pOH: (14 - pH).toFixed(2),
      hConc: formatScientific(Math.pow(10, -pH))
    });
  };

  const calculateWeak = () => {
    const c = safeNum(weakConc);
    const pka = safeNum(weakPKa);
    if (weakConc === '' || c <= 0) {
      setWeakResult(null);
      setErrors(e => ({ ...e, weak: 'Enter a concentration greater than 0 M.' }));
      return;
    }
    if (weakPKa === '') {
      setWeakResult(null);
      setErrors(e => ({ ...e, weak: 'Enter the pKa of the acid.' }));
      return;
    }
    setErrors(e => ({ ...e, weak: undefined }));

    const pH = phWeakAcid(c, pka);

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
    if (bufferPKa === '') {
      setBufferResult(null);
      setErrors(e => ({ ...e, buffer: 'Enter a pKa, or pick a preset above.' }));
      return;
    }
    if (acid <= 0 || base <= 0) {
      setBufferResult(null);
      setErrors(e => ({ ...e, buffer: 'Both [Acid] and [Base] must be greater than 0 M.' }));
      return;
    }
    setErrors(e => ({ ...e, buffer: undefined }));

    // Henderson-Hasselbalch: pH = pKa + log([A-]/[HA])
    const pH = phBuffer(pka, base, acid);

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
               Complete dissociation, plus the H⁺ already in the water — so a very dilute
               acid tends to pH 7 instead of crossing it.<br/>
               <span className="font-mono text-xs">[H⁺] = (C + √(C² + 4K<sub>w</sub>)) / 2</span>
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

             {errors.strong && (
               <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{errors.strong}</div>
             )}

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
               Solves the equilibrium exactly, so it holds even when the acid is strong or
               dilute enough to dissociate substantially.<br/>
               <span className="font-mono text-xs">[H⁺] = K<sub>w</sub>/[H⁺] + C·K<sub>a</sub>/(K<sub>a</sub> + [H⁺])</span>
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

             {errors.weak && (
               <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{errors.weak}</div>
             )}

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
                        key={b.id}
                        onClick={() => loadPreset(b.pKa25)}
                        className="px-2 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-md hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                        {b.name} <span className="text-slate-400 font-mono">{b.pKa25.toFixed(2)}</span>
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

             {errors.buffer && (
               <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{errors.buffer}</div>
             )}

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