/**
 * GuidedBeam — Step-by-step guided input for beam design.
 * Guides junior engineers through every decision with plain-English explanations.
 * On completion, calls onDone(inputs) so BeamDesign can run the calculation.
 */
import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { getMaterial } from '../../utils/materials';
import type { BeamInputs, ConcreteGrade, RebarGrade } from '../../types/structural';

interface Props {
  initial: BeamInputs;
  onDone: (inp: BeamInputs) => void;
  onCancel: () => void;
}

/* ── Step data ─────────────────────────────────────────────────────────────── */
type BeamUse = 'floor' | 'roof' | 'lintel' | 'transfer' | 'other';

const BEAM_USES: { id: BeamUse; label: string; desc: string; icon: string }[] = [
  { id: 'floor',    label: 'Floor beam',    desc: 'Supports a floor slab — the most common type',             icon: '🏢' },
  { id: 'roof',     label: 'Roof beam',     desc: 'Supports a roof slab or purlins',                          icon: '🏠' },
  { id: 'lintel',   label: 'Lintel',        desc: 'Spans over a door or window opening',                       icon: '🚪' },
  { id: 'transfer', label: 'Transfer beam', desc: 'Carries loads from columns above — needs special care',     icon: '⚠️' },
  { id: 'other',    label: 'Other',         desc: 'General purpose beam',                                       icon: '📐' },
];

const SUPPORT_TYPES = [
  {
    id: 'simply-supported' as const,
    label: 'Simply supported',
    desc: 'Rests on two walls or columns. Cannot rotate at supports.',
    icon: '⊣—⊢',
    typicalUse: 'Most floor and roof beams',
  },
  {
    id: 'continuous' as const,
    label: 'Continuous',
    desc: 'Runs over three or more supports — more efficient, needs hogging steel at supports.',
    icon: '⊣——⊣——⊢',
    typicalUse: 'Long runs of floor beams in multi-bay buildings',
  },
  {
    id: 'cantilever' as const,
    label: 'Cantilever',
    desc: 'Fixed at one end, free at the other. Think of a balcony projection.',
    icon: '█——▶',
    typicalUse: 'Balconies, canopies, overhangs',
  },
];

const TYPICAL_LOADS: Record<BeamUse, { dead: number; live: number; note: string }> = {
  floor:    { dead: 7,  live: 3,   note: 'Includes slab self-weight, screed & finishes. Live load = residential.' },
  roof:     { dead: 5,  live: 1.5, note: 'Includes slab self-weight, waterproofing. Live load = maintenance.' },
  lintel:   { dead: 12, live: 0,   note: 'Masonry wall load above. No live load directly on lintel.' },
  transfer: { dead: 30, live: 15,  note: 'Heavy! Check with senior engineer. Default is conservative.' },
  other:    { dead: 10, live: 5,   note: 'Generic values — update based on your actual loading.' },
};

interface State extends BeamInputs { beamUse: BeamUse }

export default function GuidedBeam({ initial, onDone, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>({ ...initial, beamUse: 'floor' });
  const set = <K extends keyof State>(k: K, v: State[K]) => setState(p => ({ ...p, [k]: v }));
  const setMat = (c: string, r: string) => set('material', getMaterial(c as ConcreteGrade, r as RebarGrade));

  const STEPS = [
    'Beam type',
    'Support conditions',
    'Span & size',
    'Loading',
    'Materials',
    'Review',
  ];

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  /* ── Individual step content ─────────────────────────────────────────────── */

  const StepType = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 leading-relaxed">
        What is this beam being used for? This helps suggest typical load values.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {BEAM_USES.map(u => (
          <button key={u.id} onClick={() => {
            set('beamUse', u.id);
            const loads = TYPICAL_LOADS[u.id];
            setState(p => ({ ...p, beamUse: u.id, deadLoad: loads.dead, liveLoad: loads.live }));
          }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
              ${state.beamUse === u.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <span className="text-2xl">{u.icon}</span>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{u.label}</p>
              <p className="text-xs text-slate-500">{u.desc}</p>
            </div>
            {state.beamUse === u.id && <CheckCircle size={16} className="text-blue-500 ml-auto shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );

  const StepSupport = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">How is the beam supported at its ends?</p>
      <div className="space-y-2">
        {SUPPORT_TYPES.map(s => (
          <button key={s.id} onClick={() => set('supportType', s.id)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
              ${state.supportType === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <code className="text-slate-400 text-xs mt-0.5 shrink-0 font-mono bg-slate-100 px-2 py-1 rounded">{s.icon}</code>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{s.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Typical use: {s.typicalUse}</p>
            </div>
            {state.supportType === s.id && <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />}
          </button>
        ))}
      </div>
    </div>
  );

  const StepSize = () => {
    const guidedDepth = Math.round(state.span * 1000 /
      (state.supportType === 'cantilever' ? 8 : state.supportType === 'continuous' ? 26 : 20) / 25) * 25;

    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Enter the beam geometry.</p>

        <div className="space-y-3">
          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600">Span (L)</span>
              <span className="text-xs text-slate-400">metres</span>
            </div>
            <input type="number" min={0.5} max={30} step={0.5}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={state.span}
              onChange={e => setState(p => ({ ...p, span: +e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">The clear distance between supports</p>
          </label>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">💡 Suggested depth</p>
            <p className="text-sm font-bold text-blue-800">{guidedDepth} mm</p>
            <p className="text-xs text-blue-600">
              Based on EC2 span/depth ratio of {state.supportType === 'cantilever' ? 8 : state.supportType === 'continuous' ? 26 : 20}
              {' '}for a {state.supportType} beam spanning {state.span} m.
            </p>
          </div>

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600">Depth (h)</span>
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <input type="number" min={150} max={2000} step={25}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={state.depth}
              onChange={e => setState(p => ({ ...p, depth: +e.target.value }))} />
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600">Width (bw)</span>
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <input type="number" min={150} max={1000} step={25}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={state.width}
              onChange={e => setState(p => ({ ...p, width: +e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Typically 200–300 mm for floor beams. Width/depth ≥ 0.3 recommended.</p>
          </label>
        </div>
      </div>
    );
  };

  const StepLoading = () => {
    const loads = TYPICAL_LOADS[state.beamUse];
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the loads on the beam. The suggested values are typical for a <strong>{state.beamUse}</strong> beam.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700 mb-1">How to estimate these loads:</p>
          <p className="leading-relaxed">{loads.note}</p>
        </div>

        <label className="block">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-xs font-semibold text-slate-700">Dead Load (Gk)</span>
              <p className="text-xs text-slate-400">Permanent loads — self-weight of slab, finishes, partitions</p>
            </div>
            <span className="text-xs text-slate-400">kN/m</span>
          </div>
          <input type="number" min={0} step={0.5}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            value={state.deadLoad}
            onChange={e => setState(p => ({ ...p, deadLoad: +e.target.value }))} />
        </label>

        <label className="block">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-xs font-semibold text-slate-700">Live Load (Qk)</span>
              <p className="text-xs text-slate-400">Variable loads — people, furniture, equipment</p>
            </div>
            <span className="text-xs text-slate-400">kN/m</span>
          </div>
          <input type="number" min={0} step={0.5}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            value={state.liveLoad}
            onChange={e => setState(p => ({ ...p, liveLoad: +e.target.value }))} />
        </label>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">Design load (ULS):</p>
          <p className="font-mono text-sm">
            wEd = 1.35 × {state.deadLoad} + 1.5 × {state.liveLoad} = <strong>{(1.35 * state.deadLoad + 1.5 * state.liveLoad).toFixed(1)} kN/m</strong>
          </p>
        </div>
      </div>
    );
  };

  const StepMaterials = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Choose the concrete and reinforcement grades. EC2 defaults are pre-selected.</p>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700 mb-2 block">Concrete grade (fck)</span>
        <div className="grid grid-cols-3 gap-2">
          {(['C20/25','C25/30','C30/37','C35/45','C40/50'] as ConcreteGrade[]).map(c => (
            <button key={c} onClick={() => setMat(c, state.material.rebar)}
              className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
                ${state.material.concrete === c ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <strong>C25/30</strong> is standard for Gambia structural concrete. Use C30/37+ for aggressive exposure (coastal, foundation).
        </div>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700 mb-2 block">Reinforcement grade (fyk)</span>
        <div className="grid grid-cols-3 gap-2">
          {(['B500B','B500C','B250'] as RebarGrade[]).map(r => (
            <button key={r} onClick={() => setMat(state.material.concrete, r)}
              className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
                ${state.material.rebar === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <strong>B500B</strong> is the standard deformed high-yield bar used in Gambia. B250 (mild steel) is obsolete but still found on site.
        </div>
      </label>

      <label className="block">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-700">Cover to reinforcement</span>
          <span className="text-xs text-slate-400">mm</span>
        </div>
        <input type="number" min={20} max={75} step={5}
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          value={state.cover}
          onChange={e => setState(p => ({ ...p, cover: +e.target.value }))} />
        <p className="text-xs text-slate-400 mt-1">
          Minimum: 35 mm coastal / 30 mm inland for beams. Increases for aggressive exposure.
        </p>
      </label>
    </div>
  );

  const StepReview = () => {
    const wEd = 1.35 * state.deadLoad + 1.5 * state.liveLoad;
    const rows = [
      { label: 'Beam use', value: BEAM_USES.find(u => u.id === state.beamUse)?.label },
      { label: 'Support', value: SUPPORT_TYPES.find(s => s.id === state.supportType)?.label },
      { label: 'Span', value: `${state.span} m` },
      { label: 'Depth × Width', value: `${state.depth} × ${state.width} mm` },
      { label: 'Cover', value: `${state.cover} mm` },
      { label: 'Dead load (Gk)', value: `${state.deadLoad} kN/m` },
      { label: 'Live load (Qk)', value: `${state.liveLoad} kN/m` },
      { label: 'Design UDL (wEd)', value: `${wEd.toFixed(1)} kN/m`, highlight: true },
      { label: 'Concrete', value: state.material.concrete },
      { label: 'Rebar', value: state.material.rebar },
    ];
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Check everything looks right before running the design.</p>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {rows.map(r => (
            <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 ${r.highlight ? 'bg-blue-50' : ''}`}>
              <span className="text-xs text-slate-500">{r.label}</span>
              <span className={`text-xs font-semibold ${r.highlight ? 'text-blue-700' : 'text-slate-800'}`}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const stepContent = [<StepType />, <StepSupport />, <StepSize />, <StepLoading />, <StepMaterials />, <StepReview />];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          {STEPS.map((_s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          <Button onClick={onCancel} variant="ghost" size="sm" className="!px-0 !py-0">Cancel guided mode</Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        {stepContent[step]}
      </div>

      {/* Navigation */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <Button onClick={back} disabled={step === 0} variant="secondary" icon={<ChevronLeft size={14} />} className="rounded-xl">
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="rounded-xl">
            Next <ChevronRight size={14} />
          </Button>
        ) : (
          <Button onClick={() => onDone(state)} variant="success" icon={<CheckCircle size={14} />} className="rounded-xl">
            Run Design
          </Button>
        )}
      </div>
    </div>
  );
}
