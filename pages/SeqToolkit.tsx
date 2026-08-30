import React, { useMemo, useState } from 'react';
import { RefreshCw, Copy, Check, Dna, ArrowLeftRight } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/UI';
import {
  cleanSequence, complement, reverseComplement, translate, gcFraction, composition, AVG_MW,
} from '../lib/sequence';

type View = 'transform' | 'translate';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center px-2 py-1 rounded hover:bg-slate-100 transition-colors"
    >
      {done ? <Check size={13} className="mr-1" /> : <Copy size={13} className="mr-1" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
};

const SeqBlock: React.FC<{ title: string; seq: string; note?: string; mono?: boolean }> = ({ title, seq, note, mono = true }) => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
      <div className="flex items-center gap-2">
        {note && <span className="text-[11px] text-slate-400">{note}</span>}
        <CopyButton text={seq} />
      </div>
    </div>
    <p className={`p-4 text-sm break-all leading-relaxed text-slate-800 ${mono ? 'font-mono' : ''}`}>
      {seq || <span className="text-slate-300">—</span>}
    </p>
  </div>
);

const SeqToolkit: React.FC = () => {
  const [input, setInput] = useState('');
  const [view, setView] = useState<View>('transform');

  const seq = useMemo(() => cleanSequence(input).replace(/U/g, 'T'), [input]);
  const comp = useMemo(() => composition(seq), [seq]);
  const gc = useMemo(() => gcFraction(seq) * 100, [seq]);

  // Six-frame translation: three forward, three on the reverse complement.
  const frames = useMemo(() => {
    if (!seq) return [];
    const rc = reverseComplement(seq);
    return [
      ...[0, 1, 2].map(f => ({ label: `+${f + 1}`, protein: translate(seq, f) })),
      ...[0, 1, 2].map(f => ({ label: `−${f + 1}`, protein: translate(rc, f) })),
    ];
  }, [seq]);

  const longestOrf = useMemo(() => {
    let best = { length: 0, frame: '', peptide: '' };
    for (const f of frames) {
      // Longest run between a Met and the next stop.
      for (const m of f.protein.matchAll(/M[^*]*/g)) {
        if (m[0].length > best.length) best = { length: m[0].length, frame: f.label, peptide: m[0] };
      }
    }
    return best.length ? best : null;
  }, [frames]);

  const dsMw = comp.length * AVG_MW.dsDNAPerBp;
  const ssMw = comp.length * AVG_MW.ssDNAPerNt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sequence Toolkit"
        description="Reverse complement, translate and inspect a DNA sequence."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="DNA Sequence" action={
            <Button variant="ghost" size="sm" onClick={() => setInput('')} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Clear
            </Button>
          }>
            <div className="space-y-4">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                spellCheck={false}
                placeholder={"Paste a sequence (5' → 3'). FASTA headers, numbers and whitespace are ignored."}
                className="w-full h-56 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-0 font-mono text-sm uppercase resize-none transition-colors placeholder-slate-400 placeholder:normal-case"
              />

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Length', value: `${comp.length}`, sub: 'nt' },
                  { label: 'GC', value: comp.length ? gc.toFixed(1) : '—', sub: '%' },
                  { label: 'Non-ATGC', value: `${comp.other}`, sub: 'bases' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold text-slate-900 leading-tight">{s.value}</p>
                    <p className="text-[10px] text-slate-400">{s.sub}</p>
                  </div>
                ))}
              </div>

              {comp.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Composition</p>
                  {([['A', comp.a], ['T', comp.t], ['G', comp.g], ['C', comp.c]] as [string, number][]).map(([b, n]) => (
                    <div key={b} className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-600 w-4">{b}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(n / comp.length) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-20 text-right">
                        {n} ({((n / comp.length) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-100 text-xs text-slate-500 font-mono space-y-0.5">
                    <p>ds MW ≈ {(dsMw / 1000).toFixed(1)} kDa ({AVG_MW.dsDNAPerBp} Da/bp)</p>
                    <p>ss MW ≈ {(ssMw / 1000).toFixed(1)} kDa ({AVG_MW.ssDNAPerNt} Da/nt)</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-50 p-1.5 rounded-2xl flex">
            {([['transform', 'Transform'], ['translate', 'Translate (6 frames)']] as [View, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${view === v ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {!seq ? (
            <Card className="bg-slate-50/50 border-dashed border-2 border-slate-200">
              <div className="flex flex-col items-center justify-center text-center text-slate-400 py-16">
                {view === 'transform'
                  ? <ArrowLeftRight size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                  : <Dna size={48} className="mb-4 text-slate-300" strokeWidth={1} />}
                <p className="font-medium text-slate-500">Paste a sequence to begin</p>
                <p className="text-sm mt-2 max-w-[240px]">Everything is computed in your browser — nothing is uploaded.</p>
              </div>
            </Card>
          ) : view === 'transform' ? (
            <div className="space-y-4 animate-fadeIn">
              <SeqBlock title="Reverse complement" seq={reverseComplement(seq)} note="5' → 3'" />
              <SeqBlock title="Complement" seq={complement(seq)} note="3' → 5'" />
              <SeqBlock title="Reverse" seq={seq.split('').reverse().join('')} />
              <SeqBlock title="Input (cleaned)" seq={seq} note={`${seq.length} nt`} />
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {longestOrf && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
                    Longest ORF — frame {longestOrf.frame}, {longestOrf.length} aa
                  </p>
                  <p className="font-mono text-xs text-emerald-900 break-all leading-relaxed">{longestOrf.peptide}</p>
                  <p className="text-[11px] text-emerald-600 mt-2">
                    Longest run from a Met to the next stop. Not a promoter- or Kozak-aware prediction.
                  </p>
                </div>
              )}
              {frames.map(f => (
                <SeqBlock
                  key={f.label}
                  title={`Frame ${f.label}`}
                  seq={f.protein}
                  note={`${f.protein.length} aa · ${(f.protein.match(/\*/g) || []).length} stops`}
                />
              ))}
              <p className="text-xs text-slate-400 px-1">
                Standard genetic code (NCBI translation table 1). <span className="font-mono">*</span> is a stop codon;
                a trailing partial codon is dropped.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeqToolkit;
