import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Receipt } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import Button, { IconButton } from '../ui/Button';

type Category = 'Labour' | 'Materials' | 'Equipment' | 'Transport' | 'Overheads' | 'Professional' | 'Other';

interface Expense {
  id: string;
  date: string;
  description: string;
  category: Category;
  amount: number;
  projectRef: string;
  supplier?: string;
  hasReceipt: boolean;
  notes?: string;
}

const CATEGORIES: Category[] = ['Labour', 'Materials', 'Equipment', 'Transport', 'Overheads', 'Professional', 'Other'];

const CAT_COLORS: Record<Category, string> = {
  Labour:       'bg-blue-100 text-blue-700',
  Materials:    'bg-amber-100 text-amber-700',
  Equipment:    'bg-violet-100 text-violet-700',
  Transport:    'bg-teal-100 text-teal-700',
  Overheads:    'bg-slate-100 text-slate-600',
  Professional: 'bg-indigo-100 text-indigo-700',
  Other:        'bg-rose-100 text-rose-700',
};

const STORAGE_KEY = 'arch_expenses';
function load(): Expense[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function save(d: Expense[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

const blank = (): Omit<Expense, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  description: '', category: 'Materials',
  amount: 0, projectRef: '', supplier: '',
  hasReceipt: false, notes: '',
});

const fmt = (n: number) => `GMD ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpenseLog() {
  const { projects } = useProject();
  const [expenses, setExpenses] = useState<Expense[]>(load);
  const [catFilter, setCatFilter] = useState<'All' | Category>('All');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(blank());
  const [showForm, setShowForm] = useState(false);

  const persist = (next: Expense[]) => { setExpenses(next); save(next); };
  const f = (key: keyof Omit<Expense,'id'>, val: string | number | boolean) =>
    setForm(p => ({ ...p, [key]: val }));

  const openNew = () => { setEditing(null); setForm(blank()); setShowForm(true); };
  const openEdit = (e: Expense) => { setEditing(e); setForm({ ...e }); setShowForm(true); };
  const del = (id: string) => { if (confirm('Delete expense?')) persist(expenses.filter(e => e.id !== id)); };

  const submit = () => {
    if (!form.description || !form.amount) return;
    if (editing) {
      persist(expenses.map(e => e.id === editing.id ? { ...form, id: editing.id } : e));
    } else {
      persist([...expenses, { ...form, id: crypto.randomUUID() }]);
    }
    setShowForm(false);
  };

  const visible = catFilter === 'All' ? expenses : expenses.filter(e => e.category === catFilter);

  // Category breakdown for current filter scope
  const total = visible.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map(c => ({
    cat: c,
    sum: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.sum > 0).sort((a, b) => b.sum - a.sum);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Receipt size={22} />
          <h1 className="text-xl font-bold">Expense Log</h1>
        </div>
        <p className="text-rose-200 text-sm">Record and categorise firm expenditure by project. Track receipts and analyse spend across Labour, Materials, Equipment and more.</p>
      </div>
      {/* Category breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">Spend by Category</p>
        <div className="flex flex-wrap gap-2">
          {byCategory.map(x => (
            <div key={x.cat} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CAT_COLORS[x.cat]}`}>
              {x.cat}: {fmt(x.sum)}
            </div>
          ))}
          {byCategory.length === 0 && <p className="text-xs text-slate-400">No expenses recorded yet.</p>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
          {(['All', ...CATEGORIES] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                ${catFilter === c ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>
        <Button onClick={openNew} size="sm" icon={<Plus size={13} />} className="ml-auto">
          Log Expense
        </Button>
      </div>

      {/* Total for current filter */}
      {catFilter !== 'All' && (
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{visible.length}</span> {catFilter} expense(s) — Total: <span className="font-bold text-slate-800">{fmt(total)}</span>
        </div>
      )}

      {/* Expense list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No expenses in this category.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Description', 'Category', 'Project', 'Amount (GMD)', 'Receipt', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{exp.date}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800">{exp.description}</p>
                    {exp.supplier && <p className="text-slate-400">{exp.supplier}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${CAT_COLORS[exp.category]}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{exp.projectRef || '—'}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-800">{fmt(exp.amount)}</td>
                  <td className="px-3 py-2.5">
                    {exp.hasReceipt
                      ? <Receipt size={13} className="text-emerald-500" />
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <IconButton onClick={() => openEdit(exp)} tone="primary">
                        <Pencil size={13} />
                      </IconButton>
                      <IconButton onClick={() => del(exp.id)} tone="danger">
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Total shown:</td>
                <td className="px-3 py-2 text-xs font-bold text-slate-800">{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <p className="font-semibold text-slate-800">{editing ? 'Edit Expense' : 'Log Expense'}</p>
              <IconButton onClick={() => setShowForm(false)}><X size={16} /></IconButton>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  <input type="date" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.date} onChange={e => f('date', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.category} onChange={e => f('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Description *</label>
                <input className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.description} onChange={e => f('description', e.target.value)} placeholder="What was this for?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Amount (GMD) *</label>
                  <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.amount} onChange={e => f('amount', +e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Project</label>
                  <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.projectRef} onChange={e => f('projectRef', e.target.value)}>
                    <option value="">— No project —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.jobNumber}>{p.jobNumber} — {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Supplier / Payee</label>
                <input className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.supplier ?? ''} onChange={e => f('supplier', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Notes</label>
                <textarea rows={2} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                  value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.hasReceipt}
                  onChange={e => f('hasReceipt', e.target.checked)} />
                <span className="text-xs text-slate-600">Receipt obtained</span>
              </label>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button onClick={submit} fullWidth>{editing ? 'Save Changes' : 'Log Expense'}</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
