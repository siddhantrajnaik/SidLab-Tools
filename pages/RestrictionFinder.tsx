import React, { useState, useMemo } from 'react';
import { Scissors, Search, BarChart3, List, Circle, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/UI';

// --- DATA: Enzyme Dictionary ---
interface Enzyme {
  name: string;
  seq: string;
  cutOffset: number; // 0-based index relative to seq start where cut occurs on top strand
}

const ENZYMES: Enzyme[] = [
  { name: 'EcoRI', seq: 'GAATTC', cutOffset: 1 },    // G^AATTC
  { name: 'BamHI', seq: 'GGATCC', cutOffset: 1 },    // G^GATCC
  { name: 'HindIII', seq: 'AAGCTT', cutOffset: 1 },  // A^AGCTT
  { name: 'NotI', seq: 'GCGGCCGC', cutOffset: 2 },   // GC^GGCCGC
  { name: 'XbaI', seq: 'TCTAGA', cutOffset: 1 },     // T^CTAGA
  { name: 'SpeI', seq: 'ACTAGT', cutOffset: 1 },     // A^CTAGT
  { name: 'PstI', seq: 'CTGCAG', cutOffset: 5 },     // CTGCA^G
  { name: 'SalI', seq: 'GTCGAC', cutOffset: 1 },     // G^TCGAC
  { name: 'EcoRV', seq: 'GATATC', cutOffset: 3 },    // GAT^ATC (Blunt)
  { name: 'XhoI', seq: 'CTCGAG', cutOffset: 1 },     // C^TCGAG
  { name: 'KpnI', seq: 'GGTACC', cutOffset: 5 },     // GGTAC^C
  { name: 'SacI', seq: 'GAGCTC', cutOffset: 5 },     // GAGCT^C
];

interface CutSite {
  enzyme: Enzyme;
  pos: number; // 0-based index in the sequence where cut happens (after this index)
  strand: 'forward' | 'reverse';
  recStart: number; // 0-based index where recognition sequence starts
}

const RestrictionFinder: React.FC = () => {
  const [sequence, setSequence] = useState('');
  const [isCircular, setIsCircular] = useState(false);
  const [selectedEnzyme, setSelectedEnzyme] = useState<string | 'ALL'>('ALL');

  // Helper: Reverse Complement
  const getRevComp = (seq: string) => {
    const map: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G', N: 'N' };
    return seq.split('').reverse().map(b => map[b] || 'N').join('');
  };

  // --- ANALYSIS LOGIC ---
  const { cutSites, fragments, seqLength } = useMemo(() => {
    const cleanSeq = sequence.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const len = cleanSeq.length;
    if (len === 0) return { cutSites: [], fragments: [], seqLength: 0 };

    const sites: CutSite[] = [];
    
    // Which enzymes to check?
    const enzymesToCheck = selectedEnzyme === 'ALL' 
      ? ENZYMES 
      : ENZYMES.filter(e => e.name === selectedEnzyme);

    enzymesToCheck.forEach(enzyme => {
      // 1. Forward Strand Search
      let pos = cleanSeq.indexOf(enzyme.seq);
      while (pos !== -1) {
        sites.push({
          enzyme,
          pos: pos + enzyme.cutOffset, // Cut is after this index
          strand: 'forward',
          recStart: pos
        });
        pos = cleanSeq.indexOf(enzyme.seq, pos + 1);
      }
    });

    sites.sort((a, b) => a.pos - b.pos);

    // Calculate Fragments (Virtual Digest)
    // Only meaningful if one enzyme is selected, or we assume simultaneous digest
    let frags: { start: number; end: number; length: number }[] = [];
    
    if (sites.length > 0) {
       let currentPos = 0;
       
       // For circular DNA, we need to wrap around
       if (isCircular) {
         for (let i = 0; i < sites.length - 1; i++) {
            frags.push({ start: sites[i].pos, end: sites[i+1].pos, length: sites[i+1].pos - sites[i].pos });
         }
         // Wrap frag
         const last = sites[sites.length - 1].pos;
         const first = sites[0].pos;
         frags.push({ start: last, end: first, length: (len - last) + first });
       } else {
         const sortedCuts = [0, ...sites.map(s => s.pos), len];
         const uniqueCuts = [...new Set(sortedCuts)].sort((a,b) => a-b);
         
         for (let i = 0; i < uniqueCuts.length - 1; i++) {
             frags.push({ start: uniqueCuts[i], end: uniqueCuts[i+1], length: uniqueCuts[i+1] - uniqueCuts[i] });
         }
       }
    } else {
        frags.push({ start: 0, end: len, length: len });
    }

    return { cutSites: sites, fragments: frags, seqLength: len };
  }, [sequence, isCircular, selectedEnzyme]);

  // --- RENDERING ---

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Restriction Site Finder" 
        description="Locate restriction enzyme cleavage sites and simulate digestion fragments."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input & Controls */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Sequence Input" className="h-full">
             <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">DNA Sequence (5' to 3')</label>
                   <div className="flex items-center space-x-2">
                       <button 
                         onClick={() => setIsCircular(!isCircular)}
                         className={`px-2 py-1 text-xs rounded-md border flex items-center transition-colors ${isCircular ? 'bg-pink-50 border-pink-200 text-pink-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}
                       >
                           {isCircular ? <ArrowLeftRight size={12} className="mr-1"/> : <ArrowLeftRight size={12} className="mr-1"/>}
                           {isCircular ? 'Circular' : 'Linear'}
                       </button>
                       <span className="text-xs font-mono text-slate-400">{seqLength} bp</span>
                   </div>
                </div>
                <textarea 
                   value={sequence}
                   onChange={(e) => setSequence(e.target.value)}
                   className="w-full h-64 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:border-pink-500 focus:ring-0 font-mono text-sm uppercase resize-none transition-colors placeholder-slate-400"
                   placeholder="PASTE DNA SEQUENCE HERE..."
                />
                
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Filter Enzyme</label>
                   <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setSelectedEnzyme('ALL')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedEnzyme === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                      >
                        ALL
                      </button>
                      {ENZYMES.map(e => (
                        <button 
                            key={e.name}
                            onClick={() => setSelectedEnzyme(e.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedEnzyme === e.name ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/30' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                            {e.name}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Visualization & Results */}
        <div className="lg:col-span-7 space-y-6">
           
           {/* GRAPHICAL MAP */}
           <Card className="min-h-[200px] flex flex-col justify-center border-l-4 border-l-pink-500">
              <div className="flex items-center space-x-2 mb-6">
                  <div className="bg-pink-100 p-2 rounded-lg text-pink-600"><Scissors size={20} /></div>
                  <h3 className="text-lg font-bold text-slate-900">Restriction Map</h3>
              </div>
              
              {seqLength > 0 ? (
                  <div className="relative py-12 px-4 select-none">
                      {/* DNA Backbone */}
                      <div className={`h-4 bg-pink-100 w-full relative ${isCircular ? 'rounded-full border-4 border-double border-pink-200 h-24 w-24 mx-auto' : 'rounded-full'}`}>
                          {!isCircular ? (
                             /* Linear Map Markers */
                             cutSites.map((site, i) => {
                                const pct = (site.pos / seqLength) * 100;
                                const isTop = i % 2 === 0; 
                                return (
                                    <div 
                                        key={i} 
                                        className="absolute top-0 h-full w-0.5 bg-pink-300 group hover:bg-pink-600 hover:w-1 transition-all z-10 cursor-pointer"
                                        style={{ left: `${pct}%` }}
                                    >
                                        <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-white px-2 py-1 rounded-lg shadow-md border border-pink-100 opacity-100 transition-opacity z-20 ${isTop ? '-top-10' : '-bottom-10'}`}>
                                            <span className="text-pink-600">{site.enzyme.name}</span>
                                            <span className="text-slate-400 ml-1 text-[10px]">{site.pos}</span>
                                        </div>
                                    </div>
                                );
                             })
                          ) : (
                              /* Circular Map Markers (Simplified Radial) */
                              cutSites.map((site, i) => {
                                  const deg = (site.pos / seqLength) * 360;
                                  return (
                                    <div 
                                        key={i}
                                        className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-pink-300 origin-bottom -translate-x-1/2 -translate-y-full"
                                        style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-50%)` }}
                                    />
                                  );
                              })
                          )}
                      </div>
                      
                      {/* Scale Labels (Linear Only) */}
                      {!isCircular && (
                          <div className="flex justify-between text-[10px] text-pink-300 font-mono mt-4 font-bold">
                              <span>1 bp</span>
                              <span>{Math.round(seqLength / 2)}</span>
                              <span>{seqLength} bp</span>
                          </div>
                      )}

                      {/* Circular Info Overlay if Circular */}
                      {isCircular && (
                          <div className="text-center mt-4 text-xs text-slate-400">
                             {cutSites.length} sites found on circular map.
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="text-center text-slate-400 py-8">
                      Enter sequence to generate map.
                  </div>
              )}
           </Card>

           {/* VIRTUAL GEL & TABLE */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card title="Virtual Digest" className="overflow-hidden">
                   <div className="space-y-4">
                       {fragments.length > 0 ? (
                           <div className="bg-gradient-to-b from-indigo-950 to-purple-950 rounded-2xl p-4 h-64 overflow-y-auto flex justify-center space-x-10 shadow-inner">
                               {/* Lane 1: Marker (Fake) */}
                               <div className="flex flex-col items-center w-12 opacity-60">
                                   <span className="text-[10px] text-indigo-200 mb-2 font-bold uppercase tracking-wider">Marker</span>
                                   <div className="w-full h-full bg-white/5 relative rounded-lg border border-white/10 backdrop-blur-sm">
                                        {[1000, 800, 600, 400, 200, 100].map(bp => (
                                            <div key={bp} className="absolute w-full h-[1px] bg-white/40" style={{ top: `${(1 - (bp/1200)) * 100}%` }}></div>
                                        ))}
                                   </div>
                               </div>
                               
                               {/* Lane 2: Sample */}
                               <div className="flex flex-col items-center w-16">
                                   <span className="text-[10px] text-pink-200 mb-2 font-bold uppercase tracking-wider">Sample</span>
                                   <div className="w-full h-full bg-white/5 relative rounded-lg border border-white/10 backdrop-blur-sm shadow-lg">
                                        {fragments.map((frag, i) => {
                                            // Simple visual mapping
                                            const visLength = Math.min(frag.length, 1200);
                                            const topPct = (1 - (visLength / 1200)) * 100; 
                                            // Simulate band intensity/thickness based on length (smaller = thicker/diffused in reality, but keeping constant here for clarity)
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="absolute left-1 right-1 h-1.5 bg-pink-400 rounded-sm shadow-[0_0_10px_rgba(244,114,182,0.8)]" 
                                                    style={{ top: `${topPct}%` }}
                                                    title={`${frag.length} bp`}
                                                ></div>
                                            );
                                        })}
                                   </div>
                               </div>
                           </div>
                       ) : (
                           <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                               <Circle size={24} className="mb-2 opacity-50"/>
                               <span className="text-xs">No digestion simulated</span>
                           </div>
                       )}
                       
                       <div className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <strong className="text-slate-700">Fragments:</strong> {fragments.map(f => f.length).join(', ')} bp
                       </div>
                   </div>
               </Card>

               <Card title="Site List">
                   <div className="overflow-y-auto max-h-80 pr-1">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-white text-slate-500 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                               <tr>
                                   <th className="px-3 py-3 bg-slate-50 rounded-tl-lg">Enzyme</th>
                                   <th className="px-3 py-3 bg-slate-50">Cut At</th>
                                   <th className="px-3 py-3 bg-slate-50 rounded-tr-lg">Sequence</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {cutSites.length > 0 ? cutSites.map((site, i) => (
                                   <tr key={i} className="hover:bg-pink-50 transition-colors group">
                                       <td className="px-3 py-2 font-bold text-slate-700 group-hover:text-pink-700">{site.enzyme.name}</td>
                                       <td className="px-3 py-2 font-mono text-pink-500 font-bold">{site.pos}</td>
                                       <td className="px-3 py-2 font-mono text-xs text-slate-400">{site.enzyme.seq}</td>
                                   </tr>
                               )) : (
                                   <tr>
                                       <td colSpan={3} className="px-3 py-8 text-center text-slate-400 italic">No sites found</td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
               </Card>
           </div>

        </div>
      </div>
    </div>
  );
};

export default RestrictionFinder;