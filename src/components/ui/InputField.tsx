import { lookupTerm } from '../../utils/termGlossary';

interface InputFieldProps {
  label: string;
  unit?: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export default function InputField({ label, unit, value, onChange, type = 'number', min, max, step, hint }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white transition-all
        focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 hover:border-slate-400">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step ?? 'any'}
          className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-800 bg-transparent outline-none"
        />
        {unit && (
          <span className="px-2 py-2 text-[11px] font-medium text-slate-500 bg-slate-50 border-l border-slate-200 flex items-center tabular-nums">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const selected = options.find(o => o.value === value);
  const info = lookupTerm(value, selected?.label);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 text-sm text-slate-800 border border-slate-300 rounded-lg bg-white outline-none transition-all
          hover:border-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {info && (
        <p className="text-[11px] leading-snug text-slate-500">
          <span className="text-blue-400 mr-1">ⓘ</span>
          {info.meaning}
          {info.use && <span className="text-slate-400"> {info.use}</span>}
        </p>
      )}
    </div>
  );
}
