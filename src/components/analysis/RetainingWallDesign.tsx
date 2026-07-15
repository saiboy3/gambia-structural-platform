import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import CalcSheet from '../ui/CalcSheet';
import { getMaterial } from '../../utils/materials';
import { designRetainingWall } from '../../utils/retainingWallCalculations';
import { retainingWallCalcNotes } from '../../utils/calcNotesGeotechSlab';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { RetainingWallInputs, RetainingWallResults } from '../../utils/retainingWallCalculations';
import type { ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: RetainingWallInputs = {
  type: 'cantilever',
  height: 3.0,
  baseWidth: 2.4,
  toeTip: 0.6,
  stemWidth: 300,
  baseThk: 400,
  soilDensity: 18,
  soilAngle: 30,
  soilCohesion: 0,
  surcharge: 10,
  concreteDensity: 24,
  cover: 50,
  material: getMaterial('C25/30', 'B500B'),
};

function WallSVG({ inp, res }: { inp: RetainingWallInputs; res: RetainingWallResults }) {
  const W = 280, H = 200, pad = 20;
  const scale = (H - 2 * pad) / inp.height;
  const wallH = inp.height * scale;
  const baseW = inp.baseWidth * scale;
  const x0 = (W - baseW) / 2;
  const yBase = H - pad;

  const isGravity = inp.type === 'gravity';
  const topW = (inp.stemWidth / 1000) * scale;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      {isGravity ? (
        <>
          {/* Soil fill behind the battered back face */}
          <polygon points={`${x0 + topW},${yBase - wallH} ${x0 + baseW},${yBase - wallH} ${x0 + baseW},${yBase} ${x0 + topW},${yBase}`}
            fill="#d4a96a" opacity={0.3} />
          {/* Solid trapezoid — vertical front face, battered back */}
          <polygon points={`${x0},${yBase} ${x0},${yBase - wallH} ${x0 + topW},${yBase - wallH} ${x0 + baseW},${yBase}`}
            fill="#475569" />
        </>
      ) : (
        <>
          {/* Soil fill */}
          <rect x={x0 + inp.toeTip * scale + topW} y={yBase - wallH - (inp.baseThk / 1000) * scale}
            width={baseW - inp.toeTip * scale - topW} height={wallH + (inp.baseThk / 1000) * scale} fill="#d4a96a" opacity={0.3} />
          {/* Base slab */}
          <rect x={x0} y={yBase - (inp.baseThk / 1000) * scale} width={baseW} height={(inp.baseThk / 1000) * scale} fill="#64748b" />
          {/* Stem */}
          <rect x={x0 + inp.toeTip * scale} y={yBase - wallH - (inp.baseThk / 1000) * scale} width={topW} height={wallH} fill="#475569" />
          {/* Rebar lines */}
          <line x1={x0 + inp.toeTip * scale + 6} y1={yBase - wallH - (inp.baseThk / 1000) * scale + 6}
            x2={x0 + inp.toeTip * scale + 6} y2={yBase - (inp.baseThk / 1000) * scale - 6} stroke="#ef4444" strokeWidth={1.5} />
        </>
      )}
      {/* Dimensions */}
      <text x={x0 + baseW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#64748b">B = {inp.baseWidth}m</text>
      <text x={x0 - 4} y={yBase - wallH / 2} textAnchor="end" fontSize={9} fill="#64748b">H = {inp.height}m</text>
      {/* Status */}
      <text x={W - 4} y={12} textAnchor="end" fontSize={10} fontWeight="bold"
        fill={res.status === 'pass' ? '#059669' : res.status === 'warn' ? '#d97706' : '#dc2626'}>
        {res.status.toUpperCase()}
      </text>
    </svg>
  );
}

export default function RetainingWallDesign() {
  const [inp, setInp] = useState<RetainingWallInputs>(defaultInputs);
  const [res, setRes] = useState<RetainingWallResults | null>(null);
  const { factors } = useBuildingCode();

  const set = (k: keyof RetainingWallInputs, v: string | number) =>
    setInp(p => ({ ...p, [k]: v }));
  const setMat = (c: string, r: string) =>
    setInp(p => ({ ...p, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));
  const run = () => setRes(designRetainingWall(inp, factors));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-orange-600 to-orange-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle size={22} />
          <h1 className="text-xl font-bold">Retaining Wall Design</h1>
        </div>
        <p className="text-orange-200 text-sm">Cantilever RC or mass-concrete gravity wall stability checks and reinforcement design</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Wall Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Wall type" value={inp.type} onChange={v => set('type', v)}
              options={[{ value: 'cantilever', label: 'Cantilever RC' }, { value: 'gravity', label: 'Gravity' }]} />
            <InputField label="Retained height" unit="m"  value={inp.height}       onChange={v => set('height', +v)} min={0.5} />
            <InputField label="Base width"       unit="m"  value={inp.baseWidth}    onChange={v => set('baseWidth', +v)} min={0.5} />
            {inp.type === 'cantilever' && (
              <InputField label="Toe length"     unit="m"  value={inp.toeTip}       onChange={v => set('toeTip', +v)} min={0} />
            )}
            <InputField label={inp.type === 'gravity' ? 'Top width (crown)' : 'Stem width'} unit="mm"
              value={inp.stemWidth} onChange={v => set('stemWidth', +v)} min={150} />
            {inp.type === 'cantilever' && (
              <InputField label="Base thickness" unit="mm" value={inp.baseThk}      onChange={v => set('baseThk', +v)} min={200} />
            )}
            <InputField label="Soil density"     unit="kN/m³" value={inp.soilDensity} onChange={v => set('soilDensity', +v)} min={14} />
            <InputField label="Friction angle φ'" unit="°" value={inp.soilAngle}   onChange={v => set('soilAngle', +v)} min={20} max={45} />
            <InputField label="Surcharge"        unit="kPa" value={inp.surcharge}  onChange={v => set('surcharge', +v)} min={0} />
            {inp.type === 'cantilever' && (
              <InputField label="Cover"          unit="mm" value={inp.cover}       onChange={v => set('cover', +v)} min={40} />
            )}
            <SelectField label="Concrete" value={inp.material.concrete}
              onChange={(v) => setMat(v, inp.material.rebar)}
              options={['C20/25','C25/30','C30/37','C35/45'].map(c => ({ value: c, label: c }))} />
            {inp.type === 'cantilever' && (
              <SelectField label="Rebar" value={inp.material.rebar}
                onChange={(v) => setMat(inp.material.concrete, v)}
                options={['B500B','B500C'].map(r => ({ value: r, label: r }))} />
            )}
          </div>
          <Button onClick={run} fullWidth className="mt-4">
            Design Wall
          </Button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Earth Pressure</p>
              <ResultRow label="Ka (Rankine)"       value={res.Ka.toFixed(3)} />
              <ResultRow label="Ph (total horiz.)"  value={res.Ph.toFixed(1)} unit="kN/m" highlight />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Stability</p>
              <ResultRow label="FoS Overturning"    value={res.FoS_overturning.toFixed(2)} />
              <ResultRow label="FoS Sliding"        value={res.FoS_sliding.toFixed(2)} />
              <ResultRow label="Eccentricity (e)"   value={res.eccentricity.toFixed(3)} unit="m" />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Bearing</p>
              <ResultRow label="qmax"               value={res.qmax.toFixed(1)} unit="kPa" />
              <ResultRow label="qmin"               value={res.qmin.toFixed(1)} unit="kPa" />
              {inp.type === 'cantilever' ? (
                <>
                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Stem Reinforcement</p>
                  <ResultRow label="MEd,stem"           value={res.Med_stem.toFixed(2)} unit="kNm/m" />
                  <ResultRow label="As,stem required"   value={res.As_stem.toFixed(0)} unit="mm²/m" />
                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Base Reinforcement</p>
                  <ResultRow label="As,toe"             value={res.As_toe.toFixed(0)} unit="mm²/m" />
                  <ResultRow label="As,heel"            value={res.As_heel.toFixed(0)} unit="mm²/m" />
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Mass Concrete Section</p>
                  <ResultRow label="Self-weight (W)"    value={res.W_concrete.toFixed(1)} unit="kN/m" highlight />
                  <p className="text-xs text-slate-400 mt-1">
                    No flexural reinforcement — stability relies on self-weight. The eccentricity
                    (middle-third) check above governs instead of a stem moment check.
                  </p>
                </>
              )}
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Retaining Wall Calculation Sheet"
                codeLabel={factors.label}
                steps={retainingWallCalcNotes(inp, res, factors)}
              />
              <SaveDesignPanel memberType="retaining-wall"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Wall</p>
          )}
        </Card>

        <Card title="Wall Cross-Section" className="lg:col-span-1">
          {res ? <WallSVG inp={inp} res={res} /> :
            <p className="text-sm text-slate-400 text-center py-8">Design output will appear here</p>}
        </Card>
      </div>
    </div>
  );
}
