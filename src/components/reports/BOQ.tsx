import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { Plus, Trash2, Download, RefreshCw } from 'lucide-react';
import { getItem, KEYS } from '../../utils/storage';
import type { BOQItem } from '../../types/structural';
import type { CostItem } from '../../types/app';

const HARDCODED_RATES: Record<string, number> = {
  'Excavation (m³)': 650, 'Blinding concrete (m³)': 4200,
  'RC Foundation (m³)': 7500, 'RC Column (m³)': 8000,
  'RC Beam (m³)': 7800, 'RC Slab (m³)': 7200,
  'Reinforcement (tonne)': 42000, 'Formwork (m²)': 850,
};

const defaultItems: BOQItem[] = [
  { description: 'Excavation to reduced level',         unit: 'm³',    quantity: 20,  rate: 650,   amount: 13000  },
  { description: 'Blinding concrete C10/12.5, 75mm',   unit: 'm³',    quantity: 2.5, rate: 4200,  amount: 10500  },
  { description: 'RC Pad foundation C25/30',            unit: 'm³',    quantity: 6,   rate: 7500,  amount: 45000  },
  { description: 'High yield reinforcement B500B',      unit: 'tonne', quantity: 1.2, rate: 42000, amount: 50400  },
  { description: 'RC Column 300×400 C25/30',            unit: 'm³',    quantity: 4,   rate: 8000,  amount: 32000  },
  { description: 'RC Beam 250×450 C25/30',              unit: 'm³',    quantity: 5,   rate: 7800,  amount: 39000  },
  { description: 'RC Slab 175mm C25/30',                unit: 'm³',    quantity: 12,  rate: 7200,  amount: 86400  },
  { description: 'Formwork to beams & slabs',           unit: 'm²',    quantity: 80,  rate: 850,   amount: 68000  },
];

function fmt(n: number) {
  return new Intl.NumberFormat('en-GM', { style: 'currency', currency: 'GMD', maximumFractionDigits: 0 }).format(n);
}

export default function BOQ() {
  const [items, setItems]           = useState<BOQItem[]>(defaultItems);
  const [costItems, setCostItems]   = useState<CostItem[]>([]);
  const [contingencyPct, setContingencyPct] = useState(10);
  const [projectTitle, setProjectTitle]     = useState('Structural Works');

  useEffect(() => {
    const stored = getItem<CostItem[]>(KEYS.COST_ITEMS, []);
    setCostItems(stored);
  }, []);

  const update = (i: number, key: keyof BOQItem, val: string | number) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [key]: val };
      updated.amount = +updated.quantity * +updated.rate;
      return updated;
    }));
  };

  const addRow = () => setItems(prev => [...prev, { description: '', unit: 'm³', quantity: 0, rate: 0, amount: 0 }]);
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  // Sync rates from cost database
  const syncRates = () => {
    setItems(prev => prev.map(item => {
      const match = costItems.find(c =>
        item.description.toLowerCase().includes(c.description.toLowerCase()) ||
        c.description.toLowerCase().includes(item.description.toLowerCase())
      );
      if (match) {
        const rate = match.rateGMD;
        return { ...item, rate, amount: item.quantity * rate };
      }
      return item;
    }));
  };

  // Add from cost database
  const addFromCostDb = (c: CostItem) => {
    setItems(prev => [...prev, { description: c.description, unit: c.unit, quantity: 1, rate: c.rateGMD, amount: c.rateGMD }]);
  };

  const total      = items.reduce((s, r) => s + r.amount, 0);
  const contingency = total * contingencyPct / 100;
  const grandTotal  = total + contingency;

  // Get latest quarter cost items
  const quarters = [...new Set(costItems.map(i => i.quarter))].sort().reverse();
  const latestQuarter = quarters[0];
  const latestCostItems = costItems.filter(i => i.quarter === latestQuarter);

  return (
    <div className="space-y-4">
      <Card title={`Bill of Quantities — ${projectTitle}`} actions={
        <div className="flex gap-2">
          {costItems.length > 0 && (
            <button onClick={syncRates}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
              <RefreshCw size={12} /> Sync Rates
            </button>
          )}
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            <Download size={13} /> Print / Export
          </button>
        </div>
      }>
        {/* Project title */}
        <div className="mb-3 flex gap-3 items-center">
          <label className="text-xs text-slate-500 shrink-0">Project / Title:</label>
          <input
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none flex-1 focus:border-blue-400"
            value={projectTitle}
            onChange={e => setProjectTitle(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-2 py-2 font-semibold w-8">#</th>
                <th className="text-left px-2 py-2 font-semibold">Description</th>
                <th className="text-left px-2 py-2 font-semibold w-16">Unit</th>
                <th className="text-right px-2 py-2 font-semibold w-20">Qty</th>
                <th className="text-right px-2 py-2 font-semibold w-28">Rate (GMD)</th>
                <th className="text-right px-2 py-2 font-semibold w-28">Amount (GMD)</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input value={item.description} onChange={e => update(i, 'description', e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-300"
                      placeholder="Description…" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.unit} onChange={e => update(i, 'unit', e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-600" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" value={item.quantity} onChange={e => update(i, 'quantity', +e.target.value)}
                      className="w-full bg-transparent outline-none text-right text-slate-800" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" value={item.rate} onChange={e => update(i, 'rate', +e.target.value)}
                      className="w-full bg-transparent outline-none text-right text-slate-800" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-800">
                    {item.amount.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
          <Plus size={13} /> Add Row
        </button>

        {/* Totals */}
        <div className="mt-4 border-t border-slate-200 pt-4 space-y-2 max-w-xs ml-auto text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Sub-total</span>
            <span className="font-semibold">{fmt(total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 flex items-center gap-1">
              Contingency
              <input type="number" value={contingencyPct} onChange={e => setContingencyPct(+e.target.value)}
                className="w-10 border border-slate-200 rounded px-1 py-0.5 text-center text-xs outline-none ml-1" />%
            </span>
            <span className="font-semibold">{fmt(contingency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-800">Grand Total</span>
            <span className="font-bold text-blue-700 text-sm">{fmt(grandTotal)}</span>
          </div>
        </div>
      </Card>

      {/* Rate reference from CostDatabase or hardcoded */}
      <Card title={latestCostItems.length > 0
        ? `Current Rates from Cost Database (${latestQuarter})`
        : 'Indicative Unit Rates (GMD) — Gambia Market'
      }>
        {latestCostItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">Click a rate to add it to the BOQ above.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {latestCostItems.map(c => (
                <button key={c.id} onClick={() => addFromCostDb(c)}
                  className="text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-lg px-3 py-2 transition-colors">
                  <p className="text-xs text-slate-500">{c.description}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-sm font-semibold text-slate-800">{c.rateGMD.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">GMD / {c.unit}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(HARDCODED_RATES).map(([desc, rate]) => (
                <div key={desc} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">{desc}</p>
                  <p className="text-sm font-semibold text-slate-800">{rate.toLocaleString()} GMD</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Populate the Cost Database to see live rates here with one-click add to BOQ.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
