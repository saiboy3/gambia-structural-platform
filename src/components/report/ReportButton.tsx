/**
 * ReportButton — issues a module's design as an A4 calculation record.
 *
 * Drop one into any analysis page and hand it a ReportData describing what to
 * document. The engineer picks which sections to issue and stamps the approval
 * metadata, then the browser's print pipeline produces the PDF — which keeps
 * text and SVG vector (searchable, sharp, small) rather than rasterising the
 * page into an image.
 */
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { FileDown, X, Printer } from 'lucide-react';
import Button from '../ui/Button';
import PrintReport from './PrintReport';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import {
  DEFAULT_SECTIONS, DEFAULT_META,
  type ReportData, type ReportSections, type ReportMeta,
} from '../../types/report';

interface Props {
  data: ReportData;
  /** Optional: the project this design belongs to (else the active selection). */
  projectId?: string;
  /**
   * The module's 3D view element, e.g. `<Beam3D inputs={inp} results={res} />`.
   * Mounted off-screen while the dialog is open so it can be captured whether or
   * not the page currently has its 3D tab showing.
   */
  threeD?: ReactNode;
}

const SECTION_LABELS: { id: keyof ReportSections; label: string; hint: string }[] = [
  { id: 'cover',     label: 'Cover page',            hint: 'Letterhead, project details, status' },
  { id: 'signature', label: 'Approval block',        hint: 'Designed / checked / approved signatures' },
  { id: 'params',    label: 'Design parameters',     hint: 'Every input used to produce the results' },
  { id: 'results',   label: 'Design results',        hint: 'Computed capacities and reinforcement' },
  { id: 'messages',  label: 'Checks & observations', hint: 'PASS / WARN / FAIL notes from the engine' },
  { id: 'calcs',     label: 'Detailed calculations', hint: 'Step-by-step working with code clauses' },
  { id: 'visuals',   label: 'Diagrams',              hint: 'Section and analysis figures' },
  { id: 'threeD',    label: '3D reinforcement view', hint: 'Indicative image — the rest of the record is vector' },
];

export default function ReportButton({ data, projectId, threeD }: Props) {
  const [open, setOpen]         = useState(false);
  const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);
  const [meta, setMeta]         = useState<ReportMeta>(DEFAULT_META);
  const [image3d, setImage3d]   = useState<string | null>(null);
  const [pending, setPending]   = useState(false);
  const [capturing, setCapturing] = useState(false);
  const holderRef               = useRef<HTMLDivElement>(null);

  const { projects } = useProject();
  const { currentUser, users } = useUser();
  const { factors } = useBuildingCode();

  const project = projects.find(p => p.id === projectId)
    ?? projects.find(p => p.status === 'active')
    ?? null;

  const engineerName = currentUser?.name
    ?? users.find(u => u.id === project?.engineerId)?.name
    ?? '';

  // Sections with nothing to show are disabled rather than silently empty.
  const available: Record<keyof ReportSections, boolean> = {
    cover:     true,
    signature: true,
    params:    data.params.length > 0,
    results:   data.results.length > 0,
    messages:  (data.messages?.length ?? 0) > 0,
    calcs:     (data.calcSteps?.length ?? 0) > 0,
    visuals:   (data.visuals?.length ?? 0) > 0,
    threeD:    !!threeD,
  };

  const toggle = (id: keyof ReportSections) =>
    setSections(s => ({ ...s, [id]: !s[id] }));

  const setM = <K extends keyof ReportMeta>(k: K, v: ReportMeta[K]) =>
    setMeta(m => ({ ...m, [k]: v }));

  // Grab the 3D view as a PNG, then hand off to the effect below. Printing here
  // would race the state update and omit the image from the document.
  //
  // The off-screen WebGL canvas is cold when the section is first ticked, and a
  // frozen (still) scene with an environment map + shadows takes several frames
  // to reach a fully populated image. A fixed delay captured a near-blank frame,
  // so instead poll until the PNG size stabilises (two reads within 2%), with a
  // hard ceiling so a stuck GPU can't hang the dialog.
  const generate = () => {
    if (!(sections.threeD && threeD)) {
      setImage3d(null);
      setPending(true);
      return;
    }

    setCapturing(true);
    const start = performance.now();
    let last = 0;
    let stable = 0;

    const tick = () => {
      const canvas = holderRef.current?.querySelector('canvas');
      const url = canvas ? canvas.toDataURL('image/png') : '';
      const size = url.length;
      const elapsed = performance.now() - start;

      // Settled: a populated frame that stopped growing. The floor (5 KB) only
      // rejects the near-empty buffer-clear frame (~2 KB); a real render — even
      // a thin column that is mostly dark background — is well above it, while
      // a stirrup-dense beam is far larger, so an absolute upper gate would
      // wrongly reject the column. Stability is the real signal.
      const settled = size > 5_000 && last > 0 && Math.abs(size - last) / size < 0.02;
      stable = settled ? stable + 1 : 0;
      last = size;

      if (stable >= 2 || elapsed > 4000) {
        setImage3d(size > 5_000 ? url : null);
        setCapturing(false);
        setPending(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Print once React has committed the captured image into the document.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      document.body.classList.add('report-print');
      const cleanup = () => {
        document.body.classList.remove('report-print');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
      // Safari/Firefox don't always fire afterprint — belt and braces.
      setTimeout(cleanup, 1500);
      setPending(false);
    }, 60);
    return () => clearTimeout(t);
  }, [pending]);

  const chosen = SECTION_LABELS.filter(s => sections[s.id] && available[s.id]).length;

  return (
    <>
      <Button variant="secondary" size="sm" icon={<FileDown size={13} />}
        onClick={() => setOpen(true)}>
        Export PDF Report
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Export PDF Report</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.moduleTitle} · {factors.label}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Sections */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">
                  Include in report <span className="font-normal text-slate-400">({chosen} of {SECTION_LABELS.length})</span>
                </p>
                <div className="space-y-1">
                  {SECTION_LABELS.map(s => {
                    const disabled = !available[s.id];
                    return (
                      <label key={s.id}
                        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors
                          ${disabled
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                            : 'cursor-pointer border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 accent-blue-600"
                          checked={!disabled && sections[s.id]}
                          disabled={disabled}
                          onChange={() => toggle(s.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-slate-700">
                            {s.label}
                            {disabled && <span className="ml-1 font-normal text-slate-400">— nothing to show</span>}
                          </span>
                          <span className="block text-xs leading-tight text-slate-400">{s.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Document metadata */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">Document details</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-xs text-slate-500">Revision</span>
                    <input value={meta.revision} onChange={e => setM('revision', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Purpose of issue</span>
                    <input value={meta.purpose} onChange={e => setM('purpose', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Checked by</span>
                    <input value={meta.checkedBy} onChange={e => setM('checkedBy', e.target.value)}
                      placeholder="Leave blank to sign by hand"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Approved by</span>
                    <input value={meta.approvedBy} onChange={e => setM('approvedBy', e.target.value)}
                      placeholder="Leave blank to sign by hand"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
                  </label>
                </div>
                <label className="mt-2.5 block">
                  <span className="text-xs text-slate-500">Notes (printed on the cover)</span>
                  <textarea value={meta.notes} onChange={e => setM('notes', e.target.value)} rows={2}
                    placeholder="Assumptions, scope limits, or anything the checker should know"
                    className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
                </label>
              </div>

              {!project && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  No project selected — the cover will show “not assigned”. Assign this design to a
                  project first if the report is being issued.
                </p>
              )}

              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                Choose <strong>Save as PDF</strong> as the destination. For a clean record, switch
                off “Headers and footers” in the print dialog and leave background graphics on.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" icon={<Printer size={13} />} onClick={generate}
                disabled={capturing || pending}>
                {capturing ? 'Preparing…' : 'Generate PDF'}
              </Button>
            </div>
          </div>

          {/* Off-screen 3D view, mounted only when the section is ticked. Kept
              rendered (not display:none) so WebGL actually produces frames —
              a hidden canvas never paints, and would capture blank. */}
          {threeD && sections.threeD && (
            <div
              ref={holderRef}
              aria-hidden
              style={{ position: 'fixed', left: -10000, top: 0, width: 900, height: 560, pointerEvents: 'none' }}
            >
              {threeD}
            </div>
          )}

          {/* Mounted while the dialog is open so the print pipeline has a document */}
          <PrintReport
            data={data}
            sections={sections}
            meta={meta}
            project={project}
            engineerName={engineerName}
            codeLabel={factors.label}
            codeDescription={factors.description}
            image3d={image3d}
          />
        </div>
      )}
    </>
  );
}
