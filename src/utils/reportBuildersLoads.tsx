/**
 * reportBuildersLoads — calculation records for the load-derivation tools
 * (Load Calculator, Load Combinations, Wind Load).
 *
 * These modules produce the actions that every member design depends on, so
 * they're worth issuing as records in their own right: a checker needs to see
 * where gk, qk and the wind pressures came from, not just the member that used
 * them.
 */
import { loadCalcNotes, loadCombinationsCalcNotes, windCalcNotes } from './calcNotesLoads';
import type { LoadCalcDeadItem, LoadCalcOccupancy } from './calcNotesLoads';
import type { LoadValues, Combination } from './loadCombinations';
import type { WindInputs, WindResults } from './windCalculations';
import type { ReportData } from '../types/report';
import type { CodeFactors } from '../context/BuildingCodeContext';

type Factors = Partial<CodeFactors> & { code?: string; label?: string };

const TERRAIN_LABEL: Record<string, string> = {
  '0': 'Cat 0 — Sea / coastal strip',
  'I': 'Cat I — Open country, lakes',
  'II': 'Cat II — Farmland with hedges',
  'III': 'Cat III — Suburban / forest',
  'IV': 'Cat IV — Urban / city centre',
};

const INTERNAL_LABEL: Record<string, string> = {
  closed: 'Closed building',
  open: 'Open / evenly distributed openings',
  dominant: 'Dominant face open',
};

// ── Load Calculator ──────────────────────────────────────────────────────────
export function buildLoadCalcReport(
  deadItems: LoadCalcDeadItem[],
  selectedOcc: LoadCalcOccupancy | null,
  qk: number,
  factors: Factors,
): ReportData {
  const gk = deadItems.reduce((s, i) => s + i.value, 0);
  const γG = factors.gammaG ?? 1.35;
  const γQ = factors.gammaQ ?? 1.5;

  return {
    moduleTitle: 'Floor Load Derivation',
    elementRef: selectedOcc ? `${selectedOcc.use} floor` : 'Floor loading',
    params: [
      {
        heading: 'Imposed load',
        rows: [
          { label: 'Occupancy category', value: selectedOcc ? `${selectedOcc.category} — ${selectedOcc.use}` : 'Not selected' },
          { label: 'Characteristic imposed load (qk)', value: qk.toFixed(2), unit: 'kN/m²', key: true },
        ],
      },
      {
        heading: 'Dead load build-up',
        rows: [
          ...deadItems.map(d => ({ label: d.item, value: d.value.toFixed(2), unit: 'kN/m²' })),
          { label: 'Total characteristic dead load (gk)', value: gk.toFixed(2), unit: 'kN/m²', key: true },
        ],
      },
      {
        heading: 'Partial factors',
        rows: [
          { label: 'γG (permanent)', value: γG },
          { label: 'γQ (variable)', value: γQ },
        ],
      },
    ],
    results: [
      {
        heading: 'Design loads',
        rows: [
          { label: 'ULS design load', value: (γG * gk + γQ * qk).toFixed(2), unit: 'kN/m²', key: true },
          { label: 'SLS design load', value: (gk + qk).toFixed(2), unit: 'kN/m²', key: true },
          { label: 'Dead load only (factored)', value: (γG * gk).toFixed(2), unit: 'kN/m²' },
        ],
      },
    ],
    calcSteps: loadCalcNotes(deadItems, selectedOcc, qk, factors),
  };
}

// ── Load Combinations ────────────────────────────────────────────────────────
export function buildLoadCombinationsReport(
  loads: LoadValues,
  combos: Combination[],
  factors: Factors,
): ReportData {
  const uls = combos.filter(c => c.type === 'ULS');
  const sls = combos.filter(c => c.type === 'SLS');
  const acc = combos.filter(c => c.type === 'ACC');
  const govULS = uls.find(c => c.governing);
  const govSLS = sls.find(c => c.governing);

  const group = (heading: string, list: Combination[]) => ({
    heading,
    rows: list.map(c => ({
      label: `${c.name} — ${c.equation}`,
      value: c.value.toFixed(2),
      unit: 'kN/m²',
      key: c.governing,
    })),
  });

  return {
    moduleTitle: 'Load Combinations',
    elementRef: `Combinations — ${factors.label ?? ''}`.trim(),
    params: [
      {
        heading: 'Characteristic loads',
        rows: [
          { label: 'Permanent (Gk)', value: loads.Gk.toFixed(2), unit: 'kN/m²' },
          { label: 'Variable / imposed (Qk)', value: loads.Qk.toFixed(2), unit: 'kN/m²' },
          { label: 'Wind (Wk)', value: loads.Wk.toFixed(2), unit: 'kN/m²' },
        ],
      },
    ],
    results: [
      group('Ultimate limit state', uls),
      ...(sls.length ? [group('Serviceability limit state', sls)] : []),
      ...(acc.length ? [group('Accidental', acc)] : []),
      {
        heading: 'Governing combinations',
        rows: [
          { label: 'Governing ULS', value: govULS ? `${govULS.value.toFixed(2)} kN/m² — ${govULS.name}` : '—', key: true },
          { label: 'Governing SLS', value: govSLS ? `${govSLS.value.toFixed(2)} kN/m² — ${govSLS.name}` : '—', key: true },
        ],
      },
    ],
    calcSteps: loadCombinationsCalcNotes(loads, combos, factors),
  };
}

// ── Wind Load ────────────────────────────────────────────────────────────────
export function buildWindReport(inp: WindInputs, res: WindResults): ReportData {
  return {
    moduleTitle: 'Wind Load Assessment',
    elementRef: `Wind — ${inp.height} m × ${inp.breadth} m`,
    params: [
      {
        heading: 'Site & exposure',
        rows: [
          { label: 'Basic wind velocity (vb,0)', value: inp.vb0, unit: 'm/s' },
          { label: 'Wind zone', value: inp.zone },
          { label: 'Terrain category', value: TERRAIN_LABEL[inp.terrain] ?? inp.terrain },
          { label: 'Directional factor (cdir)', value: inp.cdir },
          { label: 'Season factor (cseason)', value: inp.cseason },
          { label: 'Structural factor (cscd)', value: inp.csCd },
          { label: 'Air density (ρ)', value: inp.rho, unit: 'kg/m³' },
        ],
      },
      {
        heading: 'Building geometry',
        rows: [
          { label: 'Reference height (ze)', value: inp.height, unit: 'm' },
          { label: 'Crosswind breadth (b)', value: inp.breadth, unit: 'm' },
          { label: 'Along-wind depth (d)', value: inp.depth, unit: 'm' },
          { label: 'Openings', value: INTERNAL_LABEL[inp.internalPressure] ?? inp.internalPressure },
        ],
      },
    ],
    results: [
      {
        heading: 'Velocities & pressures',
        rows: [
          { label: 'Basic wind velocity (vb)', value: res.vb.toFixed(2), unit: 'm/s' },
          { label: 'Roughness factor (cr)', value: res.cr.toFixed(3) },
          { label: 'Orography factor (co)', value: res.co.toFixed(2) },
          { label: 'Mean velocity (vm)', value: res.vm.toFixed(2), unit: 'm/s' },
          { label: 'Peak velocity (vp)', value: res.vp.toFixed(2), unit: 'm/s' },
          { label: 'Basic velocity pressure (qb)', value: res.qb.toFixed(3), unit: 'kN/m²' },
          { label: 'Exposure factor (ce)', value: res.ce.toFixed(3) },
          { label: 'Peak velocity pressure (qp)', value: res.qp.toFixed(3), unit: 'kN/m²', key: true },
        ],
      },
      {
        heading: 'Pressure coefficients',
        rows: [
          { label: 'Windward wall (cpe,10)', value: res.cpe_wall.toFixed(2) },
          { label: 'Leeward wall (cpe,10)', value: res.cpe_lee.toFixed(2) },
          { label: 'Roof (cpe,10)', value: res.cpe_roof.toFixed(2) },
          { label: 'Internal (cpi)', value: res.cpi.toFixed(2) },
        ],
      },
      {
        heading: 'Net pressures & forces',
        rows: [
          { label: 'Windward wall (we)', value: res.we_wind.toFixed(3), unit: 'kN/m²', key: true },
          { label: 'Leeward wall (we)', value: res.we_lee.toFixed(3), unit: 'kN/m²' },
          { label: 'Roof (we)', value: res.we_roof.toFixed(3), unit: 'kN/m²' },
          { label: 'Total wind force (Fw)', value: res.Fw_total.toFixed(1), unit: 'kN', key: true },
          { label: 'Force per m height', value: res.Fw_perM.toFixed(2), unit: 'kN/m' },
        ],
      },
    ],
    calcSteps: windCalcNotes(inp, res),
  };
}
