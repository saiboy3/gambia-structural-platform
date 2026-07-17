import { useState } from 'react';
import { Link2 } from 'lucide-react';
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
import { designConnection } from '../../utils/steelConnectionCalculations';
import type { ConnectionInputs, ConnectionType } from '../../utils/steelConnectionCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import CalcSheet from '../ui/CalcSheet';
import { steelConnectionCalcNotes } from '../../utils/calcNotesSteel';
import ReportButton from '../report/ReportButton';
import { buildSteelConnectionReport } from '../../utils/reportBuildersSteel';

const defaultInp: ConnectionInputs = {
  type: 'end-plate',
  Ved: 120,
  Ned: 0,
  Med: 30,
  plateFy: 275,
  plateThickness: 12,
  plateWidth: 150,
  plateHeight: 300,
  bolt: { diameter: 20, grade: '8.8', rows: 4, cols: 1 },
  fck_grout: 25,
  columnFy: 275,
  columnA: 68.4,
};

const CONNECTION_INFO: Record<ConnectionType, { label: string; note: string; icon: string }> = {
  'end-plate':  { label: 'End Plate',  note: 'Beam-to-column moment/shear connection. Most common in portal frames.', icon: '▪' },
  'base-plate': { label: 'Base Plate', note: 'Column to foundation. Checks bearing on grout/concrete pad.', icon: '▬' },
  'fin-plate':  { label: 'Fin Plate',  note: 'Simple shear-only beam end connection. Easy to fabricate.', icon: '▫' },
};

// ── Connection sketch SVG ───────────────────────────────────────────────────
function ConnectionSVG({ type, plateW, plateH, boltRows, boltCols, boltDia }:
  { type: ConnectionType; plateW: number; plateH: number; boltRows: number; boltCols: number; boltDia: number }) {
  const W = 260, H = 200;
  const cx = W / 2, cy = H / 2;
  const scale = Math.min((W * 0.4) / plateW, (H * 0.6) / plateH);
  const pW = plateW * scale, pH = plateH * scale;

  if (type === 'base-plate') {
    const colW = pW * 0.4, colH = pH * 0.5;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Foundation block */}
        <rect x={cx - pW * 0.7} y={cy + pH * 0.4} width={pW * 1.4} height={30} fill="#d4a373" rx={2} />
        <text x={cx} y={cy + pH * 0.4 + 20} textAnchor="middle" fontSize={7} fill="#78350f">Concrete pad</text>
        {/* Base plate */}
        <rect x={cx - pW / 2} y={cy + pH * 0.1} width={pW} height={pH * 0.3} fill="#64748b" />
        {/* Column stub */}
        <rect x={cx - colW / 2} y={cy - colH * 0.5} width={colW} height={pH * 0.6 + colH * 0.5} fill="#475569" />
        {/* Bolts (anchor) */}
        {[[-1, 1], [1, 1]].map(([bx, _by], i) => (
          <line key={i}
            x1={cx + bx * pW * 0.35} y1={cy + pH * 0.1}
            x2={cx + bx * pW * 0.35} y2={cy + pH * 0.4 + 20}
            stroke="#f59e0b" strokeWidth={3} />
        ))}
        <text x={cx} y={cy - colH * 0.5 - 6} textAnchor="middle" fontSize={8} fill="#475569">Column</text>
        <text x={cx} y={cy + pH * 0.25 + 6} textAnchor="middle" fontSize={7} fill="white">Base plate {plateW}×{plateH}</text>
      </svg>
    );
  }

  if (type === 'fin-plate') {
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Column (vertical) */}
        <rect x={20} y={20} width={30} height={H - 40} fill="#475569" />
        {/* Fin plate */}
        <rect x={50} y={cy - pH / 2} width={pW * 0.6} height={pH} fill="#64748b" />
        {/* Beam */}
        <rect x={50 + pW * 0.6} y={cy - 12} width={W - 90 - pW * 0.6} height={24} fill="#475569" />
        {/* Bolts */}
        {Array.from({ length: boltRows }).map((_, i) => (
          <circle key={i}
            cx={50 + pW * 0.3}
            cy={cy - pH / 2 + (i + 1) * pH / (boltRows + 1)}
            r={boltDia * scale * 0.4} fill="#f59e0b" />
        ))}
        <text x={cx + 20} y={H - 10} textAnchor="middle" fontSize={8} fill="#475569">Fin plate (shear only)</text>
      </svg>
    );
  }

  // End plate
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Column (vertical) */}
      <rect x={20} y={20} width={28} height={H - 40} fill="#475569" />
      {/* End plate */}
      <rect x={48} y={cy - pH / 2} width={plateW * scale * 0.4} height={pH} fill="#64748b" />
      {/* Beam */}
      <rect x={48 + plateW * scale * 0.4} y={cy - 14} width={W - 80} height={28} fill="#475569" />
      {/* Bolts */}
      {Array.from({ length: boltRows }).map((_, i) =>
        Array.from({ length: boltCols }).map((_, j) => (
          <circle key={`${i}-${j}`}
            cx={54 + j * 24}
            cy={cy - pH / 2 + (i + 1) * pH / (boltRows + 1)}
            r={Math.max(3, boltDia * scale * 0.3)} fill="#f59e0b" />
        ))
      )}
      {/* Weld hint */}
      <line x1={48 + plateW * scale * 0.4} y1={cy - 14}
        x2={48 + plateW * scale * 0.4} y2={cy + 14} stroke="#ef4444" strokeWidth={2} strokeDasharray="3,2" />
      <text x={cx + 30} y={H - 10} textAnchor="middle" fontSize={7} fill="#475569">End plate {plateW}×{plateH} mm</text>
    </svg>
  );
}

export default function SteelConnection() {
  const [inp, setInp] = useState<ConnectionInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designConnection> | null>(null);
  const [activeTab, setActiveTab] = useState<'sketch' | 'utilisation'>('sketch');
  const { factors } = useBuildingCode();

  const set = (k: keyof ConnectionInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));
  const setBolt = (k: keyof ConnectionInputs['bolt'], v: unknown) =>
    setInp(p => ({ ...p, bolt: { ...p.bolt, [k]: v } }));

  const checks: UtilCheck[] = res ? [
    { label: 'Bolt shear', demand: res.util_bolt_shear, capacity: 1.0, note: 'FvEd / FvRd',
      hint: 'Use a larger bolt diameter (M20→M24) or increase the bolt count in the group.' },
    { label: 'Bolt tension', demand: res.util_bolt_tension, capacity: 1.0, note: 'FtEd / FtRd',
      hint: 'Increase bolt grade (8.8→10.9) or add more bolt rows to reduce tension per bolt.' },
    { label: 'Plate shear', demand: res.util_plate_shear, capacity: 1.0, note: 'VEd / Vpl,Rd',
      hint: 'Increase plate thickness or use a wider plate to raise the shear area.' },
    { label: 'Block shear', demand: res.util_block, capacity: 1.0, note: 'VEd / VbsRd',
      hint: 'Increase bolt gauge (horizontal spacing) or add bolt rows to enlarge the shear-out path.' },
    ...(inp.type === 'base-plate' ? [{ label: 'Bearing on grout', demand: res.bearing_stress, capacity: res.bearing_limit, unit: 'MPa', note: 'σ / 0.67fck',
      hint: 'Stress under base plate exceeds grout capacity. Increase plate dimensions or use higher-strength grout.' }] : []),
    ...(inp.type === 'base-plate' ? [{ label: 'Column squash capacity', demand: Math.abs(inp.Ned), capacity: res.NcRd_column, unit: 'kN', note: 'NEd / Nc,Rd',
      hint: 'Axial load into the base plate exceeds the column shaft capacity. Increase column section.' }] : []),
  ] : [];

  const needsMoment = inp.type === 'end-plate';
  const needsBearing = inp.type === 'base-plate';

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-600 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Link2 size={22} />
          <h1 className="text-xl font-bold">Steel Connections</h1>
        </div>
        <p className="text-slate-200 text-sm">Bolted and welded connection design for moment, shear and splice connections to EC3-1-8</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Connection Parameters" className="lg:col-span-1">
          {/* Type picker */}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-1.5">Connection type</p>
            <div className="space-y-1.5">
              {(Object.entries(CONNECTION_INFO) as [ConnectionType, typeof CONNECTION_INFO[ConnectionType]][]).map(([key, info]) => (
                <button key={key} onClick={() => set('type', key)}
                  className={`w-full py-2 px-3 rounded-lg border text-left transition-all
                    ${inp.type === key ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}>
                  <span className={`text-xs font-semibold ${inp.type === key ? 'text-white' : 'text-slate-700'}`}>{info.label}</span>
                  <span className={`text-[10px] ml-2 ${inp.type === key ? 'text-blue-100' : 'text-slate-400'}`}>{info.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loads */}
          <p className="text-xs font-semibold text-slate-500 mb-2">Design Loads (ULS)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Shear (VEd)</label>
                <HelpTooltip title="Design shear" text="Vertical shear force at the connection. Always required." typical="50–500 kN" />
              </div>
              <InputField label="" unit="kN" value={inp.Ved} onChange={v => set('Ved', +v)} min={0} />
            </div>
            {needsMoment && (
              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Moment (MEd)</label>
                  <HelpTooltip title="Design moment" text="Applied moment (for end plates in moment frames). Causes bolt tension in top row." typical="0–100 kNm" />
                </div>
                <InputField label="" unit="kNm" value={inp.Med} onChange={v => set('Med', +v)} min={0} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Axial (NEd)</label>
                <HelpTooltip title="Axial force" text="Tension (+) or compression (-). Often 0 for simple connections." typical="0 for simple, or wind axial" />
              </div>
              <InputField label="" unit="kN" value={inp.Ned} onChange={v => set('Ned', +v)} />
            </div>

            {/* Plate */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Plate Geometry</p>
            </div>
            <InputField label="Plate thickness" unit="mm" value={inp.plateThickness} onChange={v => set('plateThickness', +v)} min={8} />
            <InputField label="Plate width" unit="mm" value={inp.plateWidth} onChange={v => set('plateWidth', +v)} min={80} />
            <InputField label="Plate height" unit="mm" value={inp.plateHeight} onChange={v => set('plateHeight', +v)} min={100} />
            <SelectField label="Plate grade" value={String(inp.plateFy)}
              onChange={v => set('plateFy', +v)}
              options={[{ value: '275', label: 'S275' }, { value: '355', label: 'S355' }]} />

            {/* Bolts */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Bolt Group</p>
            </div>
            <SelectField label="Bolt diameter" value={String(inp.bolt.diameter)}
              onChange={v => setBolt('diameter', +v)}
              options={[{ value: '16', label: 'M16' }, { value: '20', label: 'M20' }, { value: '24', label: 'M24' }]} />
            <SelectField label="Grade" value={inp.bolt.grade}
              onChange={v => setBolt('grade', v)}
              options={[{ value: '8.8', label: '8.8' }, { value: '10.9', label: '10.9' }]} />
            <InputField label="Rows" value={inp.bolt.rows} onChange={v => setBolt('rows', Math.max(1, +v))} min={1} max={8} />
            <InputField label="Columns" value={inp.bolt.cols} onChange={v => setBolt('cols', Math.max(1, +v))} min={1} max={4} />

            {needsBearing && (
              <>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Base / Grout</p>
                </div>
                <SelectField label="Grout/concrete fck" value={String(inp.fck_grout)}
                  onChange={v => set('fck_grout', +v)}
                  options={[20, 25, 30].map(f => ({ value: String(f), label: `C${f}/${f + 5}` }))} />

                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5 mt-1">Column (for squash capacity check)</p>
                </div>
                <SelectField label="Column steel grade" value={String(inp.columnFy)}
                  onChange={v => set('columnFy', +v)}
                  options={[{ value: '275', label: 'S275' }, { value: '355', label: 'S355' }]} />
                <div>
                  <div className="flex items-center gap-0.5">
                    <label className="text-xs font-medium text-slate-600">Column section area</label>
                    <HelpTooltip title="Column cross-section area" text="Gross area of the column shaft, used to check the base plate axial load doesn't exceed the column's own squash capacity." typical="30–130 cm² for typical UB/UC sections" />
                  </div>
                  <InputField label="" unit="cm²" value={inp.columnA} onChange={v => set('columnA', +v)} min={10} />
                </div>
              </>
            )}
          </div>
          <Button onClick={() => setRes(designConnection(inp))} fullWidth className="mt-4">
            Check Connection
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Bolt Group — {res.nBolts}×M{inp.bolt.diameter}/{inp.bolt.grade}</p>
              <ResultRow label="FvRd per bolt" value={res.FvRd.toFixed(1)} unit="kN" />
              <ResultRow label="FtRd per bolt" value={res.FtRd.toFixed(1)} unit="kN" />
              <ResultRow label="Shear utilisation" value={`${(res.util_bolt_shear * 100).toFixed(0)}%`} highlight />
              <ResultRow label="Tension utilisation" value={`${(res.util_bolt_tension * 100).toFixed(0)}%`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Plate</p>
              <ResultRow label="Shear area (Av)" value={res.Av_plate.toFixed(0)} unit="mm²" />
              <ResultRow label="Vpl,Rd" value={res.VplRd_plate.toFixed(1)} unit="kN" />
              <ResultRow label="Plate shear" value={`${(res.util_plate_shear * 100).toFixed(0)}%`} highlight />
              <ResultRow label="Block shear VbsRd" value={res.VbsRd.toFixed(1)} unit="kN" />
              <ResultRow label="Block shear util." value={`${(res.util_block * 100).toFixed(0)}%`} />

              {needsBearing && (
                <>
                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Base Bearing</p>
                  <ResultRow label="Bearing stress" value={res.bearing_stress.toFixed(2)} unit="MPa" highlight />
                  <ResultRow label="Limit (0.67×fck)" value={res.bearing_limit.toFixed(2)} unit="MPa" />
                  <ResultRow label="Bearing" value={res.bearingOK ? '✓ Pass' : '✗ Fail'} />

                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Column Squash Capacity</p>
                  <ResultRow label="Nc,Rd (column)" value={res.NcRd_column.toFixed(0)} unit="kN" />
                  <ResultRow label="Axial utilisation" value={`${(res.util_column_axial * 100).toFixed(0)}%`} highlight />
                </>
              )}

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Weld (plate to beam/col.)</p>
              <ResultRow label="Fillet weld size" value={`${res.weldSize} mm`} highlight />
              <ResultRow label="Weld utilisation" value={`${(res.weldUtil * 100).toFixed(0)}%`} />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Steel Connection Calculation Sheet"
                codeLabel={factors.label}
                steps={steelConnectionCalcNotes(inp, res, factors)}
              />
              <div className="mt-3 flex justify-end">
                <ReportButton data={buildSteelConnectionReport(inp, res, factors)} />
              </div>
              <SaveDesignPanel memberType="beam"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🔧</p>
              <p className="text-sm font-semibold text-slate-600">Steel connection checker</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">EC3-1-8: bolt shear/tension, plate shear, block shear, weld. End plate / fin plate / base plate.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Connection Sketch & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['sketch', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'sketch' ? 'Connection Sketch' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'sketch' && (
            <>
              <ConnectionSVG
                type={inp.type}
                plateW={inp.plateWidth}
                plateH={inp.plateHeight}
                boltRows={inp.bolt.rows}
                boltCols={inp.bolt.cols}
                boltDia={inp.bolt.diameter}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-slate-500">Bolts (M{inp.bolt.diameter} grade {inp.bolt.grade})</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-2 rounded bg-slate-500" /><span className="text-slate-500">Connection plate ({inp.plateThickness}mm)</span></div>
                {inp.type === 'end-plate' && <div className="flex items-center gap-2"><div className="w-4 h-1" style={{ background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 2px, transparent 2px, transparent 4px)' }} /><span className="text-slate-500">Fillet weld ({res?.weldSize ?? '?'}mm)</span></div>}
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Connection checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run check first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
