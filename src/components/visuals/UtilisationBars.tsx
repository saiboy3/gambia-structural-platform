/**
 * UtilisationBars — horizontal progress bars showing % utilisation per check
 * Green < 80%, Amber 80–100%, Red > 100%
 */

export interface UtilCheck {
  label: string;
  demand: number;      // actual value
  capacity: number;    // allowable / limit
  unit?: string;
  note?: string;       // e.g. "MEd / MRd"
  invert?: boolean;    // true when demand > capacity = PASS (e.g. As,prov > As,req)
}

function pct(check: UtilCheck) {
  if (check.capacity === 0) return 0;
  const ratio = check.demand / check.capacity;
  return check.invert ? (1 / ratio) * 100 : ratio * 100;
}

function colour(u: number, invert: boolean) {
  const pass = invert ? u <= 100 : u <= 100;
  if (!pass) return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  if (u > 80)  return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
}

interface Props {
  checks: UtilCheck[];
  title?: string;
}

export default function UtilisationBars({ checks, title }: Props) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>}
      {checks.map((chk, i) => {
        const u = Math.min(pct(chk), 150);          // cap display at 150%
        const raw = pct(chk);
        const passes = chk.invert ? chk.demand >= chk.capacity : chk.demand <= chk.capacity;
        const { bar, text, bg } = colour(raw, chk.invert ?? false);

        return (
          <div key={i} className={`rounded-xl px-3 py-2 ${bg}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-semibold text-slate-700">{chk.label}</span>
                {chk.note && <span className="text-xs text-slate-400 ml-1.5">({chk.note})</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${text}`}>
                  {raw.toFixed(0)}%
                </span>
                <span className={`text-xs font-bold ${passes ? 'text-emerald-600' : 'text-red-600'}`}>
                  {passes ? '✓' : '✗'}
                </span>
              </div>
            </div>
            <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${bar}`}
                style={{ width: `${Math.min(u, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">
                {chk.demand.toFixed(chk.demand < 10 ? 2 : 1)}{chk.unit ? ` ${chk.unit}` : ''}
              </span>
              <span className="text-xs text-slate-400">
                / {chk.capacity.toFixed(chk.capacity < 10 ? 2 : 1)}{chk.unit ? ` ${chk.unit}` : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
