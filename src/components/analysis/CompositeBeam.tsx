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
import { designCompositeBeam } from '../../utils/compositeBeamCalculations';
import { PORTAL_SECTIONS } from '../../utils/portalFrameCalculations';
import type { CompositeBeamInputs } from '../../utils/compositeBeamCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import CalcSheet from '../ui/CalcSheet';
import { compositeBeamCalcNotes } from '../../utils/calcNotesSteel';

const UB_SECTIONS = PORTAL_SECTIONS.filter(s => s.name.startsWith('UB'));

const defaultInp: CompositeBeamInputs = {
  span: 9,
  beamSpacing: 3,
  steelSection: 'UB 406×178×54',
  fyk: 355,
  slabDepth: 130,
  deckDepth: 60,
  fck: 25,
  deadLoadConst: 3.0,
  deadLoadFinal: 1.5,
  liveLoad: 4.0,
  interaction: 0.6,
  studDia: 19,
  studHeight: 95,
  studFu: 450,
  studsPerRow: 1,
};

// ── Section cross-section SVG ─────────────────────────────────────────────────
function CrossSectionSVG({ ha, bf, tf, tw, hc, deckDepth, beff }:
  { ha: number; bf: number; tf: number; tw: number; hc: number; deckDepth: number; beff: number }) {
  const W = 260, H = 200;
  const scale = Math.min((H * 0.6) / (ha + hc + deckDepth), (W * 0.5) / bf);
  const cx = W / 2, botY = H - 20;
  const steelTop = botY - ha * scale;
  const deckBot = steelTop - deckDepth * scale;
  const slabTop = deckBot - hc * scale;
  const beffW = Math.min(W - 20, beff * scale * 200);  // beff in m → mm

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Concrete slab */}
      <rect x={cx - beffW / 2} y={slabTop} width={beffW} height={hc * scale + deckDepth * scale}
        fill="#d1d5db" stroke="#6b7280" strokeWidth={0.5} />
      <text x={cx} y={slabTop - 4} textAnchor="middle" fontSize={7} fill="#6b7280">beff = {beff.toFixed(2)} m</text>
      {/* Deck profile hint (trapezoidal shading) */}
      {deckDepth > 0 && (
        <rect x={cx - beffW / 2} y={deckBot} width={beffW} height={deckDepth * scale}
          fill="#9ca3af" fillOpacity={0.4} stroke="#6b7280" strokeWidth={0.3} strokeDasharray="3,2" />
      )}
      {/* Stud */}
      <line x1={cx + 8} y1={steelTop} x2={cx + 8} y2={deckBot} stroke="#f59e0b" strokeWidth={2} />
      <circle cx={cx + 8} cy={deckBot} r={3} fill="#f59e0b" />
      <text x={cx + 14} y={(steelTop + deckBot) / 2 + 3} fontSize={6} fill="#d97706">stud</text>
      {/* Steel beam — flanges and web */}
      {/* Top flange */}
      <rect x={cx - (bf / 2) * scale} y={steelTop} width={bf * scale} height={tf * scale} fill="#475569" />
      {/* Web */}
      <rect x={cx - (tw / 2) * scale} y={steelTop + tf * scale} width={tw * scale} height={(ha - 2 * tf) * scale} fill="#475569" />
      {/* Bot flange */}
      <rect x={cx - (bf / 2) * scale} y={botY - tf * scale} width={bf * scale} height={tf * scale} fill="#475569" />
      {/* Dimensions */}
      <text x={cx} y={botY + 12} textAnchor="middle" fontSize={7} fill="#64748b">ha = {ha} mm</text>
      <text x={cx - beffW / 2 - 3} y={(slabTop + botY) / 2} fontSize={6} fill="#64748b" textAnchor="middle"
        transform={`rotate(-90,${cx - beffW / 2 - 6},${(slabTop + botY) / 2})`}>{(hc + deckDepth).toFixed(0)} mm slab</text>
    </svg>
  );
}

export default function CompositeBeam() {
  const [inp, setInp] = useState<CompositeBeamInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designCompositeBeam> | null>(null);
  const [activeTab, setActiveTab] = useState<'section' | 'utilisation'>('section');
  const { factors } = useBuildingCode();

  const set = (k: keyof CompositeBeamInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Bending (partial composite)', demand: res.Med, capacity: res.Mpl_partial, unit: 'kNm', note: 'MEd / Mpl,Rd',
      hint: 'Add more shear studs to increase composite action, or upsize the steel section.' },
    { label: 'Vertical shear', demand: res.Ved, capacity: res.VplRd, unit: 'kN', note: 'VEd / Vpl,Rd',
      hint: 'Shear is resisted by the steel web alone. Use a heavier section with a deeper, thicker web.' },
    { label: 'Deflection (L/360)', demand: res.delta_total, capacity: res.deltaLimit, unit: 'mm', note: 'δ / (L/360)',
      hint: 'Increase the steel section depth or use propped construction to reduce long-term deflection.' },
  ] : [];

  const sec = UB_SECTIONS.find(s => s.name === inp.steelSection) ?? UB_SECTIONS[3];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-600 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Layers size={22} />
          <h1 className="text-xl font-bold">Composite Beam Design</h1>
        </div>
        <p className="text-slate-200 text-sm">Steel-concrete composite beam design to EC4 including shear connector sizing</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Composite Beam Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Beam span</label>
                <HelpTooltip title="Simply-supported span" text="CL to CL bearing. Composite beams are typically simply supported." typical="6–15 m in commercial floors" />
              </div>
              <InputField label="" unit="m" value={inp.span} onChange={v => set('span', +v)} min={3} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Beam spacing</label>
                <HelpTooltip title="Secondary beam spacing" text="CL to CL of parallel beams. Controls tributary width and effective slab width." typical="2.5–4 m" />
              </div>
              <InputField label="" unit="m" value={inp.beamSpacing} onChange={v => set('beamSpacing', +v)} min={1} step={0.25} />
            </div>
            <SelectField label="Steel section (UB)" value={inp.steelSection}
              onChange={v => set('steelSection', v)}
              options={UB_SECTIONS.map(s => ({ value: s.name, label: s.name }))} />
            <SelectField label="Steel grade" value={String(inp.fyk)}
              onChange={v => set('fyk', +v)}
              options={[{ value: '275', label: 'S275' }, { value: '355', label: 'S355' }]} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Slab depth (total)</label>
                <HelpTooltip title="Overall slab thickness" text="Total depth including deck profile. EC4 minimum 90mm above deck." typical="120–150 mm above 60mm deck" />
              </div>
              <InputField label="" unit="mm" value={inp.slabDepth} onChange={v => set('slabDepth', +v)} min={90} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Deck depth</label>
                <HelpTooltip title="Profiled deck height" text="Height of deck ribs. Set 0 for solid slab." typical="45, 60 or 75 mm" />
              </div>
              <InputField label="" unit="mm" value={inp.deckDepth} onChange={v => set('deckDepth', +v)} min={0} />
            </div>
            <SelectField label="Concrete fck" value={String(inp.fck)}
              onChange={v => set('fck', +v)}
              options={[20, 25, 30, 35].map(f => ({ value: String(f), label: `C${f}/${f + 5}` }))} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Interaction η</label>
                <HelpTooltip title="Degree of shear connection" text="Ratio of shear force provided vs full composite. EC4 min 0.4 (or 0.5 for long spans)." typical="0.6–1.0" />
              </div>
              <InputField label="" value={inp.interaction} onChange={v => set('interaction', +v)} min={0.4} max={1.0} step={0.05} />
            </div>
            <InputField label="SDL (final)" unit="kN/m²" value={inp.deadLoadFinal} onChange={v => set('deadLoadFinal', +v)} min={0} step={0.25} />
            <InputField label="Live load" unit="kN/m²" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} step={0.5} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Stud diameter</label>
                <HelpTooltip title="Headed stud diameter" text="Standard headed studs. 19mm is most common. 22mm for higher capacity." typical="19 mm (450 fu)" />
              </div>
              <InputField label="" unit="mm" value={inp.studDia} onChange={v => set('studDia', +v)} min={13} max={25} />
            </div>
            <SelectField label="Studs per row" value={String(inp.studsPerRow)}
              onChange={v => set('studsPerRow', +v)}
              options={[{ value: '1', label: '1 per rib' }, { value: '2', label: '2 per rib' }]} />
          </div>
          <Button onClick={() => setRes(designCompositeBeam(inp))} fullWidth className="mt-4">
            Design Composite Beam
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Effective slab width (beff)" value={res.beff.toFixed(2)} unit="m" />
              <ResultRow label="Mpl,Rd (full composite)" value={res.Mpl_Rd.toFixed(0)} unit="kNm" />
              <ResultRow label={`Mpl,Rd (η=${inp.interaction})`} value={res.Mpl_partial.toFixed(0)} unit="kNm" highlight />
              <ResultRow label="MEd" value={res.Med.toFixed(0)} unit="kNm" />
              <ResultRow label="Bending utilisation" value={`${(res.util_bending * 100).toFixed(0)}%`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Shear Connectors</p>
              <ResultRow label="Stud resistance (PRd)" value={res.PRd_stud.toFixed(1)} unit="kN/stud" />
              <ResultRow label="Studs required (½ span)" value={String(res.nStudsRequired)} />
              <ResultRow label="Studs provided (½ span)" value={String(res.nStudsProvided)} highlight />
              <ResultRow label="Stud spacing" value={res.studSpacing.toFixed(0)} unit="mm" />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Vertical Shear</p>
              <ResultRow label="VEd" value={res.Ved.toFixed(0)} unit="kN" />
              <ResultRow label="Vpl,Rd" value={res.VplRd.toFixed(0)} unit="kN" />
              <ResultRow label="Shear utilisation" value={`${(res.util_shear * 100).toFixed(0)}%`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Deflection (SLS)</p>
              <ResultRow label="Construction (steel only)" value={`${res.delta_const.toFixed(1)}`} unit="mm" />
              <ResultRow label="Composite (imposed)" value={`${res.delta_comp.toFixed(1)}`} unit="mm" />
              <ResultRow label="Total" value={`${res.delta_total.toFixed(1)}`} unit="mm" highlight />
              <ResultRow label="Limit (L/360)" value={`${res.deltaLimit.toFixed(1)}`} unit="mm" />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Composite Beam Calculation Sheet"
                codeLabel={factors.label}
                steps={compositeBeamCalcNotes(inp, res, factors)}
              />
              <SaveDesignPanel memberType="beam"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🔩</p>
              <p className="text-sm font-semibold text-slate-600">Composite beam design</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">EC4: plastic stress block, headed shear studs, deflection at construction and composite stage.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Section & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['section', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'section' ? 'Cross Section' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'section' && (
            <>
              <CrossSectionSVG
                ha={sec.h} bf={sec.bf} tf={sec.tf} tw={sec.tw}
                hc={inp.slabDepth - inp.deckDepth}
                deckDepth={inp.deckDepth}
                beff={res?.beff ?? Math.min(inp.span / 4, inp.beamSpacing)}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-slate-400" /><span className="text-slate-500">Concrete slab</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-slate-600" /><span className="text-slate-500">Steel UB</span></div>
                <div className="flex items-center gap-2"><div className="w-1 h-3 rounded bg-amber-400" /><span className="text-slate-500">Headed stud connector</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Capacity checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
