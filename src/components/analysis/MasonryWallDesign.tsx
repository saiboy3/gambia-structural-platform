import { useState } from 'react';
import { Layers } from 'lucide-react';
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
import { designMasonryWall } from '../../utils/masonryCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { MasonryInputs, MasonryUnit, MortarClass, WallType } from '../../utils/masonryCalculations';
import CalcSheet from '../ui/CalcSheet';
import { masonryCalcNotes } from '../../utils/calcNotesPileMasonry';

const defaultInp: MasonryInputs = {
  unitType: 'sandcrete-block',
  mortar: 'M5',
  wallType: 'single-leaf',
  thickness: 225,
  clearHeight: 3.0,
  floorCondition: 'both-fixed',
  Gk: 25,
  Qk: 10,
  ek: 0,
  windPressure: 0.5,
};

const UNIT_INFO: Record<MasonryUnit, { label: string; note: string }> = {
  'sandcrete-block': { label: 'Sandcrete Block', note: 'Most common in Gambia — hollow/solid 150–225mm' },
  'burnt-brick':     { label: 'Burnt Brick', note: 'Fired clay bricks, stronger than sandcrete' },
  'laterite-block':  { label: 'Laterite Block', note: 'Compressed earth — sustainable, lower strength' },
  'concrete-block':  { label: 'Concrete Block', note: 'Dense aggregate — stronger than sandcrete' },
};

function WallElevationSVG({ height, thickness, slenderness, phi }: { height: number; thickness: number; slenderness: number; phi: number }) {
  const W = 260, H = 200, pad = 20;
  const wallW = Math.min(80, thickness / 3);
  const wallH = H - 2 * pad;
  const wallX = W / 2 - wallW / 2;

  // Eccentricity bar
  // eccW reserved for future eccentricity visualisation

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Ground */}
      <rect x={0} y={H - pad} width={W} height={pad} fill="#d1d5db" />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#6b7280">Ground</text>
      {/* Wall body */}
      <rect x={wallX} y={pad} width={wallW} height={wallH} fill="#d4a373" stroke="#92400e" strokeWidth={1} />
      {/* Hatching lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i}
          x1={wallX} y1={pad + i * (wallH / 8)}
          x2={wallX + wallW} y2={pad + (i + 1) * (wallH / 8)}
          stroke="#92400e" strokeWidth={0.5} opacity={0.4} />
      ))}
      {/* Height dimension */}
      <line x1={wallX - 10} y1={pad} x2={wallX - 10} y2={H - pad} stroke="#64748b" strokeWidth={0.5} markerEnd="url(#arrow)" />
      <text x={wallX - 14} y={H / 2} textAnchor="middle" fontSize={8} fill="#64748b"
        transform={`rotate(-90,${wallX - 14},${H / 2})`}>{height.toFixed(1)} m</text>
      {/* Thickness dimension */}
      <line x1={wallX} y1={H - pad + 8} x2={wallX + wallW} y2={H - pad + 8} stroke="#64748b" strokeWidth={0.5} />
      <text x={wallX + wallW / 2} y={H - pad + 18} textAnchor="middle" fontSize={8} fill="#64748b">{thickness} mm</text>
      {/* Slenderness label */}
      <text x={wallX + wallW + 8} y={pad + 20} fontSize={8} fill={slenderness > 27 ? '#dc2626' : '#16a34a'}>
        λ = {slenderness.toFixed(1)}
      </text>
      <text x={wallX + wallW + 8} y={pad + 30} fontSize={7} fill="#64748b">{slenderness > 27 ? '> 27 FAIL' : '≤ 27 ✓'}</text>
      {/* Φ bar */}
      <text x={wallX + wallW + 8} y={pad + 50} fontSize={8} fill="#475569">Φ = {phi.toFixed(2)}</text>
      <rect x={wallX + wallW + 8} y={pad + 54} width={40} height={6} rx={2} fill="#e2e8f0" />
      <rect x={wallX + wallW + 8} y={pad + 54} width={40 * phi} height={6} rx={2} fill="#3b82f6" />
      {/* Load arrows at top */}
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={wallX + (i + 0.5) * wallW / 5} y1={pad - 10}
          x2={wallX + (i + 0.5) * wallW / 5} y2={pad}
          stroke="#ef4444" strokeWidth={1.5}
          markerEnd="url(#arrowRed)" />
      ))}
      <defs>
        <marker id="arrowRed" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  );
}

export default function MasonryWallDesign() {
  const [inp, setInp] = useState<MasonryInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designMasonryWall> | null>(null);
  const [activeTab, setActiveTab] = useState<'elevation' | 'utilisation'>('elevation');
  const { factors } = useBuildingCode();

  const set = (k: keyof MasonryInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Vertical compression', demand: res.NEdpm, capacity: res.NRd, unit: 'kN/m', note: 'NEd / NRd',
      hint: 'Use a denser block, stronger mortar class, or increase wall thickness.' },
    { label: 'Slenderness (λ ≤ 27)', demand: res.slenderness, capacity: 27, note: 'λ / limit',
      hint: 'Wall is too slender. Add an intermediate restraint (floor/pilaster) or increase wall thickness.' },
    ...(inp.windPressure > 0 ? [{ label: 'Wind bending', demand: res.Med_wind, capacity: res.MRd_wind, unit: 'kNm/m', note: 'MEd / MRd',
      hint: 'Increase wall thickness to raise section modulus, or add vertical RC reinforcement in the cavity.' }] : []),
  ] : [];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-stone-600 to-stone-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Layers size={22} />
          <h1 className="text-xl font-bold">Masonry Wall Design</h1>
        </div>
        <p className="text-stone-200 text-sm">Unreinforced masonry wall design to EC6 including slenderness and vertical load capacity</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Masonry Wall Parameters" className="lg:col-span-1">
          {/* Unit type picker */}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-1.5">Masonry unit type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(UNIT_INFO) as [MasonryUnit, { label: string; note: string }][]).map(([key, info]) => (
                <button key={key} onClick={() => set('unitType', key)}
                  className={`py-2 px-2 rounded-lg border text-left transition-all
                    ${inp.unitType === key ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                  <p className={`text-xs font-semibold ${inp.unitType === key ? 'text-white' : 'text-slate-700'}`}>{info.label}</p>
                  <p className={`text-[10px] mt-0.5 ${inp.unitType === key ? 'text-blue-100' : 'text-slate-400'}`}>{info.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Mortar class" value={inp.mortar}
              onChange={v => set('mortar', v as MortarClass)}
              options={(['M2.5','M5','M7.5','M10'] as MortarClass[]).map(m => ({ value: m, label: m }))} />
            <SelectField label="Wall type" value={inp.wallType}
              onChange={v => set('wallType', v as WallType)}
              options={[
                { value: 'single-leaf', label: 'Single leaf' },
                { value: 'cavity', label: 'Cavity' },
                { value: 'grouted-cavity', label: 'Grouted cavity' },
              ]} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Wall thickness</label>
                <HelpTooltip title="Leaf thickness" text="Single leaf thickness. Sandcrete blocks: 150 or 225 mm." typical="150 mm partition / 225 mm load-bearing" />
              </div>
              <InputField label="" unit="mm" value={inp.thickness} onChange={v => set('thickness', +v)} min={100} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Clear storey height</label>
                <HelpTooltip title="Clear height" text="Height between floors/restraints. Used with ρ factor to get effective height." typical="2.4–3.5 m residential" />
              </div>
              <InputField label="" unit="m" value={inp.clearHeight} onChange={v => set('clearHeight', +v)} min={1} step={0.1} />
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Floor restraint condition</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { value: 'both-fixed', label: 'Both fixed', note: 'ρ=0.75' },
                  { value: 'one-fixed', label: 'One fixed', note: 'ρ=0.85' },
                  { value: 'both-pinned', label: 'Both pinned', note: 'ρ=1.0' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => set('floorCondition', opt.value)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-all
                      ${inp.floorCondition === opt.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                    <div>{opt.label}</div>
                    <div className={`text-[10px] ${inp.floorCondition === opt.value ? 'text-blue-100' : 'text-slate-400'}`}>{opt.note}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Permanent load (Gk)</label>
                <HelpTooltip title="Characteristic dead load" text="Floor/roof load per metre run of wall (excluding self-weight)." typical="15–40 kN/m depending on floor span" />
              </div>
              <InputField label="" unit="kN/m" value={inp.Gk} onChange={v => set('Gk', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Variable load (Qk)</label>
                <HelpTooltip title="Characteristic live load" text="Imposed load per metre run of wall from floor above." typical="5–15 kN/m" />
              </div>
              <InputField label="" unit="kN/m" value={inp.Qk} onChange={v => set('Qk', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Load eccentricity (ek)</label>
                <HelpTooltip title="Load eccentricity" text="Distance from wall centre to load resultant. 0 if load is centred." typical="t/3 for beam bearing on one face" />
              </div>
              <InputField label="" unit="mm" value={inp.ek} onChange={v => set('ek', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Wind pressure</label>
                <HelpTooltip title="Design wind pressure" text="Lateral design wind pressure on the wall face. Set 0 for internal walls." typical="0.5–1.2 kN/m² in Gambia" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.windPressure} onChange={v => set('windPressure', +v)} min={0} step={0.1} />
            </div>
          </div>

          <Button onClick={() => setRes(designMasonryWall(inp, factors))} fullWidth className="mt-4">
            Design Masonry Wall
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="fk (char. strength)" value={res.fk.toFixed(1)} unit="MPa" />
              <ResultRow label="fkd (design strength)" value={res.fkd.toFixed(2)} unit="MPa" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Slenderness</p>
              <ResultRow label="Effective height (hef)" value={res.hef.toFixed(2)} unit="m" />
              <ResultRow label="Effective thickness (tef)" value={(res.tef * 1000).toFixed(0)} unit="mm" />
              <ResultRow label="Slenderness (λ)" value={res.slenderness} highlight />
              <ResultRow label="λ ≤ 27" value={res.slenderness_ok ? '✓ Pass' : '✗ Fail'} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Eccentricity & Compression</p>
              <ResultRow label="e_total" value={res.e_total.toFixed(1)} unit="mm" />
              <ResultRow label="Reduction factor (Φ)" value={res.Phi.toFixed(3)} highlight />
              <ResultRow label="NEd" value={res.NEdpm.toFixed(1)} unit="kN/m" />
              <ResultRow label="NRd" value={res.NRd.toFixed(1)} unit="kN/m" />
              <ResultRow label="Utilisation" value={`${(res.utilisation * 100).toFixed(0)}%`} />

              {inp.windPressure > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Wind Bending</p>
                  <ResultRow label="MEd (wind)" value={res.Med_wind.toFixed(3)} unit="kNm/m" />
                  <ResultRow label="MRd (lateral)" value={res.MRd_wind.toFixed(3)} unit="kNm/m" />
                  <ResultRow label="Wind bending" value={res.windOK ? '✓ Pass' : '✗ Fail'} />
                </>
              )}

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Masonry Wall Calculation Sheet"
                codeLabel={factors.label}
                steps={masonryCalcNotes(inp, res, factors)}
              />
              <SaveDesignPanel memberType="foundation"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🧱</p>
              <p className="text-sm font-semibold text-slate-600">Masonry wall design</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">EC6 approach. Checks slenderness, eccentricity reduction, and wind bending for Gambia masonry units.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Wall Elevation & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['elevation', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'elevation' ? 'Elevation' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'elevation' && (
            <WallElevationSVG
              height={inp.clearHeight}
              thickness={inp.thickness}
              slenderness={res?.slenderness ?? (inp.clearHeight / (inp.thickness / 1000))}
              phi={res?.Phi ?? 0.8}
            />
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Capacity checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
          {/* Material key */}
          <div className="mt-3 p-2 bg-amber-50 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">Selected: {UNIT_INFO[inp.unitType].label}</p>
            <p className="text-xs text-amber-700">{UNIT_INFO[inp.unitType].note}</p>
            {res && <p className="text-xs text-amber-700 mt-1">fk = {res.fk} MPa with {inp.mortar} mortar</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
