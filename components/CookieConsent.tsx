import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('labsuite_cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('labsuite_cookie_consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fadeIn print:hidden">
      <div className="max-w-5xl mx-auto bg-slate-900 text-white p-4 md:p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-700/50 backdrop-blur-xl bg-slate-900/95">
        <div className="flex items-start md:items-center gap-4">
            <div className="bg-slate-800 p-3 rounded-full text-pink-500 shrink-0">
                <Cookie size={24} />
            </div>
            <div>
                <h3 className="font-bold text-base md:text-lg mb-1">We use cookies</h3>
                <p className="text-slate-300 text-sm leading-snug">
                    We use local storage to save your preferences and calculation history. 
                    <Link to="/cookies" className="text-pink-400 hover:text-pink-300 underline ml-1 font-medium">Learn more</Link>.
                </p>
            </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
            <button 
                onClick={() => setShow(false)} 
                className="flex-1 md:flex-none px-6 py-2.5 rounded-full border border-slate-600 hover:bg-slate-800 hover:border-slate-500 transition-colors font-medium text-sm text-slate-200"
            >
                Decline
            </button>
            <button 
                onClick={handleAccept} 
                className="flex-1 md:flex-none px-8 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-all font-bold text-sm shadow-lg shadow-pink-500/20 active:scale-95"
            >
                Accept
            </button>
        </div>
      </div>
    </div>
  );
};