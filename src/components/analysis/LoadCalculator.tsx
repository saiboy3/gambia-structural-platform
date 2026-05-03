import { useState } from 'react';
import Card from '../ui/Card';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

interface OccupancyRow {
  category: string;
  use: string;
  qkMin: number;
  qkMax: number;
  qkEC2: number;
  qkBS: number;
  qkACI: number;
}

const OCCUPANCY: OccupancyRow[] = [
  { category: 'A', use: 'Residential / Domestic',        qkMin: 1.5, qkMax: 2.0, qkEC2: 2.0, qkBS: 1.5, qkACI: 1.92 },
  { category: 'A', use: 'Stairs & landings (res.)',      qkMin: 2.0, qkMax: 3.0, qkEC2: 3.0, qkBS: 3.0, qkACI: 2.87 },
  { category: 'B', use: 'Office — general use',          qkMin: 2.5, qkMax: 3.0, qkEC2: 3.0, qkBS: 2.5, qkACI: 2.40 },
  { category: 'B', use: 'Office — filing / storage',     qkMin: 4.0, qkMax: 5.0, qkEC2: 5.0, qkBS: 5.0, qkACI: 4.79 },
  { category: 'C1', use: 'Areas with tables (school)',   qkMin: 3.0, qkMax: 3.0, qkEC2: 3.0, qkBS: 3.0, qkACI: 2.87 },
  { category: 'C2', use: 'Fixed seating (auditorium)',   qkMin: 4.0, qkMax: 4.0, qkEC2: 4.0, qkBS: 4.0, qkACI: 2.87 },
  { category: 'C3', use: 'Areas without obstacles',     qkMin: 5.0, qkMax: 5.0, qkEC2: 5.0, qkBS: 5.0, qkACI: 4.79 },
  { category: 'C4', use: 'Gym / dance floors',          qkMin: 5.0, qkMax: 7.5, qkEC2: 5.0, qkBS: 5.0, qkACI: 4.79 },
  { category: 'C5', use: 'Crowd / concert areas',       qkMin: 7.5, qkMax: 7.5, qkEC2: 7.5, qkBS: 5.0, qkACI: 4.79 },
  { category: 'D1', use: 'Retail — general',            qkMin: 4.0, qkMax: 5.0, qkEC2: 4.0, qkBS: 4.0, qkACI: 4.79 },
  { category: 'D2', use: 'Retail — department store',   qkMin: 5.0, qkMax: 5.0, qkEC2: 5.0, qkBS: 5.0, qkACI: 4.79 },
  { category: 'E',  use: 'Storage / warehouse',         qkMin: 7.5, qkMax: 15,  qkEC2: 7.5, qkBS: 7.5, qkACI: 11.97 },
  { category: 'F',  use: 'Car parking ≤ 30 kN',        qkMin: 2.5, qkMax: 2.5, qkEC2: 2.5, qkBS: 2.5, qkACI: 1.92 },
  { category: 'G',  use: 'Car parking 30–160 kN',      qkMin: 5.0, qkMax: 5.0, qkEC2: 5.0, qkBS: 5.0, qkACI: 3.59 },
  { category: 'H',  use: 'Roof (inaccessible)',         qkMin: 0.6, qkMax: 1.0, qkEC2: 0.6, qkBS: 0.75, qkACI: 0.96 },
  { category: 'H',  use: 'Roof (accessible / terrace)', qkMin: 3.0, qkMax: 3.0, qkEC2: 3.0, qkBS: 3.0, qkACI: 1.92 },
];

interface DeadRow { item: string; min: number; max: number; typical: number; unit: string }
const DEAD_LOADS: DeadRow[] = [
  { item: 'Reinforced concrete slab (per mm thickness)', min: 0.023, max: 0.025, typical: 0.024, unit: 'kN/m²/mm' },
  { item: 'Sand/cement screed (50mm)',    min: 1.0,  max: 1.2,  typical: 1.1,  unit: 'kN/m²' },
  { item: 'Ceramic / porcelain tiles',   min: 0.4,  max: 0.6,  typical: 0.5,  unit: 'kN/m²' },
  { item: 'Marble / granite finish',     min: 0.6,  max: 1.0,  typical: 0.8,  unit: 'kN/m²' },
  { item: 'Plaster on soffit (13mm)',     min: 0.2,  max: 0.3,  typical: 0.25, unit: 'kN/m²' },
  { item: 'Plasterboard ceiling (12mm)', min: 0.15, max: 0.2,  typical: 0.15, unit: 'kN/m²' },
  { item: 'Lightweight partitions',      min: 0.5,  max: 1.0,  typical: 1.0,  unit: 'kN/m²' },
  { item: 'Heavy masonry partitions',    min: 1.5,  max: 3.0,  typical: 2.0,  unit: 'kN/m²' },
  { item: 'Suspended M&E services',      min: 0.1,  max: 0.5,  typical: 0.25, unit: 'kN/m²' },
  { item: 'Waterproofing membrane',      min: 0.05, max: 0.15, typical: 0.1,  unit: 'kN/m²' },
  { item: 'Roof insulation (100mm)',     min: 0.05, max: 0.1,  typical: 0.07, unit: 'kN/m²' },
  { item: 'Concrete block wall (200mm)', min: 3.0,  max: 4.0,  typical: 3.5,  unit: 'kN/m (per m height)' },
  { item: 'Brick wall (215mm)',          min: 4.0,  max: 5.0,  typical: 4.5,  unit: 'kN/m (per m height)' },
];

interface DeadItem { id: number; item: string; value: number }

export default function LoadCalculator() {
  const { factors, code } = useBuildingCode();
  const [selectedOcc, setSelectedOcc] = useState<OccupancyRow | null>(null);
  const [slabThick, setSlabThick] = useState(175);
  const [deadItems, setDeadItems] = useState<DeadItem[]>([
    { id: 1, item: 'RC slab self-weight', value: +(0.024 * 175).toFixed(2) },
    { id: 2, item: 'Screed + tiles',      value: 1.6 },
    { id: 3, item: 'Partitions',          value: 1.0 },
    { id: 4, item: 'Services',            value: 0.25 },
  ]);
  const [showDeadRef, setShowDeadRef] = useState(false);

  const qk = selectedOcc
    ? (code === 'EC2' ? selectedOcc.qkEC2 : code === 'BS8110' ? selectedOcc.qkBS : selectedOcc.qkACI)
    : 0;

  const gk = deadItems.reduce((s, i) => s + i.value, 0);
  const wdULS = factors.gammaG * gk + factors.gammaQ * qk;
  const wdSLS = gk + qk;

  const addItem = () => setDeadItems(p => [...p, { id: Date.now(), item: 'Custom load', value: 0 }]);
  const removeItem = (id: number) => setDeadItems(p => p.filter(i => i.id !== id));
  const updateItem = (id: number, key: 'item' | 'value', val: string | number) =>
    setDeadItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i));

  const updateSlabThick = (t: number) => {
    setSlabThick(t);
    setDeadItems(p => p.map(i => i.item === 'RC slab self-weight' ? { ...i, value: +(0.024 * t).toFixed(2) } : i));
  };

  return (
    <div className="space-y-4">
      {/* Live load picker */}
      <Card title="Live Load — Occupancy Category">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-2 py-2 font-semibold">Cat.</th>
                <th className="text-left px-2 py-2 font-semibold">Occupancy / Use</th>
                <th className="text-right px-2 py-2 font-semibold">EC2 (kN/m²)</th>
                <th className="text-right px-2 py-2 font-semibold">BS8110 (kN/m²)</th>
                <th className="text-right px-2 py-2 font-semibold">ACI 318 (kN/m²)</th>
                <th className="w-16 text-center px-2 py-2 font-semibold">Select</th>
              </tr>
            </thead>
            <tbody>
              {OCCUPANCY.map((row, i) => {
                const isSelected = selectedOcc === row;
                return (
                  <tr key={i}
                    onClick={() => setSelectedOcc(isSelected ? null : row)}
                    className={`border-t border-slate-100 cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}>
                    <td className="px-2 py-1.5 font-mono text-slate-500">{row.category}</td>
                    <td className="px-2 py-1.5 text-slate-700">{row.use}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">{row.qkEC2}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-blue-700">{row.qkBS}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-violet-700">{row.qkACI}</td>
                    <td className="px-2 py-1.5 text-center">
                      {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectedOcc && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
            <span className="font-semibold text-blue-800">{selectedOcc.use}</span>
            <span className="text-blue-600 ml-2">→ qk = <strong>{qk} kN/m²</strong> ({code})</span>
          </div>
        )}
      </Card>

      {/* Dead load builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Dead Load Builder">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs text-slate-600 font-medium whitespace-nowrap">Slab thickness</label>
            <input type="number" value={slabThick} onChange={e => updateSlabThick(+e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg" />
            <span className="text-xs text-slate-500">mm</span>
          </div>

          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pb-1 font-semibold">Load item</th>
                <th className="text-right pb-1 font-semibold w-24">kN/m²</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {deadItems.map(item => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2">
                    <input value={item.item} onChange={e => updateItem(item.id, 'item', e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-700" />
                  </td>
                  <td className="py-1.5 text-right">
                    <input type="number" step="0.01" value={item.value}
                      onChange={e => updateItem(item.id, 'value', +e.target.value)}
                      className="w-full text-right bg-transparent outline-none font-semibold text-slate-800" />
                  </td>
                  <td className="py-1.5 pl-1">
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300">
                <td className="pt-2 text-slate-600 font-semibold">Total gk</td>
                <td className="pt-2 text-right font-bold text-slate-800">{gk.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800">+ Add item</button>
        </Card>

        {/* Summary */}
        <Card title="Load Combination Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">Dead load (gk)</p>
                <p className="text-2xl font-bold text-amber-700">{gk.toFixed(2)}</p>
                <p className="text-xs text-amber-500">kN/m²</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 font-medium">Live load (qk)</p>
                <p className="text-2xl font-bold text-blue-700">{qk.toFixed(2)}</p>
                <p className="text-xs text-blue-500">kN/m² {selectedOcc ? `— ${selectedOcc.use}` : '(select above)'}</p>
              </div>
            </div>

            <div className="bg-slate-800 text-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">{factors.label} Load Combinations</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-300">ULS: {factors.gammaG}×gk + {factors.gammaQ}×qk</span>
                  <span className="text-emerald-400 font-bold">{wdULS.toFixed(2)} kN/m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">SLS: gk + qk</span>
                  <span className="text-sky-400 font-bold">{wdSLS.toFixed(2)} kN/m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">gk only (γG)</span>
                  <span className="text-slate-300">{(factors.gammaG * gk).toFixed(2)} kN/m²</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>γG = {factors.gammaG} · γQ = {factors.gammaQ} · γc = {factors.gammaC} · γs = {factors.gammaS}</p>
              <p>Standard: {factors.description}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Dead load reference */}
      <Card title={
        <button className="flex items-center gap-2 text-sm font-semibold text-slate-700"
          onClick={() => setShowDeadRef(p => !p)}>
          <Calculator size={14} /> Dead Load Reference Values
          {showDeadRef ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      }>
        {showDeadRef && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-2 py-2 font-semibold">Load Item</th>
                  <th className="text-right px-2 py-2 font-semibold">Min</th>
                  <th className="text-right px-2 py-2 font-semibold">Typical</th>
                  <th className="text-right px-2 py-2 font-semibold">Max</th>
                  <th className="text-left px-2 py-2 font-semibold">Unit</th>
                </tr>
              </thead>
              <tbody>
                {DEAD_LOADS.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-slate-700">{r.item}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{r.min}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-800">{r.typical}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{r.max}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!showDeadRef && <p className="text-xs text-slate-400">Click to expand reference table</p>}
      </Card>
    </div>
  );
}
