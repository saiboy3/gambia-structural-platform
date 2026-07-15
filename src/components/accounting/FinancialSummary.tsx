import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface Invoice {
  id: string; invoiceNo: string; client: string; projectRef?: string;
  amount: number; taxRate: number;
  dateIssued: string; dateDue: string; datePaid?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
}
interface Expense {
  id: string; date: string; description: string; category: string;
  amount: number; projectRef: string;
}

function loadInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem('arch_invoices') ?? '[]'); } catch { return []; }
}
function loadExpenses(): Expense[] {
  try { return JSON.parse(localStorage.getItem('arch_expenses') ?? '[]'); } catch { return []; }
}

const fmt = (n: number) => `GMD ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function daysDiff(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function FinancialSummary() {
  const invoices = loadInvoices();
  const expenses = loadExpenses();

  const active = invoices.filter(i => i.status !== 'Cancelled');
  const gross = (i: Invoice) => i.amount * (1 + i.taxRate / 100);

  const revenue = {
    total:       active.reduce((s, i) => s + gross(i), 0),
    collected:   active.filter(i => i.status === 'Paid').reduce((s, i) => s + gross(i), 0),
    outstanding: active.filter(i => i.status === 'Sent').reduce((s, i) => s + gross(i), 0),
    overdue:     active.filter(i => i.status === 'Overdue').reduce((s, i) => s + gross(i), 0),
    draft:       active.filter(i => i.status === 'Draft').reduce((s, i) => s + gross(i), 0),
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = revenue.collected - totalExpenses;
  const collectionRate = revenue.total > 0 ? (revenue.collected / revenue.total) * 100 : 0;

  // Invoice ageing buckets
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue' || (i.status === 'Sent' && daysDiff(i.dateDue) > 0));
  const ageing = {
    '0–30 days':  overdueInvoices.filter(i => daysDiff(i.dateDue) <= 30),
    '31–60 days': overdueInvoices.filter(i => daysDiff(i.dateDue) > 30 && daysDiff(i.dateDue) <= 60),
    '61–90 days': overdueInvoices.filter(i => daysDiff(i.dateDue) > 60 && daysDiff(i.dateDue) <= 90),
    '90+ days':   overdueInvoices.filter(i => daysDiff(i.dateDue) > 90),
  };

  // Expense by category
  const categories = Array.from(new Set(expenses.map(e => e.category)));
  const expByCat = categories
    .map(c => ({ cat: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .sort((a, b) => b.total - a.total);

  // Recent activity (last 5 invoices / expenses by date)
  const recentInvoices = [...invoices].sort((a, b) => b.dateIssued.localeCompare(a.dateIssued)).slice(0, 5);

  // Per-project profitability: invoiced (excl. cancelled) vs expenses, keyed by project ref
  const projectRefs = Array.from(new Set([
    ...active.map(i => i.projectRef).filter(Boolean),
    ...expenses.map(e => e.projectRef).filter(Boolean),
  ])) as string[];
  const byProject = projectRefs.map(ref => {
    const invoiced = active.filter(i => i.projectRef === ref).reduce((s, i) => s + gross(i), 0);
    const spent = expenses.filter(e => e.projectRef === ref).reduce((s, e) => s + e.amount, 0);
    return { ref, invoiced, spent, margin: invoiced - spent };
  }).sort((a, b) => b.invoiced - a.invoiced);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 size={22} />
          <h1 className="text-xl font-bold">Financial Summary</h1>
        </div>
        <p className="text-indigo-200 text-sm">Overview of firm revenue, collected payments, outstanding invoices and expenses. Data is drawn live from the Invoice Manager and Expense Log.</p>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue Invoiced', value: revenue.total, icon: DollarSign, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Collected',              value: revenue.collected, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Expenses',         value: totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Net Profit',             value: netProfit, icon: TrendingUp, color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`rounded-xl border border-slate-200 p-4 ${k.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={k.color} />
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
              <p className={`text-base font-bold ${k.color}`}>{fmt(k.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Collection rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600">Collection Rate</p>
          <p className="text-xs font-bold text-slate-800">{collectionRate.toFixed(1)}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(collectionRate, 100)}%` }} />
        </div>
        <div className="flex gap-3 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Paid {fmt(revenue.collected)}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Sent {fmt(revenue.outstanding)}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Overdue {fmt(revenue.overdue)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoice ageing */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-amber-500" />
            <p className="text-xs font-semibold text-slate-700">Invoice Ageing (Unpaid)</p>
          </div>
          {overdueInvoices.length === 0 ? (
            <p className="text-xs text-slate-400">No overdue or outstanding invoices.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(ageing) as [string, Invoice[]][]).map(([bucket, items]) => {
                if (items.length === 0) return null;
                const bucketTotal = items.reduce((s, i) => s + gross(i), 0);
                return (
                  <div key={bucket} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{bucket}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{items.length} invoice{items.length !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-slate-800">{fmt(bucketTotal)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-slate-100 pt-2 flex justify-between text-xs font-bold text-slate-800">
                <span>Total outstanding</span>
                <span>{fmt(overdueInvoices.reduce((s, i) => s + gross(i), 0))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-rose-500" />
            <p className="text-xs font-semibold text-slate-700">Expenses by Category</p>
          </div>
          {expByCat.length === 0 ? (
            <p className="text-xs text-slate-400">No expenses logged.</p>
          ) : (
            <div className="space-y-2">
              {expByCat.map(({ cat, total }) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600">{cat}</span>
                      <span className="font-semibold text-slate-800">{fmt(total)} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-project profitability */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-blue-500" />
          <p className="text-xs font-semibold text-slate-700">Project Profitability</p>
        </div>
        {byProject.length === 0 ? (
          <p className="text-xs text-slate-400">Link invoices and expenses to projects to see per-project margins.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium text-right">Invoiced</th>
                <th className="pb-2 font-medium text-right">Expenses</th>
                <th className="pb-2 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byProject.map(p => (
                <tr key={p.ref}>
                  <td className="py-1.5 font-semibold text-slate-700">{p.ref}</td>
                  <td className="py-1.5 text-right text-slate-600">{fmt(p.invoiced)}</td>
                  <td className="py-1.5 text-right text-slate-600">{fmt(p.spent)}</td>
                  <td className={`py-1.5 text-right font-bold ${p.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmt(p.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-slate-500" />
          <p className="text-xs font-semibold text-slate-700">Recent Invoices</p>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="text-xs text-slate-400">No invoices created yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2 font-medium">Invoice #</th>
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Issued</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="py-1.5 font-mono text-slate-700">{inv.invoiceNo}</td>
                  <td className="py-1.5 text-slate-600">{inv.client}</td>
                  <td className="py-1.5 text-slate-400">{inv.dateIssued}</td>
                  <td className="py-1.5 text-right font-semibold text-slate-800">{fmt(gross(inv))}</td>
                  <td className="py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold
                      ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                        inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
