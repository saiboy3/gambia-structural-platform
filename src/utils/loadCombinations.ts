import type { BuildingCode } from '../context/BuildingCodeContext';

export interface LoadValues {
  Gk: number;   // Permanent / dead (kN/m² or kN/m)
  Qk: number;   // Leading variable / live
  Wk: number;   // Wind (kN/m² or kN/m)
  Qk2?: number; // Secondary variable (e.g. snow — not common in Gambia, kept for completeness)
}

export interface Combination {
  id: string;
  name: string;
  equation: string;
  type: 'ULS' | 'SLS' | 'ACC';
  value: number;
  factors: { Gk: number; Qk: number; Wk: number; Qk2?: number };
  governing?: boolean;
}

// ─── EC0 / EC2 combinations ───────────────────────────────────────────────
// ψ factors for office/residential (Table A1.1 EC0)
const psi0Q = 0.7;   // ψ0 for imposed
const psi1Q = 0.5;   // ψ1 for imposed
const psi2Q = 0.3;   // ψ2 for imposed
const psi0W = 0.6;   // ψ0 for wind
const psi1W = 0.2;   // ψ1 for wind

function ec2Combinations(v: LoadValues): Combination[] {
  const { Gk, Qk, Wk } = v;
  const combos: Omit<Combination, 'governing'>[] = [
    // ULS — Eq. 6.10 (simplified, always conservative)
    { id:'EC-ULS-610',  name:'ULS Eq.6.10',           equation:'1.35Gk + 1.5Qk',
      type:'ULS', factors:{ Gk:1.35, Qk:1.5, Wk:0 },
      value: 1.35*Gk + 1.5*Qk },
    // ULS — Eq. 6.10 with wind
    { id:'EC-ULS-610W', name:'ULS Eq.6.10 + Wind',    equation:'1.35Gk + 1.5Qk + 1.5×0.6Wk',
      type:'ULS', factors:{ Gk:1.35, Qk:1.5, Wk:1.5*psi0W },
      value: 1.35*Gk + 1.5*Qk + 1.5*psi0W*Wk },
    // ULS — Eq. 6.10 wind dominant
    { id:'EC-ULS-610WD',name:'ULS Wind Dominant',     equation:'1.35Gk + 1.5Wk + 1.5×0.7Qk',
      type:'ULS', factors:{ Gk:1.35, Qk:1.5*psi0Q, Wk:1.5 },
      value: 1.35*Gk + 1.5*psi0Q*Qk + 1.5*Wk },
    // ULS — Eq. 6.10a (less favourable when ξ applies)
    { id:'EC-ULS-610a', name:'ULS Eq.6.10a',          equation:'1.35Gk + 1.5×0.7Qk + 1.5Wk',
      type:'ULS', factors:{ Gk:1.35, Qk:1.5*psi0Q, Wk:1.5 },
      value: 1.35*Gk + 1.5*psi0Q*Qk + 1.5*Wk },
    // ULS — Eq. 6.10b (ξ=0.925)
    { id:'EC-ULS-610b', name:'ULS Eq.6.10b',          equation:'0.925×1.35Gk + 1.5Qk',
      type:'ULS', factors:{ Gk:0.925*1.35, Qk:1.5, Wk:0 },
      value: 0.925*1.35*Gk + 1.5*Qk },
    // ULS — Uplift check
    { id:'EC-ULS-UPL',  name:'ULS Uplift (min Gk)',   equation:'1.0Gk − 1.5Wk',
      type:'ULS', factors:{ Gk:1.0, Qk:0, Wk:-1.5 },
      value: 1.0*Gk - 1.5*Wk },
    // Accidental
    { id:'EC-ACC',      name:'Accidental (Ad)',        equation:'Gk + Ad + ψ1×Qk',
      type:'ACC', factors:{ Gk:1.0, Qk:psi1Q, Wk:0 },
      value: Gk + psi1Q*Qk },
    // SLS Characteristic
    { id:'EC-SLS-CHAR', name:'SLS Characteristic',    equation:'Gk + Qk + 0.6Wk',
      type:'SLS', factors:{ Gk:1.0, Qk:1.0, Wk:psi0W },
      value: Gk + Qk + psi0W*Wk },
    // SLS Frequent
    { id:'EC-SLS-FREQ', name:'SLS Frequent',           equation:'Gk + 0.5Qk + 0.2Wk',
      type:'SLS', factors:{ Gk:1.0, Qk:psi1Q, Wk:psi1W },
      value: Gk + psi1Q*Qk + psi1W*Wk },
    // SLS Quasi-permanent
    { id:'EC-SLS-QP',   name:'SLS Quasi-permanent',   equation:'Gk + 0.3Qk',
      type:'SLS', factors:{ Gk:1.0, Qk:psi2Q, Wk:0 },
      value: Gk + psi2Q*Qk },
  ];
  return markGoverning(combos);
}

// ─── BS 8110 combinations ─────────────────────────────────────────────────
function bs8110Combinations(v: LoadValues): Combination[] {
  const { Gk, Qk, Wk } = v;
  const combos: Omit<Combination, 'governing'>[] = [
    { id:'BS-ULS-1', name:'ULS Dead + Imposed',       equation:'1.4Gk + 1.6Qk',
      type:'ULS', factors:{ Gk:1.4, Qk:1.6, Wk:0 },
      value: 1.4*Gk + 1.6*Qk },
    { id:'BS-ULS-2', name:'ULS Dead + Imposed + Wind',equation:'1.2(Gk + Qk + Wk)',
      type:'ULS', factors:{ Gk:1.2, Qk:1.2, Wk:1.2 },
      value: 1.2*(Gk + Qk + Wk) },
    { id:'BS-ULS-3', name:'ULS Dead + Wind',          equation:'1.4Gk + 1.4Wk',
      type:'ULS', factors:{ Gk:1.4, Qk:0, Wk:1.4 },
      value: 1.4*Gk + 1.4*Wk },
    { id:'BS-ULS-4', name:'ULS Min Dead + Wind',      equation:'1.0Gk + 1.4Wk',
      type:'ULS', factors:{ Gk:1.0, Qk:0, Wk:1.4 },
      value: 1.0*Gk + 1.4*Wk },
    { id:'BS-ULS-5', name:'ULS Pattern: Alt spans',   equation:'1.4Gk + 1.6Qk / 1.0Gk',
      type:'ULS', factors:{ Gk:1.4, Qk:1.6, Wk:0 },
      value: 1.4*Gk + 1.6*Qk },
    { id:'BS-SLS-1', name:'SLS Characteristic',       equation:'Gk + Qk',
      type:'SLS', factors:{ Gk:1.0, Qk:1.0, Wk:0 },
      value: Gk + Qk },
    { id:'BS-SLS-2', name:'SLS with Wind',            equation:'Gk + Qk + Wk',
      type:'SLS', factors:{ Gk:1.0, Qk:1.0, Wk:1.0 },
      value: Gk + Qk + Wk },
  ];
  return markGoverning(combos);
}

// ─── ACI 318-19 combinations ──────────────────────────────────────────────
function aciCombinations(v: LoadValues): Combination[] {
  const { Gk: D, Qk: L, Wk: W } = v;
  const combos: Omit<Combination, 'governing'>[] = [
    { id:'ACI-1', name:'ACI 1: Dead only',            equation:'1.4D',
      type:'ULS', factors:{ Gk:1.4, Qk:0, Wk:0 },
      value: 1.4*D },
    { id:'ACI-2', name:'ACI 2: Dead + Live',          equation:'1.2D + 1.6L',
      type:'ULS', factors:{ Gk:1.2, Qk:1.6, Wk:0 },
      value: 1.2*D + 1.6*L },
    { id:'ACI-3', name:'ACI 3: Dead + Live + Wind',   equation:'1.2D + 1.0W + L',
      type:'ULS', factors:{ Gk:1.2, Qk:1.0, Wk:1.0 },
      value: 1.2*D + 1.0*W + L },
    { id:'ACI-4', name:'ACI 4: Dead + Wind',          equation:'1.2D + 1.0W',
      type:'ULS', factors:{ Gk:1.2, Qk:0, Wk:1.0 },
      value: 1.2*D + 1.0*W },
    { id:'ACI-5', name:'ACI 5: Wind uplift',          equation:'0.9D + 1.0W',
      type:'ULS', factors:{ Gk:0.9, Qk:0, Wk:1.0 },
      value: 0.9*D + 1.0*W },
    { id:'ACI-6', name:'ACI 6: Dead + Roof live',     equation:'1.2D + 1.6Lr + L',
      type:'ULS', factors:{ Gk:1.2, Qk:1.0, Wk:0 },
      value: 1.2*D + 1.6*0.5*L + L },  // Lr ≈ 0.5Qk simplified
    { id:'ACI-SLS',name:'ACI Service',                equation:'D + L',
      type:'SLS', factors:{ Gk:1.0, Qk:1.0, Wk:0 },
      value: D + L },
  ];
  return markGoverning(combos);
}

// ─── IBC 2021 / ASCE 7-22 combinations ───────────────────────────────────────
// Strength design (§2.3.1) — the seven named combos.
// Snow (S), roof live (Lr), rain (R) = 0 for The Gambia.
// Seismic (E) is included in combos 6 & 7; where a project has no seismic
// demand, these simply reproduce the wind-governed result.
// ASD service combinations (§2.4.1) are provided as SLS rows.
function ibcCombinations(v: LoadValues): Combination[] {
  const { Gk: D, Qk: L, Wk: W } = v;
  // ASCE 7-22 uses a 0.6 wind-speed factor in ASD; strength design uses 1.0W.
  // Seismic E is approximated here as 0.1×D (SDS=0.1, low-seismic zone default).
  const E = 0.1 * D;

  const combos: Omit<Combination, 'governing'>[] = [
    // ── Strength (ULS) — §2.3.1 ──────────────────────────────────────────
    {
      id: 'IBC-U1', name: 'ASCE7 U1: Dead only',
      equation: '1.4D',
      type: 'ULS', factors: { Gk: 1.4, Qk: 0, Wk: 0 },
      value: 1.4 * D,
    },
    {
      id: 'IBC-U2', name: 'ASCE7 U2: Dead + Live',
      equation: '1.2D + 1.6L',
      type: 'ULS', factors: { Gk: 1.2, Qk: 1.6, Wk: 0 },
      value: 1.2 * D + 1.6 * L,
    },
    {
      id: 'IBC-U3', name: 'ASCE7 U3: Dead + Live + Wind companion',
      equation: '1.2D + 1.6L + 0.5W',
      type: 'ULS', factors: { Gk: 1.2, Qk: 1.6, Wk: 0.5 },
      value: 1.2 * D + 1.6 * L + 0.5 * W,
    },
    {
      id: 'IBC-U4', name: 'ASCE7 U4: Wind governs',
      equation: '1.2D + 1.0W + 1.0L',
      type: 'ULS', factors: { Gk: 1.2, Qk: 1.0, Wk: 1.0 },
      value: 1.2 * D + 1.0 * W + 1.0 * L,
    },
    {
      id: 'IBC-U5', name: 'ASCE7 U5: Wind uplift / overturning',
      equation: '0.9D + 1.0W',
      type: 'ULS', factors: { Gk: 0.9, Qk: 0, Wk: 1.0 },
      value: 0.9 * D + 1.0 * W,
    },
    {
      id: 'IBC-U6', name: 'ASCE7 U6: Seismic governs',
      equation: '1.2D + 1.0E + 1.0L',
      type: 'ULS', factors: { Gk: 1.2 + 0.2 * 0.1, Qk: 1.0, Wk: 0 },
      value: 1.2 * D + E + 1.0 * L,
    },
    {
      id: 'IBC-U7', name: 'ASCE7 U7: Seismic uplift',
      equation: '0.9D − 1.0E',
      type: 'ULS', factors: { Gk: 0.9, Qk: 0, Wk: 0 },
      value: 0.9 * D - E,
    },
    // ── Service (ASD / SLS equivalent) — §2.4.1 ──────────────────────────
    {
      id: 'IBC-S1', name: 'ASCE7 S1: Dead only (service)',
      equation: 'D',
      type: 'SLS', factors: { Gk: 1.0, Qk: 0, Wk: 0 },
      value: D,
    },
    {
      id: 'IBC-S2', name: 'ASCE7 S2: Dead + Live (service)',
      equation: 'D + L',
      type: 'SLS', factors: { Gk: 1.0, Qk: 1.0, Wk: 0 },
      value: D + L,
    },
    {
      id: 'IBC-S3', name: 'ASCE7 S3: Dead + ¾Live + 0.6W',
      equation: 'D + 0.75L + 0.6W',
      type: 'SLS', factors: { Gk: 1.0, Qk: 0.75, Wk: 0.6 },
      value: D + 0.75 * L + 0.6 * W,
    },
    {
      id: 'IBC-S4', name: 'ASCE7 S4: Wind overturning (service)',
      equation: '0.6D + 0.6W',
      type: 'SLS', factors: { Gk: 0.6, Qk: 0, Wk: 0.6 },
      value: 0.6 * D + 0.6 * W,
    },
  ];
  return markGoverning(combos);
}

function markGoverning(combos: Omit<Combination, 'governing'>[]): Combination[] {
  const ulsMax = Math.max(...combos.filter(c => c.type === 'ULS').map(c => c.value));
  const slsMax = Math.max(...combos.filter(c => c.type === 'SLS').map(c => c.value));
  return combos.map(c => ({
    ...c,
    governing: (c.type === 'ULS' && c.value === ulsMax) || (c.type === 'SLS' && c.value === slsMax),
  }));
}

export function getCombinations(code: BuildingCode, loads: LoadValues): Combination[] {
  if (code === 'EC2')    return ec2Combinations(loads);
  if (code === 'BS8110') return bs8110Combinations(loads);
  if (code === 'IBC')    return ibcCombinations(loads);
  return aciCombinations(loads);
}

export function getGoverningULS(code: BuildingCode, loads: LoadValues): number {
  return Math.max(...getCombinations(code, loads).filter(c => c.type === 'ULS').map(c => c.value));
}
