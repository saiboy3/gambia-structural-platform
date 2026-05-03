import type { CodeFactors } from '../context/BuildingCodeContext';

export interface RetainingWallInputs {
  type: 'gravity' | 'cantilever';
  height: number;       // m — retained height
  baseWidth: number;    // m — total base width
  toeTip: number;       // m — toe length
  stemWidth: number;    // m — stem width at base
  baseThk: number;      // mm — base slab thickness
  soilDensity: number;  // kN/m³
  soilAngle: number;    // deg — internal friction angle φ'
  soilCohesion: number; // kPa — c' (0 for granular)
  surcharge: number;    // kPa — on retained side
  concreteDensity: number; // kN/m³ (typically 24)
  cover: number;        // mm
  material: { fck: number; fcd: number; fyk: number; fyd: number; concrete: string; rebar: string };
}

export interface RetainingWallResults {
  status: 'pass' | 'warn' | 'fail';
  // Earth pressure
  Ka: number;
  Ph: number;         // kN/m — horizontal resultant
  Pv: number;         // kN/m — vertical component (sloped surcharge)
  // Stability
  W_concrete: number; // kN/m — self-weight
  W_soil: number;     // kN/m — soil on heel
  V_total: number;    // kN/m — total vertical
  restoringM: number; // kNm/m
  overturningM: number; // kNm/m
  FoS_overturning: number;
  FoS_sliding: number;
  // Bearing
  eccentricity: number; // m
  qmax: number;         // kPa
  qmin: number;         // kPa
  // Stem design
  Med_stem: number;   // kNm/m at base of stem
  d_stem: number;     // mm
  As_stem: number;    // mm²/m
  // Base design
  Med_toe: number;    // kNm/m
  Med_heel: number;   // kNm/m
  As_toe: number;
  As_heel: number;
  messages: string[];
}

export function designRetainingWall(inp: RetainingWallInputs, _cf: CodeFactors): RetainingWallResults {
  const msgs: string[] = [];
  const { height: H, baseWidth: B, toeTip: a, stemWidth: sw, baseThk: hb,
          soilDensity: γs, soilAngle: φ_deg,
          surcharge: q, concreteDensity: γc, cover } = inp;
  const { fcd, fyd } = inp.material;

  const φ = (φ_deg * Math.PI) / 180;
  const heel = B - a - sw / 1000;        // m

  // Rankine active earth pressure coefficient
  const Ka = (1 - Math.sin(φ)) / (1 + Math.sin(φ));

  // Horizontal thrust from soil + surcharge (per metre run)
  const Ph_soil = 0.5 * Ka * γs * H * H;
  const Ph_surcharge = Ka * q * H;
  const Ph = Ph_soil + Ph_surcharge;

  // Vertical component — zero for vertical wall face
  const Pv = 0;

  // Self-weight of concrete (stem + base)
  const stemH = H - hb / 1000;
  const W_stem = stemH * sw / 1000 * γc;
  const W_base = B * hb / 1000 * γc;
  const W_concrete = W_stem + W_base;

  // Soil on heel
  const W_soil = heel * H * γs;

  // Surcharge on heel
  const W_surcharge = heel * q;

  // Total vertical
  const V_total = W_concrete + W_soil + W_surcharge + Pv;

  // Moments about toe (restoring) — individual moments
  const x_stem    = a + sw / 2000;
  const x_base    = B / 2;
  const x_soilHeel = a + sw / 1000 + heel / 2;
  const x_surcharge = x_soilHeel;

  const restoringM = W_stem * x_stem + W_base * x_base + W_soil * x_soilHeel + W_surcharge * x_surcharge;

  // Overturning moment about toe
  const overturningM = Ph * H / 3 + Ph_surcharge * H / 2;

  const FoS_overturning = restoringM / overturningM;
  const minFoS_OT = 1.5;
  if (FoS_overturning < minFoS_OT) msgs.push(`FAIL: FoS overturning = ${FoS_overturning.toFixed(2)} < ${minFoS_OT}`);
  else msgs.push(`PASS: FoS overturning = ${FoS_overturning.toFixed(2)}`);

  // Sliding: base friction + passive resistance (passive ignored for conservatism)
  const μ = Math.tan(0.67 * φ);   // base friction (2/3 φ)
  const Fr = μ * V_total;
  const FoS_sliding = Fr / Ph;
  const minFoS_SL = 1.5;
  if (FoS_sliding < minFoS_SL) msgs.push(`FAIL: FoS sliding = ${FoS_sliding.toFixed(2)} < ${minFoS_SL}`);
  else msgs.push(`PASS: FoS sliding = ${FoS_sliding.toFixed(2)}`);

  // Bearing pressure
  const xbar = (restoringM - overturningM) / V_total;  // resultant from toe
  const eccentricity = Math.abs(B / 2 - xbar);
  const qmax = (V_total / B) * (1 + 6 * eccentricity / B);
  const qmin = (V_total / B) * (1 - 6 * eccentricity / B);

  // Stem design — cantilever fixed at base
  const Med_stem = Ph * H / 3 + Ph_surcharge * H / 2;  // kNm/m
  const d_stem = Math.max(sw - cover - 10, 100);
  const z_stem = Math.min(0.9 * d_stem, d_stem - (d_stem - Math.sqrt(d_stem * d_stem - 2 * Med_stem * 1e6 / (fcd * 1000))) / 2);
  const As_stem = (Med_stem * 1e6) / (fyd * Math.min(z_stem, 0.95 * d_stem));

  // Toe moment (upward soil pressure minus base self-weight)
  const q_toe_avg = (qmax + (qmax - (qmax - qmin) * a / B)) / 2;
  const Med_toe = q_toe_avg * a * a / 2;

  // Heel moment (downward soil + surcharge minus upward pressure)
  const q_heel = (qmin + qmax) / 2;   // simplified
  const wd_heel = (W_soil + W_surcharge) / heel;
  const Med_heel = Math.max(0, (wd_heel - q_heel) * heel * heel / 2);

  const d_base = hb - cover - 10;
  const As_toe  = (Med_toe  * 1e6) / (fyd * 0.9 * d_base);
  const As_heel = (Med_heel * 1e6) / (fyd * 0.9 * d_base);

  const status: RetainingWallResults['status'] =
    FoS_overturning < minFoS_OT || FoS_sliding < minFoS_SL ? 'fail' :
    FoS_overturning < 2 || FoS_sliding < 2 ? 'warn' : 'pass';

  return {
    status, Ka, Ph, Pv, W_concrete, W_soil, V_total,
    restoringM, overturningM, FoS_overturning, FoS_sliding,
    eccentricity, qmax, qmin,
    Med_stem, d_stem, As_stem,
    Med_toe, Med_heel, As_toe, As_heel,
    messages: msgs,
  };
}
