/**
 * OptimiseSuggestion — shows recommended parameter changes after optimization,
 * with an Apply button that patches inputs and immediately recalculates.
 */

export interface SuggestionRow {
  label: string;
  current: number;
  suggested: number;
  unit: string;
  /** Override the numeric display with a text label (e.g. for grade changes) */
  currentLabel?: string;
  suggestedLabel?: string;
}

interface Props {
  rows: SuggestionRow[];
  onApply: () => void;
  onDismiss: () => void;
  note?: string;
}

export default function OptimiseSuggestion({ rows, onApply, onDismiss, note }: Props) {
  const changed = rows.filter(r => r.suggested !== r.current);

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-blue-700">Recommended parameters</p>
        <span className="text-[10px] text-blue-400 bg-blue-100 px-2 py-0.5 rounded-full">
          all checks → green
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        {rows.map((r, i) => {
          const isChanged = r.suggested !== r.current;
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-mono">
                {isChanged ? (
                  <>
                    <span className="text-slate-400 line-through mr-1">
                      {r.currentLabel ?? `${r.current} ${r.unit}`}
                    </span>
                    <span className="text-blue-700 font-bold">
                      {r.suggestedLabel ?? `${r.suggested} ${r.unit}`}
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-600">
                    {r.currentLabel ?? `${r.current} ${r.unit}`} ✓
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {changed.length === 0 && (
        <p className="text-xs text-emerald-600 mb-2">All checks are already within limits.</p>
      )}

      {note && (
        <p className="text-[10px] text-slate-400 mb-2 leading-snug">{note}</p>
      )}

      <div className="flex gap-2">
        {changed.length > 0 && (
          <button
            onClick={onApply}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            Apply & recalculate
          </button>
        )}
        <button
          onClick={onDismiss}
          className="px-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
