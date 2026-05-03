interface ResultRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function ResultRow({ label, value, unit, highlight }: ResultRowProps) {
  return (
    <div className={`flex justify-between items-center py-1.5 px-2 rounded ${highlight ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-xs font-mono font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
