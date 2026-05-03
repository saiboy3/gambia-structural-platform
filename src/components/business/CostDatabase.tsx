import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { getItem, setItem, generateId, KEYS } from '../../utils/storage';
import { DEFAULT_COST_ITEMS } from '../../data/defaultCostItems';
import type { CostItem, CostCategory } from '../../types/app';

const CATEGORY_LABELS: Record<CostCategory, string> = {
  concrete: 'Concrete', steel: 'Steel / Rebar', formwork: 'Formwork',
  labour: 'Labour', aggregates: 'Aggregates & Cement', other: 'Other',
};
const CATEGORY_COLORS: Record<CostCategory, string> = {
  concrete: 'bg-blue-100 text-blue-700', steel: 'bg-slate-100 text-slate-700',
  formwork: 'bg-amber-100 text-amber-700', labour: 'bg-violet-100 text-violet-700',
  aggregates: 'bg-orange-100 text-orange-700', other: 'bg-emerald-100 text-emerald-700',
};

export default function CostDatabase() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CostItem>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState<CostCategory | 'all'>('all');
  const [quarterFilter, setQuarterFilter] = useState('Q1-2026');

  useEffect(() => {
    let stored = getItem<CostItem[]>(KEYS.COST_ITEMS, []);
    if (stored.length === 0) {
      stored = DEFAULT_COST_ITEMS.map(i => ({ ...i, id: generateId() }));
      setItem(KEYS.COST_ITEMS, stored);
    }
    setItems(stored);
  }, []);

  const save = (updated: CostItem[]) => { setItems(updated); setItem(KEYS.COST_ITEMS, updated); };

  const startEdit = (item: CostItem) => { setEditing(item.id); setEditForm(item); };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };
  const saveEdit = () => {
    if (!editing) return;
    save(items.map(i => i.id === editing ? { ...i, ...editForm } as CostItem : i));
    cancelEdit();
  };
  const deleteItem = (id: string) => save(items.filter(i => i.id !== id));

  const addItem = () => {
    const item: CostItem = {
      id: generateId(),
      category: (editForm.category as CostCategory) ?? 'other',
      description: editForm.description ?? '',
      unit: editForm.unit ?? '',
      rateGMD: editForm.rateGMD ?? 0,
      quarter: editForm.quarter ?? quarterFilter,
      source: editForm.source ?? '',
    };
    save([...items, item]);
    setShowAdd(false);
    setEditForm({});
  };

  const quarters = [...new Set(items.map(i => i.quarter))].sort().reverse();
  const filtered = items.filter(i =>
    i.quarter === quarterFilter &&
    (filterCat === 'all' || i.category === filterCat)
  );
  const grouped = filtered.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category]!.push(i);
    return acc;
  }, {} as Partial<Record<CostCategory, CostItem[]>>);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={quarterFilter} onChange={e => setQuarterFilter(e.target.value)}>
            {quarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={filterCat} onChange={e => setFilterCat(e.target.value as typeof filterCat)}>
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => { setShowAdd(true); setEditForm({ quarter: quarterFilter }); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Plus size={14} /> Add Rate
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">New Cost Item</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Description</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editForm.description ?? ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Category</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editForm.category ?? 'other'} onChange={e => setEditForm(p => ({ ...p, category: e.target.value as CostCategory }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Unit</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="m³, tonne, day…" value={editForm.unit ?? ''}
                onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Rate (GMD)</label>
              <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editForm.rateGMD ?? ''} onChange={e => setEditForm(p => ({ ...p, rateGMD: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Quarter</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="Q1-2026" value={editForm.quarter ?? ''}
                onChange={e => setEditForm(p => ({ ...p, quarter: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Source / Notes</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editForm.source ?? ''} onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addItem} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Save size={13} /> Save
            </button>
            <button onClick={() => { setShowAdd(false); setEditForm({}); }}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Grouped tables */}
      {(Object.keys(CATEGORY_LABELS) as CostCategory[]).map(cat => {
        const catItems = (grouped[cat] ?? []);
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat]}`}>{CATEGORY_LABELS[cat]}</span>
              <span className="text-xs text-slate-400">{catItems.length} items</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-2 font-semibold">Description</th>
                  <th className="text-center px-3 py-2 font-semibold">Unit</th>
                  <th className="text-right px-4 py-2 font-semibold">Rate (GMD)</th>
                  <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Source</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {catItems.map(item => editing === item.id ? (
                  <tr key={item.id} className="bg-blue-50">
                    <td className="px-4 py-1.5"><input className="w-full border border-blue-200 rounded px-2 py-1 text-xs outline-none" value={editForm.description ?? ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="w-16 border border-blue-200 rounded px-2 py-1 text-xs outline-none text-center" value={editForm.unit ?? ''} onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} /></td>
                    <td className="px-4 py-1.5"><input type="number" className="w-24 border border-blue-200 rounded px-2 py-1 text-xs outline-none text-right" value={editForm.rateGMD ?? ''} onChange={e => setEditForm(p => ({ ...p, rateGMD: +e.target.value }))} /></td>
                    <td className="px-3 py-1.5 hidden md:table-cell"><input className="w-full border border-blue-200 rounded px-2 py-1 text-xs outline-none" value={editForm.source ?? ''} onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))} /></td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="text-blue-600 hover:text-blue-800"><Save size={12} /></button>
                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{item.description}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">{item.rateGMD.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-400 hidden md:table-cell">{item.source}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-slate-600"><Edit2 size={12} /></button>
                        <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <p className="text-xs text-slate-400">Rates are in Gambian Dalasi (GMD). Update quarterly to reflect current market prices.</p>
    </div>
  );
}
