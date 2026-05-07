/**
 * Steel Portal Frame — EC3 / BS 5950 simplified method
 * Single-bay, symmetric pinned-base or fixed-base portal
 * Checks: rafter bending, column bending, sway stability (notional horizontal forces)
 * Section database: subset of UKB/UKC sections (Ix, Sx, Zx, A, h, bf, tf, tw, iy, iz)
 */

export interface PortalSection {
  name: string;
  A: number;    // cm²
  h: number;    // mm — total depth
  bf: number;   // mm — flange width
  tf: number;   // mm — flange thickness
  tw: number;   // mm — web thickness
  Ix: number;   // cm⁴
  Sx: number;   // cm³ — plastic modulus
  Zx: number;   // cm³ — elastic modulus
  iy: number;   // cm — radius of gyration (major)
  iz: number;   // cm — radius of gyration (minor)
  It: number;   // cm⁴ — torsion constant
  Iw: number;   // cm⁶ (×10³) — warping constant
}

// Representative UKB sections suitable for portal rafters/columns in Gambia context
export const PORTAL_SECTIONS: PortalSection[] = [
  { name: 'UB 203×133×25',  A: 32.0,  h: 203, bf: 133, tf: 7.8,  tw: 5.7,  Ix: 2340,   Sx: 258,  Zx: 231,  iy: 8.55, iz: 3.08, It: 5.01,   Iw: 69.2 },
  { name: 'UB 254×102×25',  A: 32.0,  h: 257, bf: 102, tf: 8.4,  tw: 6.0,  Ix: 3410,   Sx: 306,  Zx: 265,  iy: 10.3, iz: 2.14, It: 4.98,   Iw: 45.8 },
  { name: 'UB 254×146×31',  A: 40.0,  h: 251, bf: 146, tf: 8.6,  tw: 6.0,  Ix: 4410,   Sx: 393,  Zx: 353,  iy: 10.5, iz: 3.49, It: 7.76,   Iw: 151 },
  { name: 'UB 305×102×28',  A: 36.2,  h: 309, bf: 102, tf: 8.8,  tw: 6.0,  Ix: 5140,   Sx: 380,  Zx: 332,  iy: 11.9, iz: 2.22, It: 6.65,   Iw: 71.2 },
  { name: 'UB 305×165×40',  A: 51.5,  h: 303, bf: 165, tf: 10.2, tw: 6.0,  Ix: 8500,   Sx: 623,  Zx: 560,  iy: 12.8, iz: 3.86, It: 14.7,   Iw: 411 },
  { name: 'UB 356×171×45',  A: 57.0,  h: 351, bf: 171, tf: 9.7,  tw: 7.0,  Ix: 12100,  Sx: 775,  Zx: 688,  iy: 14.6, iz: 3.83, It: 13.7,   Iw: 640 },
  { name: 'UB 406×178×54',  A: 68.4,  h: 402, bf: 178, tf: 10.9, tw: 7.7,  Ix: 18700,  Sx: 1060, Zx: 927,  iy: 16.5, iz: 3.87, It: 23.1,   Iw: 1190 },
  { name: 'UB 457×191×67',  A: 85.5,  h: 453, bf: 191, tf: 12.7, tw: 8.5,  Ix: 29400,  Sx: 1470, Zx: 1296, iy: 18.5, iz: 4.12, It: 43.1,   Iw: 2670 },
  { name: 'UB 533×210×82',  A: 104,   h: 528, bf: 209, tf: 13.2, tw: 9.6,  Ix: 47500,  Sx: 2060, Zx: 1800, iy: 21.3, iz: 4.38, It: 69.2,   Iw: 6230 },
  { name: 'UB 610×229×101', A: 129,   h: 602, bf: 228, tf: 14.8, tw: 10.6, Ix: 75700,  Sx: 2880, Zx: 2520, iy: 24.2, iz: 4.57, It: 121,    Iw: 13700 },
  { name: 'UC 152×152×30',  A: 38.2,  h: 157, bf: 152, tf: 9.4,  tw: 6.5,  Ix: 1750,   Sx: 247,  Zx: 221,  iy: 6.76, iz: 3.82, It: 11.7,   Iw: 63.2 },
  { name: 'UC 203×203×46',  A: 58.7,  h: 203, bf: 203, tf: 11.0, tw: 7.2,  Ix: 4560,   Sx: 497,  Zx: 449,  iy: 8.82, iz: 5.11, It: 31.9,   Iw: 311 },
  { name: 'UC 254×254×73',  A: 93.1,  h: 254, bf: 254, tf: 14.2, tw: 8.6,  Ix: 11400,  Sx: 992,  Zx: 894,  iy: 11.1, iz: 6.48, It: 93.0,   Iw: 1560 },
  { name: 'UC 305×305×97',  A: 123,   h: 307, bf: 305, tf: 15.4, tw: 9.9,  Ix: 22200,  Sx: 1590, Zx: 1440, iy: 13.4, iz: 7.69, It: 184,    Iw: 5470 },
];

export type BaseCondition = 'pinned' | 'fixed';
export type FrameLoadType = 'gravity-only' | 'gravity-wind';

export interface PortalFrameInputs {
  span: number;          // m — bay width (column CL to CL)
  height: number;        // m — eaves height (column base to rafter knee)
  pitch: number;         // degrees — roof pitch
  spacing: number;       // m — frame spacing (bay length)
  base: BaseCondition;
  rafterSection: string;
  columnSection: string;
  fyk: number;           // MPa — yield strength (275 or 355)
  roofDL: number;        // kN/m² — dead load (cladding + purlins)
  roofLL: number;        // kN/m² — live / maintenance
  windPressure: number;  // kN/m² — wind pressure (horizontal face)
  lateralRestraint: 'full' | 'intermediate' | 'none';
}

export interface PortalFrameResults {
  status: 'pass' | 'warn' | 'fail';
  // Geometry
  rafterLength: number;  // m — along slope
  frameArea: number;     // m²
  // Loads
  wEd_rafter: number;    // kN/m — factored UDL along rafter
  HEd: number;           // kN — horizontal thrust at base
  VEd_col: number;       // kN — vertical reaction per column
  // Rafter
  Med_rafter: number;    // kNm — max moment in rafter
  McRd_rafter: number;   // kNm — moment resistance
  util_rafter: number;
  LTB_rafter: 'pass' | 'warn' | 'fail';
  // Column
  Med_col: number;       // kNm
  McRd_col: number;      // kNm
  NEd_col: number;       // kN
  NcRd_col: number;      // kN
  util_col: number;
  // Sway
  swayRatio: number;     // h/250 limit check (notional horizontal forces)
  swayOK: boolean;
  messages: string[];
}

export function designPortalFrame(inp: PortalFrameInputs): PortalFrameResults {
  const msgs: string[] = [];
  const { span, height, pitch, spacing, fyk } = inp;

  const rafter = PORTAL_SECTIONS.find(s => s.name === inp.rafterSection) ?? PORTAL_SECTIONS[4];
  const column = PORTAL_SECTIONS.find(s => s.name === inp.columnSection) ?? PORTAL_SECTIONS[11];

  const fy = fyk;
  const gammaM0 = 1.0;

  // ── Geometry ─────────────────────────────────────────────────────────────
  const pitchRad = pitch * Math.PI / 180;
  const rafterLength = (span / 2) / Math.cos(pitchRad);   // m per side
  const riseHeight = (span / 2) * Math.tan(pitchRad);       // m — ridge height above eaves

  // Roof slope area loading (kN/m along rafter = kN/m² × spacing)
  const gk_roof = inp.roofDL * spacing;   // kN/m along rafter
  const qk_roof = inp.roofLL * spacing;
  const wEd_rafter = 1.35 * gk_roof + 1.5 * qk_roof;  // kN/m along rafter

  // ── Reactions (symmetric, pinned or fixed base) ───────────────────────────
  // Vertical reaction at each column (half frame)
  const totalVert = wEd_rafter * rafterLength;  // kN per half span
  const VEd_col = totalVert;  // kN

  // Horizontal thrust (approximate — propped rafter formula)
  // For pinned base: H = wL²/(8h) for equivalent UDL on horizontal projection
  const wH = wEd_rafter * Math.cos(pitchRad);  // projected horizontal component kN/m
  const HEd = wH * (span / 2) * (span / 2) / (2 * (height + riseHeight / 2));
  // Fixed base reduces thrust by ~25%
  const HEd_design = inp.base === 'fixed' ? HEd * 0.75 : HEd;

  // ── Rafter design ─────────────────────────────────────────────────────────
  // Max moment in rafter: at haunch (knee joint) for gravity
  // Simple approximation: M = wEd×L_r²/8 for propped rafter segment
  const Med_rafter = wEd_rafter * rafterLength * rafterLength / 10;  // kNm (approx)

  // Moment resistance (plastic) — class 1/2 assumed
  const McRd_rafter = (rafter.Sx * fy) / (gammaM0 * 1000);  // kNm

  // LTB check: simplified from EC3 6.3.2
  const Leff_rafter = rafterLength * 1000;  // mm — effective length (full for no restraint)
  const LTB_lambda = (Leff_rafter / (rafter.iz * 10)) / (Math.PI * Math.sqrt(210000 / fy));
  const chi_LT = inp.lateralRestraint === 'full' ? 1.0 :
    inp.lateralRestraint === 'intermediate' ? 0.85 :
    Math.max(0.4, 1 / (LTB_lambda + Math.sqrt(LTB_lambda * LTB_lambda - 0.4)));
  const MbRd_rafter = chi_LT * McRd_rafter;

  const util_rafter = Med_rafter / MbRd_rafter;
  const LTB_rafter: PortalFrameResults['LTB_rafter'] =
    util_rafter > 1.0 ? 'fail' : util_rafter > 0.85 ? 'warn' : 'pass';

  if (util_rafter > 1) msgs.push(`FAIL: Rafter utilisation ${(util_rafter * 100).toFixed(0)}% — increase rafter section or add purlins`);
  else msgs.push(`PASS: Rafter ${(util_rafter * 100).toFixed(0)}% utilised (MEd=${Med_rafter.toFixed(0)} / MbRd=${MbRd_rafter.toFixed(0)} kNm)`);

  // ── Column design ─────────────────────────────────────────────────────────
  // Column moment at knee: from thrust × eaves height
  const Med_col = HEd_design * height;  // kNm
  const NEd_col = VEd_col;              // kN (vertical from rafter)

  const McRd_col = (column.Sx * fy) / (gammaM0 * 1000);  // kNm
  const NcRd_col = (column.A * fy) / (gammaM0 * 100);    // kN (A in cm², fy MPa)

  // Combined check (EC3 6.2.9 simplified): M/McRd + N/NcRd ≤ 1
  const util_col = Med_col / McRd_col + NEd_col / NcRd_col;

  if (util_col > 1) msgs.push(`FAIL: Column interaction ${(util_col * 100).toFixed(0)}% — increase column section`);
  else msgs.push(`PASS: Column interaction ${(util_col * 100).toFixed(0)}%`);

  // ── Sway stability ────────────────────────────────────────────────────────
  // Notional horizontal force = 0.5% of vertical load (EC3 5.3.2)
  const Vtotal = VEd_col * 2;  // both columns
  const NHF = 0.005 * Vtotal;
  // Simplified sway check: assume column as cantilever
  const EI_col = 210000 * column.Ix * 1e-4 * 1e6;  // N·mm² (Ix cm⁴ → mm⁴ × 1e4 → ×1e4, E N/mm²)
  const h_mm = height * 1000;
  const delta = inp.base === 'fixed'
    ? (NHF * 1000 * h_mm ** 3) / (12 * EI_col)
    : (NHF * 1000 * h_mm ** 3) / (3 * EI_col);
  const swayLimit = h_mm / 250;
  const swayOK = delta <= swayLimit;
  const swayRatio = delta / swayLimit;

  if (!swayOK) msgs.push(`FAIL: Sway δ=${delta.toFixed(1)}mm > h/250=${swayLimit.toFixed(1)}mm — increase column stiffness or add knee bracing`);
  else msgs.push(`PASS: Sway δ=${delta.toFixed(1)}mm ≤ h/250=${swayLimit.toFixed(1)}mm`);

  // Wind check (informational)
  if (inp.windPressure > 0) {
    const w_wind = inp.windPressure * spacing * height;  // kN total horizontal
    if (w_wind > NHF * 2) msgs.push(`WARN: Wind force ${w_wind.toFixed(0)} kN governs over NHF — check wind uplift on rafter separately`);
  }

  const status: PortalFrameResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status,
    rafterLength: +rafterLength.toFixed(2),
    frameArea: +(span * (height + riseHeight / 2)).toFixed(1),
    wEd_rafter: +wEd_rafter.toFixed(2),
    HEd: +HEd_design.toFixed(1),
    VEd_col: +VEd_col.toFixed(1),
    Med_rafter: +Med_rafter.toFixed(1),
    McRd_rafter: +McRd_rafter.toFixed(1),
    util_rafter: +util_rafter.toFixed(3),
    LTB_rafter,
    Med_col: +Med_col.toFixed(1),
    McRd_col: +McRd_col.toFixed(1),
    NEd_col: +NEd_col.toFixed(1),
    NcRd_col: +NcRd_col.toFixed(1),
    util_col: +util_col.toFixed(3),
    swayRatio: +swayRatio.toFixed(3),
    swayOK,
    messages: msgs,
  };
}
