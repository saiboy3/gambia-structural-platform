/**
 * DesignWizard — "What do I need to design?" guided entry point.
 * Asks 4–5 plain-English questions then routes to the right design module
 * with pre-context set. Junior-friendly.
 */
import { useState } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

/* ── Question tree ─────────────────────────────────────────────────────────── */
type WorkCategory = 'building' | 'infrastructure' | 'geotechnical' | 'unsure';
type BuildingType  = 'residential' | 'commercial' | 'industrial' | 'mixed';
type ElementType   = 'beam' | 'column' | 'slab' | 'foundation' | 'staircase'
                   | 'retaining-wall' | 'steel' | 'boq';

interface Recommendation {
  page: string;
  title: string;
  why: string;
  steps: string[];
  tip?: string;
}

function getRecommendation(
  category: WorkCategory,
  element: ElementType | null,
  _buildingType: BuildingType | null,
): Recommendation {
  const map: Record<string, Recommendation> = {
    beam: {
      page: 'beam',
      title: 'RC Beam Design',
      why: 'You need to size a concrete beam and choose its reinforcement.',
      steps: ['Enter span and overall depth', 'Input dead and live loads (in kN/m)', 'Click "Design Beam" — results appear instantly'],
      tip: 'Not sure about loads? Use the Load Calculator first to convert area loads to line loads on the beam.',
    },
    column: {
      page: 'column',
      title: 'RC Column Design',
      why: 'You need to check a column for axial load plus bending.',
      steps: ['Enter column size and effective height', 'Input axial force (NEd) and moments', 'Review P-M interaction diagram'],
      tip: 'For a multi-storey building start at the ground floor column — it carries the most load.',
    },
    slab: {
      page: 'slab',
      title: 'RC Slab Design',
      why: 'You need to design a reinforced concrete floor or roof slab.',
      steps: ['Choose one-way or two-way spanning', 'Enter slab thickness and span(s)', 'Input imposed load (kN/m²)'],
      tip: 'Rule of thumb: slab depth ≈ span/20 for a simply-supported one-way slab.',
    },
    foundation: {
      page: 'foundation',
      title: 'Foundation Design',
      why: 'You need to size a pad or strip foundation and check bearing pressure.',
      steps: ['Enter column load (kN)', 'Input allowable bearing capacity from site investigation', 'Platform sizes the pad and designs reinforcement'],
    },
    staircase: {
      page: 'staircase',
      title: 'RC Staircase Design',
      why: 'You need to design a reinforced concrete stair flight.',
      steps: ['Enter riser and going dimensions', 'Set number of risers and flight width', 'Platform checks the 2R+G comfort rule and sizes the waist slab'],
    },
    'retaining-wall': {
      page: 'retaining-wall',
      title: 'Retaining Wall Design',
      why: 'You need to check a wall that holds back soil.',
      steps: ['Enter retained height and base width', 'Input soil properties (friction angle, density)', 'Platform checks overturning, sliding and bearing'],
      tip: 'If sliding FoS < 1.5, try increasing base width or adding a shear key.',
    },
    steel: {
      page: 'steel',
      title: 'Steel Member Design',
      why: 'You need to check a steel beam or column section.',
      steps: ['Select section from the catalogue (UC, UB, SHS)', 'Enter span and loading', 'Check bending, shear and LTB utilisation'],
    },
    boq: {
      page: 'boq',
      title: 'Bill of Quantities',
      why: 'You need to prepare a priced schedule of structural works.',
      steps: ['Add items using the cost database rates', 'Adjust quantities', 'Print or export the BOQ'],
    },
    infrastructure_culvert: {
      page: 'foundation',
      title: 'Box Culvert (coming soon)',
      why: 'Culvert and drainage design is on the roadmap.',
      steps: ['For now, use Foundation Design for simple slab/wall checks', 'Full culvert module coming in next release'],
    },
    geotechnical: {
      page: 'site-investigation',
      title: 'Site Investigation Log',
      why: 'Record borehole, trial pit, or DCP test data for the project.',
      steps: ['Create a new investigation record', 'Log soil layers, depths, and N-values', 'Set estimated bearing capacity for use in foundation design'],
    },
  };

  if (category === 'infrastructure') return map.infrastructure_culvert;
  if (category === 'geotechnical') return map.geotechnical;
  return map[element ?? 'beam'] ?? map.beam;
}

const CATEGORIES = [
  { id: 'building' as const,        label: 'Building structure',       desc: 'Beams, slabs, columns, foundations for houses, offices, warehouses', icon: '🏗️' },
  { id: 'infrastructure' as const,  label: 'Roads & infrastructure',   desc: 'Culverts, drainage, pavement design, retaining walls',               icon: '🛣️' },
  { id: 'geotechnical' as const,    label: 'Ground investigation',     desc: 'Log site investigation data, boreholes, trial pits',                  icon: '🔬' },
  { id: 'unsure' as const,          label: 'Not sure — guide me',      desc: 'Answer a few more questions and we\'ll recommend the right tool',     icon: '🤔' },
];

const BUILDING_TYPES = [
  { id: 'residential' as const, label: 'House / residential',   desc: 'Up to 4 storeys',          icon: '🏠' },
  { id: 'commercial'  as const, label: 'Office / commercial',   desc: 'Shops, offices, hotels',   icon: '🏢' },
  { id: 'industrial'  as const, label: 'Warehouse / factory',   desc: 'Large spans, heavy loads', icon: '🏭' },
  { id: 'mixed'       as const, label: 'Mixed use / other',     desc: 'Combination',              icon: '🏘️' },
];

const ELEMENTS: { id: ElementType; label: string; desc: string; icon: string }[] = [
  { id: 'beam',          label: 'Beam',          desc: 'Horizontal spanning member',              icon: '━' },
  { id: 'column',        label: 'Column',        desc: 'Vertical load-carrying member',           icon: '▐' },
  { id: 'slab',          label: 'Slab',          desc: 'Floor or roof plate',                     icon: '▬' },
  { id: 'foundation',    label: 'Foundation',    desc: 'Pad, strip, or pile cap',                 icon: '▽' },
  { id: 'staircase',     label: 'Staircase',     desc: 'RC stair flight',                         icon: '⬧' },
  { id: 'retaining-wall',label: 'Retaining wall',desc: 'Holds back soil or water',                icon: '▋' },
  { id: 'steel',         label: 'Steel member',  desc: 'Steel beam or column check',              icon: '⟨⟩' },
  { id: 'boq',           label: 'Cost estimate', desc: 'Bill of quantities in GMD',               icon: '₵' },
];

export default function DesignWizard({ onNavigate }: Props) {
  const [step, setStep]               = useState(0);
  const [category, setCategory]       = useState<WorkCategory | null>(null);
  const [buildingType, setBuildingType] = useState<BuildingType | null>(null);
  const [element, setElement]         = useState<ElementType | null>(null);
  const [done, setDone]               = useState(false);

  const recommendation = done
    ? getRecommendation(category!, element, buildingType)
    : null;

  const reset = () => { setStep(0); setCategory(null); setBuildingType(null); setElement(null); setDone(false); };

  /* ── Steps ───────────────────────────────────────────────────────────────── */
  const StepCategory = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 leading-relaxed">
        What kind of work are you doing today?
      </p>
      {CATEGORIES.map(c => (
        <button key={c.id} onClick={() => {
          setCategory(c.id);
          if (c.id === 'geotechnical') { setDone(true); return; }
          if (c.id === 'infrastructure') { setDone(true); return; }
          setStep(1);
        }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all group">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700">{c.label}</p>
            <p className="text-xs text-slate-500">{c.desc}</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-400" />
        </button>
      ))}
    </div>
  );

  const StepBuildingType = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">What type of building is it?</p>
      {BUILDING_TYPES.map(b => (
        <button key={b.id} onClick={() => { setBuildingType(b.id); setStep(2); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all group">
          <span className="text-2xl">{b.icon}</span>
          <div>
            <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700">{b.label}</p>
            <p className="text-xs text-slate-500">{b.desc}</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-400" />
        </button>
      ))}
    </div>
  );

  const StepElement = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Which structural element do you need to design?</p>
      <div className="grid grid-cols-2 gap-2">
        {ELEMENTS.map(e => (
          <button key={e.id} onClick={() => { setElement(e.id); setDone(true); }}
            className="flex items-start gap-2 px-3 py-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all group">
            <span className="text-lg font-mono text-slate-400 w-6 shrink-0">{e.icon}</span>
            <div>
              <p className="font-semibold text-slate-800 text-xs group-hover:text-blue-700">{e.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{e.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const Result = ({ rec }: { rec: Recommendation }) => (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-emerald-600 mb-1">✓ We recommend</p>
        <p className="font-bold text-emerald-800 text-base">{rec.title}</p>
        <p className="text-xs text-emerald-700 mt-1">{rec.why}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">How to use it:</p>
        <ol className="space-y-2">
          {rec.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {rec.tip && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tip</p>
          <p className="text-xs text-amber-800 leading-relaxed">{rec.tip}</p>
        </div>
      )}

      <button onClick={() => onNavigate(rec.page)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
        Open {rec.title} <ArrowRight size={14} />
      </button>

      <button onClick={reset} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
        ← Start over
      </button>
    </div>
  );

  const steps = [<StepCategory />, <StepBuildingType />, <StepElement />];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-xs font-semibold text-blue-300 mb-1 uppercase tracking-wide">Design Wizard</p>
        <h2 className="text-xl font-bold mb-1">What do you need to design?</h2>
        <p className="text-blue-200 text-sm">Answer a few questions and we'll take you straight to the right tool.</p>
      </div>

      {/* Progress dots */}
      {!done && (
        <div className="flex gap-2 px-1">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {done && recommendation
          ? <Result rec={recommendation} />
          : steps[step]}
      </div>

      {/* Back nav */}
      {step > 0 && !done && (
        <button onClick={() => setStep(s => s - 1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-1">
          <ChevronLeft size={12} /> Back
        </button>
      )}
    </div>
  );
}
