import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import BeamSection from '../visuals/BeamSection';
import Beam3D from '../visuals/ThreeD/Beam3D';
import BMDDiagram from '../visuals/BMDDiagram';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import CalcSheet from '../ui/CalcSheet';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import GuidedBeam from '../wizard/GuidedBeam';
import { getMaterial } from '../../utils/materials';
import { designBeam } from '../../utils/beamCalculations';
import { beamCalcNotes } from '../../utils/calcNotes';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { BeamInputs, BeamResults, ConcreteGrade, RebarGrade } from '../../types/structural';
import { BookOpen, Sliders } from 'lucide-react';

const defaultInputs: BeamInputs = {
  span: 6, width: 250, depth: 450, cover: 35,
  deadLoad: 15, liveLoad: 10,
  supportType: 'simply-supported',
  material: getMaterial('C25/30', 'B500B'),
};

function buildChecks(inp: BeamInputs, res: BeamResults, factors: ReturnType<typeof useBuildingCode>['factors']): UtilCheck[] {
  const { fck } = inp.material;
  const Klim = 0.167;
  const K = (res.Med * 1e6) / (fck * inp.width * res.d * res.d);
  const limitRatio = inp.supportType === 'cantilever' ? factors.spanDepthCantilever
    : inp.supportType === 'continuous' ? factors.spanDepthContinuous : factors.spanDepthSimple;
  const actualLD = (inp.span * 1000) / res.d;

  return [
    {
      label: 'Bending (K-value)',
      demand: +K.toFixed(4),
      capacity: Klim,
      note: 'K / Klim',
      unit: '',
      hint: 'K > 0.167 means the compression zone is over-stressed. Increase beam depth or add top compression bars.',
    },
    {
      label: 'Flexural steel',
      demand: res.mainBars.As,
      capacity: res.AsReq,
      unit: 'mm²',
      note: 'As,prov / As,req',
      invert: true,
      hint: 'Provided steel must meet required area. Select a larger bar diameter or increase the bar count.',
    },
    {
      label: 'Shear',
      demand: res.Ved,
      capacity: res.Ved / (res.shearOK ? 0.95 : 1.05),
      unit: 'kN',
      note: 'VEd / VRd',
      hint: 'Reduce link spacing, add stirrup legs, or widen the web to raise shear capacity.',
    },
    {
      label: 'Span / depth (deflection)',
      demand: +actualLD.toFixed(1),
      capacity: +limitRatio.toFixed(1),
      note: 'actual / limit',
      hint: 'Ratio too high means excessive deflection. Increase beam depth or add compression steel.',
    },
    {
      label: 'Crack width',
      demand: +((res as unknown as Record<string,unknown>).crackWidth as number ?? 0).toFixed(3),
      capacity: 0.3,
      unit: 'mm',
      note: 'wk / wmax',
      hint: 'Use smaller-diameter bars at closer spacing to distribute tension across the face.',
    },
  ];
}

export default function BeamDesign() {
  const [inp, setInp]       = useState<BeamInputs>(defaultInputs);
  const [res, setRes]       = useState<BeamResults | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [mode, setMode]     = useState<'standard' | 'guided'>('standard');
  const [activeTab, setActiveTab] = useState<'diagram' | 'section' | 'utilisation'>('diagram');
  const { factors } = useBuildingCode();

  const set = (key: keyof BeamInputs, val: string | number) =>
    setInp(prev => ({ ...prev, [key]: val }));
  const setMat = (c: string, r: string) =>
    setInp(prev => ({ ...prev, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));
  const run = (overrideInp?: BeamInputs) => {
    const target = overrideInp ?? inp;
    if (overrideInp) setInp(overrideInp);
    setRes(designBeam(target, factors));
    setMode('standard');
  };

  const wEd = 1.35 * inp.deadLoad + 1.5 * inp.liveLoad;

  return (
    <div className="space-y-3">
      {/* Project selector + mode toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
        <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setMode('standard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${mode === 'standard' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <Sliders size={12} /> Standard
          </button>
          <button onClick={() => setMode('guided')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${mode === 'guided' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <BookOpen size={12} /> Guided
          </button>
        </div>
      </div>

      {/* Guided mode */}
      {mode === 'guided' && (
        <GuidedBeam
          initial={inp}
          onDone={run}
          onCancel={() => setMode('standard')}
        />
      )}

      {/* Standard mode */}
      {mode === 'standard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Inputs ────────────────────────────────────────────── */}
          <Card title="Beam Parameters" className="lg:col-span-1">
            <div className="grid grid-cols-2 gap-3">

              {/* Span */}
              <div className="col-span-2">
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium text-slate-600">Support condition</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['simply-supported','continuous','cantilever'] as const).map(s => (
                    <button key={s} onClick={() => set('supportType', s)}
                      className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                        inp.supportType === s
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 text-slate-500 hover:border-blue-300'
                      }`}>
                      {s === 'simply-supported' ? 'Simply Sup.' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Span (L)</label>
                  <HelpTooltip
                    title="Beam span"
                    text="The clear distance between the faces of supports, or centre-to-centre of bearings."
                    typical="3–9 m for floor beams in Gambia"
                    effect="Longer span → larger moment → more steel or deeper beam"
                  />
                </div>
                <InputField label="" unit="m" value={inp.span} onChange={v => set('span', +v)} min={0.5} />
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Width (bw)</label>
                  <HelpTooltip
                    title="Web width"
                    text="The width of the rectangular beam web. For T-beams this is the narrow part."
                    typical="200–350 mm for most beams"
                    effect="Wider beam → more shear capacity → fewer links needed"
                  />
                </div>
                <InputField label="" unit="mm" value={inp.width} onChange={v => set('width', +v)} min={150} />
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Depth (h)</label>
                  <HelpTooltip
                    title="Overall depth"
                    text="Total beam depth from top to bottom face. Effective depth (d) is slightly less after cover and bars."
                    typical={`${Math.round(inp.span * 1000 / 20 / 25) * 25}–${Math.round(inp.span * 1000 / 15 / 25) * 25} mm for ${inp.span} m span`}
                    effect="Deeper beam → larger lever arm → less steel needed"
                  />
                </div>
                <InputField label="" unit="mm" value={inp.depth} onChange={v => set('depth', +v)} min={150} />
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Cover</label>
                  <HelpTooltip
                    title="Nominal cover"
                    text="Distance from the outer face of concrete to the nearest bar surface. Protects steel from corrosion."
                    typical="35 mm coastal / 30 mm inland for beams"
                    effect="More cover → smaller effective depth → slightly more steel needed"
                  />
                </div>
                <InputField label="" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={20} />
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Dead load (Gk)</label>
                  <HelpTooltip
                    title="Characteristic dead load"
                    text="Permanent loads: self-weight of slab, screed, finishes, permanent partitions."
                    typical="5–15 kN/m for floor beams depending on slab span and thickness"
                    effect="Factor 1.35 applied at ULS"
                  />
                </div>
                <InputField label="" unit="kN/m" value={inp.deadLoad} onChange={v => set('deadLoad', +v)} min={0} />
              </div>

              <div>
                <div className="flex items-center gap-0.5">
                  <label className="text-xs font-medium text-slate-600">Live load (Qk)</label>
                  <HelpTooltip
                    title="Characteristic imposed load"
                    text="Variable loads: people, furniture, equipment. Does not include wind."
                    typical="2.0 kN/m² residential, 3.0–4.0 kN/m² office — multiply by tributary width"
                    effect="Factor 1.5 applied at ULS"
                  />
                </div>
                <InputField label="" unit="kN/m" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} />
              </div>

              {/* Design UDL preview */}
              <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Design UDL (wEd)</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{wEd.toFixed(1)} kN/m</span>
              </div>

              <SelectField label="Concrete" value={inp.material.concrete}
                onChange={v => setMat(v, inp.material.rebar)}
                options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
              <SelectField label="Rebar" value={inp.material.rebar}
                onChange={v => setMat(inp.material.concrete, v)}
                options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />

              <SelectField label="Section" value={inp.flange ? 'T' : 'rect'}
                onChange={v => setInp(p => ({ ...p, flange: v === 'T' ? { width: 800, thickness: 120 } : undefined }))}
                options={[{ value: 'rect', label: 'Rectangular' }, { value: 'T', label: 'T-beam / Flanged' }]} />
              <div /> {/* spacer */}

              {inp.flange && <>
                <InputField label="Flange width (bf)" unit="mm" value={inp.flange.width}
                  onChange={v => setInp(p => ({ ...p, flange: { ...p.flange!, width: +v } }))} min={inp.width} />
                <InputField label="Flange thickness (hf)" unit="mm" value={inp.flange.thickness}
                  onChange={v => setInp(p => ({ ...p, flange: { ...p.flange!, thickness: +v } }))} min={50} />
              </>}
            </div>

            <button onClick={() => run()}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              Design Beam
            </button>
          </Card>

          {/* ── Results ───────────────────────────────────────────── */}
          <Card title="Design Results" className="lg:col-span-1">
            {res ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge status={res.status} />
                  <span className="text-xs text-slate-500">{factors.label} Design</span>
                </div>

                <p className="text-xs font-semibold text-slate-500 mb-1 mt-2">Design Actions</p>
                <ResultRow label="Design Moment (MEd)" value={res.Med} unit="kNm" highlight />
                <ResultRow label="Design Shear (VEd)" value={res.Ved} unit="kN" highlight />

                <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Bending Reinforcement</p>
                <ResultRow label="Effective depth (d)" value={res.d} unit="mm" />
                <ResultRow label="Neutral axis (x)" value={res.x} unit="mm" />
                <ResultRow label="As required" value={res.AsReq} unit="mm²" />
                <ResultRow label="Main bars" value={`${res.mainBars.count}T${res.mainBars.dia}`} />
                <ResultRow label="As provided" value={res.mainBars.As} unit="mm²" />

                <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Shear</p>
                <ResultRow label="Stirrups" value={`T${res.stirrups.dia}@${res.stirrups.spacing}mm (${res.stirrups.legs}legs)`} />
                <ResultRow label="Shear check" value={res.shearOK ? '✓ Pass' : '✗ Fail'} />

                <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Serviceability</p>
                <ResultRow label="Deflection" value={res.deflectionOK ? '✓ Pass' : '✗ Fail'} />
                <ResultRow label="Crack width (wk)" value={((res as unknown as Record<string,unknown>).crackWidth as number ?? 0).toFixed(3)} unit="mm" />
                <ResultRow label="Crack check" value={(res as unknown as Record<string,unknown>).crackOK ? '✓ Pass' : '✗ Fail'} />

                {!!(res as unknown as Record<string,unknown>).isT && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">T-beam</p>
                    <ResultRow label="Effective flange width" value={(res as unknown as Record<string,unknown>).bEff as number} unit="mm" />
                  </>
                )}

                <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                  {res.messages.map((m, i) => (
                    <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Materials</p>
                <ResultRow label="fck" value={inp.material.fck} unit="MPa" />
                <ResultRow label="fyd" value={inp.material.fyd.toFixed(1)} unit="MPa" />

                <CalcSheet title="Beam Calculation Sheet" codeLabel={factors.label} steps={beamCalcNotes(inp, res, factors)} />
                <SaveDesignPanel memberType="beam"
                  inputs={inp as unknown as Record<string, unknown>}
                  results={res as unknown as Record<string, unknown>} />
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <p className="text-3xl">📐</p>
                <p className="text-sm font-semibold text-slate-600">Ready to design</p>
                <p className="text-xs text-slate-400 max-w-48 mx-auto">Adjust the parameters on the left then click <strong>Design Beam</strong></p>
                <button onClick={() => setMode('guided')}
                  className="mt-2 text-xs text-blue-600 hover:underline">
                  New to beam design? Try Guided mode →
                </button>
              </div>
            )}
          </Card>

          {/* ── Visuals ───────────────────────────────────────────── */}
          <Card title="Diagrams & Visuals" className="lg:col-span-1">
            {/* Tab strip */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
              {([
                { id: 'diagram',     label: 'BMD / SFD' },
                { id: 'section',     label: 'Section' },
                { id: 'utilisation', label: 'Utilisation' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${activeTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'diagram' && (
              <BMDDiagram
                span={inp.span}
                supportType={inp.supportType}
                wEd={wEd}
                Med={res?.Med ?? (wEd * inp.span * inp.span / 8)}
                Ved={res?.Ved ?? (wEd * inp.span / 2)}
              />
            )}

            {activeTab === 'section' && (
              <>
                <div className="flex justify-end mb-2">
                  {res && (
                    <button onClick={() => setShow3D(p => !p)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
                      {show3D ? '2D' : '3D'} View
                    </button>
                  )}
                </div>
                {res ? (
                  show3D
                    ? <Beam3D inputs={inp} results={res} />
                    : <BeamSection inputs={inp} results={res} />
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
                )}
              </>
            )}

            {activeTab === 'utilisation' && (
              res
                ? <UtilisationBars checks={buildChecks(inp, res, factors)} title="Check utilisation" />
                : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
