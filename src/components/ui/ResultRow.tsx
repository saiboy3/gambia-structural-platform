interface ResultRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function ResultRow({ label, value, unit, highlight }: ResultRowProps) {
  return (
    <div className={`relative flex justify-between items-center py-1.5 pl-3 pr-2 rounded-md transition-colors
      ${highlight ? 'bg-blue-50/80 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
      {highlight && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-blue-500" />}
      <span className={`text-xs ${highlight ? 'text-blue-900 font-medium' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-xs font-mono font-semibold tabular-nums ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
