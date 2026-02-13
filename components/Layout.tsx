import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Image as ImageIcon, Mail } from 'lucide-react';
import { Button } from './UI';
import { WhatsAppIcon } from './ScienceIcons';
import { CookieConsent } from './CookieConsent';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();

  const handleNavSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(`/?q=${encodeURIComponent(navSearch)}`);
      setMobileMenuOpen(false); // Close mobile search if open
    }
  };

  const navItems = [
    { to: '/', label: 'Explore' },
    { to: '/dilution', label: 'Dilution' },
    { to: '/molarity', label: 'Molarity' },
    { to: '/restriction', label: 'Rest. Sites' },
    { to: '/primers', label: 'Primers' },
    { to: '/timer', label: 'Timer' },
    { to: '/fasta', label: 'FASTA' },
    { to: '/log', label: 'Log Calc' },
    { to: '/cellcount', label: 'Cells' },
    { to: '/sds', label: 'SDS Gel' },
    { to: '/percent', label: '%' },
    { to: '/ph', label: 'pH Calc' },
    { to: '/protein', label: 'Protein' },
    { to: '/protocols', label: 'Protocols' },
    { to: '/oops', label: 'Oops!' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Inline styles for hiding scrollbar but allowing scroll */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Primary Header */}
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-50 print:hidden h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            {/* Logo area */}
            <div className="flex items-center flex-shrink-0 mr-6">
              <NavLink to="/" className="flex items-center group">
                {/* Logo Image Logic: Tries to load /branding/logo.png, falls back to S icon */}
                {!logoError ? (
                   <img 
                     src="/branding/logo.png" 
                     alt="Logo" 
                     className="h-10 w-auto mr-3 object-contain transition-transform group-hover:scale-105"
                     onError={() => setLogoError(true)}
                   />
                ) : (
                   <div className="bg-slate-900 text-white p-2 rounded-xl mr-3 transition-transform group-hover:rotate-12">
                      <span className="font-logo font-bold text-xl">S</span>
                   </div>
                )}
                <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-logo">Sidlab Tools</span>
              </NavLink>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-sm">
                <div className="relative group">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                   <input 
                      type="text" 
                      value={navSearch}
                      onChange={(e) => setNavSearch(e.target.value)}
                      onKeyDown={handleNavSearch}
                      placeholder="Search tools..." 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all"
                   />
                </div>
            </div>

            {/* Mobile Search Toggle */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-full transition-colors ${mobileMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
              >
                {mobileMenuOpen ? <X size={20} /> : <Search size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay (only visible when toggled on mobile) */}
      {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 p-4 animate-fadeIn sticky top-16 z-50">
               <input 
                  type="text" 
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  onKeyDown={handleNavSearch}
                  placeholder="Search tools..." 
                  className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all"
                  autoFocus
              />
          </div>
      )}

      {/* Secondary Header - Rolling Navigation Strip */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-16 z-40 print:hidden shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-3">
             {navItems.map((item) => (
               <NavLink
                 key={item.to}
                 to={item.to}
                 className={({ isActive }) => `
                   flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border
                   ${isActive 
                     ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10 scale-105' 
                     : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:shadow-sm'}
                 `}
               >
                 {item.label}
               </NavLink>
             ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 print:max-w-none print:p-0 print:block">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 bg-white print:hidden">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
                <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center mr-3 text-slate-900 font-logo font-bold">S</div>
                <span className="text-slate-900 font-bold font-logo">Sidlab Tools</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
                {/* Contact Icons */}
                <div className="flex space-x-4 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-8">
                    <a 
                        href="https://wa.me/918249524316" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-[#25D366] hover:bg-green-50 rounded-full transition-all"
                        title="Chat on WhatsApp"
                    >
                        <WhatsAppIcon className="h-5 w-5" />
                    </a>
                    <a 
                        href="mailto:siddhantrajnaik@gmail.com" 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Send Email"
                    >
                        <Mail size={20} />
                    </a>
                </div>

                <div className="flex space-x-6 text-sm font-medium text-slate-500 items-center">
                    <NavLink to="/admin" className="hover:text-slate-900">Admin</NavLink>
                    <a href="#" className="hover:text-slate-900">Terms</a>
                    <a href="#" className="hover:text-slate-900">Privacy</a>
                    <NavLink to="/cookies" className="hover:text-slate-900">Cookies</NavLink>
                </div>
            </div>
         </div>
      </footer>
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
};

export default Layout;