import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Printer } from 'lucide-react';

// ── Data types ────────────────────────────────────────────────────────────────
export interface CalcStep {
  heading?: string;   // section header row — all other fields ignored when set
  label?: string;     // parameter name
  formula?: string;   // symbolic expression  e.g. "K = MEd / (fck · bw · d²)"
  working?: string;   // numerical substitution e.g. "= 158.6×10⁶ / (25×250×395²)"
  result?: string;    // final value with unit e.g. "0.163"
  ref?: string;       // code clause e.g. "EC2 Cl. 3.1.7"
  note?: string;      // pass/fail remark or extra information
  status?: 'ok' | 'warn' | 'fail' | 'info';
}

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_ROW: Record<string, string> = {
  ok:   'bg-emerald-50',
  warn: 'bg-amber-50',
  fail: 'bg-red-50',
  info: 'bg-blue-50',
};
const STATUS_RESULT: Record<string, string> = {
  ok:   'text-emerald-700',
  warn: 'text-amber-700',
  fail: 'text-red-700',
  info: 'text-blue-700',
};
const STATUS_NOTE: Record<string, string> = {
  ok:   'text-emerald-600',
  warn: 'text-amber-600',
  fail: 'text-red-600',
  info: 'text-blue-600',
};

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  title?: string;
  steps: CalcStep[];
  codeLabel?: string;   // e.g. "EC2 / EN 1992-1-1"
}

export default function CalcSheet({ title = 'Calculation Sheet', steps, codeLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden print:border-0">
      {/* Toggle bar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(p => !p)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p => !p); } }}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left print:hidden cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">{title}</span>
          {codeLabel && (
            <span className="text-xs text-slate-400 font-normal">— {codeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); window.print(); }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded border border-slate-200 hover:bg-white transition-colors"
            >
              <Printer size={11} /> Print
            </button>
          )}
          {open
            ? <ChevronUp size={14} className="text-slate-400" />
            : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Sheet body */}
      {open && (
        <div className="overflow-x-auto print:overflow-visible">
          {/* Print-only header */}
          <div className="hidden print:block px-4 py-3 border-b border-slate-300">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            {codeLabel && <p className="text-xs text-slate-500">Design standard: {codeLabel}</p>}
          </div>

          <table className="w-full text-xs border-t border-slate-200 border-collapse">
            <colgroup>
              <col className="w-44" />
              <col />
              <col className="w-32" />
              <col className="w-40" />
            </colgroup>
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs">
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Parameter</th>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Formula / Working</th>
                <th className="text-right px-3 py-2 font-semibold border-b border-slate-200">Result</th>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Reference</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => {
                // ── Section heading row ───────────────────────────────────
                if (step.heading) {
                  return (
                    <tr key={i} className="bg-slate-800">
                      <td colSpan={4} className="px-3 py-1.5 text-xs font-bold text-white tracking-wide">
                        {step.heading}
                      </td>
                    </tr>
                  );
                }

                // ── Data row ──────────────────────────────────────────────
                const rowBg  = step.status ? STATUS_ROW[step.status]    : 'hover:bg-slate-50';
                const resCls = step.status ? STATUS_RESULT[step.status] : 'text-slate-800';
                const noteCls = step.status ? STATUS_NOTE[step.status]  : 'text-slate-500';

                return (
                  <tr key={i} className={`border-t border-slate-100 ${rowBg}`}>
                    {/* Parameter name */}
                    <td className="px-3 py-2 font-medium text-slate-700 align-top leading-relaxed">
                      {step.label}
                    </td>

                    {/* Formula + working */}
                    <td className="px-3 py-2 align-top leading-relaxed space-y-0.5">
                      {step.formula && (
                        <div className="font-mono text-slate-500 italic text-xs">{step.formula}</div>
                      )}
                      {step.working && (
                        <div className="font-mono text-slate-700 text-xs">{step.working}</div>
                      )}
                      {step.note && (
                        <div className={`text-xs font-sans not-italic ${noteCls}`}>{step.note}</div>
                      )}
                    </td>

                    {/* Result */}
                    <td className={`px-3 py-2 text-right font-bold align-top leading-relaxed ${resCls}`}>
                      {step.result}
                    </td>

                    {/* Reference */}
                    <td className="px-3 py-2 text-slate-400 align-top leading-relaxed text-xs">
                      {step.ref}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer disclaimer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-start gap-2">
            <span className="text-slate-400 text-xs mt-0.5">ℹ</span>
            <p className="text-xs text-slate-400">
              This calculation sheet is generated for reference and preliminary design verification.
              All results must be independently checked against the applicable code and project-specific conditions
              before use in construction documents.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
