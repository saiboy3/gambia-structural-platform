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
import { designPile } from '../../utils/pileCalculations';
import type { PileInputs, SoilLayer } from '../../utils/pileCalculations';

const defaultLayers: SoilLayer[] = [
  { thickness: 3, soilType: 'soft-clay', cu: 25, gamma: 17 },
  { thickness: 5, soilType: 'firm-clay', cu: 60, gamma: 18 },
  { thickness: 4, soilType: 'medium-sand', phi: 32, gamma: 19 },
];

const defaultInp: PileInputs = {
  pileType: 'bored',
  diameter: 450,
  length: 12,
  layers: defaultLayers,
  gwt: 2.0,
  FoS: 2.5,
  loadType: 'compression',
};

const SOIL_TYPES: SoilLayer['soilType'][] = [
  'soft-clay','firm-clay','stiff-clay',
  'loose-sand','medium-sand','dense-sand',
  'laterite-soft','laterite-hard','rock',
];

function SoilProfileSVG({ layers, pileLen, pileDia }: { layers: SoilLayer[]; pileLen: number; pileDia: number }) {
  const W = 280, H = 220, pad = 20, leftW = 60;
  const totalDepth = Math.max(layers.reduce((s, l) => s + l.thickness, 0), pileLen + 1);
  const scale = (H - 2 * pad) / totalDepth;
  const COLOURS: Record<string, string> = {
    'soft-clay': '#d4a373', 'firm-clay': '#c08c5a', 'stiff-clay': '#a0694a',
    'loose-sand': '#fde68a', 'medium-sand': '#fbbf24', 'dense-sand': '#d97706',
    'laterite-soft': '#f87171', 'laterite-hard': '#dc2626',
    'rock': '#94a3b8',
  };
  const pileW = Math.max(4, (pileDia / 1000) * (W - leftW - pad) * 0.3);
  const pileMidX = leftW + (W - leftW - pad) / 2;

  let y = pad;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={leftW / 2} y={pad - 4} fontSize={8} textAnchor="middle" fill="#64748b">Depth</text>
      {layers.map((l, i) => {
        const h = l.thickness * scale;
        const rect = <rect key={`r${i}`} x={leftW} y={y} width={W - leftW - pad} height={h}
          fill={COLOURS[l.soilType] ?? '#cbd5e1'} stroke="#94a3b8" strokeWidth={0.5} />;
        const label = <text key={`t${i}`} x={leftW + (W - leftW - pad) / 2} y={y + h / 2 + 3}
          fontSize={7} textAnchor="middle" fill="#1e293b">{l.soilType.replace('-', ' ')}</text>;
        const depthLabel = <text key={`d${i}`} x={leftW - 3} y={y + h}
          fontSize={7} textAnchor="end" fill="#64748b">{(layers.slice(0, i + 1).reduce((s, ll) => s + ll.thickness, 0)).toFixed(0)}m</text>;
        y += h;
        return [rect, label, depthLabel];
      })}
      {/* Pile */}
      <rect x={pileMidX - pileW / 2} y={pad} width={pileW} height={pileLen * scale}
        fill="#475569" fillOpacity={0.7} stroke="#1e293b" strokeWidth={1} />
      <text x={pileMidX} y={pad + pileLen * scale + 10} fontSize={7} textAnchor="middle" fill="#475569">
        L={pileLen}m
      </text>
      {/* Pile label */}
      <text x={pileMidX} y={pad - 4} fontSize={7} textAnchor="middle" fill="#475569">
        ⌀{pileDia}
      </text>
    </svg>
  );
}

export default function PileDesign() {
  const [inp, setInp] = useState<PileInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designPile> | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'utilisation'>('profile');

  const set = (k: keyof PileInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const updateLayer = (i: number, k: keyof SoilLayer, v: unknown) =>
    setInp(p => {
      const layers = p.layers.map((l, idx) => idx === i ? { ...l, [k]: v } : l);
      return { ...p, layers };
    });

  const addLayer = () => setInp(p => ({
    ...p, layers: [...p.layers, { thickness: 3, soilType: 'medium-sand' as SoilLayer['soilType'], phi: 30, gamma: 18 }],
  }));

  const removeLayer = (i: number) => setInp(p => ({ ...p, layers: p.layers.filter((_, idx) => idx !== i) }));

  const checks: UtilCheck[] = res ? [
    { label: 'Shaft friction', demand: res.Qs, capacity: res.Qu, unit: 'kN', note: 'Qs/Qu ratio' },
    { label: 'End bearing', demand: res.Qb, capacity: res.Qu, unit: 'kN', note: 'Qb/Qu ratio' },
  ] : [];

  const isClay = (t: string) => t.includes('clay');
  const isSand = (t: string) => t.includes('sand') || t.includes('laterite');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Pile Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Pile type" value={inp.pileType} onChange={v => set('pileType', v)}
              options={[
                { value: 'bored', label: 'Bored' },
                { value: 'driven-precast', label: 'Driven (precast)' },
                { value: 'driven-timber', label: 'Driven (timber)' },
              ]} />
            <SelectField label="Load type" value={inp.loadType} onChange={v => set('loadType', v)}
              options={[
                { value: 'compression', label: 'Compression' },
                { value: 'tension', label: 'Tension' },
              ]} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Diameter</label>
                <HelpTooltip title="Pile diameter" text="Shaft diameter. Common in Gambia: 300–600mm bored piles." typical="350–500 mm" />
              </div>
              <InputField label="" unit="mm" value={inp.diameter} onChange={v => set('diameter', +v)} min={150} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Embedded length</label>
                <HelpTooltip title="Pile length" text="Total embedded length below existing ground level." typical="8–20 m for most buildings" />
              </div>
              <InputField label="" unit="m" value={inp.length} onChange={v => set('length', +v)} min={1} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">GWT depth</label>
                <HelpTooltip title="Groundwater table" text="Depth from surface to groundwater. Affects effective stress in sand layers." typical="1–5 m in coastal Gambia" />
              </div>
              <InputField label="" unit="m" value={inp.gwt} onChange={v => set('gwt', +v)} min={0} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Factor of Safety</label>
                <HelpTooltip title="Factor of Safety" text="Applied to ultimate capacity to get allowable. Higher FoS for uncertain ground." typical="2.5 standard / 3.0 limited data" />
              </div>
              <InputField label="" value={inp.FoS} onChange={v => set('FoS', +v)} min={1.5} step={0.1} />
            </div>
          </div>

          {/* Soil layers */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Soil Profile (top to bottom)</p>
              <button onClick={addLayer} className="text-xs text-blue-600 hover:underline">+ Add layer</button>
            </div>
            <div className="space-y-2">
              {inp.layers.map((layer, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500">Layer {i + 1}</span>
                    {inp.layers.length > 1 && (
                      <button onClick={() => removeLayer(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <SelectField label="Soil type" value={layer.soilType}
                      onChange={v => updateLayer(i, 'soilType', v)}
                      options={SOIL_TYPES.map(t => ({ value: t, label: t.replace('-', ' ') }))} />
                    <InputField label="Thickness" unit="m" value={layer.thickness}
                      onChange={v => updateLayer(i, 'thickness', +v)} min={0.5} step={0.5} />
                    {isClay(layer.soilType) && (
                      <InputField label="cu" unit="kPa" value={layer.cu ?? 50}
                        onChange={v => updateLayer(i, 'cu', +v)} min={10} />
                    )}
                    {isSand(layer.soilType) && (
                      <InputField label="φ'" unit="°" value={layer.phi ?? 30}
                        onChange={v => updateLayer(i, 'phi', +v)} min={20} max={45} />
                    )}
                    <InputField label="Unit weight" unit="kN/m³" value={layer.gamma ?? 18}
                      onChange={v => updateLayer(i, 'gamma', +v)} min={14} max={22} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setRes(designPile(inp))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Calculate Pile Capacity
          </button>
        </Card>

        {/* Results */}
        <Card title="Capacity Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Shaft friction (Qs)" value={res.Qs.toFixed(0)} unit="kN" highlight />
              <ResultRow label="End bearing (Qb)" value={res.Qb.toFixed(0)} unit="kN" />
              <ResultRow label="Ultimate capacity (Qu)" value={res.Qu.toFixed(0)} unit="kN" highlight />
              <ResultRow label="Allowable (Qa = Qu/FoS)" value={res.Qa.toFixed(0)} unit="kN" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Shaft Friction by Layer</p>
              {res.layerFriction.map((lf, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">{lf.label}</span>
                  <span className="font-mono text-slate-800">{lf.Qs_layer.toFixed(0)} kN <span className="text-slate-400">(qs={lf.qs} kPa)</span></span>
                </div>
              ))}

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
              <p className="text-3xl">🪨</p>
              <p className="text-sm font-semibold text-slate-600">Pile capacity calculator</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">α-method for clay, β-method for sand/laterite. Build your soil profile and calculate.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Soil Profile & Utilisation" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['profile', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'profile' ? 'Soil Profile' : 'Capacity Split'}
              </button>
            ))}
          </div>
          {activeTab === 'profile' && (
            <>
              <SoilProfileSVG layers={inp.layers} pileLen={inp.length} pileDia={inp.diameter} />
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {[
                  { label: 'Soft clay', color: '#d4a373' }, { label: 'Firm clay', color: '#c08c5a' },
                  { label: 'Stiff clay', color: '#a0694a' }, { label: 'Loose sand', color: '#fde68a' },
                  { label: 'Med. sand', color: '#fbbf24' }, { label: 'Dense sand', color: '#d97706' },
                  { label: 'Laterite', color: '#f87171' }, { label: 'Rock', color: '#94a3b8' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Capacity breakdown" />
              : <p className="text-sm text-slate-400 text-center py-8">Run calculation first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
