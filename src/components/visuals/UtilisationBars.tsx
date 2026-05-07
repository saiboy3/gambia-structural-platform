/**
 * UtilisationBars — horizontal progress bars showing % utilisation per check
 * Green < 80%, Amber 80–100%, Red > 100%
 */

export interface UtilCheck {
  label: string;
  demand: number;       // actual value
  capacity: number;     // allowable / limit
  unit?: string;
  note?: string;        // formula, e.g. "MEd / MRd"
  hint?: string;        // actionable tip — shown below the bar
  invert?: boolean;     // true when demand > capacity = PASS (e.g. As,prov > As,req)
}

function pct(check: UtilCheck) {
  if (check.capacity === 0) return 0;
  const ratio = check.demand / check.capacity;
  return check.invert ? (1 / ratio) * 100 : ratio * 100;
}

function colours(u: number) {
  if (u > 100) return {
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hint: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  };
  if (u > 80) return {
    bar: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hint: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  };
  return {
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hint: 'text-slate-400',
    badge: 'bg-emerald-100 text-emerald-700',
  };
}

interface Props {
  checks: UtilCheck[];
  title?: string;
}

export default function UtilisationBars({ checks, title }: Props) {
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      )}
      {checks.map((chk, i) => {
        const raw = pct(chk);
        const u = Math.min(raw, 150);
        const passes = chk.invert
          ? chk.demand >= chk.capacity
          : chk.demand <= chk.capacity;
        const c = colours(raw);

        // Status label
        const statusLabel = raw > 100 ? 'FAIL' : raw > 80 ? 'MARGINAL' : 'OK';

        return (
          <div key={i} className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}>

            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-700 leading-tight">{chk.label}</span>
                {chk.note && (
                  <span className="text-[10px] text-slate-400 ml-1.5 font-mono">{chk.note}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-xs font-mono font-bold ${c.text}`}>
                  {raw.toFixed(0)}%
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden mb-1.5">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${c.bar}`}
                style={{ width: `${Math.min(u, 100)}%` }}
              />
            </div>

            {/* Demand / capacity values */}
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-400">
                {chk.demand.toFixed(chk.demand < 10 ? 2 : 1)}{chk.unit ? ` ${chk.unit}` : ''}
                <span className="text-slate-300 mx-1">demand</span>
              </span>
              <span className="text-[10px] text-slate-400">
                <span className="text-slate-300 mx-1">capacity</span>
                {chk.capacity.toFixed(chk.capacity < 10 ? 2 : 1)}{chk.unit ? ` ${chk.unit}` : ''}
              </span>
            </div>

            {/* Hint line */}
            {chk.hint && (
              <p className={`text-[10px] leading-snug mt-1 border-t border-white/50 pt-1 ${c.hint}`}>
                {raw > 100
                  ? `⚠ ${chk.hint}`
                  : raw > 80
                    ? `↑ ${chk.hint}`
                    : `· ${chk.hint}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
