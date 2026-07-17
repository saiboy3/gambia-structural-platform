import { useState } from 'react';
import { Layers } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { designPortalFrame, PORTAL_SECTIONS } from '../../utils/portalFrameCalculations';
import type { PortalFrameInputs } from '../../utils/portalFrameCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import CalcSheet from '../ui/CalcSheet';
import { portalFrameCalcNotes } from '../../utils/calcNotesSteel';
import ReportButton from '../report/ReportButton';
import { buildPortalFrameReport } from '../../utils/reportBuildersSteel';

const defaultInp: PortalFrameInputs = {
  span: 18,
  height: 5,
  pitch: 6,
  spacing: 6,
  base: 'pinned',
  rafterSection: 'UB 457×191×67',
  columnSection: 'UC 254×254×73',
  fyk: 275,
  roofDL: 0.35,
  roofLL: 0.6,
  windPressure: 0.8,
  lateralRestraint: 'intermediate',
};

// ── Frame elevation SVG ───────────────────────────────────────────────────────
function FrameElevationSVG({ span, height, pitch, base, utilRafter, utilCol, spacing, wEd }:
  { span: number; height: number; pitch: number; base: 'pinned' | 'fixed';
    utilRafter: number; utilCol: number; spacing: number; wEd: number }) {
  const W = 300, H = 220, padL = 38, padB = 42, padT = 30;
  const rise = (span / 2) * Math.tan(pitch * Math.PI / 180);
  const maxH = height + rise;

  const scaleX = (W - padL - 18) / span;
  const scaleY = (H - padB - padT) / maxH;

  const toSVG = (x: number, y: number): [number, number] =>
    [padL + x * scaleX, H - padB - y * scaleY];

  const [lx, ly] = toSVG(0, 0);
  const [rx] = toSVG(span, 0);
  const ry = ly;
  const [lEx, lEy] = toSVG(0, height);
  const [rEx, rEy] = toSVG(span, height);
  const [ridgeX, ridgeY] = toSVG(span / 2, height + rise);
  const groundY = ly;

  const rColor = utilRafter > 1 ? '#dc2626' : utilRafter > 0.85 ? '#f59e0b' : '#16a34a';
  const cColor = utilCol > 1 ? '#dc2626' : utilCol > 0.85 ? '#f59e0b' : '#16a34a';

  // Rafter member depth indicator (drawn as thick polyline with width)
  const rafterThick = 5;
  const colThick = 6;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full bg-white border border-slate-100 rounded-lg">
      <defs>
        <marker id="pfrDimA" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
        <marker id="pfrDimB" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
        <marker id="pfrLoad" markerWidth={5} markerHeight={5} refX={2.5} refY={5} orient="auto">
          <path d="M0,0 L2.5,5 L5,0 Z" fill="#3b82f6" />
        </marker>
        <marker id="pfrWind" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#8b5cf6" />
        </marker>
      </defs>

      {/* Sky background (subtle gradient suggestion) */}
      <rect x={0} y={0} width={W} height={groundY} fill="#f8fafc" />

      {/* Ground */}
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#6b7280" strokeWidth={2} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 24} y1={groundY} x2={i * 24 - 10} y2={groundY + 10}
          stroke="#6b7280" strokeWidth={1} strokeOpacity={0.4} />
      ))}

      {/* ── UDL on rafters ── */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i + 0.5) / 8;
        const [ax, ay] = toSVG(t * span / 2, height + t * rise);
        const [bx, by] = toSVG(span - t * span / 2, height + t * rise);
        const perpOffset = 14;
        return (
          <g key={i}>
            <line x1={ax} y1={ay - perpOffset} x2={ax} y2={ay - 2}
              stroke="#3b82f6" strokeWidth={1} markerEnd="url(#pfrLoad)" />
            <line x1={bx} y1={by - perpOffset} x2={bx} y2={by - 2}
              stroke="#3b82f6" strokeWidth={1} markerEnd="url(#pfrLoad)" />
          </g>
        );
      })}
      <text x={ridgeX} y={ridgeY - 18} textAnchor="middle" fontSize={7.5} fill="#2563eb" fontWeight="700">
        wEd = {wEd.toFixed(1)} kN/m²
      </text>

      {/* Wind on left column */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const [wx, wy] = toSVG(0, t * height);
        return (
          <line key={i} x1={wx - 22} y1={wy} x2={wx - 2} y2={wy}
            stroke="#8b5cf6" strokeWidth={1.2} markerEnd="url(#pfrWind)" />
        );
      })}
      <text x={lx - 24} y={(ly + lEy) / 2 - 6} textAnchor="middle" fontSize={6.5} fill="#7c3aed">wind</text>

      {/* ── Columns (drawn as thick line with colour) ── */}
      <line x1={lx} y1={ly} x2={lEx} y2={lEy}
        stroke={cColor} strokeWidth={colThick + 2} strokeLinecap="butt" strokeOpacity={0.25} />
      <line x1={lx} y1={ly} x2={lEx} y2={lEy}
        stroke={cColor} strokeWidth={colThick} strokeLinecap="butt" />
      <line x1={rx} y1={ry} x2={rEx} y2={rEy}
        stroke={cColor} strokeWidth={colThick + 2} strokeLinecap="butt" strokeOpacity={0.25} />
      <line x1={rx} y1={ry} x2={rEx} y2={rEy}
        stroke={cColor} strokeWidth={colThick} strokeLinecap="butt" />

      {/* ── Rafters ── */}
      <line x1={lEx} y1={lEy} x2={ridgeX} y2={ridgeY}
        stroke={rColor} strokeWidth={rafterThick + 2} strokeLinecap="round" strokeOpacity={0.25} />
      <line x1={lEx} y1={lEy} x2={ridgeX} y2={ridgeY}
        stroke={rColor} strokeWidth={rafterThick} strokeLinecap="round" />
      <line x1={rEx} y1={rEy} x2={ridgeX} y2={ridgeY}
        stroke={rColor} strokeWidth={rafterThick + 2} strokeLinecap="round" strokeOpacity={0.25} />
      <line x1={rEx} y1={rEy} x2={ridgeX} y2={ridgeY}
        stroke={rColor} strokeWidth={rafterThick} strokeLinecap="round" />

      {/* ── Haunches (triangular gusset at eaves) ── */}
      {[[lEx, lEy], [rEx, rEy]].map(([ex, ey], i) => {
        const haunchL = Math.min(1.5 * scaleX, 20);
        return (
          <polygon key={i}
            points={`${ex},${ey} ${ex + (i === 0 ? haunchL : -haunchL)},${ey} ${ex},${ey - haunchL * 0.5}`}
            fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={0.8} />
        );
      })}

      {/* ── Joints ── */}
      <circle cx={lEx} cy={lEy} r={5.5} fill="white" stroke="#3b82f6" strokeWidth={2} />
      <circle cx={rEx} cy={rEy} r={5.5} fill="white" stroke="#3b82f6" strokeWidth={2} />
      <circle cx={ridgeX} cy={ridgeY} r={4.5} fill="white" stroke="#3b82f6" strokeWidth={2} />

      {/* ── Base conditions ── */}
      {base === 'pinned' ? (
        <>
          {[lx, rx].map((bx, i) => (
            <g key={i}>
              <polygon points={`${bx},${groundY} ${bx - 8},${groundY + 13} ${bx + 8},${groundY + 13}`} fill="#334155" />
              <line x1={bx - 11} y1={groundY + 15} x2={bx + 11} y2={groundY + 15} stroke="#334155" strokeWidth={2} />
              {[-8,-3,2,7].map(d => (
                <line key={d} x1={bx - 11 + d + 2} y1={groundY + 15}
                  x2={bx - 11 + d - 2} y2={groundY + 20} stroke="#334155" strokeWidth={0.8} />
              ))}
            </g>
          ))}
        </>
      ) : (
        <>
          {[lx, rx].map((bx, i) => (
            <g key={i}>
              <rect x={bx - 12} y={groundY - 2} width={24} height={14} fill="#334155" rx={1} />
              <rect x={bx - 16} y={groundY + 12} width={32} height={6} fill="#475569" />
              {[-12,-6,0,6].map(d => (
                <line key={d} x1={bx + d} y1={groundY + 18}
                  x2={bx + d - 4} y2={groundY + 24} stroke="#334155" strokeWidth={0.8} />
              ))}
            </g>
          ))}
        </>
      )}

      {/* ── Dimension leaders ── */}
      {/* Span */}
      <line x1={lx} y1={groundY + 24} x2={rx} y2={groundY + 24}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#pfrDimA)" markerStart="url(#pfrDimB)" />
      <line x1={lx} y1={groundY + 20} x2={lx} y2={groundY + 28} stroke="#64748b" strokeWidth={0.8} />
      <line x1={rx} y1={groundY + 20} x2={rx} y2={groundY + 28} stroke="#64748b" strokeWidth={0.8} />
      <text x={(lx + rx) / 2} y={groundY + 34} textAnchor="middle" fontSize={8} fill="#475569" fontWeight="700">
        span = {span} m
      </text>

      {/* Eaves height */}
      <line x1={lx - 22} y1={groundY} x2={lx - 22} y2={lEy}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#pfrDimA)" markerStart="url(#pfrDimB)" />
      <text x={lx - 24} y={(groundY + lEy) / 2} fontSize={8} fill="#475569" fontWeight="700"
        transform={`rotate(-90,${lx - 24},${(groundY + lEy) / 2})`} textAnchor="middle">
        h={height}m
      </text>

      {/* Rise */}
      <line x1={ridgeX + 10} y1={lEy} x2={ridgeX + 10} y2={ridgeY}
        stroke="#94a3b8" strokeWidth={0.6} markerEnd="url(#pfrDimA)" markerStart="url(#pfrDimB)" />
      <text x={ridgeX + 14} y={(lEy + ridgeY) / 2 + 3} fontSize={7} fill="#94a3b8">
        {rise.toFixed(1)}m
      </text>

      {/* Pitch label */}
      <text x={ridgeX} y={ridgeY + 12} textAnchor="middle" fontSize={7} fill="#64748b">
        {pitch}° pitch
      </text>

      {/* Spacing note */}
      <text x={W - 4} y={padT + 10} textAnchor="end" fontSize={7} fill="#64748b">@ {spacing}m c/c</text>

      {/* ── Utilisation key ── */}
      <rect x={W - 92} y={padT - 2} width={88} height={52} rx={4} fill="white" stroke="#e2e8f0" fillOpacity={0.95} />
      <text x={W - 48} y={padT + 10} textAnchor="middle" fontSize={7.5} fill="#374151" fontWeight="700">Utilisation</text>
      <rect x={W - 88} y={padT + 14} width={12} height={7} rx={1} fill={cColor} />
      <text x={W - 73} y={padT + 21} fontSize={7.5} fill="#374151">
        Column {(utilCol * 100).toFixed(0)}%
      </text>
      <rect x={W - 88} y={padT + 25} width={12} height={5} rx={1} fill={rColor} />
      <text x={W - 73} y={padT + 31} fontSize={7.5} fill="#374151">
        Rafter {(utilRafter * 100).toFixed(0)}%
      </text>
      <circle cx={W - 82} cy={padT + 41} r={4} fill="white" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={W - 73} y={padT + 44} fontSize={7.5} fill="#374151">Haunch joint</text>
    </svg>
  );
}

export default function PortalFrame() {
  const [inp, setInp] = useState<PortalFrameInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designPortalFrame> | null>(null);
  const [activeTab, setActiveTab] = useState<'frame' | 'utilisation'>('frame');
  const { factors } = useBuildingCode();

  const set = (k: keyof PortalFrameInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Rafter bending (LTB)', demand: res.Med_rafter, capacity: res.McRd_rafter, unit: 'kNm', note: `χLT × Mpl,Rd`,
      hint: 'Lateral-torsional buckling governs. Add intermediate purlins as restraints, or upsize the rafter section.' },
    { label: 'Column interaction', demand: res.util_col, capacity: 1.0, unit: '', note: 'M/McRd + N/NcRd',
      hint: 'Combined bending and axial load exceeds capacity. Upsize the column section or add a haunch at the eaves.' },
    { label: 'Sway stability', demand: res.swayRatio, capacity: 1.0, unit: '', note: 'δ / (h/250)',
      hint: 'Frame sways excessively under lateral load. Add diagonal bracing, use fixed bases, or increase column stiffness.' },
  ] : [];

  const sections = PORTAL_SECTIONS.map(s => ({ value: s.name, label: s.name }));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-600 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Layers size={22} />
          <h1 className="text-xl font-bold">Steel Portal Frame</h1>
        </div>
        <p className="text-slate-200 text-sm">Rafter and column design for single-bay steel portal frames to EC3</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Portal Frame Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Bay span</label>
                <HelpTooltip title="Frame span" text="Column CL to column CL. Single-bay portal." typical="12–30 m for industrial buildings" />
              </div>
              <InputField label="" unit="m" value={inp.span} onChange={v => set('span', +v)} min={6} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Eaves height</label>
                <HelpTooltip title="Eaves height" text="Column base to rafter underside at eaves." typical="4–8 m for commercial warehouses" />
              </div>
              <InputField label="" unit="m" value={inp.height} onChange={v => set('height', +v)} min={3} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Roof pitch</label>
                <HelpTooltip title="Roof pitch" text="Angle from horizontal. Affects rafter length and thrust." typical="5–15° for portal frames" />
              </div>
              <InputField label="" unit="°" value={inp.pitch} onChange={v => set('pitch', +v)} min={3} max={30} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Frame spacing</label>
                <HelpTooltip title="Bay length" text="Distance between frames along the building." typical="5–8 m" />
              </div>
              <InputField label="" unit="m" value={inp.spacing} onChange={v => set('spacing', +v)} min={3} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Roof dead load</label>
                <HelpTooltip title="Dead load" text="Cladding + purlins + services. Excludes steel frame self-weight." typical="0.25–0.50 kN/m² profiled sheet" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.roofDL} onChange={v => set('roofDL', +v)} min={0} step={0.05} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Roof live load</label>
                <HelpTooltip title="Imposed / maintenance" text="Maintenance load on roof. EC1 1.1 kN/m² or 0.6 kN/m² for inaccessible roof." typical="0.6 kN/m²" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.roofLL} onChange={v => set('roofLL', +v)} min={0} step={0.1} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Wind pressure</label>
                <HelpTooltip title="Design wind" text="Horizontal wind pressure on cladding. Governs sway check." typical="0.5–1.2 kN/m² in Gambia" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.windPressure} onChange={v => set('windPressure', +v)} min={0} step={0.1} />
            </div>
            <SelectField label="Steel grade (fyk)" value={String(inp.fyk)}
              onChange={v => set('fyk', +v)}
              options={[{ value: '275', label: 'S275 (275 MPa)' }, { value: '355', label: 'S355 (355 MPa)' }]} />
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Column base condition</p>
              <div className="grid grid-cols-2 gap-1">
                {([['pinned', 'Pinned (moment-free)'], ['fixed', 'Fixed (moment base)']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => set('base', v)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-all
                      ${inp.base === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Rafter lateral restraint</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ['full', 'Full', 'χLT=1'],
                  ['intermediate', 'Purlins', 'χLT≈0.85'],
                  ['none', 'None', 'LTB calc'],
                ] as const).map(([v, l, n]) => (
                  <button key={v} onClick={() => set('lateralRestraint', v)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-all
                      ${inp.lateralRestraint === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                    <div>{l}</div>
                    <div className={`text-[10px] ${inp.lateralRestraint === v ? 'text-blue-100' : 'text-slate-400'}`}>{n}</div>
                  </button>
                ))}
              </div>
            </div>
            <SelectField label="Rafter section" value={inp.rafterSection}
              onChange={v => set('rafterSection', v)} options={sections} />
            <SelectField label="Column section" value={inp.columnSection}
              onChange={v => set('columnSection', v)} options={sections} />
          </div>
          <Button onClick={() => setRes(designPortalFrame(inp))} fullWidth className="mt-4">
            Design Portal Frame
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Rafter length (per side)" value={res.rafterLength.toFixed(2)} unit="m" />
              <ResultRow label="Design load (wEd)" value={res.wEd_rafter.toFixed(2)} unit="kN/m rafter" />
              <ResultRow label="Horizontal thrust (H)" value={res.HEd.toFixed(1)} unit="kN" highlight />
              <ResultRow label="Vertical reaction (V)" value={res.VEd_col.toFixed(1)} unit="kN" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Rafter — {inp.rafterSection}</p>
              <ResultRow label="MEd" value={res.Med_rafter.toFixed(1)} unit="kNm" />
              <ResultRow label="MbRd (with LTB)" value={res.McRd_rafter.toFixed(1)} unit="kNm" />
              <ResultRow label="Utilisation" value={`${(res.util_rafter * 100).toFixed(0)}%`} highlight />
              <ResultRow label="LTB check" value={res.LTB_rafter === 'pass' ? '✓ Pass' : res.LTB_rafter === 'warn' ? '⚠ Borderline' : '✗ Fail'} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Column — {inp.columnSection}</p>
              <ResultRow label="MEd" value={res.Med_col.toFixed(1)} unit="kNm" />
              <ResultRow label="McRd" value={res.McRd_col.toFixed(1)} unit="kNm" />
              <ResultRow label="NEd" value={res.NEd_col.toFixed(1)} unit="kN" />
              <ResultRow label="NcRd" value={res.NcRd_col.toFixed(1)} unit="kN" />
              <ResultRow label="Interaction" value={`${(res.util_col * 100).toFixed(0)}%`} highlight />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Sway Stability</p>
              <ResultRow label="δ / (h/250)" value={`${(res.swayRatio * 100).toFixed(0)}%`} />
              <ResultRow label="Sway" value={res.swayOK ? '✓ Pass' : '✗ Fail — stiffen columns'} />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Portal Frame Calculation Sheet"
                codeLabel={factors.label}
                steps={portalFrameCalcNotes(inp, res, factors)}
              />
              <div className="mt-3 flex justify-end">
                <ReportButton data={buildPortalFrameReport(inp, res, factors)} />
              </div>
              <SaveDesignPanel memberType="beam"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🏭</p>
              <p className="text-sm font-semibold text-slate-600">Steel portal frame</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">Single-bay symmetric frame. Checks rafter bending (with LTB), column interaction, and sway stability per EC3.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Frame View & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['frame', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'frame' ? 'Frame Elevation' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'frame' && (
            <>
              <FrameElevationSVG
                span={inp.span} height={inp.height} pitch={inp.pitch} base={inp.base}
                utilRafter={res?.util_rafter ?? 0} utilCol={res?.util_col ?? 0}
                spacing={inp.spacing} wEd={res?.wEd_rafter ?? (inp.roofDL + inp.roofLL) * inp.spacing}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-1.5 rounded bg-emerald-500" /><span className="text-slate-500">&lt; 85% utilised</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-1.5 rounded bg-amber-400" /><span className="text-slate-500">85–100% (borderline)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-1.5 rounded bg-red-500" /><span className="text-slate-500">&gt; 100% (fail)</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-slate-500">Joints (haunch / ridge)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Frame checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
