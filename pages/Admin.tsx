import React, { useState, useEffect } from 'react';
import { Save, Trash2, Upload, Image as ImageIcon, ShieldCheck, AlertCircle, Lock, Key, LayoutTemplate } from 'lucide-react';
import { PageHeader, Card, Button, Input } from '../components/UI';
import { AdZone } from '../components/AdBanner';

const ACCESS_CODE = '6188';

const ZONES: { id: AdZone; label: string; desc: string; storageKey: string }[] = [
    { id: 'hero', label: 'Hero Top', desc: 'Appears at the very top of the dashboard.', storageKey: 'labsuite_ad_hero' },
    { id: 'middle', label: 'Mid-Page', desc: 'Appears between search and tool grid.', storageKey: 'labsuite_ad_middle' },
    { id: 'footer', label: 'Footer', desc: 'Appears at the bottom of the dashboard.', storageKey: 'labsuite_ad_footer' },
];

const Admin: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Banner State
  const [activeZone, setActiveZone] = useState<AdZone>('hero');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState<string | null>(null); // What is currently saved
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

  // Check session on mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem('labsuite_admin_auth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  // Load banner whenever Active Zone changes
  useEffect(() => {
    if (isAuthenticated) {
        loadBannerForZone(activeZone);
    }
  }, [activeZone, isAuthenticated]);

  const loadBannerForZone = (zone: AdZone) => {
    const key = ZONES.find(z => z.id === zone)?.storageKey;
    if (key) {
        const saved = localStorage.getItem(key);
        setCurrentBanner(saved);
        setSelectedImage(saved); // Reset editor to current
        setStatus({ type: null, msg: '' });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ACCESS_CODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem('labsuite_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect access code.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('labsuite_admin_auth');
    setPasswordInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for localStorage safety
        setStatus({ type: 'error', msg: 'Image is too large for local storage demo. Please use an image under 2MB.' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setStatus({ type: null, msg: '' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const zoneConfig = ZONES.find(z => z.id === activeZone);
    if (selectedImage && zoneConfig) {
      try {
        localStorage.setItem(zoneConfig.storageKey, selectedImage);
        setCurrentBanner(selectedImage);
        setStatus({ type: 'success', msg: `${zoneConfig.label} updated successfully!` });
      } catch (err) {
        setStatus({ type: 'error', msg: 'Storage quota exceeded. Try a smaller image.' });
      }
    }
  };

  const handleRemove = () => {
    const zoneConfig = ZONES.find(z => z.id === activeZone);
    if (zoneConfig) {
        localStorage.removeItem(zoneConfig.storageKey);
        setSelectedImage(null);
        setCurrentBanner(null);
        setStatus({ type: 'success', msg: `${zoneConfig.label} removed.` });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4">
        <Card title="Admin Access" className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Lock size={32} />
            </div>
          </div>
          <p className="text-slate-500 mb-6">Please enter the access code to manage site settings.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
               <input 
                 type="password"
                 value={passwordInput}
                 onChange={(e) => setPasswordInput(e.target.value)}
                 className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all text-center tracking-widest font-bold"
                 placeholder="••••"
                 autoFocus
               />
               <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
            
            {authError && (
              <div className="text-sm text-red-500 font-medium animate-pulse">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full">
              Unlock Panel
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const activeZoneConfig = ZONES.find(z => z.id === activeZone);

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Admin Panel" 
        description="Manage site configuration and advertisement settings." 
        action={
           <Button variant="outline" size="sm" onClick={handleLogout}>Log Out</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Zone Selector (Left Column) */}
        <div className="lg:col-span-4 space-y-4">
            <h3 className="font-bold text-slate-900 px-2">Select Ad Space</h3>
            <div className="space-y-2">
                {ZONES.map(z => (
                    <button
                        key={z.id}
                        onClick={() => setActiveZone(z.id)}
                        className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center group ${
                            activeZone === z.id 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-pink-300 hover:text-slate-900'
                        }`}
                    >
                        <div className={`p-2 rounded-lg mr-3 ${activeZone === z.id ? 'bg-white/10' : 'bg-slate-100 group-hover:bg-pink-50'}`}>
                            <LayoutTemplate size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-sm">{z.label}</div>
                            <div className={`text-xs ${activeZone === z.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                {z.desc}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start mt-8">
                 <ShieldCheck className="text-emerald-500 mt-1 mr-3 flex-shrink-0" size={20} />
                 <div>
                    <h4 className="font-bold text-slate-900 text-sm">Client-Side Storage</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Currently using <code>localStorage</code>. Images are stored in the browser cache.
                    </p>
                 </div>
            </div>
        </div>

        {/* Editor (Right Column) */}
        <div className="lg:col-span-8">
          <Card title={`Editing: ${activeZoneConfig?.label}`} className="border-t-4 border-t-pink-500 min-h-[500px]">
            <div className="space-y-8">
              
              <div>
                 <label className="block text-sm font-semibold text-slate-900 mb-3">
                    Preview & Upload <span className="text-slate-400 font-normal ml-2">(Max 2MB)</span>
                 </label>
                 
                 {/* Preview Area */}
                 <div className="relative group w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-pink-500 transition-colors bg-slate-50 overflow-hidden flex flex-col items-center justify-center cursor-pointer min-h-[200px]">
                    
                    {selectedImage ? (
                        <>
                            <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-bold flex items-center"><Upload className="mr-2"/> Change Image</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400">
                             <ImageIcon size={48} className="mb-3 opacity-50 group-hover:text-pink-500 transition-colors" />
                             <span className="text-sm font-bold text-slate-500 group-hover:text-pink-600">Click to upload image</span>
                        </div>
                    )}

                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                 </div>
              </div>

              {status.msg && (
                <div className={`p-4 rounded-xl text-sm flex items-center animate-fadeIn ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                   <AlertCircle size={18} className="mr-2" />
                   {status.msg}
                </div>
              )}

              <div className="flex space-x-4 pt-4 border-t border-slate-100">
                 <Button onClick={handleSave} size="lg" className="flex-1 bg-slate-900" icon={<Save size={18}/>}>
                    Save Changes
                 </Button>
                 <Button onClick={handleRemove} variant="outline" size="lg" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 hover:border-red-200" icon={<Trash2 size={18}/>}>
                    Remove Ad
                 </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;