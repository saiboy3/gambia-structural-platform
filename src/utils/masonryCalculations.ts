/**
 * Masonry wall design — EC6 (BS EN 1996-1-1)
 * Covers: compressive stress, slenderness, eccentricity
 * Common in Gambia: sandcrete blocks, burnt bricks, laterite blocks
 */
import type { CodeFactors } from '../context/BuildingCodeContext';

export type MasonryUnit = 'sandcrete-block' | 'burnt-brick' | 'laterite-block' | 'concrete-block';
export type MortarClass = 'M2.5' | 'M5' | 'M7.5' | 'M10';
export type WallType = 'single-leaf' | 'cavity' | 'grouted-cavity';

// Characteristic compressive strength of masonry (N/mm²) — EC6 Table
// fk = K × fb^α × fm^β  (simplified constant table for common Gambia units)
const FK_TABLE: Record<MasonryUnit, Record<MortarClass, number>> = {
  'sandcrete-block': { 'M2.5': 1.8, 'M5': 2.5, 'M7.5': 3.2, 'M10': 3.8 },
  'burnt-brick':     { 'M2.5': 3.0, 'M5': 4.0, 'M7.5': 5.0, 'M10': 6.0 },
  'laterite-block':  { 'M2.5': 1.5, 'M5': 2.2, 'M7.5': 2.8, 'M10': 3.2 },
  'concrete-block':  { 'M2.5': 2.5, 'M5': 3.5, 'M7.5': 4.5, 'M10': 5.5 },
};

// Partial factors for materials (EC6 Table NA.1 — UK NDP, typical)
const GAMMA_M: Record<WallType, number> = {
  'single-leaf': 2.7, 'cavity': 3.0, 'grouted-cavity': 2.5,
};

export interface MasonryInputs {
  unitType: MasonryUnit;
  mortar: MortarClass;
  wallType: WallType;
  thickness: number;      // mm — leaf thickness (e.g. 150, 200, 225)
  clearHeight: number;    // m — clear storey height
  floorCondition: 'both-fixed' | 'one-fixed' | 'both-pinned';  // top/bottom restraint
  // Loads (characteristic, per metre run of wall)
  Gk: number;             // kN/m — permanent vertical load (floor/roof above)
  Qk: number;             // kN/m — variable vertical load
  ek: number;             // mm — eccentricity of load (0 for centred)
  // Lateral (wind) — kN/m²  (set 0 if not applicable)
  windPressure: number;
}

export interface MasonryResults {
  status: 'pass' | 'warn' | 'fail';
  fk: number;             // MPa — char. compressive strength
  fkd: number;            // MPa — design compressive strength
  // Slenderness
  hef: number;            // m — effective height
  tef: number;            // m — effective thickness
  slenderness: number;    // λ = hef / tef
  slenderness_ok: boolean;
  // Eccentricity & reduction factor
  e_total: number;        // mm — total eccentricity
  Phi: number;            // reduction factor (EC6 6.1.2.2)
  // Design
  NEdpm: number;          // kN/m — design vertical load
  NRd: number;            // kN/m — design resistance
  utilisation: number;    // NEd / NRd
  // Lateral (wind) bending if applicable
  Med_wind: number;       // kNm/m
  MRd_wind: number;       // kNm/m — lateral bending resistance (EC6 Annex D)
  windOK: boolean;
  messages: string[];
}

export function designMasonryWall(inp: MasonryInputs, cf: CodeFactors): MasonryResults {
  const msgs: string[] = [];
  const { unitType, mortar, wallType, thickness, clearHeight, floorCondition, Gk, Qk, ek, windPressure } = inp;

  const fk = FK_TABLE[unitType][mortar];
  const gammaM = GAMMA_M[wallType];
  const fkd = fk / gammaM;

  // ── Effective height (EC6 5.5.1.2) ────────────────────────────────────────
  const rho: Record<MasonryInputs['floorCondition'], number> = {
    'both-fixed': 0.75, 'one-fixed': 0.85, 'both-pinned': 1.0,
  };
  const hef = rho[floorCondition] * clearHeight;

  // ── Effective thickness (single leaf — simplified) ─────────────────────────
  const t = thickness / 1000;  // m
  const tef = wallType === 'cavity' ? 1.0 / ((1 / t ** 3 + 1 / t ** 3)) ** (1 / 3) : t;

  const slenderness = hef / tef;
  const slenderness_ok = slenderness <= 27;
  if (!slenderness_ok) msgs.push(`FAIL: Slenderness λ = ${slenderness.toFixed(1)} > 27 — wall too slender`);
  else msgs.push(`PASS: Slenderness λ = ${slenderness.toFixed(1)} ≤ 27`);

  // ── Eccentricity & reduction factor Φ (EC6 6.1.2.2) ───────────────────────
  const em = ek;  // eccentricity from load position (mm)
  const e_init = (hef * 1000) / 450;   // mm — initial eccentricity
  const e_total = Math.max(em + e_init, 0.05 * thickness);  // mm

  // Φ = 1 - 2e/t
  const Phi = Math.max(0, 1 - 2 * e_total / thickness);
  if (Phi < 0.5) msgs.push('WARN: Eccentricity large — consider thicker wall or improved bearing detail');

  // ── Design vertical load ───────────────────────────────────────────────────
  const NEdpm = cf.gammaG * Gk + cf.gammaQ * Qk;

  // ── Design resistance ──────────────────────────────────────────────────────
  const NRd_kNm = Phi * fkd * thickness;  // kN/m

  const utilisation = NEdpm / NRd_kNm;
  if (utilisation > 1) msgs.push(`FAIL: NEd/NRd = ${utilisation.toFixed(2)} — wall capacity exceeded`);
  else msgs.push(`PASS: Compressive utilisation = ${(utilisation * 100).toFixed(0)}%`);

  // ── Lateral bending (wind) ─────────────────────────────────────────────────
  const Med_wind = windPressure * clearHeight * clearHeight / 8;  // kNm/m — simply-supported approx
  // Lateral flexural strength (EC6 Annex D): fxk1 / gammaM (bed joint failure governs)
  // Typical fxk1 for sandcrete M5 ≈ 0.2 MPa → MRd = fxk1/γM × Z = fxk1/γM × t²/6
  const fxk1 = unitType === 'burnt-brick' ? 0.3 : 0.15;  // MPa — bed joint
  const MRd_wind = (fxk1 / gammaM) * (thickness * thickness / 6) / 1000;  // kNm/m
  const windOK = Med_wind <= MRd_wind;
  if (windPressure > 0) {
    if (!windOK) msgs.push(`FAIL: Wind bending MEd=${Med_wind.toFixed(2)} > MRd=${MRd_wind.toFixed(2)} kNm/m`);
    else msgs.push(`PASS: Wind bending OK (${(Med_wind / MRd_wind * 100).toFixed(0)}% utilisation)`);
  }

  const status: MasonryResults['status'] = msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, fk, fkd: +fkd.toFixed(3), hef: +hef.toFixed(2), tef: +tef.toFixed(3),
    slenderness: +slenderness.toFixed(1), slenderness_ok,
    e_total: +e_total.toFixed(1), Phi: +Phi.toFixed(3),
    NEdpm: +NEdpm.toFixed(1), NRd: +NRd_kNm.toFixed(1),
    utilisation: +utilisation.toFixed(3),
    Med_wind: +Med_wind.toFixed(3), MRd_wind: +MRd_wind.toFixed(3), windOK,
    messages: msgs,
  };
}
