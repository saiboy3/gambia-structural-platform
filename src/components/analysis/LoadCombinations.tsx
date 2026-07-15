import { useState } from 'react';
import Card from '../ui/Card';
import InputField from '../ui/InputField';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import { getCombinations } from '../../utils/loadCombinations';
import type { LoadValues, Combination } from '../../utils/loadCombinations';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import CalcSheet from '../ui/CalcSheet';
import { loadCombinationsCalcNotes } from '../../utils/calcNotesLoads';

const TYPE_COLOR: Record<Combination['type'], string> = {
  ULS: 'bg-red-100 text-red-700',
  SLS: 'bg-blue-100 text-blue-700',
  ACC: 'bg-amber-100 text-amber-700',
};

export default function LoadCombinations() {
  const { factors, code } = useBuildingCode();
  const [loads, setLoads] = useState<LoadValues>({ Gk: 7.05, Qk: 3.0, Wk: 1.2 });

  const combos = getCombinations(code, loads);
  const ulsMax = Math.max(...combos.filter(c => c.type === 'ULS').map(c => c.value));
  const slsMax = Math.max(...combos.filter(c => c.type === 'SLS').map(c => c.value));

  const set = (k: keyof LoadValues, v: number) => setLoads(p => ({ ...p, [k]: v }));

  const barMax = ulsMax * 1.1;

  return (
    <div className="space-y-4">
      {/* Load inputs */}
      <Card title="Characteristic Load Values">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InputField label="Dead load (Gk)" unit="kN/m²" value={loads.Gk}
            onChange={v => set('Gk', +v)} min={0} step={0.1}
            hint="From load builder" />
          <InputField label="Live load (Qk)" unit="kN/m²" value={loads.Qk}
            onChange={v => set('Qk', +v)} min={0} step={0.1}
            hint="From occupancy table" />
          <InputField label="Wind load (Wk)" unit="kN/m²" value={loads.Wk}
            onChange={v => set('Wk', +v)} min={0} step={0.05}
            hint="From wind calculator" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-slate-600">Active code</p>
            <div className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">{factors.label}</div>
            <p className="text-xs text-slate-400">{factors.description}</p>
          </div>
        </div>
      </Card>

      {/* Combination table */}
      <Card title={`Load Combinations — ${factors.label}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-3 py-2 font-semibold">Combination</th>
                <th className="text-left px-3 py-2 font-semibold">Equation</th>
                <th className="text-center px-3 py-2 font-semibold w-16">Type</th>
                <th className="text-right px-3 py-2 font-semibold">γGk</th>
                <th className="text-right px-3 py-2 font-semibold">γQk</th>
                <th className="text-right px-3 py-2 font-semibold">γWk</th>
                <th className="text-right px-3 py-2 font-semibold w-28">Value (kN/m²)</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {combos.map(c => (
                <tr key={c.id}
                  className={`border-t border-slate-100 ${c.governing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-2 font-medium text-slate-700">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{c.equation}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLOR[c.type]}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{c.factors.Gk.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{c.factors.Qk.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{(c.factors.Wk ?? 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">{c.value.toFixed(2)}</td>
                  <td className="px-2 py-2">
                    {c.governing
                      ? <AlertTriangle size={13} className="text-amber-500" />
                      : <CheckCircle size={13} className="text-slate-200" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" /> Governing combination
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded ${TYPE_COLOR.ULS}`}>ULS</span> Ultimate limit state
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded ${TYPE_COLOR.SLS}`}>SLS</span> Serviceability limit state
          </div>
          {combos.some(c => c.type === 'ACC') && (
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded ${TYPE_COLOR.ACC}`}>ACC</span> Accidental
            </div>
          )}
        </div>
      </Card>

      {/* Summary + bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Governing Values">
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-600 mb-1">Governing ULS</p>
              <p className="text-3xl font-bold text-red-700">{ulsMax.toFixed(2)} <span className="text-base font-normal">kN/m²</span></p>
              <p className="text-xs text-red-500 mt-1">
                {combos.find(c => c.type === 'ULS' && c.governing)?.name}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-600 mb-1">Governing SLS</p>
              <p className="text-3xl font-bold text-blue-700">{slsMax.toFixed(2)} <span className="text-base font-normal">kN/m²</span></p>
              <p className="text-xs text-blue-500 mt-1">
                {combos.find(c => c.type === 'SLS' && c.governing)?.name}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold">ULS/SLS ratio:</span> {(ulsMax / slsMax).toFixed(2)}</p>
              <p><span className="font-semibold">Wind contribution:</span> {loads.Wk > 0 ? ((loads.Wk / ulsMax) * 100).toFixed(0) : 0}% of governing ULS</p>
            </div>
          </div>
        </Card>

        {/* Visual bar chart */}
        <Card title="Combination Comparison">
          <div className="space-y-2">
            {combos.map(c => {
              const pct = Math.min((c.value / barMax) * 100, 100);
              const barColor = c.type === 'ULS' ? (c.governing ? 'bg-red-500' : 'bg-red-300')
                : c.type === 'SLS' ? (c.governing ? 'bg-blue-500' : 'bg-blue-300')
                : 'bg-amber-400';
              return (
                <div key={c.id}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-slate-600 truncate max-w-[60%]">{c.name}</span>
                    <span className="text-xs font-semibold text-slate-800">{c.value.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <CalcSheet
        title="Load Combinations Calculation Sheet"
        codeLabel={factors.label}
        steps={loadCombinationsCalcNotes(loads, combos, { ...factors, code })}
      />
    </div>
  );
}
