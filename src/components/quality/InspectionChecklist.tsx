import { useState, useEffect } from 'react';
import { Plus, CheckSquare, Square, Printer, ClipboardCheck } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import { getItem, setItem, generateId, KEYS } from '../../utils/storage';
import { CHECKLIST_TEMPLATES } from '../../data/checklistTemplates';
import type { InspectionChecklist, ChecklistType } from '../../types/app';

const TYPE_LABELS: Record<ChecklistType, string> = {
  'pre-pour': 'Pre-Pour Inspection',
  'placement': 'Concrete Placement',
  'post-pour': 'Post-Pour / Curing',
};

export default function InspectionChecklistPage() {
  const { projects, currentProject } = useProject();
  const { users, currentUser } = useUser();
  const [checklists, setChecklists] = useState<InspectionChecklist[]>([]);
  const [active, setActive] = useState<InspectionChecklist | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ projectId: currentProject?.id ?? '', type: 'pre-pour' as ChecklistType, elementRef: '', date: '' });

  useEffect(() => {
    setChecklists(getItem<InspectionChecklist[]>(KEYS.CHECKLISTS, []));
  }, []);

  const save = (updated: InspectionChecklist[]) => {
    setChecklists(updated);
    setItem(KEYS.CHECKLISTS, updated);
  };

  const createNew = () => {
    if (!newForm.elementRef || !currentUser) return;
    const template = CHECKLIST_TEMPLATES[newForm.type].map(item => ({ ...item, id: generateId() }));
    const cl: InspectionChecklist = {
      id: generateId(),
      projectId: newForm.projectId || currentProject?.id || '',
      type: newForm.type,
      elementRef: newForm.elementRef,
      date: newForm.date || new Date().toISOString().split('T')[0],
      inspectorId: currentUser.id,
      items: template,
      signedOff: false,
    };
    const updated = [...checklists, cl];
    save(updated);
    setActive(cl);
    setShowNew(false);
  };

  const toggleItem = (itemId: string) => {
    if (!active || active.signedOff) return;
    const updated = checklists.map(cl =>
      cl.id === active.id
        ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
        : cl
    );
    save(updated);
    setActive(updated.find(cl => cl.id === active.id) ?? null);
  };

  const updateNote = (itemId: string, note: string) => {
    if (!active || active.signedOff) return;
    const updated = checklists.map(cl =>
      cl.id === active.id
        ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, note } : i) }
        : cl
    );
    save(updated);
    setActive(updated.find(cl => cl.id === active.id) ?? null);
  };

  const signOff = () => {
    if (!active || !currentUser || (currentUser.role === 'junior')) return;
    const updated = checklists.map(cl =>
      cl.id === active.id
        ? { ...cl, signedOff: true, signedOffBy: currentUser.id, signedOffAt: new Date().toISOString() }
        : cl
    );
    save(updated);
    setActive(updated.find(cl => cl.id === active.id) ?? null);
  };

  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? '—';
  const userName = (id?: string) => id ? users.find(u => u.id === id)?.name ?? '—' : '—';

  if (active) {
    const checkedCount = active.items.filter(i => i.checked).length;
    const total = active.items.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button onClick={() => setActive(null)} variant="secondary" size="sm">← Back</Button>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">{TYPE_LABELS[active.type]}</h3>
            <p className="text-xs text-slate-500">{active.elementRef} · {projectName(active.projectId)} · {active.date}</p>
          </div>
          <span className="text-xs text-slate-500">{checkedCount}/{total} items</span>
          {active.signedOff && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Signed off</span>}
          <Button onClick={() => window.print()} variant="secondary" size="sm" icon={<Printer size={11} />}>
            Print
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(checkedCount / total) * 100}%` }} />
        </div>

        <Card title="">
          <div className="space-y-1">
            {active.items.map(item => (
              <div key={item.id} className={`flex gap-3 p-2.5 rounded-lg ${item.checked ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                <button onClick={() => toggleItem(item.id)} className="mt-0.5 shrink-0">
                  {item.checked
                    ? <CheckSquare size={16} className="text-emerald-600" />
                    : <Square size={16} className="text-slate-400" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${item.checked ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                    {item.description}
                  </p>
                  {!active.signedOff && (
                    <input className="mt-1 w-full text-xs border-0 border-b border-slate-200 outline-none bg-transparent text-slate-400 placeholder-slate-300"
                      placeholder="Note (optional)" value={item.note}
                      onChange={e => updateNote(item.id, e.target.value)} />
                  )}
                  {active.signedOff && item.note && <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {!active.signedOff && (
          <div className="flex gap-2">
            <Button onClick={signOff} variant="success" fullWidth
              disabled={!currentUser || currentUser.role === 'junior' || checkedCount < total}>
              Sign Off Checklist {checkedCount < total ? `(${total - checkedCount} remaining)` : ''}
            </Button>
          </div>
        )}
        {active.signedOff && (
          <p className="text-xs text-emerald-600 text-center">
            Signed off by {userName(active.signedOffBy)} · {active.signedOffAt ? new Date(active.signedOffAt).toLocaleString() : ''}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck size={22} />
          <h1 className="text-xl font-bold">Inspection Checklists</h1>
        </div>
        <p className="text-teal-200 text-sm">Pre-pour, placement and post-pour site inspection checklists with senior engineer sign-off.</p>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">All Checklists</h3>
        <Button onClick={() => setShowNew(true)} icon={<Plus size={14} />}>New Checklist</Button>
      </div>

      {showNew && (
        <Card title="New Checklist">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Type</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={newForm.type} onChange={e => setNewForm(p => ({ ...p, type: e.target.value as ChecklistType }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Date</label>
              <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={newForm.date} onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Project</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={newForm.projectId} onChange={e => setNewForm(p => ({ ...p, projectId: e.target.value }))}>
                <option value="">— Select —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Element / Location *</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. Ground Floor Slab" value={newForm.elementRef}
                onChange={e => setNewForm(p => ({ ...p, elementRef: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={createNew} fullWidth>Create Checklist</Button>
            <Button onClick={() => setShowNew(false)} variant="secondary">Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {checklists.length === 0 ? (
          <p className="text-sm text-slate-400 col-span-2 text-center py-8">No checklists yet. Click "New Checklist" to get started.</p>
        ) : checklists.map(cl => {
          const done = cl.items.filter(i => i.checked).length;
          return (
            <button key={cl.id} onClick={() => setActive(cl)}
              className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{TYPE_LABELS[cl.type]}</p>
                  <p className="text-xs text-slate-500">{cl.elementRef} · {projectName(cl.projectId)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cl.date} · {userName(cl.inspectorId)}</p>
                </div>
                {cl.signedOff
                  ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium shrink-0">Signed off</span>
                  : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">{done}/{cl.items.length}</span>}
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(done / cl.items.length) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
