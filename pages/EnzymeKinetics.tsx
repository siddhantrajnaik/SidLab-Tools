import React, { useMemo, useState } from 'react';
import { Printer, Info } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/UI';
import { parseColumn } from '../lib/qpcr';
import { fitMichaelisMenten, lineweaverBurk, michaelisMenten } from '../lib/kinetics';

const EX_S = '0.5\n1\n2\n4\n8\n16\n32';
const EX_V = '1.48\n2.62\n4.01\n5.83\n7.06\n7.98\n8.41';
const fmt = (n: number) => (Math.abs(n) >= 1e4 || (Math.abs(n) < 1e-3 && n !== 0) ? n.toExponential(3) : n.toPrecision(4));

const Plot: React.FC<{ s: number[]; v: number[]; vmax: number; km: number }> = ({ s, v, vmax, km }) => {
  const W = 340, H = 200, P = 30;
  const smax = Math.max(...s) * 1.05, vtop = Math.max(vmax, ...v) * 1.1;
  const sx = (x: number) => P + (x / smax) * (W - 2 * P);
  const sy = (y: number) => H - P - (y / vtop) * (H - 2 * P);
  const curve = Array.from({ length: 80 }, (_, i) => (smax * i) / 79).map(x => `${sx(x)},${sy(michaelisMenten(x, vmax, km))}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Rate against substrate with the fitted curve">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#cbd5e1" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#cbd5e1" />
      <line x1={P} y1={sy(vmax)} x2={W - P} y2={sy(vmax)} stroke="#a855f7" strokeDasharray="4 4" />
      <line x1={sx(km)} y1={sy(vmax / 2)} x2={sx(km)} y2={H - P} stroke="#a855f7" strokeDasharray="4 4" />
      <polyline points={curve} fill="none" stroke="#7c3aed" strokeWidth="2" />
      {s.map((x, i) => <circle key={i} cx={sx(x)} cy={sy(v[i])} r="4" fill="#f59e0b" />)}
      <text x={W - P} y={sy(vmax) - 4} textAnchor="end" fontSize="10" className="fill-violet-500">Vmax</text>
      <text x={sx(km) + 4} y={H - P - 4} fontSize="10" className="fill-violet-500">Km</text>
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10" className="fill-slate-400">[S]</text>
    </svg>
  );
};

const EnzymeKinetics: React.FC = () => {
  const [sText, setSText] = useState(EX_S);
  const [vText, setVText] = useState(EX_V);
  const s = useMemo(() => parseColumn(sText), [sText]);
  const v = useMemo(() => parseColumn(vText), [vText]);
  const n = Math.min(s.length, v.length);
  const fit = fitMichaelisMenten(s.slice(0, n), v.slice(0, n));
  const lb = lineweaverBurk(s.slice(0, n), v.slice(0, n));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enzyme Kinetics"
        description="Km and Vmax by nonlinear fit to the Michaelis-Menten equation, with confidence intervals."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <Card title="Data">
            <p className="text-sm text-slate-500 mb-4">Paste substrate concentrations and initial rates, one per row, in matching order. Any consistent units.</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">[S]</span>
                <textarea value={sText} onChange={e => setSText(e.target.value)} rows={9} spellCheck={false}
                  className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 font-mono text-sm focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">v₀</span>
                <textarea value={vText} onChange={e => setVText(e.target.value)} rows={9} spellCheck={false}
                  className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 font-mono text-sm focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
              </label>
            </div>
            {s.length !== v.length && s.length && v.length ? <p className="text-xs text-amber-600 mt-3">Using the first {n} pairs.</p> : null}
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card title="Fit" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {fit ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Km</p>
                    <p className="text-3xl font-bold text-violet-600">{fmt(fit.km)}</p>
                    <p className="text-xs text-slate-500 mt-1">± {fmt(fit.kmSE)} SE · 95% CI {fmt(fit.kmCI[0])} – {fmt(fit.kmCI[1])}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vmax</p>
                    <p className="text-3xl font-bold text-violet-600">{fmt(fit.vmax)}</p>
                    <p className="text-xs text-slate-500 mt-1">± {fmt(fit.vmaxSE)} SE · 95% CI {fmt(fit.vmaxCI[0])} – {fmt(fit.vmaxCI[1])}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <Plot s={s.slice(0, n)} v={v.slice(0, n)} vmax={fit.vmax} km={fit.km} />
                </div>
                <p className="text-xs font-mono text-slate-500">v = Vmax·[S] / (Km + [S]) · n = {fit.n} · residual SS = {fmt(fit.ssr)}</p>
                {lb && (
                  <div className="flex items-start text-xs text-slate-500 leading-relaxed">
                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                    <p>
                      For comparison, a Lineweaver-Burk line through the same points gives Km {fmt(lb.km)} and Vmax {fmt(lb.vmax)}.
                      Taking reciprocals magnifies the error in the slowest rates, so the double-reciprocal fit is biased; the
                      values above come from fitting the curve directly, and match SciPy's curve_fit.
                    </p>
                  </div>
                )}
                {(() => {
                  const top = Math.max(...s.slice(0, n));
                  const reached = (100 * top) / (fit.km + top);
                  return (
                    <p className={`text-xs ${reached < 75 ? 'text-amber-700' : 'text-slate-500'}`}>
                      Your highest [S] reaches {reached.toFixed(0)}% of the fitted Vmax.
                      {reached < 75 && ' Vmax is extrapolated well beyond the data — measure at higher substrate if you can.'}
                    </p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-16">Needs at least three points with positive [S], at two or more concentrations.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnzymeKinetics;
