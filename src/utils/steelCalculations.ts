// Steel member design — EC3 simplified (also used as basis for AISC comparison)

export interface SteelSection {
  name: string;
  A: number;   // mm²
  h: number;   // mm — overall depth
  b: number;   // mm — flange width
  tf: number;  // mm — flange thickness
  tw: number;  // mm — web thickness
  Iy: number;  // mm⁴ (×10⁴)
  Wpl_y: number; // mm³ (×10³) — plastic section modulus
  Wel_y: number; // mm³ (×10³) — elastic section modulus
  Iz: number;  // mm⁴ (×10⁴)
  iy: number;  // mm — radius of gyration
  iz: number;  // mm
  mass: number; // kg/m
}

// Common UK/African market sections
export const STEEL_SECTIONS: SteelSection[] = [
  { name:'UC 152×152×23',  A:2950,  h:152, b:152, tf:6.8,  tw:5.8,  Iy:1250,    Wpl_y:178,   Wel_y:164,   Iz:403,   iy:65.1, iz:37.0, mass:23 },
  { name:'UC 152×152×37',  A:4720,  h:162, b:155, tf:11.5, tw:8.1,  Iy:2220,    Wpl_y:309,   Wel_y:274,   Iz:709,   iy:68.5, iz:38.7, mass:37 },
  { name:'UC 203×203×46',  A:5880,  h:203, b:203, tf:11.0, tw:7.2,  Iy:4570,    Wpl_y:497,   Wel_y:450,   Iz:1550,  iy:88.1, iz:51.3, mass:46 },
  { name:'UC 203×203×71',  A:9100,  h:216, b:206, tf:17.3, tw:10.3, Iy:7620,    Wpl_y:799,   Wel_y:706,   Iz:2540,  iy:91.5, iz:52.8, mass:71 },
  { name:'UC 254×254×73',  A:9310,  h:254, b:254, tf:14.2, tw:8.6,  Iy:11400,   Wpl_y:990,   Wel_y:895,   Iz:3910,  iy:110,  iz:64.8, mass:73 },
  { name:'UC 254×254×107', A:13600, h:267, b:258, tf:20.5, tw:12.8, Iy:17500,   Wpl_y:1480,  Wel_y:1310,  Iz:5930,  iy:113,  iz:65.7, mass:107 },
  { name:'UC 305×305×97',  A:12300, h:308, b:305, tf:15.4, tw:9.9,  Iy:22200,   Wpl_y:1590,  Wel_y:1440,  Iz:7270,  iy:134,  iz:77.0, mass:97 },
  { name:'UB 152×89×16',   A:2030,  h:152, b:89,  tf:7.7,  tw:4.5,  Iy:834,     Wpl_y:123,   Wel_y:110,   Iz:89.8,  iy:64.1, iz:21.0, mass:16 },
  { name:'UB 203×102×23',  A:2950,  h:203, b:102, tf:9.3,  tw:5.4,  Iy:2105,    Wpl_y:232,   Wel_y:207,   Iz:164,   iy:84.6, iz:23.6, mass:23 },
  { name:'UB 254×102×25',  A:3200,  h:257, b:102, tf:8.4,  tw:6.0,  Iy:3415,    Wpl_y:306,   Wel_y:266,   Iz:123,   iy:103,  iz:19.6, mass:25 },
  { name:'UB 254×146×37',  A:4720,  h:256, b:146, tf:10.9, tw:6.3,  Iy:5537,    Wpl_y:483,   Wel_y:433,   Iz:572,   iy:108,  iz:34.8, mass:37 },
  { name:'UB 305×127×37',  A:4740,  h:304, b:124, tf:10.7, tw:7.1,  Iy:7162,    Wpl_y:539,   Wel_y:471,   Iz:336,   iy:123,  iz:26.6, mass:37 },
  { name:'UB 305×165×40',  A:5130,  h:303, b:165, tf:10.2, tw:6.0,  Iy:8500,    Wpl_y:623,   Wel_y:561,   Iz:764,   iy:129,  iz:38.6, mass:40 },
  { name:'UB 356×171×51',  A:6490,  h:355, b:171, tf:11.5, tw:7.3,  Iy:14140,   Wpl_y:896,   Wel_y:796,   Iz:968,   iy:147,  iz:38.6, mass:51 },
  { name:'UB 406×178×60',  A:7640,  h:406, b:178, tf:12.8, tw:7.8,  Iy:21600,   Wpl_y:1194,  Wel_y:1063,  Iz:1203,  iy:168,  iz:39.7, mass:60 },
  { name:'UB 457×191×74',  A:9460,  h:457, b:191, tf:14.5, tw:9.0,  Iy:33400,   Wpl_y:1653,  Wel_y:1458,  Iz:1671,  iy:188,  iz:42.1, mass:74 },
  { name:'SHS 100×100×5',  A:1880,  h:100, b:100, tf:5,    tw:5,    Iy:278,     Wpl_y:62.4,  Wel_y:55.7,  Iz:278,   iy:38.4, iz:38.4, mass:14.7 },
  { name:'SHS 120×120×6',  A:2720,  h:120, b:120, tf:6,    tw:6,    Iy:587,     Wpl_y:107,   Wel_y:97.9,  Iz:587,   iy:46.4, iz:46.4, mass:21.4 },
  { name:'RHS 150×100×6',  A:2880,  h:150, b:100, tf:6,    tw:6,    Iy:842,     Wpl_y:127,   Wel_y:112,   Iz:406,   iy:54.1, iz:37.5, mass:22.6 },
  { name:'CHS 114.3×5',    A:1730,  h:114, b:114, tf:5,    tw:5,    Iy:165,     Wpl_y:34.3,  Wel_y:28.8,  Iz:165,   iy:30.8, iz:30.8, mass:13.5 },
];

export interface SteelMemberInputs {
  sectionName: string;
  span: number;           // m
  supportType: 'simply-supported' | 'cantilever' | 'continuous';
  lateralRestraint: 'full' | 'intermediate' | 'none';
  udl: number;            // kN/m total design UDL
  pointLoad: number;      // kN at midspan (additional)
  fyk: number;            // MPa — steel yield strength (275 or 355)
  gammaM0: number;        // partial factor (1.0 EC3)
  gammaM1: number;        // instability (1.0 EC3)
}

export interface SteelMemberResults {
  status: 'pass' | 'warn' | 'fail';
  section: SteelSection;
  // Actions
  Med: number;   // kNm
  Ved: number;   // kN
  // Capacity
  McRd: number;  // kNm — bending resistance
  VcRd: number;  // kN  — shear resistance
  MbRd: number;  // kNm — LTB resistance
  // Utilisation
  bendingUtil: number;
  shearUtil: number;
  ltbUtil: number;
  // Deflection
  deflection: number;   // mm
  deflLimit: number;    // mm
  deflOK: boolean;
  messages: string[];
}

export function designSteelMember(inp: SteelMemberInputs): SteelMemberResults {
  const msgs: string[] = [];
  const sec = STEEL_SECTIONS.find(s => s.name === inp.sectionName) ?? STEEL_SECTIONS[4];
  const { span: L, udl: w, pointLoad: P, fyk, gammaM0, gammaM1 } = inp;
  const fy = fyk;

  // Actions
  const mFac = inp.supportType === 'cantilever' ? 2 : inp.supportType === 'continuous' ? 10 : 8;
  const vFac = inp.supportType === 'cantilever' ? 1 : 2;
  const Med_udl = w * L * L / mFac;
  const Med_pl  = P * L / 4; // midspan point load
  const Med = Med_udl + Med_pl;
  const Ved = w * L / vFac + P / 2;

  // Bending capacity
  const Wpl_y_mm3 = sec.Wpl_y * 1e3; // convert ×10³ mm³ → mm³
  const McRd = (Wpl_y_mm3 * fy / gammaM0) / 1e6;  // kNm

  // Shear capacity: Av = h×tw for rolled I/H (simplified)
  const Av = sec.h * sec.tw;
  const VcRd = (Av * fy / Math.sqrt(3) / gammaM0) / 1e3;  // kN

  // LTB — simplified EC3 §6.3.2
  let MbRd = McRd;
  if (inp.lateralRestraint !== 'full') {
    const Lcr = inp.lateralRestraint === 'none' ? L * 1000 : L * 500; // effective LTB length mm
    const lambda_1 = Math.PI * Math.sqrt(210000 / fy);
    const lambda_LT_bar = (Lcr / (sec.iz)) / lambda_1;
    const alpha_LT = 0.49; // rolled I — buckling curve b
    const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT_bar - 0.2) + lambda_LT_bar ** 2);
    const chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - lambda_LT_bar ** 2)));
    MbRd = chi_LT * McRd / gammaM1;
    msgs.push(`LTB: λ̄_LT = ${lambda_LT_bar.toFixed(2)}, χ_LT = ${chi_LT.toFixed(3)}`);
  }

  // Utilisations
  const bendingUtil = Med / McRd;
  const shearUtil   = Ved / VcRd;
  const ltbUtil     = Med / MbRd;

  if (bendingUtil > 1) msgs.push(`FAIL: Bending utilisation ${(bendingUtil * 100).toFixed(1)}% > 100%`);
  else if (bendingUtil > 0.9) msgs.push(`WARN: Bending utilisation ${(bendingUtil * 100).toFixed(1)}%`);
  else msgs.push(`PASS: Bending utilisation ${(bendingUtil * 100).toFixed(1)}%`);

  if (shearUtil > 1) msgs.push(`FAIL: Shear utilisation ${(shearUtil * 100).toFixed(1)}% > 100%`);
  else msgs.push(`PASS: Shear utilisation ${(shearUtil * 100).toFixed(1)}%`);

  if (ltbUtil > 1) msgs.push(`FAIL: LTB utilisation ${(ltbUtil * 100).toFixed(1)}% > 100%`);
  else if (ltbUtil > 0.9) msgs.push(`WARN: LTB utilisation ${(ltbUtil * 100).toFixed(1)}%`);
  else msgs.push(`PASS: LTB utilisation ${(ltbUtil * 100).toFixed(1)}%`);

  // Deflection — elastic midspan (simply supported UDL + point load)
  const E = 210000;  // MPa
  const Iy_mm4 = sec.Iy * 1e4;
  const defl_udl = (5 / 384) * (w / L) * (L * 1000) ** 4 / (E * Iy_mm4) * 1e-3; // kN/mm → account for units
  const defl_pl  = (P * 1000 * (L * 1000) ** 3) / (48 * E * Iy_mm4);
  const deflection = defl_udl + defl_pl;
  const deflLimit = (L * 1000) / 250;
  const deflOK = deflection <= deflLimit;
  if (!deflOK) msgs.push(`WARN: Deflection ${deflection.toFixed(1)}mm > L/250 = ${deflLimit.toFixed(1)}mm`);
  else msgs.push(`PASS: Deflection ${deflection.toFixed(1)}mm < L/250`);

  const status: SteelMemberResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return { status, section: sec, Med, Ved, McRd, VcRd, MbRd, bendingUtil, shearUtil, ltbUtil, deflection, deflLimit, deflOK, messages: msgs };
}
