import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button, { IconButton } from '../ui/Button';
import { Plus, Trash2, Download, RefreshCw, FileText, Grid3x3, ChevronDown } from 'lucide-react';
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

// ─── Tiling (lite) ────────────────────────────────────────────────────────────
const TILE_SIZES = [
  { label: '300 × 300 mm', area: 0.09 },
  { label: '400 × 400 mm', area: 0.16 },
  { label: '600 × 600 mm', area: 0.36 },
  { label: '600 × 1200 mm', area: 0.72 },
] as const;

interface TilingInputs {
  area: number;          // m² to be tiled
  tileSizeIdx: number;   // index into TILE_SIZES
  wastagePct: number;    // cutting wastage
  tileRate: number;      // GMD per m² of tiles
  adhesiveRate: number;  // GMD per 20kg bag
  groutRate: number;     // GMD per kg
  labourRate: number;    // GMD per m² laid
}

function calcTiling(t: TilingInputs) {
  const grossArea = t.area * (1 + t.wastagePct / 100);
  const tileArea = TILE_SIZES[t.tileSizeIdx].area;
  const tileCount = Math.ceil(grossArea / tileArea);
  // Rules of thumb: one 20kg adhesive bag covers ~4 m²; grout ~0.5 kg/m²
  const adhesiveBags = Math.ceil(t.area / 4);
  const groutKg = Math.ceil(t.area * 0.5);
  const tilesCost = grossArea * t.tileRate;
  const adhesiveCost = adhesiveBags * t.adhesiveRate;
  const groutCost = groutKg * t.groutRate;
  const labourCost = t.area * t.labourRate;
  return { grossArea, tileCount, adhesiveBags, groutKg, tilesCost, adhesiveCost, groutCost, labourCost,
    total: tilesCost + adhesiveCost + groutCost + labourCost };
}

export default function BOQ() {
  const [items, setItems]           = useState<BOQItem[]>(defaultItems);
  const [costItems, setCostItems]   = useState<CostItem[]>([]);
  const [contingencyPct, setContingencyPct] = useState(10);
  const [projectTitle, setProjectTitle]     = useState('Structural Works');
  const [tilingOpen, setTilingOpen] = useState(false);
  const [tiling, setTiling] = useState<TilingInputs>({
    area: 50, tileSizeIdx: 2, wastagePct: 10,
    tileRate: 900, adhesiveRate: 450, groutRate: 120, labourRate: 250,
  });

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

  const tilingRes = calcTiling(tiling);

  const addTilingToBOQ = () => {
    const size = TILE_SIZES[tiling.tileSizeIdx].label;
    setItems(prev => [...prev,
      { description: `Floor tiles ${size} (incl. ${tiling.wastagePct}% wastage)`, unit: 'm²',
        quantity: +tilingRes.grossArea.toFixed(1), rate: tiling.tileRate, amount: Math.round(tilingRes.tilesCost) },
      { description: 'Tile adhesive 20kg bags', unit: 'bag',
        quantity: tilingRes.adhesiveBags, rate: tiling.adhesiveRate, amount: tilingRes.adhesiveCost },
      { description: 'Tile grout', unit: 'kg',
        quantity: tilingRes.groutKg, rate: tiling.groutRate, amount: tilingRes.groutCost },
      { description: 'Tiling labour', unit: 'm²',
        quantity: tiling.area, rate: tiling.labourRate, amount: tilingRes.labourCost },
    ]);
    setTilingOpen(false);
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
      <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} />
          <h1 className="text-xl font-bold">Bill of Quantities</h1>
        </div>
        <p className="text-rose-200 text-sm">Automated material take-off and BOQ generation in Gambian Dalasi (GMD)</p>
      </div>
      <Card title={`Bill of Quantities — ${projectTitle}`} actions={
        <div className="flex gap-2">
          {costItems.length > 0 && (
            <Button onClick={syncRates} variant="success" size="sm" icon={<RefreshCw size={12} />}>
              Sync Rates
            </Button>
          )}
          <Button onClick={() => window.print()} size="sm" icon={<Download size={13} />}>
            Print / Export
          </Button>
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
                    <IconButton onClick={() => removeRow(i)} tone="danger">
                      <Trash2 size={13} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button onClick={addRow} variant="ghost" size="sm" icon={<Plus size={13} />}
          className="mt-3 !text-blue-600 hover:!bg-blue-50">
          Add Row
        </Button>

        {/* Totals */}
        <div className="print-avoid-break mt-4 border-t border-slate-200 pt-4 space-y-2 max-w-xs ml-auto text-xs">
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

      {/* Tiling calculator (lite) — collapsible, feeds rows into the BOQ above. Working tool only, never printed. */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button onClick={() => setTilingOpen(p => !p)}
          className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors">
          <Grid3x3 size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-700 flex-1 text-left">Tiling Calculator (Lite)</span>
          <span className="text-xs text-slate-400">quantities & cost → add to BOQ</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${tilingOpen ? 'rotate-180' : ''}`} />
        </button>
        {tilingOpen && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Area to tile (m²)</label>
                <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.area} onChange={e => setTiling(p => ({ ...p, area: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Tile size</label>
                <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.tileSizeIdx} onChange={e => setTiling(p => ({ ...p, tileSizeIdx: +e.target.value }))}>
                  {TILE_SIZES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Wastage (%)</label>
                <input type="number" min={0} max={30} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.wastagePct} onChange={e => setTiling(p => ({ ...p, wastagePct: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Tiles (GMD/m²)</label>
                <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.tileRate} onChange={e => setTiling(p => ({ ...p, tileRate: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Adhesive (GMD/bag)</label>
                <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.adhesiveRate} onChange={e => setTiling(p => ({ ...p, adhesiveRate: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Grout (GMD/kg)</label>
                <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.groutRate} onChange={e => setTiling(p => ({ ...p, groutRate: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Labour (GMD/m²)</label>
                <input type="number" min={0} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={tiling.labourRate} onChange={e => setTiling(p => ({ ...p, labourRate: +e.target.value }))} />
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Tiles needed', value: `${tilingRes.tileCount} pcs (${tilingRes.grossArea.toFixed(1)} m²)` },
                { label: 'Adhesive', value: `${tilingRes.adhesiveBags} × 20kg bags` },
                { label: 'Grout', value: `${tilingRes.groutKg} kg` },
                { label: 'Total cost', value: fmt(tilingRes.total), bold: true },
              ].map(r => (
                <div key={r.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">{r.label}</p>
                  <p className={`text-sm text-slate-800 ${r.bold ? 'font-bold text-blue-700' : 'font-semibold'}`}>{r.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Coverage assumptions: one 20kg adhesive bag per 4 m²; grout at 0.5 kg/m².</p>

            <Button onClick={addTilingToBOQ} size="sm" icon={<Plus size={13} />}>
              Add Tiling Items to BOQ
            </Button>
          </div>
        )}
      </div>

      {/* Rate reference from CostDatabase or hardcoded — reference tool only, never printed */}
      <div className="no-print">
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
    </div>
  );
}
