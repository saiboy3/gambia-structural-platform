import { useState } from 'react';
import { Milestone } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { designPavement } from '../../utils/pavementCalculations';
import type { PavementInputs, RoadClass, PavementType, SubgradeType, TrafficGrowth } from '../../utils/pavementCalculations';
import CalcSheet from '../ui/CalcSheet';
import { pavementCalcNotes } from '../../utils/calcNotesTransport';
import { useBuildingCode } from '../../context/BuildingCodeContext';

const defaultInp: PavementInputs = {
  roadClass: 'secondary',
  pavementType: 'flexible',
  subgradeType: 'moderate',
  designLife: 20,
  trafficGrowth: 'medium',
  percentHeavy: 15,
  equivalentAxleLoad: 80,
  useImprovedSubgrade: false,
};

const ROAD_ICONS: Record<RoadClass, string> = {
  trunk: '🛣️', main: '🏗️', secondary: '🚗', access: '🛤️', estate: '🏠',
};

function PavementCrossSectionSVG({ layers }: { layers: { name: string; thickness: number; material: string }[] }) {
  const W = 260, pad = 16;
  const totalT = layers.reduce((s, l) => s + l.thickness, 0);
  const scale = Math.min(2.5, 160 / totalT);
  const COLOURS: Record<string, string> = {
    'Surface dressing': '#1c1917',
    'Wearing course': '#292524',
    'Binder course': '#44403c',
    'Roadbase': '#d97706',
    'Sub-base (concrete)': '#a8a29e',
    'Sub-base': '#ca8a04',
    'Improved subgrade': '#86efac',
    'Concrete slab': '#94a3b8',
  };
  let y = pad;
  const svgHeight = totalT * scale + 2 * pad + 20;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${svgHeight}`} className="w-full">
      {/* Road surface label */}
      <text x={W / 2} y={pad - 4} textAnchor="middle" fontSize={8} fill="#64748b">Road Surface ▼</text>
      {layers.map((l, i) => {
        const h = l.thickness * scale;
        const color = COLOURS[l.name] ?? '#94a3b8';
        const rect = (
          <g key={i}>
            <rect x={pad} y={y} width={W - 2 * pad} height={h} fill={color} stroke="#0f172a" strokeWidth={0.5} />
            <text x={W / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize={7} fill={i < 2 ? '#e2e8f0' : '#1e293b'}>
              {l.name} ({l.thickness}mm)
            </text>
            <text x={pad - 3} y={y + h} textAnchor="end" fontSize={6} fill="#64748b">
              {layers.slice(0, i + 1).reduce((s, ll) => s + ll.thickness, 0)}mm
            </text>
          </g>
        );
        y += h;
        return rect;
      })}
      {/* Subgrade */}
      <rect x={pad} y={y} width={W - 2 * pad} height={16} fill="#a16207" opacity={0.3}
        stroke="#92400e" strokeWidth={0.5} strokeDasharray="4,2" />
      <text x={W / 2} y={y + 11} textAnchor="middle" fontSize={7} fill="#92400e">Subgrade (in-situ)</text>
    </svg>
  );
}

export default function PavementDesign() {
  const [inp, setInp] = useState<PavementInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designPavement> | null>(null);
  const { factors } = useBuildingCode();

  const set = (k: keyof PavementInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Milestone size={22} />
          <h1 className="text-xl font-bold">Road Pavement Design</h1>
        </div>
        <p className="text-rose-200 text-sm">Flexible and rigid pavement design for roads including subbase and surfacing thickness</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Pavement Parameters" className="lg:col-span-1">
          {/* Road class */}
          <p className="text-xs font-medium text-slate-600 mb-1.5">Road classification</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {([
              ['trunk', 'Trunk Road', 'National highway, high AADT'],
              ['main', 'Main Road', 'Regional connector'],
              ['secondary', 'Secondary', 'Feeder / district road'],
              ['access', 'Access Road', 'Rural, low volume'],
              ['estate', 'Estate Road', 'Compound / development'],
            ] as [RoadClass, string, string][]).map(([v, l, n]) => (
              <button key={v} onClick={() => set('roadClass', v)}
                className={`py-2 px-2 rounded-lg border text-left transition-all col-span-${v === 'estate' ? 2 : 1}
                  ${inp.roadClass === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}>
                <p className={`text-xs font-semibold ${inp.roadClass === v ? 'text-white' : ''}`}>{ROAD_ICONS[v]} {l}</p>
                <p className={`text-[10px] ${inp.roadClass === v ? 'text-blue-100' : 'text-slate-400'}`}>{n}</p>
              </button>
            ))}
          </div>

          {/* Pavement type */}
          <p className="text-xs font-medium text-slate-600 mb-1.5">Pavement type</p>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {([
              ['flexible', '🛣️ Flexible', 'Bituminous (AC / DBM)'],
              ['rigid', '⬜ Rigid', 'Concrete slab (JPCP)'],
            ] as [PavementType, string, string][]).map(([v, l, n]) => (
              <button key={v} onClick={() => set('pavementType', v)}
                className={`py-2 rounded-lg border text-xs font-semibold transition-all
                  ${inp.pavementType === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                <div>{l}</div>
                <div className={`text-[10px] font-normal ${inp.pavementType === v ? 'text-blue-100' : 'text-slate-400'}`}>{n}</div>
              </button>
            ))}
          </div>

          {/* Subgrade */}
          <p className="text-xs font-medium text-slate-600 mb-1.5">Subgrade condition</p>
          <div className="space-y-1 mb-3">
            {([
              ['poor', '🔴 Poor', 'Soft clay / wet laterite ≤ 2% CBR'],
              ['moderate', '🟡 Moderate', 'Compacted laterite ~5% CBR'],
              ['good', '🟢 Good', 'Well-graded gravel ~10% CBR'],
              ['excellent', '✅ Excellent', 'Hard gravel / rock >15% CBR'],
            ] as [SubgradeType, string, string][]).map(([v, l, n]) => (
              <button key={v} onClick={() => set('subgradeType', v)}
                className={`w-full py-1.5 px-2 rounded-lg border text-left text-xs transition-all
                  ${inp.subgradeType === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}>
                <span className="font-semibold">{l}</span>
                <span className={`ml-1 text-[10px] ${inp.subgradeType === v ? 'text-blue-100' : 'text-slate-400'}`}>{n}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Design life</label>
                <HelpTooltip title="Design life" text="Number of years the pavement is designed to last before major rehabilitation." typical="20 years standard / 10 years access roads" />
              </div>
              <InputField label="" unit="years" value={inp.designLife} onChange={v => set('designLife', +v)} min={5} max={40} />
            </div>
            <SelectField label="Traffic growth" value={inp.trafficGrowth}
              onChange={v => set('trafficGrowth', v as TrafficGrowth)}
              options={[
                { value: 'low', label: 'Low (2%/yr)' },
                { value: 'medium', label: 'Medium (4%/yr)' },
                { value: 'high', label: 'High (7%/yr)' },
              ]} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">% Heavy vehicles</label>
                <HelpTooltip title="HGV percentage" text="Proportion of daily traffic that are trucks/HGVs. This drives the structural design." typical="10–25% on Gambian roads" />
              </div>
              <InputField label="" unit="%" value={inp.percentHeavy} onChange={v => set('percentHeavy', +v)} min={1} max={100} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Equivalent axle load</label>
                <HelpTooltip title="Standard axle" text="80 kN is the standard. Heavier axles do dramatically more damage (4th power law)." typical="80 kN standard (some Gambia routes 100 kN)" />
              </div>
              <InputField label="" unit="kN" value={inp.equivalentAxleLoad} onChange={v => set('equivalentAxleLoad', +v)} min={60} max={130} />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inp.useImprovedSubgrade}
                  onChange={e => set('useImprovedSubgrade', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-xs text-slate-600">Add improved subgrade layer (for CBR &lt; 5%)</span>
              </label>
            </div>
          </div>

          <Button onClick={() => setRes(designPavement(inp))} fullWidth className="mt-4">
            Design Pavement
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Design CBR" value={`${res.cbr}%`} highlight />
              <ResultRow label="Design traffic (MSA)" value={res.msa.toFixed(2)} unit="million std. axles" highlight />
              <ResultRow label="Total structural thickness" value={res.totalThickness.toFixed(0)} unit="mm" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Pavement Layer Schedule</p>
              {res.layers.map((l, i) => (
                <div key={i} className="text-xs border-b border-slate-100 py-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">{l.name}</span>
                    <span className="font-mono text-blue-700">{l.thickness} mm</span>
                  </div>
                  <p className="text-slate-400 text-[10px]">{l.material}</p>
                </div>
              ))}

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Material Volumes (per km per lane)</p>
              {res.surfacingVol > 0 && <ResultRow label="Surfacing" value={res.surfacingVol.toFixed(0)} unit="m³/km/lane" />}
              {res.basecourseVol > 0 && <ResultRow label="Roadbase" value={res.basecourseVol.toFixed(0)} unit="m³/km/lane" />}
              {res.subbaseVol > 0 && <ResultRow label="Sub-base" value={res.subbaseVol.toFixed(0)} unit="m³/km/lane" />}

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Pavement Calculation Sheet"
                codeLabel={factors.label}
                steps={pavementCalcNotes(inp, res, factors)}
              />
              <SaveDesignPanel memberType="foundation"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🛣️</p>
              <p className="text-sm font-semibold text-slate-600">Pavement design</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">TRL RN31 CBR method. Flexible (bituminous) or rigid (concrete). Select road class and subgrade.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Pavement Cross-Section" className="lg:col-span-1">
          {res ? (
            <>
              <PavementCrossSectionSVG layers={res.layers} />
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-1">Construction notes</p>
                <ul className="text-xs text-blue-700 space-y-0.5">
                  <li>• Compact each layer to 95–98% MDD before placing next</li>
                  <li>• Proof roll subgrade before sub-base</li>
                  {inp.pavementType === 'flexible' && <li>• Apply tack coat between bituminous layers</li>}
                  {inp.pavementType === 'rigid' && <li>• Cure concrete 7 days before trafficking</li>}
                  {res.cbr < 5 && <li>• Subgrade CBR &lt; 5% — wet-season monitoring required</li>}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">📐</p>
              <p className="text-sm text-slate-400">Cross-section appears after design</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
