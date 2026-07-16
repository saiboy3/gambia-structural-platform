import { lookupSymbol } from '../../utils/termGlossary';

interface ResultRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function ResultRow({ label, value, unit, highlight }: ResultRowProps) {
  const explain = lookupSymbol(label);
  return (
    <div className={`group relative flex justify-between items-center py-1.5 pl-3 pr-2 rounded-md transition-colors
      ${highlight ? 'bg-blue-50/80 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
      {highlight && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-blue-500" />}

      <span className={`text-xs ${highlight ? 'text-blue-900 font-medium' : 'text-slate-600'}
        ${explain ? 'decoration-dotted decoration-slate-300 underline underline-offset-2 cursor-help' : ''}`}>
        {label}
      </span>

      <span className={`text-xs font-mono font-semibold tabular-nums ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}{unit ? ` ${unit}` : ''}
      </span>

      {/* Symbol explanation — appears on hover, positioned above the row so it
          never covers the value the user is reading. */}
      {explain && (
        <span className="pointer-events-none absolute left-2 bottom-full z-30 mb-1 hidden w-64 rounded-lg
          bg-slate-900 px-3 py-2 text-[11px] leading-snug text-slate-200 shadow-xl group-hover:block">
          {explain}
        </span>
      )}
    </div>
  );
}
