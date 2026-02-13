import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export type AdZone = 'hero' | 'middle' | 'footer';

interface AdBannerProps {
  zone?: AdZone;
  className?: string;
}

const ZONE_CONFIG = {
  hero: {
    label: 'Hero Banner',
    size: '1024 x 160',
    key: 'labsuite_ad_hero',
    heightClass: 'h-32 md:h-40'
  },
  middle: {
    label: 'Mid-Page Banner',
    size: '728 x 90',
    key: 'labsuite_ad_middle',
    heightClass: 'h-24 md:h-32'
  },
  footer: {
    label: 'Footer Banner',
    size: '1024 x 160',
    key: 'labsuite_ad_footer',
    heightClass: 'h-32 md:h-40'
  }
};

export const AdBanner: React.FC<AdBannerProps> = ({ zone = 'hero', className = '' }) => {
  const [adImage, setAdImage] = useState<string | null>(null);
  const config = ZONE_CONFIG[zone];

  // Load from Admin settings (localStorage) on mount
  useEffect(() => {
    // Listen for storage events to update immediately if admin changes it in another tab
    const loadAd = () => {
        const savedBanner = localStorage.getItem(config.key);
        if (savedBanner) {
            setAdImage(savedBanner);
        } else {
            setAdImage(null);
        }
    };

    loadAd();
    
    window.addEventListener('storage', loadAd);
    return () => window.removeEventListener('storage', loadAd);
  }, [config.key]);

  return (
    <div className={`w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden ${className}`}>
      <div className={`relative group w-full ${config.heightClass} rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-300 transition-all`}>
        
        {adImage ? (
          /* Active Banner State */
          <>
            <img 
              src={adImage} 
              alt={`${config.label} Advertisement`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold z-10 pointer-events-none backdrop-blur-sm">
              Ad
            </div>
          </>
        ) : (
          /* Placeholder State */
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
            <div className="flex items-center space-x-2 mb-2">
                <ImageIcon size={20} className="opacity-50" />
                <span className="font-bold uppercase tracking-widest text-xs">{config.label} Space</span>
            </div>
            <span className="text-[10px] font-medium opacity-60">{config.size} px</span>
          </div>
        )}
      </div>
    </div>
  );
};