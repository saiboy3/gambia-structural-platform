import { useState } from 'react';
import { Square } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import CalcSheet from '../ui/CalcSheet';
import ReportButton from '../report/ReportButton';
import { buildFlatSlabReport } from '../../utils/reportBuilders';
import { getMaterial } from '../../utils/materials';
import { designFlatSlab } from '../../utils/flatSlabCalculations';
import { flatSlabCalcNotes } from '../../utils/calcNotesGeotechSlab';
import OptimiseSuggestion from '../ui/OptimiseSuggestion';
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

function PlanSVG({ lx, ly, cx, cy, thickness, cover, res }:
  { lx: number; ly: number; cx: number; cy: number; thickness: number; cover: number;
    res: ReturnType<typeof designFlatSlab> | null }) {
  const W = 290, H = 220, pad = 36;
  const scaleX = (W - 2 * pad) / lx;
  const scaleY = (H - 2 * pad) / ly;
  const pw = W - 2 * pad, ph = H - 2 * pad;
  const csW = Math.min(lx, ly) / 2 * scaleX;
  const csH = Math.min(lx, ly) / 2 * scaleY;
  const midX = pad + pw / 2, midY = pad + ph / 2;
  const colW = (cx / 1000) * scaleX, colH = (cy / 1000) * scaleY;

  // Punching perimeter (2d from column face)
  const d_mm = thickness - cover - 10;
  const perimRx = (cx / 2 + 2 * d_mm) / 1000 * scaleX;
  const perimRy = (cy / 2 + 2 * d_mm) / 1000 * scaleY;
  const perimColor = res ? (res.vEd <= res.vRdc ? '#16a34a' : '#dc2626') : '#f59e0b';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full bg-white">
      <defs>
        <pattern id="slabHatch" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke="#94a3b8" strokeWidth={0.5} strokeOpacity={0.4} />
        </pattern>
      </defs>

      {/* Slab panel */}
      <rect x={pad} y={pad} width={pw} height={ph} fill="url(#slabHatch)" stroke="#64748b" strokeWidth={1.5} />
      <rect x={pad} y={pad} width={pw} height={ph} fill="#f8fafc" fillOpacity={0.7} stroke="none" />

      {/* Column strips (both directions) */}
      <rect x={midX - csW / 2} y={pad} width={csW} height={ph}
        fill="#dbeafe" fillOpacity={0.55} stroke="#93c5fd" strokeWidth={0.8} strokeDasharray="4,2" />
      <rect x={pad} y={midY - csH / 2} width={pw} height={csH}
        fill="#dbeafe" fillOpacity={0.55} stroke="#93c5fd" strokeWidth={0.8} strokeDasharray="4,2" />

      {/* Middle strip labels */}
      <text x={pad + 4} y={midY - csH / 2 - 4} fontSize={7} fill="#3b82f6" fontWeight="600">Column strip</text>
      <text x={pad + 4} y={pad + 10} fontSize={7} fill="#64748b">Middle strip</text>

      {/* Punching shear perimeter (rounded rect at 2d from column face) */}
      <rect x={midX - perimRx} y={midY - perimRy} width={perimRx * 2} height={perimRy * 2}
        fill={perimColor} fillOpacity={0.08} stroke={perimColor} strokeWidth={1.5}
        strokeDasharray="6,3" rx={perimRx * 0.3} />
      {/* 2d dimension leaders */}
      <line x1={midX + colW / 2} y1={midY} x2={midX + perimRx} y2={midY}
        stroke={perimColor} strokeWidth={0.8} strokeDasharray="2,2" />
      <text x={midX + (colW / 2 + perimRx) / 2} y={midY - 4}
        fontSize={6.5} fill={perimColor} textAnchor="middle">2d</text>
      <text x={midX} y={midY + perimRy + 10} textAnchor="middle" fontSize={7} fill={perimColor} fontWeight="700">
        u₁ = {res ? res.u1.toFixed(0) : '—'} mm
      </text>

      {/* Corner columns */}
      {([[0,0],[pw,0],[0,ph],[pw,ph]] as [number,number][]).map(([ox,oy],i) => (
        <rect key={i} x={pad + ox - colW / 2} y={pad + oy - colH / 2}
          width={colW} height={colH} fill="#334155" />
      ))}

      {/* Internal column + punching indicator ring */}
      <rect x={midX - colW / 2} y={midY - colH / 2} width={colW} height={colH} fill="#334155" />
      {res && (
        <text x={midX + perimRx + 4} y={midY + perimRy - 4} fontSize={7} fill={perimColor} fontWeight="700">
          {(res.vEd / res.vRdc * 100).toFixed(0)}%
        </text>
      )}

      {/* Dimension annotations */}
      {/* lx */}
      <line x1={pad} y1={pad - 14} x2={pad + pw} y2={pad - 14}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#slabDimA)" markerStart="url(#slabDimB)" />
      <text x={midX} y={pad - 18} textAnchor="middle" fontSize={8} fill="#475569" fontWeight="700">lx = {lx} m</text>
      {/* ly */}
      <line x1={pad - 16} y1={pad} x2={pad - 16} y2={pad + ph}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#slabDimA)" markerStart="url(#slabDimB)" />
      <text x={pad - 18} y={midY} fontSize={8} fill="#475569" fontWeight="700"
        transform={`rotate(-90,${pad - 18},${midY})`} textAnchor="middle">ly = {ly} m</text>

      {/* Slab thickness note */}
      <text x={W - 4} y={H - 4} textAnchor="end" fontSize={7} fill="#64748b">h = {thickness} mm slab</text>

      <defs>
        <marker id="slabDimA" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
        <marker id="slabDimB" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}

export default function FlatSlabDesign() {
  const [inp, setInp] = useState<FlatSlabInputs>(defaultInputs);
  const [res, setRes] = useState<ReturnType<typeof designFlatSlab> | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'utilisation'>('plan');
  const [suggestion, setSuggestion] = useState<{ thickness: number } | null>(null);
  const { factors } = useBuildingCode();

  const set = (k: keyof FlatSlabInputs, v: string | number | boolean) => {
    setInp(p => ({ ...p, [k]: v }));
    setSuggestion(null);
  };
  const setMat = (c: string, r: string) =>
    setInp(p => ({ ...p, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));

  const runWith = (patch: Partial<FlatSlabInputs>) => {
    const next = { ...inp, ...patch };
    setInp(next);
    setSuggestion(null);
    setRes(designFlatSlab(next, factors));
  };

  const optimise = () => {
    if (!res) return;
    const depthLimit = inp.interiorCol ? 31 : 28;
    let thickness = inp.thickness; // grow from current — only increase if needed
    for (let i = 0; i < 60; i++) {
      const testRes = designFlatSlab({ ...inp, thickness }, factors);
      const punchUtil = testRes.vRdc > 0 ? (testRes.vEd / testRes.vRdc) * 100 : 200;
      const topUtil   = testRes.bars_cs_top.As > 0 ? (testRes.As_cs_top / testRes.bars_cs_top.As) * 100 : 200;
      const botUtil   = testRes.bars_cs_bot.As > 0 ? (testRes.As_cs_bot / testRes.bars_cs_bot.As) * 100 : 200;
      const spanUtil  = testRes.spanRatio > 0 ? (testRes.spanRatio / depthLimit) * 100 : 200;
      // steel utils are As_req/As_prov (inverted) — only need ≤100; punch and span need 80% headroom
      if (punchUtil <= 80 && topUtil <= 100 && botUtil <= 100 && spanUtil <= 80) break;
      thickness = Math.ceil((thickness + 25) / 25) * 25;
    }
    setSuggestion({ thickness });
  };

  const checks: UtilCheck[] = res ? [
    { label: 'Punching shear', demand: res.vEd, capacity: res.vRdc, unit: 'MPa', note: 'vEd / vRd,c',
      hint: 'Critical failure mode for flat slabs. Increase slab depth or enlarge the column.',
      actions: [
        { label: `+25 mm thickness (→ ${inp.thickness + 25} mm)`, onClick: () => runWith({ thickness: inp.thickness + 25 }) },
        { label: `+50 mm thickness (→ ${inp.thickness + 50} mm)`, onClick: () => runWith({ thickness: inp.thickness + 50 }) },
        { label: `+50 mm col. cx (→ ${inp.columnCx + 50} mm)`, onClick: () => runWith({ columnCx: inp.columnCx + 50 }) },
      ],
    },
    { label: 'Col. strip — top steel', demand: res.As_cs_top, capacity: res.bars_cs_top.As, unit: 'mm²/m', note: 'As,req / As,prov', invert: true,
      hint: 'Top bars resist hogging over columns. Increasing thickness reduces As,req automatically.',
      actions: [
        { label: `+25 mm thickness (→ ${inp.thickness + 25} mm)`, onClick: () => runWith({ thickness: inp.thickness + 25 }) },
        { label: `+50 mm thickness (→ ${inp.thickness + 50} mm)`, onClick: () => runWith({ thickness: inp.thickness + 50 }) },
      ],
    },
    { label: 'Col. strip — bottom steel', demand: res.As_cs_bot, capacity: res.bars_cs_bot.As, unit: 'mm²/m', note: 'As,req / As,prov', invert: true,
      hint: 'Bottom bars resist mid-span sagging. Increasing thickness reduces As,req automatically.',
      actions: [
        { label: `+25 mm thickness (→ ${inp.thickness + 25} mm)`, onClick: () => runWith({ thickness: inp.thickness + 25 }) },
        { label: `+50 mm thickness (→ ${inp.thickness + 50} mm)`, onClick: () => runWith({ thickness: inp.thickness + 50 }) },
      ],
    },
    { label: 'Span / depth ratio', demand: res.spanRatio, capacity: inp.interiorCol ? 31 : 28, note: 'actual / limit',
      hint: 'Slab is too shallow relative to span. Increase thickness — flat slabs are typically span/30 to span/35.',
      actions: [
        { label: `+25 mm thickness (→ ${inp.thickness + 25} mm)`, onClick: () => runWith({ thickness: inp.thickness + 25 }) },
        { label: `+50 mm thickness (→ ${inp.thickness + 50} mm)`, onClick: () => runWith({ thickness: inp.thickness + 50 }) },
      ],
    },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Square size={22} />
          <h1 className="text-xl font-bold">Flat Slab Design</h1>
        </div>
        <p className="text-emerald-200 text-sm">Flat slab design to EC2 Annex I with punching shear and deflection checks</p>
      </div>
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
          <Button onClick={() => setRes(designFlatSlab(inp, factors))} fullWidth className="mt-4">
            Design Flat Slab
          </Button>
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
              <CalcSheet
                title="Flat Slab Calculation Sheet"
                codeLabel={factors.label}
                steps={flatSlabCalcNotes(inp, res, factors)}
              />
              <div className="mt-3 flex justify-end">
                <ReportButton data={buildFlatSlabReport(inp, res, factors)} />
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
              <PlanSVG lx={inp.lx} ly={inp.ly} cx={inp.columnCx} cy={inp.columnCy}
                thickness={inp.thickness} cover={inp.cover} res={res} />
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 bg-blue-200 rounded" /><span className="text-slate-500">Column strip (60–75% of moment)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 bg-slate-100 rounded border border-slate-300" /><span className="text-slate-500">Middle strip (remaining moment)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res ? (
              <>
                <UtilisationBars checks={checks} title="Capacity checks" />
                {!suggestion && (
                  <Button onClick={optimise} variant="ghost" size="sm" fullWidth
                    className="mt-3 !text-blue-600 !border-blue-200 !bg-blue-50 hover:!bg-blue-100 rounded-xl">
                    Suggest optimal parameters
                  </Button>
                )}
                {suggestion && (
                  <OptimiseSuggestion
                    rows={[
                      { label: 'Slab thickness', current: inp.thickness, suggested: suggestion.thickness, unit: 'mm' },
                    ]}
                    note="Minimum thickness satisfying punching shear, flexure, and span/depth limits."
                    onApply={() => { runWith(suggestion); setSuggestion(null); }}
                    onDismiss={() => setSuggestion(null)}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
            )
          )}
        </Card>
      </div>
    </div>
  );
}
