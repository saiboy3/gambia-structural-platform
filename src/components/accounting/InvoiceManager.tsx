import { useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, Clock, AlertCircle, FileText, X, Send } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import Button, { IconButton } from '../ui/Button';

interface Invoice {
  id: string;
  invoiceNo: string;
  projectRef: string;
  client: string;
  clientEmail?: string;
  description: string;
  amount: number;
  taxRate: number;
  dateIssued: string;
  dateDue: string;
  datePaid?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
}

const STORAGE_KEY = 'arch_invoices';

function load(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function save(data: Invoice[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

const STATUS_STYLE: Record<Invoice['status'], string> = {
  Draft:     'bg-slate-100 text-slate-600',
  Sent:      'bg-blue-100 text-blue-700',
  Paid:      'bg-emerald-100 text-emerald-700',
  Overdue:   'bg-red-100 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-400 line-through',
};

const STATUS_ICON: Record<Invoice['status'], typeof CheckCircle> = {
  Draft: FileText, Sent: Clock, Paid: CheckCircle, Overdue: AlertCircle, Cancelled: X,
};

const blank = (): Omit<Invoice, 'id'> => ({
  invoiceNo: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  projectRef: '', client: '', clientEmail: '', description: '',
  amount: 0, taxRate: 15,
  dateIssued: new Date().toISOString().slice(0, 10),
  dateDue: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: 'Draft', notes: '',
});

const fmt = (n: number) => `GMD ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PREFILL_KEY = 'arch_invoice_prefill';

export default function InvoiceManager() {
  const { projects } = useProject();
  const [invoices, setInvoices] = useState<Invoice[]>(load);
  const [filter, setFilter] = useState<'All' | Invoice['status']>('All');
  const [editing, setEditing] = useState<Invoice | null>(null);
  // If a project page requested a new invoice, open the form pre-filled
  const [form, setForm] = useState<Omit<Invoice, 'id'>>(() => {
    try {
      const raw = localStorage.getItem(PREFILL_KEY);
      if (raw) {
        localStorage.removeItem(PREFILL_KEY);
        return { ...blank(), ...JSON.parse(raw) };
      }
    } catch { /* ignore bad prefill */ }
    return blank();
  });
  const [showForm, setShowForm] = useState(() => !!form.client || !!form.projectRef);

  const persist = (next: Invoice[]) => { setInvoices(next); save(next); };

  const openNew = () => { setEditing(null); setForm(blank()); setShowForm(true); };
  const openEdit = (inv: Invoice) => { setEditing(inv); setForm({ ...inv }); setShowForm(true); };

  const submit = () => {
    if (!form.client || !form.amount) return;
    if (editing) {
      persist(invoices.map(i => i.id === editing.id ? { ...form, id: editing.id } : i));
    } else {
      persist([...invoices, { ...form, id: crypto.randomUUID() }]);
    }
    setShowForm(false);
  };

  const del = (id: string) => { if (confirm('Delete invoice?')) persist(invoices.filter(i => i.id !== id)); };
  const markPaid = (inv: Invoice) => {
    persist(invoices.map(i => i.id === inv.id ? { ...i, status: 'Paid', datePaid: new Date().toISOString().slice(0,10) } : i));
  };

  // Open the user's email client with the invoice drafted, and mark it Sent
  const sendToClient = (inv: Invoice) => {
    const total = inv.amount * (1 + inv.taxRate / 100);
    const subject = `Invoice ${inv.invoiceNo} — Arch Engineering`;
    const body = [
      `Dear ${inv.client},`,
      '',
      `Please find our invoice details below.`,
      '',
      `Invoice No:   ${inv.invoiceNo}`,
      inv.projectRef ? `Project:      ${inv.projectRef}` : '',
      inv.description ? `Description:  ${inv.description}` : '',
      `Amount:       ${fmt(inv.amount)}`,
      `VAT (${inv.taxRate}%):     ${fmt(total - inv.amount)}`,
      `Total Due:    ${fmt(total)}`,
      `Due Date:     ${inv.dateDue}`,
      '',
      'Kind regards,',
      'Arch Engineering',
    ].filter(l => l !== null).join('\n');
    window.location.href = `mailto:${inv.clientEmail ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (inv.status === 'Draft') {
      persist(invoices.map(i => i.id === inv.id ? { ...i, status: 'Sent' } : i));
    }
  };

  const visible = filter === 'All' ? invoices : invoices.filter(i => i.status === filter);

  const totals = {
    invoiced: invoices.filter(i => i.status !== 'Cancelled').reduce((s, i) => s + i.amount * (1 + i.taxRate / 100), 0),
    paid:     invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount * (1 + i.taxRate / 100), 0),
    overdue:  invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount * (1 + i.taxRate / 100), 0),
    outstanding: invoices.filter(i => i.status === 'Sent').reduce((s, i) => s + i.amount * (1 + i.taxRate / 100), 0),
  };

  const f = (key: keyof Omit<Invoice,'id'>, val: string | number) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} />
          <h1 className="text-xl font-bold">Invoice Manager</h1>
        </div>
        <p className="text-emerald-200 text-sm">Create and track client invoices in Gambian Dalasi (GMD). Mark invoices as sent or paid and monitor your revenue pipeline.</p>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoiced', value: totals.invoiced, color: 'text-slate-700' },
          { label: 'Collected',      value: totals.paid,     color: 'text-emerald-600' },
          { label: 'Outstanding',    value: totals.outstanding, color: 'text-blue-600' },
          { label: 'Overdue',        value: totals.overdue,  color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-sm font-bold ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                ${filter === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <Button onClick={openNew} size="sm" icon={<Plus size={13} />} className="ml-auto">
          New Invoice
        </Button>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No invoices yet. Click "New Invoice" to add one.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Invoice #', 'Client / Project', 'Issued', 'Due', 'Amount (incl. tax)', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(inv => {
                const total = inv.amount * (1 + inv.taxRate / 100);
                const Icon = STATUS_ICON[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{inv.invoiceNo}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800">{inv.client}</p>
                      <p className="text-slate-400">{inv.projectRef}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{inv.dateIssued}</td>
                    <td className="px-3 py-2.5 text-slate-500">{inv.dateDue}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{fmt(total)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[inv.status]}`}>
                        <Icon size={10} /> {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {(inv.status === 'Draft' || inv.status === 'Sent' || inv.status === 'Overdue') && (
                          <IconButton onClick={() => sendToClient(inv)} title="Send to client by email" tone="primary">
                            <Send size={13} />
                          </IconButton>
                        )}
                        {inv.status === 'Sent' && (
                          <IconButton onClick={() => markPaid(inv)} title="Mark as Paid" tone="success">
                            <CheckCircle size={13} />
                          </IconButton>
                        )}
                        <IconButton onClick={() => openEdit(inv)} tone="primary">
                          <Pencil size={13} />
                        </IconButton>
                        <IconButton onClick={() => del(inv.id)} tone="danger">
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <p className="font-semibold text-slate-800">{editing ? 'Edit Invoice' : 'New Invoice'}</p>
              <IconButton onClick={() => setShowForm(false)}><X size={16} /></IconButton>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Invoice No.</label>
                  <input className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.invoiceNo} onChange={e => f('invoiceNo', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Status</label>
                  <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.status} onChange={e => f('status', e.target.value)}>
                    {['Draft','Sent','Paid','Overdue','Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Client *</label>
                  <input className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.client} onChange={e => f('client', e.target.value)} placeholder="Client name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Client Email</label>
                  <input type="email" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.clientEmail ?? ''} onChange={e => f('clientEmail', e.target.value)} placeholder="client@email.com" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Project</label>
                <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.projectRef}
                  onChange={e => {
                    const proj = projects.find(p => p.jobNumber === e.target.value);
                    setForm(p => ({
                      ...p,
                      projectRef: e.target.value,
                      // auto-fill client from the project register if not already set
                      client: p.client || proj?.client || '',
                    }));
                  }}>
                  <option value="">— No project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.jobNumber}>{p.jobNumber} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                  rows={2} value={form.description} onChange={e => f('description', e.target.value)}
                  placeholder="Services rendered…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Amount (GMD, excl. tax) *</label>
                  <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.amount} onChange={e => f('amount', +e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Tax / VAT (%)</label>
                  <input type="number" min={0} max={100} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.taxRate} onChange={e => f('taxRate', +e.target.value)} />
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                Total incl. tax: <span className="font-bold text-slate-800">{fmt(form.amount * (1 + form.taxRate / 100))}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Date Issued</label>
                  <input type="date" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.dateIssued} onChange={e => f('dateIssued', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Due Date</label>
                  <input type="date" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.dateDue} onChange={e => f('dateDue', e.target.value)} />
                </div>
              </div>
              {form.status === 'Paid' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Date Paid</label>
                  <input type="date" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={form.datePaid ?? ''} onChange={e => f('datePaid', e.target.value)} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Notes</label>
                <textarea className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                  rows={2} value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button onClick={submit} fullWidth>{editing ? 'Save Changes' : 'Create Invoice'}</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
