import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { DilutionIcon, MolarityIcon, PercentIcon, PhIcon, ProteinIcon, ProtocolsIcon, OopsIcon, PrimerIcon, GelIcon, CellIcon, LogIcon, TimerIcon, FastaIcon, ScissorsIcon, IllustratorIcon } from '../components/ScienceIcons';
import { AdBanner } from '../components/AdBanner';

interface Tool {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  image?: string; // Optional path to an image file (e.g., '/icons/dilution.png')
  color: 'blue' | 'emerald' | 'purple' | 'pink' | 'indigo' | 'orange' | 'red' | 'cyan' | 'teal' | 'lime' | 'violet' | 'slate';
  keywords: string[];
}

const TOOLS: Tool[] = [
  {
    id: 'dilution',
    title: 'Dilution Calculator',
    description: 'Essential C1V1 = C2V2 calc',
    path: '/dilution',
    icon: DilutionIcon,
    color: 'blue',
    keywords: ['dilution', 'concentration', 'c1v1', 'stock', 'solution', 'volume']
  },
  {
    id: 'molarity',
    title: 'Molarity Calculator',
    description: 'Mass from MW & Conc',
    path: '/molarity',
    icon: MolarityIcon,
    color: 'emerald',
    keywords: ['molarity', 'mass', 'molecular weight', 'mw', 'concentration', 'mole']
  },
  {
    id: 'ai-image',
    title: 'AI Illustrator',
    description: 'Scientific diagram generator',
    path: '/ai-image',
    icon: IllustratorIcon,
    color: 'violet',
    keywords: ['ai', 'image', 'generator', 'gemini', 'diagram', 'drawing']
  },
  {
    id: 'restriction',
    title: 'Restriction Finder',
    description: 'Find cut sites & fragments',
    path: '/restriction',
    icon: ScissorsIcon,
    color: 'pink',
    keywords: ['restriction', 'enzyme', 'digest', 'cut', 'fragment', 'cloning', 'plasmid']
  },
  {
    id: 'fasta',
    title: 'FASTA Cleaner',
    description: 'Format & validate sequences',
    path: '/fasta',
    icon: FastaIcon,
    color: 'slate',
    keywords: ['fasta', 'dna', 'protein', 'sequence', 'format', 'clean', 'wrap']
  },
  {
    id: 'timer',
    title: 'Lab Timer',
    description: 'Stopwatch, Interval & Timer',
    path: '/timer',
    icon: TimerIcon,
    color: 'cyan',
    keywords: ['timer', 'stopwatch', 'countdown', 'interval', 'clock', 'time']
  },
  {
    id: 'log',
    title: 'Log Calculator',
    description: 'Log, Ln, Antilog & pKa',
    path: '/log',
    icon: LogIcon,
    color: 'violet',
    keywords: ['log', 'ln', 'exponent', 'pka', 'ph', 'math', 'kinetics']
  },
  {
    id: 'cellcount',
    title: 'Cell Counter',
    description: 'Hemocytometer & Viability',
    path: '/cellcount',
    icon: CellIcon,
    color: 'lime',
    keywords: ['cell', 'count', 'hemocytometer', 'neubauer', 'viability', 'trypan', 'titer']
  },
  {
    id: 'sds',
    title: 'SDS-PAGE Gel',
    description: 'Acrylamide gel recipes',
    path: '/sds',
    icon: GelIcon,
    color: 'teal',
    keywords: ['sds', 'page', 'gel', 'electrophoresis', 'western', 'blot', 'acrylamide']
  },
  {
    id: 'primers',
    title: 'Primer Analysis',
    description: 'Tm, GC%, and PCR Ta',
    path: '/primers',
    icon: PrimerIcon,
    color: 'cyan',
    keywords: ['primer', 'pcr', 'tm', 'melting', 'dna', 'sequence', 'annealing']
  },
  {
    id: 'percent',
    title: 'Percent Solution',
    description: 'w/v, v/v, w/w & density',
    path: '/percent',
    icon: PercentIcon,
    color: 'orange',
    keywords: ['percent', 'mass', 'volume', 'density', 'w/v', 'solution']
  },
  {
    id: 'ph',
    title: 'pH Calculator',
    description: 'Acids, bases & buffers',
    path: '/ph',
    icon: PhIcon,
    color: 'pink',
    keywords: ['ph', 'buffer', 'acid', 'base', 'henderson', 'pka']
  },
  {
    id: 'protein',
    title: 'Protein Conc',
    description: 'A280 Beer-Lambert Law',
    path: '/protein',
    icon: ProteinIcon,
    color: 'indigo',
    keywords: ['protein', 'absorbance', 'a280', 'beer-lambert', 'extinction', 'uv']
  },
  {
    id: 'oops',
    title: 'Oops Calculator',
    description: 'Fix mistake & error analysis',
    path: '/oops',
    icon: OopsIcon,
    color: 'red',
    keywords: ['mistake', 'error', 'correction', 'fix', 'salvage', 'moi', 'seeding', 'overshoot']
  },
  {
    id: 'protocols',
    title: 'Protocol Engine',
    description: 'Dynamic step generation',
    path: '/protocols',
    icon: ProtocolsIcon,
    color: 'purple',
    keywords: ['protocol', 'pcr', 'buffer', 'western', 'steps', 'procedure', 'mix']
  }
];

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-50',
    hoverBg: 'group-hover:bg-blue-100/50',
    iconText: 'text-blue-600',
    iconMain: 'text-blue-500',
    titleHover: 'group-hover:text-blue-600'
  },
  emerald: {
    bg: 'bg-emerald-50',
    hoverBg: 'group-hover:bg-emerald-100/50',
    iconText: 'text-emerald-600',
    iconMain: 'text-emerald-500',
    titleHover: 'group-hover:text-emerald-600'
  },
  purple: {
    bg: 'bg-purple-50',
    hoverBg: 'group-hover:bg-purple-100/50',
    iconText: 'text-purple-600',
    iconMain: 'text-purple-500',
    titleHover: 'group-hover:text-purple-600'
  },
  pink: {
    bg: 'bg-pink-50',
    hoverBg: 'group-hover:bg-pink-100/50',
    iconText: 'text-pink-600',
    iconMain: 'text-pink-500',
    titleHover: 'group-hover:text-pink-600'
  },
  indigo: {
    bg: 'bg-indigo-50',
    hoverBg: 'group-hover:bg-indigo-100/50',
    iconText: 'text-indigo-600',
    iconMain: 'text-indigo-500',
    titleHover: 'group-hover:text-indigo-600'
  },
  orange: {
    bg: 'bg-orange-50',
    hoverBg: 'group-hover:bg-orange-100/50',
    iconText: 'text-orange-600',
    iconMain: 'text-orange-500',
    titleHover: 'group-hover:text-orange-600'
  },
  red: {
    bg: 'bg-red-50',
    hoverBg: 'group-hover:bg-red-100/50',
    iconText: 'text-red-600',
    iconMain: 'text-red-500',
    titleHover: 'group-hover:text-red-600'
  },
  cyan: {
    bg: 'bg-cyan-50',
    hoverBg: 'group-hover:bg-cyan-100/50',
    iconText: 'text-cyan-600',
    iconMain: 'text-cyan-500',
    titleHover: 'group-hover:text-cyan-600'
  },
  teal: {
    bg: 'bg-teal-50',
    hoverBg: 'group-hover:bg-teal-100/50',
    iconText: 'text-teal-600',
    iconMain: 'text-teal-500',
    titleHover: 'group-hover:text-teal-600'
  },
  lime: {
    bg: 'bg-lime-50',
    hoverBg: 'group-hover:bg-lime-100/50',
    iconText: 'text-lime-600',
    iconMain: 'text-lime-500',
    titleHover: 'group-hover:text-lime-600'
  },
  violet: {
    bg: 'bg-violet-50',
    hoverBg: 'group-hover:bg-violet-100/50',
    iconText: 'text-violet-600',
    iconMain: 'text-violet-500',
    titleHover: 'group-hover:text-violet-600'
  },
  slate: {
    bg: 'bg-slate-50',
    hoverBg: 'group-hover:bg-slate-100/50',
    iconText: 'text-slate-600',
    iconMain: 'text-slate-500',
    titleHover: 'group-hover:text-slate-600'
  }
};

const Dashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [logoError, setLogoError] = useState(false);

  // Sync state with URL if it changes (e.g. from Layout search)
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val) {
        setSearchParams({ q: val }, { replace: true });
    } else {
        setSearchParams({}, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  const filteredTools = TOOLS.filter(tool => {
    const term = searchTerm.toLowerCase();
    return (
      tool.title.toLowerCase().includes(term) ||
      tool.description.toLowerCase().includes(term) ||
      tool.keywords.some(k => k.toLowerCase().includes(term))
    );
  });

  const handleTagClick = (term: string) => {
    setSearchTerm(term);
    setSearchParams({ q: term });
  };

  return (
    <div className="space-y-10">
      
      {/* 1. HERO AD BANNER */}
      <AdBanner zone="hero" className="mb-8" />

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto pt-2 pb-4">
        {/* Branding Logo - Hidden if no file is found (no placeholder) */}
        {!logoError && (
            <div className="flex justify-center mb-6">
                <img 
                    src="/branding/logo.png" 
                    alt="Lab Logo" 
                    className="h-24 w-auto object-contain rounded-xl hover:scale-105 transition-transform duration-500"
                    onError={() => setLogoError(true)}
                />
            </div>
        )}

        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
          Discover the World's<br/>Top <span className="text-slate-900">Lab Tools</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Explore essential calculators, protocol engines, and scientific utilities designed for the modern laboratory workflow.
        </p>
        
        {/* Search Bar Visual */}
        <div className="relative max-w-xl mx-auto mb-8">
           <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
           </div>
           <input 
             type="text"
             value={searchTerm}
             onChange={handleSearchChange}
             className="block w-full rounded-full border border-slate-200 bg-white py-4 pl-14 pr-16 text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 shadow-[0_4px_20px_rgb(0,0,0,0.04)] text-lg transition-all"
             placeholder="What would you like to calculate?"
           />
           <div className="absolute inset-y-0 right-2 flex items-center">
              <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-2.5 transition-colors shadow-lg shadow-pink-500/30">
                 <Search className="h-5 w-5" />
              </button>
           </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-3 text-sm font-medium text-slate-600">
           <span className="text-slate-400">Popular:</span>
           {[
             { label: 'Molarity', term: 'Molarity' },
             { label: 'PCR Setup', term: 'PCR' },
             { label: 'Dilutions', term: 'Dilution' },
             { label: 'Buffers', term: 'Buffer' },
             { label: 'Fix Mistake', term: 'mistake' }
           ].map((tag) => (
             <button 
               key={tag.label}
               onClick={() => handleTagClick(tag.term)}
               className="px-4 py-1.5 rounded-full border border-slate-200 hover:border-pink-300 hover:text-pink-600 transition-colors bg-white active:bg-slate-50"
             >
               {tag.label}
             </button>
           ))}
        </div>
      </div>

      {/* 2. MIDDLE AD BANNER */}
      <AdBanner zone="middle" className="my-12" />

      {/* Tools Grid */}
      <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {searchTerm ? `Results for "${searchTerm}"` : 'Featured Tools'}
            </h2>
            <div className="flex space-x-2">
               <button className="px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">New & Noteworthy</button>
               <button className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Most Popular</button>
            </div>
        </div>

        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTools.map((tool) => {
              const colors = COLOR_MAP[tool.color as keyof typeof COLOR_MAP];
              return (
                <Link key={tool.id} to={tool.path} className="group block">
                  <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className={`aspect-[4/3] ${colors.bg} relative p-8 flex items-center justify-center ${colors.hoverBg} transition-colors`}>
                          <div className="absolute top-6 right-6 bg-white/60 backdrop-blur-sm p-2 rounded-xl">
                              <tool.icon className={`h-6 w-6 ${colors.iconText}`} />
                          </div>
                          <div className="text-center">
                              <div className="bg-white h-24 w-24 rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                                  {tool.image ? (
                                      <img src={tool.image} alt={tool.title} className="h-16 w-16 object-contain" />
                                  ) : (
                                      <tool.icon className={`h-10 w-10 ${colors.iconMain}`} />
                                  )}
                              </div>
                          </div>
                      </div>
                      <div className="p-6">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h3 className={`font-bold text-slate-900 text-lg ${colors.titleHover} transition-colors`}>{tool.title}</h3>
                                  <p className="text-sm text-slate-500 mt-1">{tool.description}</p>
                              </div>
                          </div>
                      </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-300">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No tools found</h3>
            <p className="text-slate-500 mt-2">Try searching for 'molarity', 'dilution', or 'protocols'</p>
            <button 
              onClick={handleClear}
              className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-full text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* 3. FOOTER AD BANNER */}
      <AdBanner zone="footer" className="mt-16" />
      
      {/* Offline Badge */}
      <div className="flex justify-center pb-8 pt-4">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-xs font-medium text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></div>
            Offline Capable • v1.0.0
        </div>
      </div>
    </div>
  );
};

export default Dashboard;