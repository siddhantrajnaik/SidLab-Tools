import React, { useState, useMemo, useCallback } from 'react';
import { Dna, Printer, AlertCircle, Thermometer, Layers, FlaskConical, Search, Sliders, CheckCircle, XCircle, RefreshCw, Zap, Microscope, ArrowRight, ArrowLeft } from 'lucide-react';
import { PageHeader, Card, Button, Input, Select } from '../components/UI';
import { safeNum } from '../utils';

// --- Types & Constants ---
type Mode = 'analyze' | 'design';
type Polymerase = 'taq' | 'q5' | 'phusion';

interface PrimerResult {
    seq: string;
    cleanSeq: string;
    length: number;
    gc: number;
    tmBasic: number;
    tmNN: number;
    molecularWeight: number;
    isValid: boolean;
    error?: string;
}

interface CandidatePrimer extends PrimerResult {
    start: number;
    end: number;
    strand: 'sense' | 'antisense';
}

interface PrimerPair {
    id: string;
    forward: CandidatePrimer;
    reverse: CandidatePrimer;
    productSize: number;
    tmDiff: number;
    score: number;
}

// SantaLucia 1998 Thermodynamic Parameters
const NN_PARAMS: Record<string, { dH: number; dS: number }> = {
    'AA': { dH: -7.9, dS: -22.2 }, 'TT': { dH: -7.9, dS: -22.2 },
    'AT': { dH: -7.2, dS: -20.4 }, 'TA': { dH: -7.2, dS: -21.3 },
    'CA': { dH: -8.5, dS: -22.7 }, 'TG': { dH: -8.5, dS: -22.7 },
    'GT': { dH: -8.4, dS: -22.4 }, 'AC': { dH: -8.4, dS: -22.4 },
    'CT': { dH: -7.8, dS: -21.0 }, 'AG': { dH: -7.8, dS: -21.0 },
    'GA': { dH: -8.2, dS: -22.2 }, 'TC': { dH: -8.2, dS: -22.2 },
    'CG': { dH: -10.6, dS: -27.2 }, 'GC': { dH: -9.8, dS: -24.4 },
    'GG': { dH: -8.0, dS: -19.9 }, 'CC': { dH: -8.0, dS: -19.9 },
};
const NN_INIT_GC = { dH: 0.1, dS: -2.8 };
const NN_INIT_AT = { dH: 2.3, dS: 4.1 };

const DEFAULT_CONC_NA_MM = 50;

// --- Core Algorithms ---
const cleanSequence = (seq: string): string => seq.replace(/[^a-zA-Z]/g, '').toUpperCase();

const getComplement = (base: string) => {
    const map: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A', N: 'N' };
    return map[base] || 'N';
};

const reverseComplement = (seq: string) => seq.split('').reverse().map(getComplement).join('');

const calculatePrimerProps = (rawSeq: string, primerConcNm: number): PrimerResult => {
    const cleanSeq = cleanSequence(rawSeq);
    if (!cleanSeq) return { seq: rawSeq, cleanSeq: '', length: 0, gc: 0, tmBasic: 0, tmNN: 0, molecularWeight: 0, isValid: false };

    if (/[^ATGC]/.test(cleanSeq)) {
        return { seq: rawSeq, cleanSeq, length: cleanSeq.length, gc: 0, tmBasic: 0, tmNN: 0, molecularWeight: 0, isValid: false, error: 'Contains non-ATGC' };
    }

    const length = cleanSeq.length;
    const g = (cleanSeq.match(/G/g) || []).length;
    const c = (cleanSeq.match(/C/g) || []).length;
    const a = (cleanSeq.match(/A/g) || []).length;
    const t = (cleanSeq.match(/T/g) || []).length;
    const gcPercent = ((g + c) / length) * 100;
    const mw = (a * 313.2) + (c * 289.2) + (g * 329.2) + (t * 304.2) - 61.96;

    let tmBasic = length < 14 ? (a + t) * 2 + (g + c) * 4 : 64.9 + 41 * (g + c - 16.4) / length;

    let dH = 0;
    let dS = 0;
    const first = cleanSeq[0];
    const last = cleanSeq[length - 1];
    if (first === 'G' || first === 'C') { dH += NN_INIT_GC.dH; dS += NN_INIT_GC.dS; } else { dH += NN_INIT_AT.dH; dS += NN_INIT_AT.dS; }
    if (last === 'G' || last === 'C') { dH += NN_INIT_GC.dH; dS += NN_INIT_GC.dS; } else { dH += NN_INIT_AT.dH; dS += NN_INIT_AT.dS; }

    for (let i = 0; i < length - 1; i++) {
        const pair = cleanSeq.slice(i, i + 2);
        if (NN_PARAMS[pair]) { dH += NN_PARAMS[pair].dH; dS += NN_PARAMS[pair].dS; }
    }

    const saltCorr = 16.6 * Math.log10(DEFAULT_CONC_NA_MM / 1000);
    const R = 1.987;
    const Ct = primerConcNm * 1e-9;
    const term = R * Math.log(Ct / 4);
    const tmNN = ((dH * 1000) / (dS + term)) - 273.15 + saltCorr;

    return { seq: rawSeq, cleanSeq, length, gc: gcPercent, tmBasic, tmNN, molecularWeight: mw, isValid: true };
};

const designPrimers = (
    template: string,
    config: {
        minProd: number, maxProd: number,
        minLen: number, maxLen: number,
        minTm: number, maxTm: number,
        optTm: number
    }
): PrimerPair[] => {
    const seq = cleanSequence(template);
    const len = seq.length;
    if (len < config.minProd) return [];

    const forwardCandidates: CandidatePrimer[] = [];
    const reverseCandidates: CandidatePrimer[] = [];

    // Loose scan
    for (let i = 0; i < len - config.minProd; i++) {
        for (let l = config.minLen; l <= config.maxLen; l++) {
            if (i + l > len) break;
            const sub = seq.substring(i, i + l);
            const props = calculatePrimerProps(sub, 500);
            if (props.isValid && props.tmNN >= (config.minTm - 5) && props.tmNN <= (config.maxTm + 5)) {
                forwardCandidates.push({ ...props, start: i, end: i + l - 1, strand: 'sense' });
            }
        }
    }

    for (let i = config.minProd; i < len; i++) {
        for (let l = config.minLen; l <= config.maxLen; l++) {
            if (i - l < 0) continue;
            const start = i - l + 1;
            const end = i;
            const templateSegment = seq.substring(start, end + 1);
            const primerSeq = reverseComplement(templateSegment);
            const props = calculatePrimerProps(primerSeq, 500);
            if (props.isValid && props.tmNN >= (config.minTm - 5) && props.tmNN <= (config.maxTm + 5)) {
                reverseCandidates.push({ ...props, start: start, end: end, strand: 'antisense' });
            }
        }
    }

    const pairs: PrimerPair[] = [];
    const MAX_CANDIDATES = 300;
    forwardCandidates.sort((a, b) => Math.abs(a.tmNN - config.optTm) - Math.abs(b.tmNN - config.optTm));
    reverseCandidates.sort((a, b) => Math.abs(a.tmNN - config.optTm) - Math.abs(b.tmNN - config.optTm));

    const topFwd = forwardCandidates.slice(0, MAX_CANDIDATES);
    const topRev = reverseCandidates.slice(0, MAX_CANDIDATES);

    for (const f of topFwd) {
        for (const r of topRev) {
            if (r.end <= f.start) continue;
            const pSize = r.end - f.start + 1;
            if (pSize < config.minProd || pSize > config.maxProd) continue;
            // Strict check
            if (f.tmNN < config.minTm || f.tmNN > config.maxTm) continue;
            if (r.tmNN < config.minTm || r.tmNN > config.maxTm) continue;

            const tmDiff = Math.abs(f.tmNN - r.tmNN);
            if (tmDiff > 5) continue;

            const tmPenalty = Math.abs(f.tmNN - config.optTm) + Math.abs(r.tmNN - config.optTm);
            const diffPenalty = tmDiff * 2;
            const gcPenalty = (Math.abs(f.gc - 50) + Math.abs(r.gc - 50)) * 0.1;
            const fClamp = (f.seq.endsWith('G') || f.seq.endsWith('C')) ? 0 : 2;
            const rClamp = (r.seq.endsWith('G') || r.seq.endsWith('C')) ? 0 : 2;

            const score = tmPenalty + diffPenalty + gcPenalty + fClamp + rClamp;

            pairs.push({
                id: `${f.start}-${r.end}`,
                forward: f,
                reverse: r,
                productSize: pSize,
                tmDiff,
                score
            });
        }
    }

    return pairs.sort((a, b) => a.score - b.score).slice(0, 20);
};

// --- Custom "Space" Components (Only for Design Mode) ---

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
    <div className={`relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl overflow-hidden ${className}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {title && <h3 className="relative text-xl font-bold text-white mb-4 tracking-tight flex items-center">{title}</h3>}
        <div className="relative z-10">{children}</div>
    </div>
);

const GlassInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, right?: React.ReactNode }> = ({ label, right, className = '', ...props }) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-blue-200 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative group">
            <input
                {...props}
                className={`w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${className}`}
            />
            {right && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">{right}</div>}
        </div>
    </div>
);

// --- Main Page Component ---

const PrimerAnalysis: React.FC = () => {
    const [mode, setMode] = useState<Mode>('analyze');

    // Analysis State
    const [fwdInput, setFwdInput] = useState('');
    const [revInput, setRevInput] = useState('');

    // Design State
    const [templateInput, setTemplateInput] = useState('');
    const [designConfig, setDesignConfig] = useState({
        minProd: 100, maxProd: 1000,
        minLen: 18, maxLen: 24,
        minTm: 55, maxTm: 65,
        optTm: 60
    });
    const [designResults, setDesignResults] = useState<PrimerPair[]>([]);
    const [isDesigning, setIsDesigning] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedPairId, setSelectedPairId] = useState<string | null>(null);

    // Shared Config
    const [polymerase, setPolymerase] = useState<Polymerase>('q5');
    const [primerConc, setPrimerConc] = useState<number>(500);

    // Logic
    const fwd = useMemo(() => calculatePrimerProps(fwdInput, primerConc), [fwdInput, primerConc]);
    const rev = useMemo(() => calculatePrimerProps(revInput, primerConc), [revInput, primerConc]);
    const analysisTmDiff = fwd.isValid && rev.isValid ? Math.abs(fwd.tmNN - rev.tmNN) : 0;
    const analysisTa = useMemo(() => {
        if (!fwd.isValid || !rev.isValid) return null;
        const minTm = Math.min(fwd.tmNN, rev.tmNN);
        if (polymerase === 'q5') return Math.floor(minTm);
        if (polymerase === 'phusion') return Math.floor(minTm + 3);
        return Math.floor(minTm - 5);
    }, [fwd, rev, polymerase]);

    const handleDesign = useCallback(async () => {
        if (!templateInput) return;
        setIsDesigning(true);
        setHasSearched(true);
        setDesignResults([]);
        setTimeout(() => {
            const pairs = designPrimers(templateInput, designConfig);
            setDesignResults(pairs);
            if (pairs.length > 0) setSelectedPairId(pairs[0].id);
            setIsDesigning(false);
        }, 50);
    }, [templateInput, designConfig]);

    const selectedPair = designResults.find(p => p.id === selectedPairId);

    // ===============================================
    // MODE: DESIGN (Space Theme)
    // ===============================================
    if (mode === 'design') {
        return (
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] -mx-4 sm:-mx-6 lg:-mx-8 -my-8 md:-my-12 p-4 sm:p-6 lg:p-8 text-white relative min-h-[calc(100vh-64px)] overflow-hidden">

                {/* Background Decorators */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
                        <div>
                            <button
                                onClick={() => setMode('analyze')}
                                className="flex items-center text-cyan-300 hover:text-white transition-colors mb-2 text-sm font-bold tracking-wider uppercase"
                            >
                                <ArrowLeft size={16} className="mr-2" /> Back to Standard Analysis
                            </button>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                                Primer Designer
                            </h1>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
                        <div className="lg:col-span-4 space-y-6">
                            <GlassCard title="Mission Parameters">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-blue-200 uppercase tracking-wider ml-1 mb-2 block">Template Sequence</label>
                                        <textarea
                                            value={templateInput}
                                            onChange={(e) => setTemplateInput(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white font-mono text-xs h-32 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all placeholder-white/20 resize-none"
                                            placeholder="PASTE DNA HERE..."
                                        />
                                        <div className="text-right text-[10px] text-white/40 mt-1 font-mono">
                                            {cleanSequence(templateInput).length} BP
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <GlassInput label="Min Prod" value={designConfig.minProd} onChange={(e) => setDesignConfig(p => ({ ...p, minProd: safeNum(e.target.value) }))} />
                                        <GlassInput label="Max Prod" value={designConfig.maxProd} onChange={(e) => setDesignConfig(p => ({ ...p, maxProd: safeNum(e.target.value) }))} />
                                        <GlassInput label="Min Tm" value={designConfig.minTm} onChange={(e) => setDesignConfig(p => ({ ...p, minTm: safeNum(e.target.value) }))} />
                                        <GlassInput label="Max Tm" value={designConfig.maxTm} onChange={(e) => setDesignConfig(p => ({ ...p, maxTm: safeNum(e.target.value) }))} />
                                    </div>

                                    <button
                                        onClick={handleDesign}
                                        disabled={isDesigning || templateInput.length < 20}
                                        className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg shadow-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                                    >
                                        {isDesigning ? <RefreshCw className="animate-spin" /> : <Zap fill="currentColor" />}
                                        <span>{isDesigning ? 'Scanning Sector...' : 'Generate Primers'}</span>
                                    </button>
                                </div>
                            </GlassCard>
                        </div>

                        <div className="lg:col-span-8">
                            {designResults.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Top Candidate Visualizer */}
                                    {selectedPair && (
                                        <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 border border-white/10 shadow-2xl overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Dna size={120} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Best Candidate</div>
                                                        <div className="text-3xl font-bold text-white">{selectedPair.productSize} bp <span className="text-lg text-white/50 font-normal">Amplicon</span></div>
                                                    </div>
                                                    <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                                                        Score: {selectedPair.score.toFixed(1)}
                                                    </div>
                                                </div>

                                                {/* Vis Bar */}
                                                <div className="h-4 bg-white/5 rounded-full relative w-full mb-8 overflow-hidden">
                                                    <div className="absolute left-0 h-full bg-cyan-500 w-[15%]" />
                                                    <div className="absolute right-0 h-full bg-purple-500 w-[15%]" />
                                                    <div className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-0.5 bg-white/20" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]"></span>
                                                            <span className="text-cyan-200 font-bold text-sm">Forward (Sense)</span>
                                                        </div>
                                                        <div className="font-mono text-sm text-white/90 break-all mb-1">{selectedPair.forward.cleanSeq}</div>
                                                        <div className="text-xs text-white/50">Tm: {selectedPair.forward.tmNN.toFixed(1)}°C | GC: {selectedPair.forward.gc.toFixed(0)}%</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center space-x-2 mb-2 justify-end">
                                                            <span className="text-purple-200 font-bold text-sm">Reverse (Antisense)</span>
                                                            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_purple]"></span>
                                                        </div>
                                                        <div className="font-mono text-sm text-white/90 break-all mb-1">{selectedPair.reverse.cleanSeq}</div>
                                                        <div className="text-xs text-white/50">Tm: {selectedPair.reverse.tmNN.toFixed(1)}°C | GC: {selectedPair.reverse.gc.toFixed(0)}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* List */}
                                    <div className="space-y-3">
                                        {designResults.map((pair, idx) => (
                                            <div
                                                key={pair.id}
                                                onClick={() => setSelectedPairId(pair.id)}
                                                className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${selectedPairId === pair.id ? 'bg-white/10 border-white/30' : 'bg-transparent border-white/5 hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-white/30 font-bold font-mono text-lg w-8">#{idx + 1}</div>
                                                    <div>
                                                        <div className="text-white font-bold">{pair.productSize} bp</div>
                                                        <div className="text-xs text-white/50 flex space-x-3">
                                                            <span className="text-cyan-200">F: {pair.forward.tmNN.toFixed(1)}°</span>
                                                            <span className="text-purple-200">R: {pair.reverse.tmNN.toFixed(1)}°</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {selectedPairId === pair.id ? <CheckCircle className="text-emerald-400" size={20} /> : <ArrowRight className="text-white/20" size={20} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                                    {isDesigning ? (
                                        <div className="animate-pulse">
                                            <div className="w-16 h-16 bg-white/20 rounded-full mb-4 mx-auto" />
                                            <div className="text-white/50">Scanning genome sector...</div>
                                        </div>
                                    ) : hasSearched ? (
                                        <>
                                            <XCircle size={48} className="text-red-400 mb-4" />
                                            <h3 className="text-xl font-bold text-white">No Candidates Found</h3>
                                            <p className="text-white/50 mt-2 max-w-sm">Relax constraints (Tm range, Product size) to expand search parameters.</p>
                                        </>
                                    ) : (
                                        <>
                                            <Layers size={48} className="text-white/20 mb-4" />
                                            <h3 className="text-xl font-bold text-white">Awaiting Input</h3>
                                            <p className="text-white/50 mt-2 max-w-sm">Enter template sequence to begin primer generation.</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===============================================
    // MODE: ANALYZE (Standard Light Theme)
    // ===============================================
    return (
        <div className="space-y-8 animate-fadeIn">
            <PageHeader
                title="Primer Engine"
                description="Analyze existing sequences using thermodynamic modeling."
                action={
                    <Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print Report</Button>
                }
            />

            {/* Mode Switcher Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20"><Dna size={180} /></div>
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-2xl font-bold mb-2">Design New Primers?</h2>
                    <p className="text-slate-300 mb-6">Switch to our advanced Primer Designer interface to generate optimal pairs from templates.</p>
                    <button
                        onClick={() => setMode('design')}
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-cyan-50 transition-colors flex items-center"
                    >
                        Launch Designer <ArrowRight size={16} className="ml-2" />
                    </button>
                </div>
            </div>

            <Card title="Reaction Parameters" className="border-l-4 border-l-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">Polymerase Model</label>
                        <div className="relative">
                            <select
                                value={polymerase}
                                onChange={(e) => setPolymerase(e.target.value as Polymerase)}
                                className="block w-full appearance-none rounded-2xl border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-slate-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 sm:text-sm transition-all"
                            >
                                <option value="q5">Q5 High-Fidelity</option>
                                <option value="phusion">Phusion High-Fidelity (HF Buffer)</option>
                                <option value="taq">Standard Taq / OneTaq</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <FlaskConical size={16} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 ml-1">
                            Affects Annealing Temp: {polymerase === 'q5' ? 'Ta = Tm' : polymerase === 'phusion' ? 'Ta = Tm + 3°C' : 'Ta = Tm - 5°C'}
                        </p>
                    </div>
                    <Input
                        label="Primer Concentration (nM)"
                        value={primerConc}
                        onChange={(e) => setPrimerConc(safeNum(e.target.value))}
                        placeholder="500"
                        rightElement={<span className="text-xs font-bold text-slate-500">nM</span>}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Input Side */}
                <div className="space-y-6">
                    {/* Forward */}
                    <div className="space-y-3">
                        <h2 className="font-bold text-slate-800 flex items-center">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">F</span>
                            Forward Primer
                        </h2>
                        <textarea
                            className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 font-mono text-sm uppercase transition-colors"
                            rows={2}
                            placeholder="5'-ATCG...-3'"
                            value={fwdInput}
                            onChange={(e) => setFwdInput(e.target.value)}
                        />
                        {fwd.isValid && <PrimerBadge p={fwd} color="blue" />}
                        {fwd.error && <ErrorMsg msg={fwd.error} />}
                    </div>

                    {/* Reverse */}
                    <div className="space-y-3">
                        <h2 className="font-bold text-slate-800 flex items-center">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs mr-2">R</span>
                            Reverse Primer
                        </h2>
                        <textarea
                            className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 font-mono text-sm uppercase transition-colors"
                            rows={2}
                            placeholder="5'-ATCG...-3'"
                            value={revInput}
                            onChange={(e) => setRevInput(e.target.value)}
                        />
                        {rev.isValid && <PrimerBadge p={rev} color="indigo" />}
                        {rev.error && <ErrorMsg msg={rev.error} />}
                    </div>
                </div>

                {/* Result Side */}
                <div className="space-y-6">
                    <Card title="Thermodynamics" className="h-full bg-slate-50/50">
                        {fwd.isValid && rev.isValid && analysisTa !== null ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div>
                                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Rec. Annealing Temp</div>
                                        <div className="text-4xl font-bold text-slate-900">{analysisTa} °C</div>
                                    </div>
                                    <Thermometer size={32} className="text-emerald-500" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100">
                                        <span className="text-slate-600">Tm Difference (ΔTm)</span>
                                        <span className={`font-mono font-bold ${analysisTmDiff > 5 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {analysisTmDiff.toFixed(1)} °C
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100">
                                        <span className="text-slate-600">Salt Correction</span>
                                        <span className="text-slate-900">SantaLucia 1998</span>
                                    </div>
                                </div>

                                {analysisTmDiff > 5 && (
                                    <div className="flex items-start p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                                        <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                                        <p>High ΔTm ({'>'}5°C)</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Dna size={48} strokeWidth={1} className="mb-4 opacity-50" />
                                <p>Enter sequences to analyze</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const PrimerBadge: React.FC<{ p: PrimerResult, color?: 'blue' | 'indigo', theme?: 'cyan' | 'purple' }> = ({ p, color, theme }) => {
    // Shared component handling both themes
    if (theme) {
        return (
            <div className={`mt-2 p-3 rounded-xl bg-${theme}-500/10 border border-${theme}-500/20 flex justify-between text-xs`}>
                <div><span className={`text-${theme}-200 block opacity-50 uppercase font-bold text-[10px]`}>Length</span>{p.length}bp</div>
                <div><span className={`text-${theme}-200 block opacity-50 uppercase font-bold text-[10px]`}>GC%</span>{p.gc.toFixed(1)}%</div>
                <div><span className={`text-${theme}-200 block opacity-50 uppercase font-bold text-[10px]`}>Tm</span>{p.tmNN.toFixed(1)}°C</div>
            </div>
        );
    }
    // Default Light Mode Badge
    return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-xs grid grid-cols-3 gap-2 mt-2">
            <div>
                <span className="text-slate-400 block uppercase text-[10px] font-bold">Length</span>
                <span className="font-bold text-slate-700">{p.length} bp</span>
            </div>
            <div>
                <span className="text-slate-400 block uppercase text-[10px] font-bold">GC%</span>
                <span className={`font-bold ${p.gc < 40 || p.gc > 60 ? 'text-orange-500' : 'text-slate-700'}`}>{p.gc.toFixed(1)}%</span>
            </div>
            <div>
                <span className="text-slate-400 block uppercase text-[10px] font-bold">Tm (NN)</span>
                <span className={`font-bold text-${color}-600`}>{p.tmNN.toFixed(1)}°C</span>
            </div>
        </div>
    );
};

const ErrorMsg: React.FC<{ msg: string }> = ({ msg }) => (
    <div className="mt-2 text-red-500 text-xs flex items-center bg-red-50 p-2 rounded-lg"><XCircle size={12} className="mr-1" /> {msg}</div>
);

export default PrimerAnalysis;