import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { WORKED_EXAMPLES } from '../../data/workedExamples';
import type { WorkedExample } from '../../data/workedExamples';

const CATEGORY_LABELS: Record<WorkedExample['category'], string> = {
  beam: 'Beam', column: 'Column', slab: 'Slab', foundation: 'Foundation',
  'retaining-wall': 'Retaining Wall', staircase: 'Staircase', steel: 'Steel',
};
const DIFF_COLORS: Record<WorkedExample['difficulty'], string> = {
  basic: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};
const CODE_COLORS: Record<WorkedExample['code'], string> = {
  EC2: 'bg-blue-100 text-blue-700',
  BS8110: 'bg-slate-100 text-slate-700',
  ACI318: 'bg-violet-100 text-violet-700',
};

function Step({ step, idx }: { step: WorkedExample['steps'][0]; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <span className="text-sm font-semibold text-slate-700">{step.heading}</span>
        {!open && step.result && (
          <span className="ml-auto text-xs text-slate-500 font-mono truncate max-w-[200px]">{step.result}</span>
        )}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2">
          {step.body && <p className="text-sm text-slate-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: step.body.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />}
          {step.equation && (
            <pre className="bg-slate-800 text-emerald-300 text-xs rounded-lg px-3 py-2.5 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {step.equation}
            </pre>
          )}
          {step.result && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-blue-700">{step.result}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExampleCard({ ex }: { ex: WorkedExample }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-slate-50"
      >
        <BookOpen size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{ex.title}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ex.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
              {CATEGORY_LABELS[ex.category]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CODE_COLORS[ex.code]}`}>
              {ex.code}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[ex.difficulty]}`}>
              {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
            </span>
          </div>
        </div>
        {open
          ? <ChevronDown size={16} className="text-slate-400 mt-0.5 shrink-0" />
          : <ChevronRight size={16} className="text-slate-400 mt-0.5 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {ex.steps.map((step, i) => <Step key={i} step={step} idx={i} />)}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mt-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1">Conclusion</p>
            <p className="text-xs text-emerald-800 leading-relaxed">{ex.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkedExamples() {
  const [filterCat, setFilterCat] = useState<WorkedExample['category'] | 'all'>('all');
  const [filterCode, setFilterCode] = useState<WorkedExample['code'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = WORKED_EXAMPLES.filter(ex =>
    (filterCat === 'all' || ex.category === filterCat) &&
    (filterCode === 'all' || ex.code === filterCode) &&
    (search === '' || ex.title.toLowerCase().includes(search.toLowerCase()) || ex.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40"
          placeholder="Search examples…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
          value={filterCat} onChange={e => setFilterCat(e.target.value as typeof filterCat)}>
          <option value="all">All members</option>
          {(Object.entries(CATEGORY_LABELS) as [WorkedExample['category'], string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
          value={filterCode} onChange={e => setFilterCode(e.target.value as typeof filterCode)}>
          <option value="all">All codes</option>
          <option value="EC2">EC2</option>
          <option value="BS8110">BS8110</option>
          <option value="ACI318">ACI318</option>
        </select>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} example{filtered.length !== 1 ? 's' : ''} — click to expand step-by-step workings</p>

      {filtered.length === 0
        ? <p className="text-sm text-slate-400 text-center py-12">No examples match your filters.</p>
        : filtered.map(ex => <ExampleCard key={ex.id} ex={ex} />)
      }
    </div>
  );
}
