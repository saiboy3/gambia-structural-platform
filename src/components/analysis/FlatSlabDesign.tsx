import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { getMaterial } from '../../utils/materials';
import { designFlatSlab } from '../../utils/flatSlabCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { ConcreteGrade, RebarGrade } from '../../types/structural';
import type { FlatSlabInputs } from '../../utils/flatSlabCalculations';

const defaultInputs: FlatSlabInputs = {
  lx: 6.0, ly: 6.0, thickness: 250, cover: 30,
  columnCx: 300, columnCy: 300,
  liveLoad: 3.0, deadLoad: 2.0,
  interiorCol: true,
  material: getMaterial('C25/30', 'B500B'),
};

function PlanSVG({ lx, ly, cx, cy }: { lx: number; ly: number; cx: number; cy: number }) {
  const W = 280, H = 200, pad = 30;
  const scaleX = (W - 2 * pad) / lx;
  const scaleY = (H - 2 * pad) / ly;
  const pw = W - 2 * pad, ph = H - 2 * pad;
  // Column strip bounds (min span / 2 either side)
  const csW = Math.min(lx, ly) / 2 * scaleX;
  const csH = Math.min(lx, ly) / 2 * scaleY;
  const midX = pad + pw / 2, midY = pad + ph / 2;
  const colW = (cx / 1000) * scaleX, colH = (cy / 1000) * scaleY;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Panel */}
      <rect x={pad} y={pad} width={pw} height={ph} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
      {/* Middle strip shading */}
      <rect x={midX - csW / 2} y={pad} width={csW} height={ph} fill="#dbeafe" fillOpacity={0.6} />
      <rect x={pad} y={midY - csH / 2} width={pw} height={csH} fill="#dbeafe" fillOpacity={0.6} />
      {/* Column strip labels */}
      <text x={midX} y={pad - 4} textAnchor="middle" fontSize={8} fill="#3b82f6">Column strip</text>
      {/* Panel dims */}
      <text x={midX} y={H - 4} textAnchor="middle" fontSize={9} fill="#64748b">lx = {lx} m</text>
      <text x={8} y={midY} textAnchor="middle" fontSize={9} fill="#64748b" transform={`rotate(-90,8,${midY})`}>ly = {ly} m</text>
      {/* Corner columns */}
      {[[0,0],[pw,0],[0,ph],[pw,ph]].map(([ox,oy],i) => (
        <rect key={i} x={pad + ox - colW / 2} y={pad + oy - colH / 2} width={colW} height={colH} fill="#475569" />
      ))}
      {/* Centre column */}
      <rect x={midX - colW / 2} y={midY - colH / 2} width={colW} height={colH} fill="#475569" />
      {/* Critical perimeter label */}
      <text x={midX + 10} y={midY + 20} fontSize={7} fill="#ef4444">u₁ (2d)</text>
    </svg>
  );
}

export default function FlatSlabDesign() {
  const [inp, setInp] = useState<FlatSlabInputs>(defaultInputs);
  const [res, setRes] = useState<ReturnType<typeof designFlatSlab> | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'utilisation'>('plan');
  const { factors } = useBuildingCode();

  const set = (k: keyof FlatSlabInputs, v: string | number | boolean) =>
    setInp(p => ({ ...p, [k]: v }));
  const setMat = (c: string, r: string) =>
    setInp(p => ({ ...p, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));

  const checks: UtilCheck[] = res ? [
    { label: 'Punching shear', demand: res.vEd, capacity: res.vRdc, unit: 'MPa', note: 'vEd / vRd,c' },
    { label: 'Col. strip hogging', demand: res.As_cs_top, capacity: res.bars_cs_top.As, unit: 'mm²/m', note: 'As,req / As,prov', invert: true },
    { label: 'Col. strip sagging', demand: res.As_cs_bot, capacity: res.bars_cs_bot.As, unit: 'mm²/m', note: 'As,req / As,prov', invert: true },
    { label: 'Span / depth', demand: res.spanRatio, capacity: inp.interiorCol ? 31 : 28, note: 'actual / limit' },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Flat Slab Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Short span (lx)</label>
                <HelpTooltip title="Short span" text="The shorter panel dimension between column centres." typical="5–8 m for office/residential flat slabs" effect="Controls design moment and required slab depth" />
              </div>
              <InputField label="" unit="m" value={inp.lx} onChange={v => set('lx', +v)} min={2} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Long span (ly)</label>
                <HelpTooltip title="Long span" text="The longer panel dimension between column centres." typical="5–9 m" />
              </div>
              <InputField label="" unit="m" value={inp.ly} onChange={v => set('ly', +v)} min={2} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Slab thickness</label>
                <HelpTooltip title="Slab thickness" text="Overall depth of slab. Rule of thumb: lx/31 for interior column (EC2)." typical={`${Math.round(inp.lx * 1000 / 31 / 25) * 25}–${Math.round(inp.lx * 1000 / 28 / 25) * 25} mm for ${inp.lx} m span`} />
              </div>
              <InputField label="" unit="mm" value={inp.thickness} onChange={v => set('thickness', +v)} min={150} />
            </div>
            <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={20} />
            <InputField label="Column Cx" unit="mm" value={inp.columnCx} onChange={v => set('columnCx', +v)} min={200} />
            <InputField label="Column Cy" unit="mm" value={inp.columnCy} onChange={v => set('columnCy', +v)} min={200} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Dead load (SDL)</label>
                <HelpTooltip title="Superimposed dead load" text="Finishes, raised floor, services — excludes slab self-weight (calculated automatically)." typical="1.5–3.0 kN/m²" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.deadLoad} onChange={v => set('deadLoad', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Live load</label>
                <HelpTooltip title="Imposed live load" text="People, furniture, equipment." typical="2.0 residential / 3.0–4.0 office" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} />
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Column position</p>
              <div className="grid grid-cols-2 gap-1">
                {([true, false] as const).map((interior) => (
                  <button key={String(interior)} onClick={() => set('interiorCol', interior)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-all
                      ${inp.interiorCol === interior ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                    {interior ? 'Interior' : 'Edge'}
                  </button>
                ))}
              </div>
            </div>
            <SelectField label="Concrete" value={inp.material.concrete}
              onChange={v => setMat(v, inp.material.rebar)}
              options={['C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
            <SelectField label="Rebar" value={inp.material.rebar}
              onChange={v => setMat(inp.material.concrete, v)}
              options={['B500B','B500C'].map(r => ({ value: r, label: r }))} />
          </div>
          <button onClick={() => setRes(designFlatSlab(inp, factors))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Flat Slab
          </button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>

              <ResultRow label="Effective depth (d)" value={res.d.toFixed(0)} unit="mm" highlight />
              <ResultRow label="Design UDL (wEd)" value={res.wEd.toFixed(2)} unit="kN/m²" />
              <ResultRow label="Span / depth" value={res.spanRatio} />
              <ResultRow label="Deflection" value={res.deflectionOK ? '✓ Pass' : '✗ Check'} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Column Strip (hogging over col.)</p>
              <ResultRow label="MEd,cs" value={res.Med_cs_neg.toFixed(1)} unit="kNm/m" highlight />
              <ResultRow label="As,req (top)" value={res.As_cs_top.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars (top)" value={`T${res.bars_cs_top.dia}@${res.bars_cs_top.spacing}`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Column Strip (sagging in span)</p>
              <ResultRow label="As,req (bot)" value={res.As_cs_bot.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars (bot)" value={`T${res.bars_cs_bot.dia}@${res.bars_cs_bot.spacing}`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Middle Strip</p>
              <ResultRow label="As,req (bot)" value={res.As_ms_bot.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars (bot)" value={`T${res.bars_ms_bot.dia}@${res.bars_ms_bot.spacing}`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Punching Shear</p>
              <ResultRow label="VEd" value={res.VEd.toFixed(0)} unit="kN" />
              <ResultRow label="u₁ (2d perimeter)" value={res.u1.toFixed(0)} unit="mm" />
              <ResultRow label="vEd" value={res.vEd.toFixed(3)} unit="MPa" highlight />
              <ResultRow label="vRd,c" value={res.vRdc.toFixed(3)} unit="MPa" />
              <ResultRow label="Punching" value={res.punchingOK ? '✓ Pass' : '✗ Fail — shear studs needed'} />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <SaveDesignPanel memberType="slab"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🏗️</p>
              <p className="text-sm font-semibold text-slate-600">Flat slab — no beams</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">Punching shear at the column is the critical check. Enter parameters and run design.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Slab Plan & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['plan','utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'plan' ? 'Plan View' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'plan' && (
            <>
              <PlanSVG lx={inp.lx} ly={inp.ly} cx={inp.columnCx} cy={inp.columnCy} />
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 bg-blue-200 rounded" /><span className="text-slate-500">Column strip (60–75% of moment)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 bg-slate-100 rounded border border-slate-300" /><span className="text-slate-500">Middle strip (remaining moment)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Capacity checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
