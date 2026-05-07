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
import { designAbutment } from '../../utils/abutmentCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { AbutmentInputs } from '../../utils/abutmentCalculations';

const defaultInp: AbutmentInputs = {
  stemHeight: 4.0,
  stemThick: 700,
  stemThickTop: 400,
  baseLength: 4.5,
  baseThick: 600,
  cover: 60,
  phi: 30,
  gamma: 19,
  bearingCapacity: 150,
  bridgeReaction: 250,
  bridgeFriction: 30,
  surcharge: 10,
  fck: 30,
  fyk: 500,
};

function AbutmentSVG({ stemHeight, stemThick, stemThickTop, baseLength, baseThick, phi, res }:
  { stemHeight: number; stemThick: number; stemThickTop: number; baseLength: number; baseThick: number; phi: number;
    res: ReturnType<typeof designAbutment> | null }) {
  const W = 260, H = 200, pad = 20;
  const baseH = baseThick / 1000;
  const totalH = stemHeight + baseH;
  const scaleY = (H - 2 * pad) / (totalH + 1.5);
  const scaleX = (W - 2 * pad) / (baseLength + 1);

  const baseY = H - pad;
  const baseX = pad + 0.5 * scaleX;
  const baseW = baseLength * scaleX;
  const baseHpx = baseH * scaleY;
  const stemBotW = (stemThick / 1000) * scaleX;
  const stemTopW = (stemThickTop / 1000) * scaleX;
  const stemH = stemHeight * scaleY;

  const stabColor = res ? (res.stabilityOK ? '#22c55e' : '#ef4444') : '#94a3b8';
  const bearColor = res ? (res.bearingOK ? '#22c55e' : '#ef4444') : '#94a3b8';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Ground */}
      <rect x={0} y={baseY} width={W} height={pad} fill="#d4a373" opacity={0.5} />
      {/* Foundation soil */}
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1={pad + i * 40} y1={baseY} x2={pad + i * 40 - 10} y2={baseY + 10}
          stroke="#92400e" strokeWidth={0.8} opacity={0.5} />
      ))}
      {/* Base slab */}
      <rect x={baseX} y={baseY - baseHpx} width={baseW} height={baseHpx} fill={bearColor} opacity={0.7} stroke="#1e293b" strokeWidth={0.5} />
      {/* Stem (tapered) */}
      <polygon
        points={`${baseX},${baseY - baseHpx} ${baseX + stemBotW},${baseY - baseHpx} ${baseX + stemTopW},${baseY - baseHpx - stemH} ${baseX},${baseY - baseHpx - stemH}`}
        fill={stabColor} opacity={0.8} stroke="#1e293b" strokeWidth={0.5}
      />
      {/* Bridge beam (schematic) */}
      <rect x={baseX + stemTopW + 2} y={baseY - baseHpx - stemH - 12} width={50} height={12} fill="#475569" rx={1} />
      {/* Backfill */}
      <polygon
        points={`${baseX + stemBotW},${baseY - baseHpx} ${baseX + baseW},${baseY - baseHpx} ${baseX + baseW},${baseY - baseHpx - stemH} ${baseX + stemTopW},${baseY - baseHpx - stemH}`}
        fill="#d4a373" opacity={0.5}
      />
      <text x={baseX + stemBotW + (baseW - stemBotW) * 0.4} y={baseY - baseHpx - stemH * 0.4}
        textAnchor="middle" fontSize={7} fill="#92400e">Fill (φ={phi}°)</text>
      {/* Traffic arrows on fill */}
      {[0, 1, 2].map(i => (
        <line key={i}
          x1={baseX + stemBotW + 10 + i * 20} y1={baseY - baseHpx - stemH - 10}
          x2={baseX + stemBotW + 10 + i * 20} y2={baseY - baseHpx - stemH}
          stroke="#ef4444" strokeWidth={1.5} />
      ))}
      {/* Dimensions */}
      <text x={baseX + baseW / 2} y={baseY + 12} textAnchor="middle" fontSize={7} fill="#64748b">
        B={baseLength}m
      </text>
      <text x={baseX - 6} y={baseY - baseHpx - stemH / 2} textAnchor="end" fontSize={7} fill="#64748b"
        transform={`rotate(-90,${baseX - 8},${baseY - baseHpx - stemH / 2})`}>H={stemHeight}m</text>
      {/* Status indicators */}
      {res && (
        <>
          <text x={W - 10} y={30} textAnchor="end" fontSize={7} fill={stabColor}>
            Stab: {res.FoS_overturning.toFixed(2)} / {res.FoS_sliding.toFixed(2)}
          </text>
          <text x={W - 10} y={42} textAnchor="end" fontSize={7} fill={bearColor}>
            Bearing: {res.bearingPressure.toFixed(0)} kPa
          </text>
        </>
      )}
    </svg>
  );
}

export default function BridgeAbutment() {
  const [inp, setInp] = useState<AbutmentInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designAbutment> | null>(null);
  const [activeTab, setActiveTab] = useState<'sketch' | 'utilisation'>('sketch');
  const { factors } = useBuildingCode();

  const set = (k: keyof AbutmentInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Overturning (FoS ≥ 2.0)', demand: 2.0, capacity: res.FoS_overturning, note: 'Limit / FoS', invert: true },
    { label: 'Sliding (FoS ≥ 1.5)', demand: 1.5, capacity: res.FoS_sliding, note: 'Limit / FoS', invert: true },
    { label: 'Bearing pressure', demand: res.bearingPressure, capacity: inp.bearingCapacity, unit: 'kPa', note: 'σ / q_allow' },
    { label: 'Stem bending', demand: res.Med_stem, capacity: res.Med_stem / 0.5, unit: 'kNm/m', note: 'MEd / MRd (approx)' },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card title="Abutment Parameters" className="lg:col-span-1">
          <p className="text-xs font-semibold text-slate-500 mb-2">Abutment geometry</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Stem height</label>
                <HelpTooltip title="Stem height" text="Height from top of base slab to bridge bearing level." typical="3–6 m for small bridges" />
              </div>
              <InputField label="" unit="m" value={inp.stemHeight} onChange={v => set('stemHeight', +v)} min={1} step={0.5} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Stem thickness (base)</label>
                <HelpTooltip title="Stem thickness at base" text="Governs bending resistance at the critical section." typical="Stem H / 10 minimum" />
              </div>
              <InputField label="" unit="mm" value={inp.stemThick} onChange={v => set('stemThick', +v)} min={300} />
            </div>
            <InputField label="Stem thickness (top)" unit="mm" value={inp.stemThickTop}
              onChange={v => set('stemThickTop', +v)} min={200} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Base slab length</label>
                <HelpTooltip title="Footing length" text="Total length of base slab (toe + stem + heel). Controls overturning and bearing." typical="0.5–0.8 × stem height" />
              </div>
              <InputField label="" unit="m" value={inp.baseLength} onChange={v => set('baseLength', +v)} min={1} step={0.25} />
            </div>
            <InputField label="Base slab thickness" unit="mm" value={inp.baseThick}
              onChange={v => set('baseThick', +v)} min={400} />
            <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={50} />
          </div>

          <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Soil & Bearing</p>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Backfill friction φ'" value={String(inp.phi)}
              onChange={v => set('phi', +v)}
              options={[
                { value: '20', label: "20° (soft clay)" },
                { value: '25', label: "25° (firm clay)" },
                { value: '30', label: "30° (dense sand/laterite)" },
                { value: '35', label: "35° (gravel)" },
              ]} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Fill unit weight</label>
                <HelpTooltip title="Backfill density" text="Unit weight of compacted fill behind abutment." typical="18–20 kN/m³ laterite" />
              </div>
              <InputField label="" unit="kN/m³" value={inp.gamma} onChange={v => set('gamma', +v)} min={15} max={22} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Allowable bearing</label>
                <HelpTooltip title="Foundation bearing capacity" text="Allowable bearing pressure of the founding soil. From site investigation." typical="100–300 kPa for most soils" />
              </div>
              <InputField label="" unit="kPa" value={inp.bearingCapacity} onChange={v => set('bearingCapacity', +v)} min={50} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Traffic surcharge</label>
                <HelpTooltip title="Live load surcharge" text="Equivalent surcharge from traffic behind abutment. BS 5400: 10 kN/m² HA." typical="10 kN/m²" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.surcharge} onChange={v => set('surcharge', +v)} min={0} />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Bridge Loads (per metre width)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Bridge reaction (V)</label>
                <HelpTooltip title="Vertical bridge reaction" text="Dead + live load reaction from bridge beam at bearing. ULS or SLS." typical="200–600 kN/m" />
              </div>
              <InputField label="" unit="kN/m" value={inp.bridgeReaction} onChange={v => set('bridgeReaction', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Braking force (H)</label>
                <HelpTooltip title="Horizontal braking" text="Longitudinal force from traffic braking. BS5400: 8 kN/m lane or 250kN total." typical="20–50 kN/m" />
              </div>
              <InputField label="" unit="kN/m" value={inp.bridgeFriction} onChange={v => set('bridgeFriction', +v)} min={0} />
            </div>
            <SelectField label="Concrete fck" value={String(inp.fck)}
              onChange={v => set('fck', +v)}
              options={[25, 30, 35, 40].map(f => ({ value: String(f), label: `C${f}/${f + 5}` }))} />
          </div>

          <button onClick={() => setRes(designAbutment(inp, factors))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Abutment
          </button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Ka (Rankine)" value={res.Ka.toFixed(3)} />
              <ResultRow label="Horiz. earth force (H)" value={res.Hea.toFixed(1)} unit="kN/m" highlight />
              <ResultRow label="Total vertical (V)" value={res.totalV.toFixed(1)} unit="kN/m" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Stability</p>
              <ResultRow label="FoS overturning" value={res.FoS_overturning.toFixed(2)} highlight />
              <ResultRow label="FoS sliding" value={res.FoS_sliding.toFixed(2)} />
              <ResultRow label="Eccentricity (e)" value={res.eccentricity.toFixed(3)} unit="m" />
              <ResultRow label="Max bearing pressure" value={res.bearingPressure.toFixed(1)} unit="kPa" highlight />
              <ResultRow label="Bearing" value={res.bearingOK ? '✓ OK' : '✗ Exceeded'} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Stem Reinforcement</p>
              <ResultRow label="MEd at base" value={res.Med_stem.toFixed(1)} unit="kNm/m" highlight />
              <ResultRow label="d (effective depth)" value={res.d_stem.toFixed(0)} unit="mm" />
              <ResultRow label="As,req" value={res.As_stem.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars (rear face)" value={`T${res.bars_stem.dia}@${res.bars_stem.spacing}mm`} highlight />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Heel Reinforcement</p>
              <ResultRow label="MEd (heel)" value={res.Med_heel.toFixed(1)} unit="kNm/m" />
              <ResultRow label="Bars (top face)" value={`T${res.bars_heel.dia}@${res.bars_heel.spacing}mm`} />

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
              <p className="text-3xl">🏛️</p>
              <p className="text-sm font-semibold text-slate-600">RC cantilever abutment</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">Rankine earth pressure + bridge loads. Stability checks (overturning, sliding, bearing) then stem and heel reinforcement.</p>
            </div>
          )}
        </Card>

        <Card title="Abutment Sketch & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['sketch', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'sketch' ? 'Elevation Sketch' : 'Stability Checks'}
              </button>
            ))}
          </div>
          {activeTab === 'sketch' && (
            <>
              <AbutmentSVG
                stemHeight={inp.stemHeight} stemThick={inp.stemThick}
                stemThickTop={inp.stemThickTop} baseLength={inp.baseLength}
                baseThick={inp.baseThick} phi={inp.phi} res={res}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-green-400" /><span className="text-slate-500">Stable (green) / Fail (red)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-amber-300" /><span className="text-slate-500">Backfill (Rankine Ka)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Stability & strength" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
