import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Dilution from './pages/Dilution';
import Molarity from './pages/Molarity';
import Protocols from './pages/Protocols';
import PhCalculator from './pages/PhCalculator';
import ProteinConc from './pages/ProteinConc';
import PercentSol from './pages/PercentSol';
import OopsCalculator from './pages/OopsCalculator';
import PrimerAnalysis from './pages/PrimerAnalysis';
import SdsPage from './pages/SdsPage';
import CellCount from './pages/CellCount';
import Logarithm from './pages/Logarithm';
import LabTimer from './pages/LabTimer';
import FastaCleaner from './pages/FastaCleaner';
import RestrictionFinder from './pages/RestrictionFinder';
import CookiesPolicy from './pages/CookiesPolicy';
import AiIllustrator from './pages/AiIllustrator';
import Centrifuge from './pages/Centrifuge';
import NucleicAcid from './pages/NucleicAcid';
import Ligation from './pages/Ligation';
import SeqToolkit from './pages/SeqToolkit';

const App: React.FC = () => {
  // The removed ad panel stored banner images as base64 in localStorage, up to 2 MB per
  // zone. Left behind they would sit unreachable and eat into the ~5 MB origin quota that
  // the calculators use to remember their inputs, so clear them once on load.
  useEffect(() => {
    try {
      ['labsuite_ad_hero', 'labsuite_ad_middle', 'labsuite_ad_footer'].forEach(k =>
        window.localStorage.removeItem(k)
      );
      window.sessionStorage.removeItem('labsuite_admin_auth');
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); nothing to do.
    }
  }, []);

  useEffect(() => {
    // Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Block Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Picker)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
      }

      // Block Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dilution" element={<Dilution />} />
          <Route path="/molarity" element={<Molarity />} />
          <Route path="/ph" element={<PhCalculator />} />
          <Route path="/protein" element={<ProteinConc />} />
          <Route path="/percent" element={<PercentSol />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/oops" element={<OopsCalculator />} />
          <Route path="/primers" element={<PrimerAnalysis />} />
          <Route path="/sds" element={<SdsPage />} />
          <Route path="/cellcount" element={<CellCount />} />
          <Route path="/log" element={<Logarithm />} />
          <Route path="/timer" element={<LabTimer />} />
          <Route path="/fasta" element={<FastaCleaner />} />
          <Route path="/restriction" element={<RestrictionFinder />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/ai-image" element={<AiIllustrator />} />
          <Route path="/centrifuge" element={<Centrifuge />} />
          <Route path="/nucleic" element={<NucleicAcid />} />
          <Route path="/ligation" element={<Ligation />} />
          <Route path="/seqtools" element={<SeqToolkit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;