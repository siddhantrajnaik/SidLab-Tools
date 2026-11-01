import React, { useMemo, useState } from 'react';
import { Printer, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Input, Button } from '../components/UI';
import { safeNum } from '../utils';
import { standardCurve, pfafflRatio, deltaDeltaCq, parseColumn } from '../lib/qpcr';

const EXAMPLE_QTY = '100000\n10000\n1000\n100\n10';
const EXAMPLE_CQ = '15.1\n18.5\n21.7\n25.2\n28.4';

const num = (v: string): number | '' => (v === '' ? '' : parseFloat(v));
const fmt = (n: number, d = 2) => (isFinite(n) ? n.toFixed(d) : '—');

/** Cq against log10(input), with the fitted line. Drawn so outliers are visible at a glance. */
const CurvePlot: React.FC<{ x: number[]; y: number[]; slope: number; intercept: number }> = ({ x, y, slope, intercept }) => {
  const W = 320, H = 190, P = 30;
  const xmin = Math.min(...x), xmax = Math.max(...x);
  const ymin = Math.min(...y) - 1, ymax = Math.max(...y) + 1;
  const sx = (v: number) => P + ((v - xmin) / (xmax - xmin || 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Standard curve: Cq against log10 input">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#cbd5e1" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#cbd5e1" />
      <line x1={sx(xmin)} y1={sy(slope * xmin + intercept)} x2={sx(xmax)} y2={sy(slope * xmax + intercept)}
        stroke="#8b5cf6" strokeWidth="2" />
      {x.map((v, i) => <circle key={i} cx={sx(v)} cy={sy(y[i])} r="4" fill="#f59e0b" />)}
      <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-slate-400" fontSize="10">log₁₀ input</text>
      <text x={10} y={H / 2} textAnchor="middle" className="fill-slate-400" fontSize="10" transform={`rotate(-90 10 ${H / 2})`}>Cq</text>
    </svg>
  );
};

const QpcrCalculator: React.FC = () => {
  const [qtyText, setQtyText] = useState(EXAMPLE_QTY);
  const [cqText, setCqText] = useState(EXAMPLE_CQ);

  const [tc, setTc] = useState<number | ''>(26.1);
  const [rc, setRc] = useState<number | ''>(17.4);
  const [tt, setTt] = useState<number | ''>(23.9);
  const [rt, setRt] = useState<number | ''>(17.9);
  const [effT, setEffT] = useState<number | ''>(100);
  const [effR, setEffR] = useState<number | ''>(100);

  const qty = useMemo(() => parseColumn(qtyText), [qtyText]);
  const cq = useMemo(() => parseColumn(cqText), [cqText]);
  const n = Math.min(qty.length, cq.length);
  const usable = qty.slice(0, n).every(q => q > 0);
  const logQty = qty.slice(0, n).map(q => Math.log10(q));
  const curve = usable ? standardCurve(logQty, cq.slice(0, n)) : null;

  const allFilled = [tc, rc, tt, rt].every(v => v !== '');
  const dd = deltaDeltaCq({ targetControl: safeNum(tc), refControl: safeNum(rc), targetTreated: safeNum(tt), refTreated: safeNum(rt) });
  const eTarget = 1 + safeNum(effT) / 100;
  const eRef = 1 + safeNum(effR) / 100;
  const dCqTarget = safeNum(tc) - safeNum(tt);
  const dCqRef = safeNum(rc) - safeNum(rt);
  const ratio = pfafflRatio(eTarget, dCqTarget, eRef, dCqRef);
  const differs = Math.abs(Math.log2(ratio) - Math.log2(dd.foldChange)) > 0.1;

  const useCurveForTarget = () => curve && setEffT(Number(curve.efficiency.toFixed(1)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="qPCR Analysis"
        description="Amplification efficiency from a standard curve, and efficiency-corrected relative quantification."
        action={<Button variant="outline" onClick={() => window.print()} icon={<Printer size={16} />}>Print</Button>}
      />

      {/* 1. Standard curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Standard curve" action={
            <Button variant="ghost" size="sm" onClick={() => { setQtyText(''); setCqText(''); }} className="text-slate-500">
              <RefreshCw size={16} className="mr-2" /> Clear
            </Button>
          }>
            <p className="text-sm text-slate-500 mb-4">
              Paste a column of each, in the same order — straight from the instrument export is fine.
              Use one Cq per dilution, or the mean of the replicates.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">Input quantity</span>
                <span className="block text-xs text-slate-400 ml-1 mb-2">copies, ng, or relative dilution</span>
                <textarea value={qtyText} onChange={e => setQtyText(e.target.value)} rows={7} spellCheck={false}
                  className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 font-mono text-sm focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-900 ml-1">Cq</span>
                <span className="block text-xs text-slate-400 ml-1 mb-2">one per row</span>
                <textarea value={cqText} onChange={e => setCqText(e.target.value)} rows={7} spellCheck={false}
                  className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 px-4 font-mono text-sm focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
              </label>
            </div>
            {qty.length !== cq.length && qty.length > 0 && cq.length > 0 && (
              <p className="text-xs text-amber-600 mt-3">
                {qty.length} quantities but {cq.length} Cq values — using the first {n} pairs.
              </p>
            )}
            {!usable && <p className="text-xs text-red-600 mt-3">Every input quantity must be greater than zero to take its logarithm.</p>}
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card title="Efficiency" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {curve ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Efficiency</p>
                    <p className="text-3xl font-bold text-violet-600">{fmt(curve.efficiency, 1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {curve.efficiencyCI
                        ? `95% CI ${fmt(curve.efficiencyCI[0], 1)} – ${fmt(curve.efficiencyCI[1], 1)}%`
                        : 'Needs three or more points for a confidence interval'}
                    </p>
                    <p className="text-xs text-slate-500">Amplification factor {fmt(curve.amplificationFactor, 3)} per cycle</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm font-mono text-sm text-slate-700 space-y-1">
                    <p>slope = {fmt(curve.slope, 3)}</p>
                    <p>intercept = {fmt(curve.intercept, 2)}</p>
                    <p>R² = {fmt(curve.r2, 4)}</p>
                    <p>n = {curve.n}</p>
                    <p className="text-xs text-slate-400 pt-2 font-sans">%E = 100 × (10<sup>−1/slope</sup> − 1)</p>
                  </div>
                </div>

                {curve.aboveTheoretical && (
                  <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    Above 100%: the slope is shallower than −3.32, which would mean more than doubling
                    per cycle. MIQE 2.0 attributes this to pipetting error in the dilution series rather
                    than a real efficiency — check the dilutions before trusting it.
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <CurvePlot x={logQty} y={cq.slice(0, n)} slope={curve.slope} intercept={curve.intercept} />
                </div>

                <div className="flex items-start text-xs text-slate-500 leading-relaxed">
                  <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                  <p>
                    There is no pass/fail verdict here on purpose. The "90–110%, R² &gt; 0.98" rule is often
                    attributed to MIQE, but MIQE 2.0 (Bustin et al., Clin Chem 2025) endorses no acceptance
                    window and no R² cutoff — it asks for the efficiency to be reported with its confidence
                    interval, over four to five orders of magnitude with at least three replicates per step.
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={useCurveForTarget}>Use this efficiency for the target gene below</Button>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-16">Paste at least two quantity / Cq pairs, with the Cq falling as input rises.</p>
            )}
          </Card>
        </div>
      </div>

      {/* 2. Relative quantification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card title="Relative quantification">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Target, control" value={tc} onChange={e => setTc(num(e.target.value))} unit="Cq" />
                <Input label="Reference, control" value={rc} onChange={e => setRc(num(e.target.value))} unit="Cq" />
                <Input label="Target, treated" value={tt} onChange={e => setTt(num(e.target.value))} unit="Cq" />
                <Input label="Reference, treated" value={rt} onChange={e => setRt(num(e.target.value))} unit="Cq" />
              </div>
              <hr className="border-slate-100" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Target efficiency" value={effT} onChange={e => setEffT(num(e.target.value))} unit="%" />
                <Input label="Reference efficiency" value={effR} onChange={e => setEffR(num(e.target.value))} unit="%" />
              </div>
              <p className="text-xs text-slate-500">Measure these with the standard curve above, one curve per assay.</p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card title="Fold change" className="bg-slate-50/50 border-dashed border-2 border-slate-200 h-full">
            {allFilled ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Efficiency-corrected (Pfaffl)</p>
                    <p className="text-3xl font-bold text-violet-600">{fmt(ratio, 2)}×</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {ratio >= 1 ? `${fmt(ratio, 2)}-fold up` : `${fmt(1 / ratio, 2)}-fold down`} in treated
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">2<sup>−ΔΔCq</sup> (assumes 100%)</p>
                    <p className="text-3xl font-bold text-slate-700">{fmt(dd.foldChange, 2)}×</p>
                    <p className="text-xs text-slate-500 mt-1">ΔΔCq = {fmt(dd.ddCq, 2)}</p>
                  </div>
                </div>

                {differs && (
                  <div className="flex items-start p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    The two methods disagree because your efficiencies are not both 100%. The corrected
                    figure is the one to report; MIQE 2.0 recommends against relying on ΔΔCq.
                  </div>
                )}

                <div className="bg-white p-5 rounded-2xl border border-slate-100 font-mono text-xs text-slate-600 space-y-1.5">
                  <p>ratio = E<sub>t</sub><sup>ΔCq,t</sup> / E<sub>r</sub><sup>ΔCq,r</sup> &nbsp;(ΔCq = control − treated)</p>
                  <p>= {fmt(eTarget, 3)}<sup>{fmt(dCqTarget, 2)}</sup> / {fmt(eRef, 3)}<sup>{fmt(dCqRef, 2)}</sup> = {fmt(ratio, 3)}</p>
                  <p className="pt-2">ΔCq control = {fmt(dd.dCqControl, 2)}, ΔCq treated = {fmt(dd.dCqTreated, 2)}</p>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pfaffl, Nucleic Acids Res 29:e45 (2001); Livak &amp; Schmittgen, Methods 25:402 (2001).
                  With one reference gene this is a single-reference ratio; MIQE 2.0 recommends normalising
                  to the geometric mean of several validated reference genes.
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-16">Enter all four Cq values.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QpcrCalculator;
