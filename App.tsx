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
import Admin from './pages/Admin';
import CookiesPolicy from './pages/CookiesPolicy';
import AiIllustrator from './pages/AiIllustrator';

const App: React.FC = () => {
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
          <Route path="/admin" element={<Admin />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/ai-image" element={<AiIllustrator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;