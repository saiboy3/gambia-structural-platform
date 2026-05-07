import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  title?: string;
  text: string;
  typical?: string;
  effect?: string;
}

export default function HelpTooltip({ title, text, typical, effect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-slate-300 hover:text-blue-500 transition-colors ml-1 focus:outline-none"
        aria-label="Help"
      >
        <HelpCircle size={13} />
      </button>

      {open && (
        <div className="absolute z-50 left-5 top-0 w-64 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs">
          {/* Arrow */}
          <div className="absolute -left-1.5 top-2 w-3 h-3 bg-slate-900 rotate-45" />

          {title && <p className="font-semibold text-slate-200 mb-1.5">{title}</p>}
          <p className="text-slate-300 leading-relaxed">{text}</p>

          {typical && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-slate-400 text-xs">
                <span className="text-emerald-400 font-semibold">Typical: </span>
                {typical}
              </p>
            </div>
          )}

          {effect && (
            <div className="mt-1.5">
              <p className="text-slate-400 text-xs">
                <span className="text-amber-400 font-semibold">Effect: </span>
                {effect}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
