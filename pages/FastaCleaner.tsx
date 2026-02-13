import React, { useState, useRef } from 'react';
import { ArrowRight, Download, Upload, Copy, Check, Trash2, AlertTriangle, AlignLeft } from 'lucide-react';
import { PageHeader, Card, Button, Select } from '../components/UI';

const FastaCleaner: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [wrapLength, setWrapLength] = useState<number>(60);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ seqs: number; bp: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core cleaning logic
  const cleanFasta = (text: string, wrap: number) => {
    if (!text.trim()) {
      setOutput('');
      setStats(null);
      return;
    }

    let cleanOutput = '';
    let totalSeqs = 0;
    let totalBp = 0;
    let totalErrors = 0;

    // Allow letters, asterisks (stop codons), and hyphens (gaps)
    const validCharsRegex = /^[A-Za-z\*\-]+$/; 
    
    // Detect if the input looks like a FASTA file (starts with >)
    const hasHeader = text.trimStart().startsWith('>');

    // Split records by '>'. 
    const rawRecords = text.split('>');
    
    rawRecords.forEach((record, index) => {
      // If we expect FASTA, the first chunk before the first '>' is usually empty preamble.
      if (hasHeader && index === 0) return;

      if (!record.trim()) return;

      let header = '';
      let rawSeq = '';

      if (!hasHeader && index === 0) {
        // CASE: Input does not start with '>'. Treat entire text as one sequence.
        // This handles NCBI raw copy-pastes like "1 agct..."
        header = 'Sequence_1';
        rawSeq = record;
      } else {
        // CASE: Standard FASTA record.
        // record content is: "HeaderLine\nSeqLine\nSeqLine..."
        // We find the first newline to separate Header from Body.
        const firstBreak = record.indexOf('\n');
        
        if (firstBreak === -1) {
             // Only one line inside a > block? It's a header with no sequence.
             header = record.trim();
             rawSeq = '';
        } else {
             header = record.substring(0, firstBreak).trim();
             rawSeq = record.substring(firstBreak + 1);
        }
      }

      // CLEANING LOGIC:
      // 1. Remove digits (0-9) - handles numbered sequences (NCBI/GenBank)
      // 2. Remove whitespace (\s) - handles newlines, spaces, tabs
      const cleanSeq = rawSeq.replace(/[\s\d]+/g, '').toUpperCase();
      
      if (cleanSeq.length > 0) {
          totalSeqs++;
          totalBp += cleanSeq.length;

          if (!validCharsRegex.test(cleanSeq)) {
              totalErrors++;
          }

          // Formatting (Wrap lines)
          let formattedSeq = cleanSeq;
          if (wrap > 0) {
              const chunks = [];
              for (let i = 0; i < cleanSeq.length; i += wrap) {
                  chunks.push(cleanSeq.slice(i, i + wrap));
              }
              formattedSeq = chunks.join('\n');
          }

          cleanOutput += `>${header}\n${formattedSeq}\n`;
      }
    });

    setOutput(cleanOutput.trim());
    setStats({ seqs: totalSeqs, bp: totalBp, errors: totalErrors });
  };

  const handleClean = () => {
    cleanFasta(input, wrapLength);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInput(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([output], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "cleaned_sequence.fasta";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="FASTA Cleaner" 
        description="Format, validate, and clean DNA/Protein FASTA files. Intelligently strips numbers (NCBI style) and whitespace."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-250px)] min-h-[600px]">
        
        {/* INPUT COLUMN */}
        <div className="flex flex-col h-full space-y-4">
            <Card className="flex-1 flex flex-col p-0 overflow-hidden shadow-md">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center">
                        <Upload size={18} className="mr-2 text-pink-500"/> Input Sequence
                    </h3>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => setInput('')}
                            className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                        >
                            <Trash2 size={14} className="mr-1"/> Clear
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded border border-pink-200 transition-colors"
                        >
                            Upload File
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".fasta,.fa,.txt" 
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
                <textarea 
                    className="flex-1 w-full p-4 font-mono text-xs md:text-sm resize-none focus:outline-none focus:bg-slate-50 transition-colors"
                    placeholder={`Paste sequences here. Examples:

Standard FASTA:
>Seq1
AGCT TAGC

NCBI Style (Raw):
1 agct agct
61 atgc atgc`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    spellCheck={false}
                />
            </Card>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                         <div className="w-32">
                             <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Line Wrap</label>
                             <Select 
                                value={wrapLength} 
                                onChange={(e) => setWrapLength(parseInt(e.target.value))}
                                className="py-2"
                             >
                                 <option value={0}>No Wrap (1 line)</option>
                                 <option value={60}>60 chars</option>
                                 <option value={70}>70 chars</option>
                                 <option value={80}>80 chars</option>
                             </Select>
                         </div>
                     </div>
                     <Button onClick={handleClean} size="lg" className="px-8 shadow-xl shadow-pink-900/10 bg-pink-500 hover:bg-pink-600 text-white" icon={<ArrowRight size={18} />}>
                        Clean & Format
                     </Button>
                </div>
            </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="flex flex-col h-full space-y-4">
             <Card className="flex-1 flex flex-col p-0 overflow-hidden shadow-md border-pink-500/20">
                <div className="bg-pink-50/50 border-b border-pink-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-pink-800 flex items-center">
                        <AlignLeft size={18} className="mr-2 text-pink-500"/> Cleaned Output
                    </h3>
                    <div className="flex space-x-2">
                        {output && (
                            <>
                                <button 
                                    onClick={handleCopy}
                                    className="text-xs font-bold text-pink-700 bg-white border border-pink-200 hover:bg-pink-50 px-3 py-1 rounded transition-colors flex items-center"
                                >
                                    {copied ? <Check size={14} className="mr-1"/> : <Copy size={14} className="mr-1"/>}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                <button 
                                    onClick={handleDownload}
                                    className="text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded shadow-sm transition-colors flex items-center"
                                >
                                    <Download size={14} className="mr-1"/> Download
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 relative">
                    <textarea 
                        className="absolute inset-0 w-full h-full p-4 font-mono text-xs md:text-sm resize-none bg-slate-50 focus:outline-none text-slate-700"
                        value={output}
                        readOnly
                        placeholder="Cleaned sequences will appear here..."
                    />
                </div>
            </Card>

            {/* Stats Panel */}
            <div className={`p-4 rounded-2xl border transition-all ${stats ? 'bg-white border-slate-200 shadow-sm' : 'bg-transparent border-transparent'}`}>
                {stats ? (
                    <div className="flex justify-between items-center">
                         <div className="flex space-x-6">
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase">Sequences</div>
                                 <div className="text-xl font-bold text-slate-900">{stats.seqs}</div>
                             </div>
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase">Total BP</div>
                                 <div className="text-xl font-bold text-slate-900">{stats.bp.toLocaleString()}</div>
                             </div>
                         </div>
                         {stats.errors > 0 ? (
                             <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                                 <AlertTriangle size={18} className="mr-2" />
                                 <span className="text-sm font-bold">{stats.errors} seqs have non-standard chars</span>
                             </div>
                         ) : (
                             <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                                 <Check size={18} className="mr-2" />
                                 <span className="text-sm font-bold">All characters valid</span>
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="text-center text-slate-400 text-sm py-2">
                        Ready to process.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FastaCleaner;