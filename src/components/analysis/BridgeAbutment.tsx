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

function AbutmentSVG({ stemHeight, stemThick, stemThickTop, baseLength, baseThick, phi, gamma, surcharge, res }:
  { stemHeight: number; stemThick: number; stemThickTop: number; baseLength: number; baseThick: number;
    phi: number; gamma: number; surcharge: number; res: ReturnType<typeof designAbutment> | null }) {
  const W = 300, H = 240, padL = 52, padB = 22, padT = 28;
  const baseH = baseThick / 1000;
  const totalH = stemHeight + baseH;
  const scaleY = (H - padT - padB) / (totalH + 1.2);
  const scaleX = (W - padL - 60) / (baseLength + 0.8);

  const baseY = H - padB;
  const baseX = padL;
  const baseW = baseLength * scaleX;
  const baseHpx = baseH * scaleY;
  const stemBotW = (stemThick / 1000) * scaleX;
  const stemTopW = (stemThickTop / 1000) * scaleX;
  const stemH = stemHeight * scaleY;
  const topY = baseY - baseHpx - stemH;

  const stabOK = res ? res.stabilityOK : true;
  const bearOK = res ? res.bearingOK : true;
  const stabColor = res ? (stabOK ? '#16a34a' : '#dc2626') : '#94a3b8';
  const bearColor = res ? (bearOK ? '#16a34a' : '#dc2626') : '#94a3b8';

  // Earth pressure triangle scale
  const Ka = Math.tan((45 - phi / 2) * Math.PI / 180) ** 2;
  const Hpz = stemHeight + baseH;  // total retained height
  const sigmaH_base = Ka * gamma * Hpz;  // kPa at base
  const epScale = Math.min(38, 50 / (sigmaH_base || 1) * stemH);  // px per kPa

  const fillRight = baseX + baseW;
  const stemRight = baseX + stemBotW;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full bg-white">
      <defs>
        <pattern id="fillHatch" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(30)">
          <line x1={0} y1={0} x2={0} y2={8} stroke="#d97706" strokeWidth={0.8} strokeOpacity={0.5} />
        </pattern>
        <pattern id="concHatch" patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={7} stroke="#64748b" strokeWidth={0.6} strokeOpacity={0.5} />
        </pattern>
        <marker id="forceArr" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
        </marker>
        <marker id="dimArrA" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
        <marker id="dimArrB" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
        </marker>
        <marker id="vArr" markerWidth={6} markerHeight={6} refX={3} refY={6} orient="auto">
          <path d="M0,0 L3,6 L6,0 Z" fill="#2563eb" />
        </marker>
      </defs>

      {/* Ground surface */}
      <line x1={0} y1={baseY} x2={W} y2={baseY} stroke="#92400e" strokeWidth={1.5} />
      {/* Founding soil hatch below */}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={i * 28} y1={baseY} x2={i * 28 - 14} y2={baseY + 14}
          stroke="#92400e" strokeWidth={1} strokeOpacity={0.4} />
      ))}

      {/* Backfill (hatched) */}
      <polygon
        points={`${stemRight},${baseY - baseHpx} ${fillRight},${baseY - baseHpx} ${fillRight},${topY} ${baseX + stemTopW},${topY}`}
        fill="url(#fillHatch)" stroke="#b45309" strokeWidth={0.5} />
      <text x={(stemRight + fillRight) / 2} y={topY + stemH * 0.35}
        textAnchor="middle" fontSize={7} fill="#92400e" fontWeight="600">
        Backfill
      </text>
      <text x={(stemRight + fillRight) / 2} y={topY + stemH * 0.35 + 10}
        textAnchor="middle" fontSize={6.5} fill="#b45309">φ={phi}°, γ={gamma}</text>

      {/* Surcharge load */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <line x1={stemRight + 10 + i * 18} y1={topY - 18}
            x2={stemRight + 10 + i * 18} y2={topY - 2}
            stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#forceArr)" />
        </g>
      ))}
      <text x={(stemRight + fillRight) / 2} y={topY - 20}
        textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">q={surcharge} kPa</text>

      {/* Base slab (with concrete hatch + colour) */}
      <rect x={baseX} y={baseY - baseHpx} width={baseW} height={baseHpx}
        fill="url(#concHatch)" stroke="#1e293b" strokeWidth={1} />
      <rect x={baseX} y={baseY - baseHpx} width={baseW} height={baseHpx}
        fill={bearColor} fillOpacity={0.2} stroke="none" />

      {/* Stem (tapered concrete) */}
      <polygon
        points={`${baseX},${baseY - baseHpx} ${stemRight},${baseY - baseHpx} ${baseX + stemTopW},${topY} ${baseX},${topY}`}
        fill="url(#concHatch)" stroke="#1e293b" strokeWidth={1} />
      <polygon
        points={`${baseX},${baseY - baseHpx} ${stemRight},${baseY - baseHpx} ${baseX + stemTopW},${topY} ${baseX},${topY}`}
        fill={stabColor} fillOpacity={0.15} stroke="none" />

      {/* Bridge bearing pad + beam */}
      <rect x={baseX + stemTopW / 4} y={topY - 6} width={stemTopW * 0.6} height={6}
        fill="#64748b" rx={1} />
      <rect x={baseX + stemTopW + 2} y={topY - 16} width={60} height={14}
        fill="#334155" rx={2} />
      <text x={baseX + stemTopW + 32} y={topY - 6} textAnchor="middle" fontSize={6.5} fill="#94a3b8">Bridge beam</text>

      {/* ── Earth pressure triangle ── */}
      {/* At top: Ka × γ × 0 + Ka × q */}
      {/* At base: Ka × γ × H */}
      {(() => {
        const epTop = Ka * surcharge * epScale;  // from surcharge
        const epBot = sigmaH_base * epScale;
        const epX = fillRight + 4;
        const topEpY = topY;
        const botEpY = baseY - baseHpx;
        return (
          <g>
            {/* Surcharge pressure rect */}
            <rect x={epX} y={topEpY} width={epTop} height={botEpY - topEpY}
              fill="#fca5a5" fillOpacity={0.5} stroke="#ef4444" strokeWidth={0.8} />
            {/* Triangular soil pressure */}
            <polygon
              points={`${epX + epTop},${topEpY} ${epX + epTop},${botEpY} ${epX + epTop + (epBot - epTop)},${botEpY}`}
              fill="#fca5a5" fillOpacity={0.7} stroke="#ef4444" strokeWidth={0.8} />
            {/* Labels */}
            <text x={epX + 2} y={topEpY + 10} fontSize={6} fill="#dc2626">Kaq</text>
            <text x={epX + 2} y={botEpY - 3} fontSize={6} fill="#dc2626">
              {sigmaH_base.toFixed(0)} kPa
            </text>
            {/* Force resultant arrow */}
            <line x1={epX + epTop + (epBot - epTop) * 0.4} y1={(topEpY + botEpY * 2) / 3}
              x2={stemRight + 4} y2={(topEpY + botEpY * 2) / 3}
              stroke="#dc2626" strokeWidth={1.5} markerEnd="url(#forceArr)" />
            <text x={epX + epTop + 2} y={(topEpY + botEpY * 2) / 3 - 3}
              fontSize={6.5} fill="#dc2626" fontWeight="700">Ea</text>
          </g>
        );
      })()}

      {/* ── Bearing pressure distribution ── */}
      {res && (
        <g>
          {/* Trapezoidal bearing pressure */}
          {(() => {
            const e = res.eccentricity;
            const V = res.totalV;
            const B = baseLength;
            const sigMax = (V / B) * (1 + 6 * e / B);
            const sigMin = Math.max(0, (V / B) * (1 - 6 * e / B));
            const pressScale = Math.min(14, 20 / sigMax);
            const maxH = sigMax * pressScale;
            const minH = sigMin * pressScale;
            return (
              <>
                <polygon
                  points={`${baseX},${baseY} ${baseX + baseW},${baseY} ${baseX + baseW},${baseY + minH} ${baseX},${baseY + maxH}`}
                  fill="#3b82f6" fillOpacity={0.35} stroke="#2563eb" strokeWidth={0.8} />
                <text x={baseX + 2} y={baseY + maxH + 10} fontSize={6} fill="#2563eb">{sigMax.toFixed(0)} kPa</text>
                <text x={baseX + baseW - 2} y={baseY + minH + 10} fontSize={6} fill="#2563eb" textAnchor="end">{sigMin.toFixed(0)}</text>
              </>
            );
          })()}
        </g>
      )}

      {/* ── Dimension leaders ── */}
      {/* Base width */}
      <line x1={baseX} y1={baseY + 14} x2={baseX + baseW} y2={baseY + 14}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#dimArrA)" markerStart="url(#dimArrB)" />
      <line x1={baseX} y1={baseY + 10} x2={baseX} y2={baseY + 18} stroke="#64748b" strokeWidth={0.8} />
      <line x1={baseX + baseW} y1={baseY + 10} x2={baseX + baseW} y2={baseY + 18} stroke="#64748b" strokeWidth={0.8} />
      <text x={baseX + baseW / 2} y={baseY + 21} textAnchor="middle" fontSize={7.5} fill="#475569" fontWeight="700">
        B = {baseLength} m
      </text>

      {/* Stem height */}
      <line x1={baseX - 16} y1={topY} x2={baseX - 16} y2={baseY - baseHpx}
        stroke="#64748b" strokeWidth={0.8} markerEnd="url(#dimArrA)" markerStart="url(#dimArrB)" />
      <text x={baseX - 18} y={(topY + baseY - baseHpx) / 2} fontSize={7.5} fill="#475569" fontWeight="700"
        transform={`rotate(-90, ${baseX - 18}, ${(topY + baseY - baseHpx) / 2})`} textAnchor="middle">
        H = {stemHeight} m
      </text>

      {/* Stem thickness at base */}
      <line x1={baseX} y1={baseY - baseHpx - 8} x2={stemRight} y2={baseY - baseHpx - 8}
        stroke="#0ea5e9" strokeWidth={0.7} markerEnd="url(#dimArrA)" markerStart="url(#dimArrB)" />
      <text x={(baseX + stemRight) / 2} y={baseY - baseHpx - 11}
        textAnchor="middle" fontSize={6.5} fill="#0ea5e9">{stemThick}mm</text>

      {/* ── Status panel ── */}
      <rect x={2} y={2} width={48} height={70} rx={3} fill="white" stroke="#e2e8f0" />
      <text x={26} y={13} textAnchor="middle" fontSize={7} fill="#374151" fontWeight="700">Stability</text>
      {res ? (
        <>
          <text x={4} y={26} fontSize={6.5} fill={res.FoS_overturning >= 2 ? '#16a34a' : '#dc2626'}>
            OT: {res.FoS_overturning.toFixed(2)}
          </text>
          <text x={4} y={37} fontSize={6.5} fill={res.FoS_overturning >= 2 ? '#16a34a' : '#dc2626'}>
            {res.FoS_overturning >= 2 ? '≥2.0 ✓' : '<2.0 ✗'}
          </text>
          <text x={4} y={50} fontSize={6.5} fill={res.FoS_sliding >= 1.5 ? '#16a34a' : '#dc2626'}>
            SL: {res.FoS_sliding.toFixed(2)}
          </text>
          <text x={4} y={61} fontSize={6.5} fill={res.FoS_sliding >= 1.5 ? '#16a34a' : '#dc2626'}>
            {res.FoS_sliding >= 1.5 ? '≥1.5 ✓' : '<1.5 ✗'}
          </text>
        </>
      ) : (
        <text x={26} y={40} textAnchor="middle" fontSize={6.5} fill="#94a3b8">Run design</text>
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

  const runWith = (patch: Partial<AbutmentInputs>) => {
    const next = { ...inp, ...patch };
    setInp(next);
    setRes(designAbutment(next, factors));
  };

  const checks: UtilCheck[] = res ? [
    { label: 'Overturning (FoS ≥ 2.0)', demand: 2.0, capacity: res.FoS_overturning, note: 'Limit / FoS', invert: true,
      hint: 'Extend the base heel slab to move the resultant force closer to the centre.',
      actions: [
        { label: `+0.5 m base length (→ ${(inp.baseLength + 0.5).toFixed(1)} m)`, onClick: () => runWith({ baseLength: inp.baseLength + 0.5 }) },
        { label: `+1.0 m base length (→ ${(inp.baseLength + 1.0).toFixed(1)} m)`, onClick: () => runWith({ baseLength: inp.baseLength + 1.0 }) },
      ],
    },
    { label: 'Sliding (FoS ≥ 1.5)', demand: 1.5, capacity: res.FoS_sliding, note: 'Limit / FoS', invert: true,
      hint: 'Widen the base to increase the friction area, or add a shear key beneath the foundation.',
      actions: [
        { label: `+0.5 m base length (→ ${(inp.baseLength + 0.5).toFixed(1)} m)`, onClick: () => runWith({ baseLength: inp.baseLength + 0.5 }) },
        { label: `+100 mm base thickness (→ ${inp.baseThick + 100} mm)`, onClick: () => runWith({ baseThick: inp.baseThick + 100 }) },
      ],
    },
    { label: 'Bearing pressure', demand: res.bearingPressure, capacity: inp.bearingCapacity, unit: 'kPa', note: 'σ / q_allow',
      hint: 'Widen the base slab to spread the load over a larger area.',
      actions: [
        { label: `+0.5 m base length (→ ${(inp.baseLength + 0.5).toFixed(1)} m)`, onClick: () => runWith({ baseLength: inp.baseLength + 0.5 }) },
        { label: `+1.0 m base length (→ ${(inp.baseLength + 1.0).toFixed(1)} m)`, onClick: () => runWith({ baseLength: inp.baseLength + 1.0 }) },
      ],
    },
    { label: 'Stem bending', demand: res.Med_stem, capacity: res.Med_stem / 0.5, unit: 'kNm/m', note: 'MEd / MRd (approx)',
      hint: 'Increase stem thickness at the base to raise bending resistance.',
      actions: [
        { label: `+100 mm stem thick (→ ${inp.stemThick + 100} mm)`, onClick: () => runWith({ stemThick: inp.stemThick + 100 }) },
        { label: `+200 mm stem thick (→ ${inp.stemThick + 200} mm)`, onClick: () => runWith({ stemThick: inp.stemThick + 200 }) },
      ],
    },
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
                baseThick={inp.baseThick} phi={inp.phi}
                gamma={inp.gamma} surcharge={inp.surcharge} res={res}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-green-400/40 border border-green-500" /><span className="text-slate-500">Stable stem/base</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-red-300/40 border border-red-400" /><span className="text-slate-500">Earth pressure (Rankine)</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-blue-300/40 border border-blue-400" /><span className="text-slate-500">Bearing pressure distribution</span></div>
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
