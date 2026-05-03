import { useState } from 'react';
import LoadCalculator from './LoadCalculator';
import LoadCombinations from './LoadCombinations';
import WindCalculator from './WindCalculator';

type Tab = 'loads' | 'combinations' | 'wind';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'loads',        label: 'Live & Dead Loads',  desc: 'Occupancy table + dead load builder' },
  { id: 'combinations', label: 'Load Combinations',  desc: 'Full ULS / SLS / Accidental combinations' },
  { id: 'wind',         label: 'Wind Load',           desc: 'EN 1991-1-4 wind pressure calculation' },
];

export default function LoadCalculatorPage() {
  const [tab, setTab] = useState<Tab>('loads');
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors
              ${tab === t.id ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}>
            <p className={`text-xs font-semibold ${tab === t.id ? 'text-white' : 'text-slate-700'}`}>{t.label}</p>
            <p className={`text-xs hidden sm:block ${tab === t.id ? 'text-blue-200' : 'text-slate-400'}`}>{t.desc}</p>
          </button>
        ))}
      </div>

      {tab === 'loads'        && <LoadCalculator />}
      {tab === 'combinations' && <LoadCombinations />}
      {tab === 'wind'         && <WindCalculator />}
    </div>
  );
}
