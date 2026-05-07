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
import { designPortalFrame, PORTAL_SECTIONS } from '../../utils/portalFrameCalculations';
import type { PortalFrameInputs } from '../../utils/portalFrameCalculations';

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
function FrameElevationSVG({ span, height, pitch, base, utilRafter, utilCol }:
  { span: number; height: number; pitch: number; base: 'pinned' | 'fixed'; utilRafter: number; utilCol: number }) {
  const W = 280, H = 200, pad = 20;
  const rise = (span / 2) * Math.tan(pitch * Math.PI / 180);
  const maxH = height + rise;

  const scaleX = (W - 2 * pad) / span;
  const scaleY = (H - 2 * pad - 20) / maxH;

  const toSVG = (x: number, y: number) => [pad + x * scaleX, H - pad - 20 - y * scaleY];

  const [lx, ly] = toSVG(0, 0);
  const [rx, ry] = toSVG(span, 0);
  const [lEx, lEy] = toSVG(0, height);
  const [rEx, rEy] = toSVG(span, height);
  const [ridgeX, ridgeY] = toSVG(span / 2, height + rise);

  const rColor = utilRafter > 1 ? '#ef4444' : utilRafter > 0.85 ? '#f59e0b' : '#22c55e';
  const cColor = utilCol > 1 ? '#ef4444' : utilCol > 0.85 ? '#f59e0b' : '#22c55e';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Ground line */}
      <line x1={pad - 5} y1={H - pad - 20} x2={W - pad + 5} y2={H - pad - 20} stroke="#94a3b8" strokeWidth={1} />
      {/* Columns */}
      <line x1={lx} y1={ly} x2={lEx} y2={lEy} stroke={cColor} strokeWidth={4} strokeLinecap="round" />
      <line x1={rx} y1={ry} x2={rEx} y2={rEy} stroke={cColor} strokeWidth={4} strokeLinecap="round" />
      {/* Rafters */}
      <line x1={lEx} y1={lEy} x2={ridgeX} y2={ridgeY} stroke={rColor} strokeWidth={3} strokeLinecap="round" />
      <line x1={rEx} y1={rEy} x2={ridgeX} y2={ridgeY} stroke={rColor} strokeWidth={3} strokeLinecap="round" />
      {/* Haunch hint */}
      <circle cx={lEx} cy={lEy} r={5} fill="#3b82f6" />
      <circle cx={rEx} cy={rEy} r={5} fill="#3b82f6" />
      <circle cx={ridgeX} cy={ridgeY} r={4} fill="#3b82f6" />
      {/* Bases */}
      {base === 'pinned' ? (
        <>
          <polygon points={`${lx},${ly} ${lx - 6},${ly + 10} ${lx + 6},${ly + 10}`} fill="#475569" />
          <polygon points={`${rx},${ry} ${rx - 6},${ry + 10} ${rx + 6},${ry + 10}`} fill="#475569" />
        </>
      ) : (
        <>
          <rect x={lx - 10} y={ly} width={20} height={8} fill="#475569" />
          <rect x={rx - 10} y={ry} width={20} height={8} fill="#475569" />
        </>
      )}
      {/* Dimensions */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={8} fill="#64748b">span = {span} m</text>
      <text x={pad - 3} y={(lEy + ly) / 2} textAnchor="end" fontSize={7} fill="#64748b"
        transform={`rotate(-90,${pad - 3},${(lEy + ly) / 2})`}>{height} m</text>
      {/* Colour key */}
      <rect x={W - 80} y={8} width={10} height={6} rx={1} fill={cColor} />
      <text x={W - 67} y={14} fontSize={7} fill="#475569">Column {(utilCol * 100).toFixed(0)}%</text>
      <rect x={W - 80} y={18} width={10} height={4} rx={1} fill={rColor} />
      <text x={W - 67} y={24} fontSize={7} fill="#475569">Rafter {(utilRafter * 100).toFixed(0)}%</text>
    </svg>
  );
}

export default function PortalFrame() {
  const [inp, setInp] = useState<PortalFrameInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designPortalFrame> | null>(null);
  const [activeTab, setActiveTab] = useState<'frame' | 'utilisation'>('frame');

  const set = (k: keyof PortalFrameInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Rafter bending (LTB)', demand: res.Med_rafter, capacity: res.McRd_rafter, unit: 'kNm', note: `χLT × Mpl,Rd` },
    { label: 'Column interaction', demand: res.util_col, capacity: 1.0, unit: '', note: 'M/McRd + N/NcRd' },
    { label: 'Sway stability', demand: res.swayRatio, capacity: 1.0, unit: '', note: 'δ / (h/250)' },
  ] : [];

  const sections = PORTAL_SECTIONS.map(s => ({ value: s.name, label: s.name }));

  return (
    <div className="space-y-3">
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
          <button onClick={() => setRes(designPortalFrame(inp))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Portal Frame
          </button>
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
