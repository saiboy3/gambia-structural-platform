import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { CODE_CLAUSES } from '../../data/codeReference';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { BuildingCode } from '../../context/BuildingCodeContext';

export default function CodeReference() {
  useBuildingCode(); // ensure context is available
  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState<BuildingCode | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = CODE_CLAUSES.filter(c => {
    const matchCode = codeFilter === 'ALL' || c.code === codeFilter || c.code === 'ALL';
    const q = search.toLowerCase();
    const matchSearch = !q || c.topic.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q) || c.clause.toLowerCase().includes(q);
    return matchCode && matchSearch;
  });

  const CODE_COLORS: Record<string, string> = {
    EC2: 'bg-emerald-100 text-emerald-700',
    BS8110: 'bg-blue-100 text-blue-700',
    ACI318: 'bg-violet-100 text-violet-700',
    IBC: 'bg-orange-100 text-orange-700',
    ALL: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            placeholder="Search by topic, clause, or keyword…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['ALL', 'EC2', 'BS8110', 'ACI318', 'IBC'] as const).map(c => (
            <button key={c} onClick={() => setCodeFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                ${codeFilter === c ? CODE_COLORS[c] + ' border-transparent' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} clause{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Clauses */}
      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
              <BookOpen size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CODE_COLORS[c.code]}`}>{c.code}</span>
                  <span className="text-xs text-slate-400 font-mono">{c.clause}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{c.topic}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.summary}</p>
              </div>
              {expanded === c.id
                ? <ChevronUp size={14} className="text-slate-400 shrink-0 mt-0.5" />
                : <ChevronDown size={14} className="text-slate-400 shrink-0 mt-0.5" />}
            </button>

            {expanded === c.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                <p className="text-sm text-slate-700 pt-3">{c.summary}</p>
                {c.equation && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-400 mb-1">Key equation</p>
                    <p className="font-mono text-sm text-slate-800">{c.equation}</p>
                  </div>
                )}
                {c.note && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700">{c.note}</p>
                  </div>
                )}
                {c.tableData && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          {c.tableData.headers.map(h => (
                            <th key={h} className="text-left px-3 py-1.5 font-semibold text-slate-600 border border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {c.tableData.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-1.5 border border-slate-200 text-slate-700">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No clauses match your search.</p>
        )}
      </div>
    </div>
  );
}
