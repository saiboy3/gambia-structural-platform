/**
 * calcNotesLoads.ts
 * Generates step-by-step calculation breakdowns for QA/QC on the load-calculation
 * / reference modules: Load Calculator (dead+live builder), Load Combinations,
 * and Wind Calculator. References EC2/EC0/EC1/BS8110 clause numbers directly
 * as plain strings (no full multi-code branching required for these modules).
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { CodeFactors } from '../context/BuildingCodeContext';
import type { Combination, LoadValues } from './loadCombinations';
import type { WindInputs, WindResults } from './windCalculations';

// ── Number formatting helpers ─────────────────────────────────────────────────
const n  = (v: number, dp = 2) => v.toFixed(dp);

// ── LOAD CALCULATOR (dead + live builder) calc notes ──────────────────────────
export interface LoadCalcDeadItem { id: number; item: string; value: number }
export interface LoadCalcOccupancy { category: string; use: string; qkEC2: number; qkBS: number; qkACI: number }

export function loadCalcNotes(
  deadItems: LoadCalcDeadItem[],
  selectedOcc: LoadCalcOccupancy | null,
  qk: number,
  cf: Partial<CodeFactors> & { code?: string; label?: string; description?: string },
): CalcStep[] {
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const gk = deadItems.reduce((s, i) => s + i.value, 0);
  const wdULS = γG * gk + γQ * qk;
  const wdSLS = gk + qk;

  const steps: CalcStep[] = [
    { heading: '1. Dead Load (gk) Build-Up' },
    ...deadItems.map((it): CalcStep => ({
      label: it.item,
      formula: 'Characteristic dead load item',
      working: `= ${n(it.value)} kN/m²`,
      result: `${n(it.value)} kN/m²`,
      ref: 'EC1-1-1 Annex A / project schedule',
    })),
    {
      label: 'Total dead load',
      formula: 'gk = Σ dead load items',
      working: `= ${deadItems.map(i => n(i.value)).join(' + ')}`,
      result: `${n(gk)} kN/m²`,
      ref: 'EC1-1-1 §5',
    },

    { heading: '2. Live / Imposed Load (qk)' },
    {
      label: 'Occupancy category',
      formula: 'qk — from occupancy classification table',
      working: selectedOcc
        ? `Category ${selectedOcc.category} — ${selectedOcc.use}`
        : 'No occupancy category selected',
      result: `${n(qk)} kN/m²`,
      ref: 'EC1-1-1 Table 6.1' ,
      status: selectedOcc ? 'ok' : 'warn',
      note: selectedOcc ? undefined : 'Select an occupancy category above to set qk',
    },

    { heading: '3. Design Load Combinations' },
    {
      label: 'ULS design load',
      formula: 'wEd = γG · gk + γQ · qk',
      working: `= ${n(γG)} × ${n(gk)} + ${n(γQ)} × ${n(qk)}`,
      result: `${n(wdULS)} kN/m²`,
      ref: 'EN 1990 Eq. 6.10',
    },
    {
      label: 'SLS design load',
      formula: 'wSLS = gk + qk',
      working: `= ${n(gk)} + ${n(qk)}`,
      result: `${n(wdSLS)} kN/m²`,
      ref: 'EN 1990 §6.5.3',
    },
    {
      label: 'Dead load only (factored)',
      formula: 'γG · gk',
      working: `= ${n(γG)} × ${n(gk)}`,
      result: `${n(γG * gk)} kN/m²`,
      ref: 'EN 1990 Eq. 6.10',
    },
  ];

  return steps;
}

// ── LOAD COMBINATIONS calc notes ───────────────────────────────────────────────
export function loadCombinationsCalcNotes(
  loads: LoadValues,
  combos: Combination[],
  cf: Partial<CodeFactors> & { code?: string; label?: string; description?: string },
): CalcStep[] {
  const ulsCombos = combos.filter(c => c.type === 'ULS');
  const slsCombos = combos.filter(c => c.type === 'SLS');
  const accCombos = combos.filter(c => c.type === 'ACC');
  const ulsGov = ulsCombos.find(c => c.governing);
  const slsGov = slsCombos.find(c => c.governing);
  const ulsMax = Math.max(...ulsCombos.map(c => c.value));
  const slsMax = Math.max(...slsCombos.map(c => c.value));

  const steps: CalcStep[] = [
    { heading: '1. Characteristic Loads' },
    {
      label: 'Dead load (Gk)',
      formula: 'Gk — characteristic permanent action',
      working: `Gk = ${n(loads.Gk)} kN/m²`,
      result: `${n(loads.Gk)} kN/m²`,
      ref: 'EN 1990 §1.5.3.22',
    },
    {
      label: 'Live load (Qk)',
      formula: 'Qk — leading variable action',
      working: `Qk = ${n(loads.Qk)} kN/m²`,
      result: `${n(loads.Qk)} kN/m²`,
      ref: 'EN 1990 §1.5.3.10',
    },
    {
      label: 'Wind load (Wk)',
      formula: 'Wk — variable action (wind)',
      working: `Wk = ${n(loads.Wk)} kN/m²`,
      result: `${n(loads.Wk)} kN/m²`,
      ref: 'EN 1990 §1.5.3.10',
    },

    { heading: `2. Ultimate Limit State (ULS) Combinations — ${cf.label ?? cf.code ?? 'EC2'}` },
    ...ulsCombos.map((c): CalcStep => ({
      label: c.name,
      formula: c.equation,
      working: `= ${n(c.factors.Gk, 3)}×${n(loads.Gk)} + ${n(c.factors.Qk, 3)}×${n(loads.Qk)} + ${n(c.factors.Wk ?? 0, 3)}×${n(loads.Wk)}`,
      result: `${n(c.value)} kN/m²`,
      ref: 'EN 1990 Eq. 6.10',
      status: c.governing ? 'warn' : undefined,
      note: c.governing ? 'Governing ULS combination' : undefined,
    })),
    {
      label: 'Governing ULS value',
      formula: 'max(all ULS combinations)',
      working: `= max(${ulsCombos.map(c => n(c.value)).join(', ')})`,
      result: `${n(ulsMax)} kN/m²`,
      ref: '',
      status: 'warn',
      note: ulsGov ? `Governed by: ${ulsGov.name}` : undefined,
    },

    { heading: '3. Serviceability Limit State (SLS) Combinations' },
    ...slsCombos.map((c): CalcStep => ({
      label: c.name,
      formula: c.equation,
      working: `= ${n(c.factors.Gk, 3)}×${n(loads.Gk)} + ${n(c.factors.Qk, 3)}×${n(loads.Qk)} + ${n(c.factors.Wk ?? 0, 3)}×${n(loads.Wk)}`,
      result: `${n(c.value)} kN/m²`,
      ref: 'EN 1990 §6.5.3',
      status: c.governing ? 'ok' : undefined,
      note: c.governing ? 'Governing SLS combination' : undefined,
    })),
    {
      label: 'Governing SLS value',
      formula: 'max(all SLS combinations)',
      working: `= max(${slsCombos.map(c => n(c.value)).join(', ')})`,
      result: `${n(slsMax)} kN/m²`,
      ref: '',
      status: 'ok',
      note: slsGov ? `Governed by: ${slsGov.name}` : undefined,
    },

    ...(accCombos.length > 0 ? [
      { heading: '4. Accidental Combinations' },
      ...accCombos.map((c): CalcStep => ({
        label: c.name,
        formula: c.equation,
        working: `= ${n(c.factors.Gk, 3)}×${n(loads.Gk)} + ${n(c.factors.Qk, 3)}×${n(loads.Qk)} + ${n(c.factors.Wk ?? 0, 3)}×${n(loads.Wk)}`,
        result: `${n(c.value)} kN/m²`,
        ref: 'EN 1990 §6.4.3.3',
      })),
    ] : []),

    { heading: `${accCombos.length > 0 ? '5' : '4'}. Summary` },
    {
      label: 'ULS / SLS ratio',
      formula: 'ratio = ULSmax / SLSmax',
      working: `= ${n(ulsMax)} / ${n(slsMax)}`,
      result: `${slsMax > 0 ? n(ulsMax / slsMax) : '—'}`,
      ref: '',
    },
    {
      label: 'Wind contribution to governing ULS',
      formula: '%Wind = Wk / ULSmax × 100',
      working: loads.Wk > 0 ? `= ${n(loads.Wk)} / ${n(ulsMax)} × 100` : 'Wk = 0 — no wind contribution',
      result: `${loads.Wk > 0 ? n((loads.Wk / ulsMax) * 100, 0) : '0'} %`,
      ref: '',
    },
  ];

  return steps;
}

// ── WIND CALCULATOR calc notes ─────────────────────────────────────────────────
export function windCalcNotes(inp: WindInputs, res: WindResults): CalcStep[] {
  // Match the engine's guard (0/0 → 0) and additionally clamp the depth = 0
  // case so the sheet shows a finite ratio instead of "Infinity". 999 keeps
  // the same cpe branch (h/d ≥ 1) the engine's Infinity would select.
  const hdRaw = inp.height / inp.depth;
  const hd = Number.isNaN(hdRaw) ? 0 : (Number.isFinite(hdRaw) ? hdRaw : 999);
  const Aref = inp.height * inp.breadth;
  const cf_ = res.cpe_wall - res.cpe_lee;

  const steps: CalcStep[] = [
    { heading: '1. Basic & Mean Wind Velocity' },
    {
      label: 'Basic wind velocity (vb)',
      formula: 'vb = cdir · cseason · vb,0',
      working: `= ${n(inp.cdir, 2)} × ${n(inp.cseason, 2)} × ${inp.vb0}`,
      result: `${n(res.vb, 1)} m/s`,
      ref: 'EC1-1-4 §4.2(2)P Eq. 4.1',
    },
    {
      label: 'Roughness factor (cr)',
      formula: 'cr(z) = kr · ln(z / z0)',
      working: `z0=${inp.terrain} category; kr = 0.19×(z0/0.05)^0.07; z = max(${inp.height}, zmin)`,
      result: `${n(res.cr, 3)}`,
      ref: 'EC1-1-4 §4.3.2 Eq. 4.4/4.5',
    },
    {
      label: 'Orography factor (co)',
      formula: 'co(z) = 1.0  (flat terrain assumed)',
      working: `co = ${n(res.co, 2)}`,
      result: `${n(res.co, 2)}`,
      ref: 'EC1-1-4 §4.3.3',
    },
    {
      label: 'Mean wind velocity (vm)',
      formula: 'vm(z) = cr(z) · co(z) · vb',
      working: `= ${n(res.cr, 3)} × ${n(res.co, 2)} × ${n(res.vb, 1)}`,
      result: `${n(res.vm, 1)} m/s`,
      ref: 'EC1-1-4 §4.3.1 Eq. 4.3',
    },

    { heading: '2. Peak Velocity Pressure' },
    {
      label: 'Basic velocity pressure (qb)',
      formula: 'qb = 0.5 · ρ · vb²',
      working: `= 0.5 × ${inp.rho} × ${n(res.vb, 1)}² / 1000`,
      result: `${n(res.qb, 3)} kN/m²`,
      ref: 'EC1-1-4 §4.5 Eq. 4.10',
    },
    {
      label: 'Exposure factor (ce)',
      formula: 'ce(z) = (1 + 7·Iv) · cr² · co²',
      working: `Iv = 1/(co·ln(z/z0));  ce = (1 + 7×Iv) × ${n(res.cr,3)}² × ${n(res.co,2)}²`,
      result: `${n(res.ce, 3)}`,
      ref: 'EC1-1-4 §4.5 Eq. 4.7',
    },
    {
      label: 'Peak velocity pressure (qp)',
      formula: 'qp(z) = ce(z) · qb',
      working: `= ${n(res.ce, 3)} × ${n(res.qb, 3)}`,
      result: `${n(res.qp, 3)} kN/m²`,
      ref: 'EC1-1-4 §4.5 Eq. 4.8',
      status: 'info',
    },
    {
      label: 'Peak gust velocity (vp)',
      formula: 'vp = √(2·qp / ρ)',
      working: `= √(2 × ${n(res.qp, 3)} × 1000 / ${inp.rho})`,
      result: `${n(res.vp, 1)} m/s`,
      ref: 'EC1-1-4 §4.5',
    },

    { heading: '3. External / Internal Pressure Coefficients' },
    {
      label: 'Height / depth ratio (h/d)',
      formula: 'h/d = height / depth',
      working: `= ${inp.height} / ${inp.depth}`,
      result: `${n(hd, 2)}`,
      ref: 'EC1-1-4 Table 7.1',
    },
    {
      label: 'cpe — windward wall (zone D)',
      formula: 'cpe = f(h/d)  interpolated 0.7 (h/d≤0.25) – 0.8 (h/d≥1)',
      working: `h/d = ${n(hd, 2)}`,
      result: `${n(res.cpe_wall, 2)}`,
      ref: 'EC1-1-4 Table 7.1 — Zone D',
    },
    {
      label: 'cpe — leeward wall (zone E)',
      formula: 'cpe = f(h/d)  interpolated −0.3 (h/d≤0.25) – −0.5 (h/d≥1)',
      working: `h/d = ${n(hd, 2)}`,
      result: `${n(res.cpe_lee, 2)}`,
      ref: 'EC1-1-4 Table 7.1 — Zone E',
    },
    {
      label: 'cpe — roof (suction)',
      formula: 'cpe,roof = −0.7  (simplified duopitch/flat suction zone)',
      working: `cpe,roof = ${n(res.cpe_roof, 2)}`,
      result: `${n(res.cpe_roof, 2)}`,
      ref: 'EC1-1-4 Table 7.2 / 7.3a (simplified)',
    },
    {
      label: 'Internal pressure coefficient (cpi)',
      formula: inp.internalPressure === 'closed' ? 'cpi = −0.3 (closed building)'
        : inp.internalPressure === 'dominant' ? 'cpi = +0.7 (dominant opening)'
        : 'cpi = +0.2 (open, no dominant face)',
      working: `internalPressure = ${inp.internalPressure}`,
      result: `${n(res.cpi, 2)}`,
      ref: 'EC1-1-4 §7.2.9',
    },

    { heading: '4. Net Design Pressures' },
    {
      label: 'Windward wall (we)',
      formula: 'we = qp · (cpe,wall − cpi)',
      working: `= ${n(res.qp, 3)} × (${n(res.cpe_wall, 2)} − ${n(res.cpi, 2)})`,
      result: `${n(res.we_wind, 3)} kN/m²`,
      ref: 'EC1-1-4 §5.2 Eq. 5.5',
      status: 'info',
    },
    {
      label: 'Leeward wall (we)',
      formula: 'we = qp · (cpe,lee − cpi)',
      working: `= ${n(res.qp, 3)} × (${n(res.cpe_lee, 2)} − ${n(res.cpi, 2)})`,
      result: `${n(res.we_lee, 3)} kN/m²`,
      ref: 'EC1-1-4 §5.2 Eq. 5.5',
    },
    {
      label: 'Roof (we)',
      formula: 'we = qp · (cpe,roof − cpi)',
      working: `= ${n(res.qp, 3)} × (${n(res.cpe_roof, 2)} − ${n(res.cpi, 2)})`,
      result: `${n(res.we_roof, 3)} kN/m²`,
      ref: 'EC1-1-4 §5.2 Eq. 5.5',
    },

    { heading: '5. Total Wind Force' },
    {
      label: 'Reference area (Aref)',
      formula: 'Aref = height × breadth',
      working: `= ${inp.height} × ${inp.breadth}`,
      result: `${n(Aref, 1)} m²`,
      ref: 'EC1-1-4 §7.2.2',
    },
    {
      label: 'Force coefficient (cf)',
      formula: 'cf = cpe,wall − cpe,lee',
      working: `= ${n(res.cpe_wall, 2)} − ${n(res.cpe_lee, 2)}`,
      result: `${n(cf_, 2)}`,
      ref: 'EC1-1-4 §7.2',
    },
    {
      label: 'Total wind force (Fw)',
      formula: 'Fw = csCd · qp · cf · Aref',
      working: `= ${n(inp.csCd, 2)} × ${n(res.qp, 3)} × ${n(cf_, 2)} × ${n(Aref, 1)}`,
      result: `${n(res.Fw_total, 1)} kN`,
      ref: 'EC1-1-4 §5.3 Eq. 5.9',
      status: 'ok',
    },
    {
      label: 'Wind force per metre height',
      formula: 'Fw/m = csCd · qp · cf · breadth',
      working: `= ${n(inp.csCd, 2)} × ${n(res.qp, 3)} × ${n(cf_, 2)} × ${inp.breadth}`,
      result: `${n(res.Fw_perM, 2)} kN/m`,
      ref: 'EC1-1-4 §5.3',
    },
  ];

  return steps;
}
