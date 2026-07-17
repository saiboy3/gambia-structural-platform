/**
 * Report data contract.
 *
 * Each analysis module describes its report content declaratively; the shared
 * <ReportButton> renders it into a print-ready A4 calculation record. Keeping
 * this a plain data contract (rather than letting each module hand-roll its own
 * print layout) is what makes every module's output look identical on paper —
 * which is the point of a document that may be issued for approval.
 */
import type { ReactNode } from 'react';
import type { CalcStep } from '../components/ui/CalcSheet';

export interface ReportRow {
  label: string;
  value: string | number;
  unit?: string;
  /** Highlights the row as a governing/critical value. */
  key?: boolean;
}

export interface ReportGroup {
  heading: string;
  rows: ReportRow[];
}

export interface ReportVisual {
  label: string;
  /** Rendered inline — SVG stays vector (and therefore selectable//sharp) in
   *  the PDF. Canvas-based 3D views are rasterised by the caller instead. */
  node: ReactNode;
}

export interface ReportData {
  /** e.g. "RC Beam Design" */
  moduleTitle: string;
  /** Short element descriptor for the running footer, e.g. "Beam B1" */
  elementRef?: string;
  status?: 'OK' | 'WARN' | 'FAIL' | 'pass' | 'warn' | 'fail';
  params: ReportGroup[];
  results: ReportGroup[];
  calcSteps?: CalcStep[];
  /** Engine messages (PASS/WARN/FAIL lines). */
  messages?: string[];
  visuals?: ReportVisual[];
}

/** Which optional sections the engineer chose to issue. */
export interface ReportSections {
  cover: boolean;
  params: boolean;
  results: boolean;
  messages: boolean;
  calcs: boolean;
  visuals: boolean;
  /** The 3D reinforcement view, rasterised from its WebGL canvas. */
  threeD: boolean;
  signature: boolean;
}

export const DEFAULT_SECTIONS: ReportSections = {
  cover: true,
  params: true,
  results: true,
  messages: true,
  calcs: true,
  visuals: true,
  // Off by default: it's a rasterised image in an otherwise vector document,
  // and it illustrates rather than evidences the design.
  threeD: false,
  signature: true,
};

/** Free-text metadata captured in the dialog and stamped onto the cover. */
export interface ReportMeta {
  revision: string;
  checkedBy: string;
  approvedBy: string;
  purpose: string;
  notes: string;
}

export const DEFAULT_META: ReportMeta = {
  revision: 'P01',
  checkedBy: '',
  approvedBy: '',
  purpose: 'Preliminary Design',
  notes: '',
};
