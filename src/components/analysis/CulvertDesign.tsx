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
import { designCulvert } from '../../utils/culvertCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { CulvertInputs } from '../../utils/culvertCalculations';

const defaultInp: CulvertInputs = {
  span: 3.0,
  height: 2.0,
  wallThick: 300,
  cover: 50,
  fillDepth: 1.5,
  fillDensity: 19,
  liveLoad: 20,
  fck: 30,
  fyk: 500,
  designFlow: 4.5,
  Manning_n: 0.013,
};

function CulvertSVG({ span, height, wallThick, fillDepth }:
  { span: number; height: number; wallThick: number; fillDepth: number }) {
  const W = 260, H = 200, pad = 20;
  const t = wallThick / 1000;
  const extSpan = span + 2 * t;
  const extHeight = height + 2 * t;
  const fillH = fillDepth;
  const totalH = extHeight + fillH;
  const scaleX = (W - 2 * pad) / (extSpan + 2);
  const scaleY = (H - 2 * pad) / (totalH + 1);
  const cx = W / 2;
  const baseY = H - pad;

  const wallColor = '#475569';
  const fillColor = '#d4a373';
  const voidColor = '#bfdbfe';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Fill */}
      <rect
        x={cx - extSpan / 2 * scaleX}
        y={baseY - (extHeight + fillH) * scaleY}
        width={extSpan * scaleX}
        height={fillH * scaleY}
        fill={fillColor} fillOpacity={0.7}
      />
      <text x={cx} y={baseY - (extHeight + fillH / 2) * scaleY + 3}
        textAnchor="middle" fontSize={7} fill="#78350f">Fill {fillDepth}m</text>
      {/* Traffic load arrows */}
      {[-1, 0, 1].map(i => (
        <g key={i}>
          <line x1={cx + i * 20} y1={baseY - (extHeight + fillH + 0.5) * scaleY}
            x2={cx + i * 20} y2={baseY - (extHeight + fillH) * scaleY}
            stroke="#ef4444" strokeWidth={1.5} />
          <text x={cx + i * 20} y={baseY - (extHeight + fillH + 0.7) * scaleY}
            textAnchor="middle" fontSize={6} fill="#ef4444">▼</text>
        </g>
      ))}
      {/* Culvert walls */}
      {/* Top slab */}
      <rect
        x={cx - extSpan / 2 * scaleX}
        y={baseY - extHeight * scaleY}
        width={extSpan * scaleX}
        height={t * scaleY}
        fill={wallColor}
      />
      {/* Bottom slab */}
      <rect
        x={cx - extSpan / 2 * scaleX}
        y={baseY - t * scaleY}
        width={extSpan * scaleX}
        height={t * scaleY}
        fill={wallColor}
      />
      {/* Left wall */}
      <rect
        x={cx - extSpan / 2 * scaleX}
        y={baseY - extHeight * scaleY}
        width={t * scaleX}
        height={extHeight * scaleY}
        fill={wallColor}
      />
      {/* Right wall */}
      <rect
        x={cx + span / 2 * scaleX}
        y={baseY - extHeight * scaleY}
        width={t * scaleX}
        height={extHeight * scaleY}
        fill={wallColor}
      />
      {/* Void (opening) */}
      <rect
        x={cx - span / 2 * scaleX}
        y={baseY - (height + t) * scaleY}
        width={span * scaleX}
        height={height * scaleY}
        fill={voidColor}
      />
      {/* Water flow arrow */}
      <text x={cx} y={baseY - (height / 2 + t) * scaleY + 3}
        textAnchor="middle" fontSize={8} fill="#1d4ed8">→ FLOW</text>
      {/* Dimensions */}
      <text x={cx} y={H - 4} textAnchor="middle" fontSize={8} fill="#64748b">
        {span}m × {height}m clear
      </text>
      {/* Rebar hint */}
      <circle cx={cx - extSpan / 2 * scaleX + t * scaleX * 0.3} cy={baseY - extHeight * scaleY + t * scaleY * 0.3} r={2} fill="#f59e0b" />
      <circle cx={cx - extSpan / 2 * scaleX + t * scaleX * 0.7} cy={baseY - extHeight * scaleY + t * scaleY * 0.3} r={2} fill="#f59e0b" />
    </svg>
  );
}

export default function CulvertDesign() {
  const [inp, setInp] = useState<CulvertInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designCulvert> | null>(null);
  const [activeTab, setActiveTab] = useState<'section' | 'utilisation'>('section');
  const { factors } = useBuildingCode();

  const set = (k: keyof CulvertInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Top slab moment', demand: res.Med_topSlab, capacity: res.Med_topSlab / Math.max(res.As_top / (res.As_top * 1.2), 0.01), unit: 'kNm/m', note: 'MEd / MRd (approx)' },
    { label: 'Hydraulic capacity', demand: inp.designFlow, capacity: res.flowCapacity, unit: 'm³/s', note: 'Q / Qcap', invert: true },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card title="Box Culvert Parameters" className="lg:col-span-1">
          <p className="text-xs font-semibold text-slate-500 mb-2">Culvert geometry</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Clear span</label>
                <HelpTooltip title="Internal span" text="Internal clear width of the culvert opening." typical="1.0–5.0 m for typical road culverts" />
              </div>
              <InputField label="" unit="m" value={inp.span} onChange={v => set('span', +v)} min={0.5} step={0.25} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Clear height</label>
                <HelpTooltip title="Internal height" text="Internal clear height of the culvert opening." typical="0.9–3.0 m" />
              </div>
              <InputField label="" unit="m" value={inp.height} onChange={v => set('height', +v)} min={0.5} step={0.25} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Wall/slab thickness</label>
                <HelpTooltip title="Wall thickness" text="Uniform thickness for all walls and slabs." typical="250–400 mm depending on fill depth" />
              </div>
              <InputField label="" unit="mm" value={inp.wallThick} onChange={v => set('wallThick', +v)} min={150} />
            </div>
            <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={40} />
          </div>

          <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Loading</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Fill depth</label>
                <HelpTooltip title="Soil cover depth" text="Depth of fill above top of culvert slab." typical="0.5–5.0 m" />
              </div>
              <InputField label="" unit="m" value={inp.fillDepth} onChange={v => set('fillDepth', +v)} min={0.3} step={0.25} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Fill density</label>
                <HelpTooltip title="Unit weight of fill" text="Unit weight of backfill material." typical="18–20 kN/m³ laterite" />
              </div>
              <InputField label="" unit="kN/m³" value={inp.fillDensity} onChange={v => set('fillDensity', +v)} min={15} max={22} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Traffic surcharge</label>
                <HelpTooltip title="HA equivalent surcharge" text="Equivalent uniformly distributed load from traffic. BS 5400 HA: 10 kN/m² for fill > 2m." typical="10–45 kN/m² depending on fill depth" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} />
            </div>
            <SelectField label="Concrete fck" value={String(inp.fck)}
              onChange={v => set('fck', +v)}
              options={[25, 30, 35, 40].map(f => ({ value: String(f), label: `C${f}/${f + 5}` }))} />
          </div>

          <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Hydraulics</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Design flow</label>
                <HelpTooltip title="Peak discharge" text="Design flood flow (Q10 or Q25 typically for roads). From catchment hydrology." typical="1–20 m³/s" />
              </div>
              <InputField label="" unit="m³/s" value={inp.designFlow} onChange={v => set('designFlow', +v)} min={0} step={0.5} />
            </div>
            <SelectField label="Manning's n" value={String(inp.Manning_n)}
              onChange={v => set('Manning_n', +v)}
              options={[
                { value: '0.011', label: '0.011 (smooth concrete)' },
                { value: '0.013', label: '0.013 (concrete)' },
                { value: '0.016', label: '0.016 (rough concrete)' },
                { value: '0.020', label: '0.020 (masonry)' },
              ]} />
          </div>

          <button onClick={() => setRes(designCulvert(inp, factors))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Culvert
          </button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="External span" value={res.externalSpan.toFixed(2)} unit="m" />
              <ResultRow label="External height" value={res.externalHeight.toFixed(2)} unit="m" />
              <ResultRow label="Earth pressure (top)" value={res.earthPressure.toFixed(1)} unit="kPa" />
              <ResultRow label="Total ULS UDL on top" value={res.totalUDL.toFixed(1)} unit="kPa" highlight />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Design Moments</p>
              <ResultRow label="Top slab (MEd)" value={res.Med_topSlab.toFixed(1)} unit="kNm/m" highlight />
              <ResultRow label="Wall (MEd)" value={res.Med_wall.toFixed(1)} unit="kNm/m" />
              <ResultRow label="Base slab (MEd)" value={res.Med_baseSlab.toFixed(1)} unit="kNm/m" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Reinforcement (d={res.d}mm)</p>
              <ResultRow label="Top slab As,req" value={res.As_top.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Top slab bars" value={`T${res.bars_top.dia}@${res.bars_top.spacing}mm`} highlight />
              <ResultRow label="Wall bars" value={`T${res.bars_wall.dia}@${res.bars_wall.spacing}mm`} />
              <ResultRow label="Base slab bars" value={`T${res.bars_base.dia}@${res.bars_base.spacing}mm`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Hydraulics (Manning)</p>
              <ResultRow label="Flow capacity (full bore)" value={res.flowCapacity.toFixed(2)} unit="m³/s" highlight />
              <ResultRow label="Design flow" value={(inp.designFlow).toFixed(2)} unit="m³/s" />
              <ResultRow label="Velocity" value={res.flowVelocity.toFixed(2)} unit="m/s" />
              <ResultRow label="Hydraulic check" value={res.hydraulicOK ? '✓ Adequate' : '✗ Undersize'} />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <SaveDesignPanel memberType="foundation"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🌊</p>
              <p className="text-sm font-semibold text-slate-600">RC box culvert</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">Structural design (frame analysis) + hydraulic capacity check (Manning's equation). Enter parameters and design.</p>
            </div>
          )}
        </Card>

        <Card title="Cross-Section & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['section', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'section' ? 'Cross-Section' : 'Key Checks'}
              </button>
            ))}
          </div>
          {activeTab === 'section' && (
            <>
              <CulvertSVG span={inp.span} height={inp.height} wallThick={inp.wallThick} fillDepth={inp.fillDepth} />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-slate-600" /><span className="text-slate-500">RC walls / slab ({inp.wallThick}mm)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-blue-200" /><span className="text-slate-500">Waterway opening</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-amber-300" /><span className="text-slate-500">Backfill ({inp.fillDepth}m)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Design checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
