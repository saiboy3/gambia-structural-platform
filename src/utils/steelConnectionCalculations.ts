/**
 * Steel connection design — EC3 (EN 1993-1-8)
 * Three connection types:
 *   1. End-plate beam-to-column (flexible/moment)
 *   2. Base plate (column to concrete foundation)
 *   3. Fin plate (single-sided shear only)
 * Bolts: M16, M20, M24 grade 8.8
 */

export type ConnectionType = 'end-plate' | 'base-plate' | 'fin-plate';

export interface BoltData {
  diameter: number;   // mm
  grade: '8.8' | '10.9';
  rows: number;
  cols: number;
}

// Bolt shear/tension resistance (EC3 Table 3.4)
const BOLT_PROPS = {
  '8.8':  { fub: 800, As_M16: 157, As_M20: 245, As_M24: 353 },
  '10.9': { fub: 1000, As_M16: 157, As_M20: 245, As_M24: 353 },
};

function boltArea(dia: number): number {
  if (dia === 16) return 157;
  if (dia === 20) return 245;
  if (dia === 24) return 353;
  return 245;
}

export interface ConnectionInputs {
  type: ConnectionType;
  // Loads
  Ved: number;           // kN — design shear
  Ned: number;           // kN — axial (tension +ve, compression -ve)
  Med: number;           // kNm — bending (end plate only)
  // Plate
  plateFy: number;       // MPa — plate yield (275)
  plateThickness: number; // mm
  plateWidth: number;    // mm — horizontal
  plateHeight: number;   // mm — vertical
  // Bolt
  bolt: BoltData;
  // Base plate extras
  fck_grout: number;     // MPa — grout / concrete below (for base plate)
  columnFy: number;      // MPa — column steel yield
  columnA: number;       // cm² — column section area
}

export interface ConnectionResults {
  status: 'pass' | 'warn' | 'fail';
  // Bolt checks
  FvRd: number;          // kN — shear resistance per bolt
  FtRd: number;          // kN — tension resistance per bolt
  nBolts: number;
  util_bolt_shear: number;
  util_bolt_tension: number;
  // Plate checks
  Av_plate: number;      // mm² — shear area of plate
  VplRd_plate: number;   // kN — shear resistance of plate
  util_plate_shear: number;
  // Block shear
  VbsRd: number;         // kN — block shear resistance
  util_block: number;
  // Base plate (if applicable)
  bearing_stress: number;  // MPa — actual bearing
  bearing_limit: number;   // MPa — 0.67×fck_grout or 0.6×fck
  bearingOK: boolean;
  // Weld
  weldSize: number;      // mm — minimum fillet weld
  weldUtil: number;
  messages: string[];
}

export function designConnection(inp: ConnectionInputs): ConnectionResults {
  const msgs: string[] = [];
  const { Ved, Ned, Med, plateFy, plateThickness, plateWidth, plateHeight, bolt } = inp;
  const gammaM2 = 1.25, gammaM0 = 1.0;

  const As = boltArea(bolt.diameter);
  const fub = BOLT_PROPS[bolt.grade].fub;
  const nBolts = bolt.rows * bolt.cols;

  // ── Bolt shear (EC3 3.6) ─────────────────────────────────────────────────
  // Single shear per bolt, single shear plane
  const FvRd = (0.6 * fub * As) / (gammaM2 * 1000);  // kN

  // ── Bolt tension (EC3 3.6) ───────────────────────────────────────────────
  const FtRd = (0.9 * fub * As) / (gammaM2 * 1000);  // kN

  // Combined shear + tension (EC3 3.6 Table 3.4 interaction)
  const FvEd_per_bolt = Ved / nBolts;   // kN
  let FtEd_per_bolt = 0;

  if (inp.type === 'end-plate' && Med > 0) {
    // Tension from moment: distributed to top bolt row(s)
    // Simplified: tension on top row = M / (lever arm)
    const p = plateHeight / (bolt.rows + 1);  // pitch
    const zA = p * bolt.rows;                  // top bolt distance from base
    FtEd_per_bolt = (Med * 1e3) / (bolt.cols * zA);  // kN
  } else if (Ned > 0) {
    FtEd_per_bolt = Ned / nBolts;  // kN (pure tension case)
  }

  const util_bolt_shear = FvEd_per_bolt / FvRd;
  const util_bolt_tension = FtEd_per_bolt / FtRd;
  // Interaction
  const bolt_interaction = FvEd_per_bolt / FvRd + FtEd_per_bolt / (1.4 * FtRd);

  if (bolt_interaction > 1) msgs.push(`FAIL: Bolt shear+tension interaction ${(bolt_interaction * 100).toFixed(0)}% — add bolts or increase grade`);
  else if (util_bolt_shear > 1) msgs.push(`FAIL: Bolt shear utilisation ${(util_bolt_shear * 100).toFixed(0)}%`);
  else msgs.push(`PASS: Bolts — ${nBolts}×M${bolt.diameter}/${bolt.grade}: shear ${(util_bolt_shear * 100).toFixed(0)}%, tension ${(util_bolt_tension * 100).toFixed(0)}%`);

  // ── Plate shear capacity ─────────────────────────────────────────────────
  const Av_plate = plateThickness * plateHeight;  // mm²
  const VplRd_plate = (plateFy / Math.sqrt(3) / gammaM0) * Av_plate / 1000;  // kN
  const util_plate_shear = Ved / VplRd_plate;

  if (util_plate_shear > 1) msgs.push(`FAIL: Plate shear ${(util_plate_shear * 100).toFixed(0)}% — increase plate thickness`);
  else msgs.push(`PASS: Plate shear ${(util_plate_shear * 100).toFixed(0)}%`);

  // ── Block shear (EC3 3.10.2) ─────────────────────────────────────────────
  // Simplified for single row of bolts
  const e1 = 40, p1 = 70;  // assumed edge/pitch mm
  const Ant = plateThickness * (e1 - bolt.diameter / 2);      // net tension area
  const Anv = plateThickness * (plateHeight - e1 - (bolt.rows - 1) * p1 - bolt.diameter / 2);  // net shear area
  const VbsRd = Math.max(0, (0.5 * fub * Ant / gammaM2 + plateFy / Math.sqrt(3) * Math.max(Anv, 0) / gammaM0) / 1000);
  const util_block = Ved / Math.max(VbsRd, 1);

  if (util_block > 1) msgs.push(`FAIL: Block shear ${(util_block * 100).toFixed(0)}%`);
  else msgs.push(`PASS: Block shear ${(util_block * 100).toFixed(0)}%`);

  // ── Base plate bearing (EC3 6.2.5 / EC4) ─────────────────────────────────
  let bearing_stress = 0, bearing_limit = 0;
  let bearingOK = true;

  if (inp.type === 'base-plate') {
    const Abase = plateWidth * plateHeight;  // mm²
    bearing_stress = Math.abs(Ned) * 1000 / Abase;  // MPa (Ned kN → N)
    bearing_limit = 0.67 * inp.fck_grout;           // MPa — EC4 6.2.5 grout bearing
    bearingOK = bearing_stress <= bearing_limit;
    if (!bearingOK) msgs.push(`FAIL: Bearing ${bearing_stress.toFixed(2)} > limit ${bearing_limit.toFixed(2)} MPa — increase plate area`);
    else msgs.push(`PASS: Bearing ${bearing_stress.toFixed(2)} MPa ≤ ${bearing_limit.toFixed(2)} MPa`);
  } else {
    bearing_limit = 0.67 * inp.fck_grout;
  }

  // ── Fillet weld size ──────────────────────────────────────────────────────
  // EC3 4.5.3: weld throat a, resistance fw = fvw = fu/(sqrt(3)×β_w×γM2)
  // Assume plate welded on two sides; effective weld length = plate height × 2
  const fu_weld = 470;  // MPa for S275 weld filler
  const beta_w = 0.85;
  const fvw = fu_weld / (Math.sqrt(3) * beta_w * gammaM2);  // MPa
  const lw = 2 * plateHeight;  // mm — total weld length
  const weldSize = Math.max(3, Math.ceil(Ved * 1000 / (fvw * lw)));  // mm
  const weldUtil = (Ved * 1000) / (fvw * lw * weldSize);

  msgs.push(`Weld: ${weldSize}mm fillet weld (${(weldUtil * 100).toFixed(0)}% utilised)`);

  const status: ConnectionResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, FvRd: +FvRd.toFixed(1), FtRd: +FtRd.toFixed(1), nBolts,
    util_bolt_shear: +util_bolt_shear.toFixed(3),
    util_bolt_tension: +util_bolt_tension.toFixed(3),
    Av_plate, VplRd_plate: +VplRd_plate.toFixed(1),
    util_plate_shear: +util_plate_shear.toFixed(3),
    VbsRd: +VbsRd.toFixed(1), util_block: +util_block.toFixed(3),
    bearing_stress: +bearing_stress.toFixed(3),
    bearing_limit: +bearing_limit.toFixed(2),
    bearingOK, weldSize, weldUtil: +weldUtil.toFixed(3),
    messages: msgs,
  };
}
