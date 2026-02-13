import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Download, Sparkles, RefreshCw, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader, Card, Button, Input, Select } from '../components/UI';

const PRESETS = [
  { id: 'diagram', label: 'Scientific Diagram', prompt: 'A clean, 2D vector-style scientific diagram of ' },
  { id: '3d', label: '3D Render', prompt: 'A high quality 3D render, studio lighting, scientific visualization of ' },
  { id: 'sketch', label: 'Lab Sketch', prompt: 'A hand-drawn style laboratory sketch of ' },
  { id: 'photo', label: 'Photorealistic', prompt: 'A photorealistic macro photography style image of ' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square (1:1)' },
  { id: '16:9', label: 'Landscape (16:9)' },
  { id: '4:3', label: 'Standard (4:3)' },
  { id: '3:4', label: 'Portrait (3:4)' },
];

const AiIllustrator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setImage(null);

    try {
      // 1. Initialize Gemini Client
      // Note: In a static client-side app, we rely on the user or environment having the key.
      const apiKey = process.env.API_KEY;
      
      if (!apiKey) {
          throw new Error("API Key is missing. Please configure process.env.API_KEY.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // 2. Construct Prompt
      const selectedPreset = PRESETS.find(p => p.id === preset);
      const fullPrompt = `${selectedPreset?.prompt || ''}${prompt}`;

      // 3. Call API
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
           imageConfig: {
               aspectRatio: aspectRatio as any
           }
        }
      });

      // 4. Parse Response for Image
      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64 = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                setImage(`data:${mimeType};base64,${base64}`);
                foundImage = true;
                break;
            }
        }
      }

      if (!foundImage) {
        throw new Error("No image data found in response.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image. Please check API quota or key.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image;
      link.download = `lab-illustration-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="AI Illustrator" 
        description="Generate scientific diagrams, 3D visualizations, and concept art using Gemini AI."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls */}
        <div className="lg:col-span-5 space-y-6">
           <Card title="Configuration">
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Visual Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPreset(p.id)}
                                className={`px-3 py-3 rounded-xl text-sm font-bold border transition-all text-left ${
                                    preset === p.id 
                                    ? 'bg-violet-50 border-violet-500 text-violet-700 ring-1 ring-violet-500/20' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                 </div>

                 <Select 
                    label="Aspect Ratio" 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value)}
                 >
                    {ASPECT_RATIOS.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                 </Select>

                 <div className="pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-0 resize-none transition-colors text-slate-900 placeholder-slate-400"
                        placeholder="e.g. A cross-section of a mitochondrion showing cristae and matrix..."
                    />
                 </div>

                 {error && (
                    <div className="p-4 bg-red-50 rounded-xl flex items-start text-red-700 text-sm border border-red-100">
                        <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                        {error}
                    </div>
                 )}

                 <Button 
                    onClick={handleGenerate} 
                    disabled={loading || !prompt.trim()}
                    size="lg" 
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 text-white"
                 >
                    {loading ? (
                        <span className="flex items-center"><RefreshCw className="animate-spin mr-2" size={18}/> Generating...</span>
                    ) : (
                        <span className="flex items-center"><Sparkles className="mr-2" size={18}/> Generate Image</span>
                    )}
                 </Button>
              </div>
           </Card>
        </div>

        {/* Output */}
        <div className="lg:col-span-7">
            <Card className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-50/50 border-2 border-dashed border-slate-200 relative overflow-hidden">
                {image ? (
                    <div className="relative w-full h-full flex flex-col animate-fadeIn">
                        <div className="flex-1 flex items-center justify-center bg-slate-100 p-4 rounded-t-[30px] overflow-hidden">
                            <img src={image} alt="Generated result" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-xl" />
                        </div>
                        <div className="bg-white p-4 border-t border-slate-200 flex justify-between items-center rounded-b-[30px]">
                            <div className="text-sm text-slate-500 font-medium flex items-center">
                                <CheckCircle size={16} className="text-emerald-500 mr-2" />
                                Generated successfully
                            </div>
                            <Button onClick={handleDownload} variant="outline" size="sm" icon={<Download size={16}/>}>
                                Download
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-400 p-8">
                        {loading ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-24 w-24 bg-slate-200 rounded-full mb-4"></div>
                                <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                <p className="mt-8 text-violet-500 font-medium">Dreaming up your science...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <ImageIcon size={64} className="mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-slate-500">No Image Generated</h3>
                                <p className="text-sm mt-2 max-w-xs text-slate-400">Enter a prompt and click generate to create scientific illustrations using AI.</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>

      </div>
    </div>
  );
};

export default AiIllustrator;