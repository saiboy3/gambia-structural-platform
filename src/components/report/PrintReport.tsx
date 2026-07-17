/**
 * PrintReport — the A4 calculation record that is actually sent to the printer.
 *
 * Rendered into a portal on <body> and hidden on screen; the print stylesheet
 * hides the app and reveals this instead, so the PDF contains the document and
 * nothing else (no nav, no buttons, no scrollbars). Text and SVG stay vector,
 * which is what makes the output readable, searchable and small enough to issue.
 */
import { createPortal } from 'react-dom';
import type { CalcStep } from '../ui/CalcSheet';
import type { ReportData, ReportSections, ReportMeta, ReportGroup } from '../../types/report';
import type { Project } from '../../types/app';

const FIRM = {
  name: 'Arch Engineering Platform',
  tagline: 'Structural Design · QA · Project Management',
  address: 'Banjul, The Gambia',
};

const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  OK:   { label: 'ADEQUATE',        tone: '#047857' },
  pass: { label: 'ADEQUATE',        tone: '#047857' },
  WARN: { label: 'ADEQUATE — SEE NOTES', tone: '#b45309' },
  warn: { label: 'ADEQUATE — SEE NOTES', tone: '#b45309' },
  FAIL: { label: 'NOT ADEQUATE',    tone: '#b91c1c' },
  fail: { label: 'NOT ADEQUATE',    tone: '#b91c1c' },
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Small building blocks ────────────────────────────────────────────────────
function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="rep-h2">
      <span className="rep-h2-n">{n}</span>
      {children}
    </h2>
  );
}

function DataTable({ group }: { group: ReportGroup }) {
  return (
    <div className="rep-avoid">
      <h3 className="rep-h3">{group.heading}</h3>
      <table className="rep-table">
        <tbody>
          {group.rows.map((r, i) => (
            <tr key={i} className={r.key ? 'rep-key' : undefined}>
              <td className="rep-td-label">{r.label}</td>
              <td className="rep-td-value">
                {/* Don't decorate whole numbers (a 250 mm width isn't "250.00"). */}
                {typeof r.value === 'number'
                  ? (Number.isInteger(r.value) ? r.value : r.value.toFixed(2))
                  : r.value}
                {r.unit ? <span className="rep-unit"> {r.unit}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalcTable({ steps }: { steps: CalcStep[] }) {
  return (
    <table className="rep-table rep-calc">
      <thead>
        <tr>
          <th style={{ width: '22%' }}>Parameter</th>
          <th>Formula / Working</th>
          <th style={{ width: '16%' }} className="rep-right">Result</th>
          <th style={{ width: '20%' }}>Reference</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((s, i) => {
          if (s.heading) {
            return (
              <tr key={i} className="rep-calc-head">
                <td colSpan={4}>{s.heading}</td>
              </tr>
            );
          }
          return (
            <tr key={i} className={s.status ? `rep-st-${s.status}` : undefined}>
              <td className="rep-td-label">{s.label}</td>
              <td>
                {s.formula && <div className="rep-formula">{s.formula}</div>}
                {s.working && <div className="rep-working">{s.working}</div>}
                {s.note && <div className="rep-note">{s.note}</div>}
              </td>
              <td className="rep-right rep-td-value">{s.result}</td>
              <td className="rep-ref">{s.ref}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Document ─────────────────────────────────────────────────────────────────
interface Props {
  data: ReportData;
  sections: ReportSections;
  meta: ReportMeta;
  project: Project | null;
  engineerName: string;
  codeLabel: string;
  codeDescription: string;
  /** PNG data URL captured from the module's WebGL canvas, if requested. */
  image3d?: string | null;
}

export default function PrintReport({
  data, sections, meta, project, engineerName, codeLabel, codeDescription, image3d,
}: Props) {
  const now = new Date();
  const status = data.status ? STATUS_TEXT[data.status] : undefined;
  const jobNo = project?.jobNumber ?? '—';
  const elementRef = data.elementRef ?? data.moduleTitle;

  // Number only the sections actually being issued.
  let sn = 0;
  const num = () => ++sn;

  const body = (
    <div id="print-report" className="rep-root">
      {/* ── Running footer — repeats on every printed page ── */}
      <div className="rep-footer">
        <span>{jobNo} · {elementRef}</span>
        <span>Rev {meta.revision} · {codeLabel}</span>
        <span>Uncontrolled when printed</span>
      </div>

      {/* ── Cover / title page ── */}
      {sections.cover && (
        <section className="rep-cover">
          <div className="rep-letterhead">
            <div>
              <div className="rep-firm">{FIRM.name}</div>
              <div className="rep-tagline">{FIRM.tagline} · {FIRM.address}</div>
            </div>
            <div className="rep-doctype">
              Structural Design<br />Calculation Record
            </div>
          </div>

          <h1 className="rep-title">{data.moduleTitle}</h1>
          <div className="rep-subtitle">{meta.purpose}</div>

          <table className="rep-table rep-cover-table">
            <tbody>
              <tr><td className="rep-td-label">Project</td><td>{project?.name ?? '— not assigned —'}</td>
                  <td className="rep-td-label">Job number</td><td>{jobNo}</td></tr>
              <tr><td className="rep-td-label">Client</td><td>{project?.client ?? '—'}</td>
                  <td className="rep-td-label">Location</td><td>{project?.location ?? '—'}</td></tr>
              <tr><td className="rep-td-label">Element</td><td>{elementRef}</td>
                  <td className="rep-td-label">Revision</td><td>{meta.revision}</td></tr>
              <tr><td className="rep-td-label">Design code</td><td colSpan={3}>{codeLabel} — {codeDescription}</td></tr>
              <tr><td className="rep-td-label">Date issued</td><td>{fmtDate(now)}</td>
                  <td className="rep-td-label">Status</td>
                  <td style={{ color: status?.tone, fontWeight: 700 }}>{status?.label ?? '—'}</td></tr>
            </tbody>
          </table>

          {meta.notes && (
            <div className="rep-notes">
              <div className="rep-h3">Notes</div>
              <p>{meta.notes}</p>
            </div>
          )}

          {sections.signature && (
            <>
              <div className="rep-h3 rep-sig-title">Approval</div>
              <table className="rep-table rep-sig">
                <thead>
                  <tr><th>Role</th><th>Name</th><th>Signature</th><th style={{ width: '20%' }}>Date</th></tr>
                </thead>
                <tbody>
                  <tr><td className="rep-td-label">Designed by</td><td>{engineerName}</td><td className="rep-sig-cell" /><td className="rep-sig-cell" /></tr>
                  <tr><td className="rep-td-label">Checked by</td><td>{meta.checkedBy || ''}</td><td className="rep-sig-cell" /><td className="rep-sig-cell" /></tr>
                  <tr><td className="rep-td-label">Approved by</td><td>{meta.approvedBy || ''}</td><td className="rep-sig-cell" /><td className="rep-sig-cell" /></tr>
                </tbody>
              </table>
            </>
          )}

          <div className="rep-disclaimer">
            <strong>Limitations.</strong> This record documents the calculations performed by
            the Arch Engineering Platform for the element and design code stated above, using the
            input parameters listed in this document. It is valid only for those inputs and that
            code. The results must be independently checked by a competent engineer against the
            governing code and the project-specific conditions before being relied upon for
            construction. Computed values are preliminary unless the approval block above is
            signed. This document is uncontrolled when printed.
          </div>
        </section>
      )}

      {/* ── Design parameters ── */}
      {sections.params && data.params.length > 0 && (
        <section className={sections.cover ? 'rep-break' : undefined}>
          <SectionTitle n={num()}>Design Parameters</SectionTitle>
          <p className="rep-lead">
            The values below are the complete set of inputs used to produce the results in this
            record. Any change to these inputs invalidates the results that follow.
          </p>
          {data.params.map((g, i) => <DataTable key={i} group={g} />)}
        </section>
      )}

      {/* ── Design results ── */}
      {sections.results && data.results.length > 0 && (
        <section>
          <SectionTitle n={num()}>Design Results</SectionTitle>
          {data.results.map((g, i) => <DataTable key={i} group={g} />)}
          {status && (
            <div className="rep-verdict" style={{ borderColor: status.tone, color: status.tone }}>
              Overall assessment: {status.label}
            </div>
          )}
        </section>
      )}

      {/* ── Engine messages ── */}
      {sections.messages && (data.messages?.length ?? 0) > 0 && (
        <section className="rep-avoid">
          <SectionTitle n={num()}>Checks &amp; Observations</SectionTitle>
          <ul className="rep-msgs">
            {data.messages!.map((m, i) => {
              const kind = m.startsWith('FAIL') ? 'fail' : m.startsWith('WARN') ? 'warn'
                        : m.startsWith('INFO') ? 'info' : 'ok';
              return <li key={i} className={`rep-msg rep-msg-${kind}`}>{m}</li>;
            })}
          </ul>
        </section>
      )}

      {/* ── Calculations ── */}
      {sections.calcs && (data.calcSteps?.length ?? 0) > 0 && (
        <section className="rep-break">
          <SectionTitle n={num()}>Detailed Calculations</SectionTitle>
          <p className="rep-lead">
            Each step below shows the expression used, the substituted values and the resulting
            figure, with the governing code clause, so that the design can be reproduced by hand.
          </p>
          <CalcTable steps={data.calcSteps!} />
        </section>
      )}

      {/* ── Diagrams (2D vector figures, then the rasterised 3D view) ── */}
      {(() => {
        const figs = sections.visuals ? (data.visuals ?? []) : [];
        const show3d = sections.threeD && !!image3d;
        if (figs.length === 0 && !show3d) return null;
        return (
          <section className="rep-break">
            <SectionTitle n={num()}>Diagrams</SectionTitle>
            {figs.map((v, i) => (
              <figure key={i} className="rep-fig rep-avoid">
                <div className="rep-fig-body">{v.node}</div>
                <figcaption>Figure {i + 1} — {v.label}</figcaption>
              </figure>
            ))}
            {show3d && (
              <figure className="rep-fig rep-avoid">
                <div className="rep-fig-body rep-fig-3d">
                  <img src={image3d!} alt="3D reinforcement view" />
                </div>
                <figcaption>
                  Figure {figs.length + 1} — 3D reinforcement arrangement (indicative)
                </figcaption>
              </figure>
            )}
          </section>
        );
      })()}

      <div className="rep-end">— End of calculation record —</div>
    </div>
  );

  return createPortal(body, document.body);
}
