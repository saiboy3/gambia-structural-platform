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
  const { type, height: H, baseWidth: B, toeTip: a, stemWidth: sw, baseThk: hb,
          soilDensity: γs, soilAngle: φ_deg,
          surcharge: q, concreteDensity: γc, cover } = inp;
  const { fcd, fyd } = inp.material;

  const φ = (φ_deg * Math.PI) / 180;

  // Rankine active earth pressure coefficient
  const Ka = (1 - Math.sin(φ)) / (1 + Math.sin(φ));

  // Horizontal thrust from soil + surcharge (per metre run)
  const Ph_soil = 0.5 * Ka * γs * H * H;
  const Ph_surcharge = Ka * q * H;
  const Ph = Ph_soil + Ph_surcharge;

  // Vertical component — zero for vertical wall face
  const Pv = 0;

  // Overturning moment about the toe — same driving force regardless of wall type
  const overturningM = Ph_soil * H / 3 + Ph_surcharge * H / 2;

  let W_concrete: number, W_soil: number, V_total: number, restoringM: number;
  let Med_stem = 0, d_stem = 0, As_stem = 0;
  let Med_toe = 0, Med_heel = 0, As_toe = 0, As_heel = 0;

  if (type === 'gravity') {
    // ── Mass-concrete gravity wall ──────────────────────────────────────────
    // Solid trapezoid: vertical front (toe) face, battered back face.
    // "Stem width" is read as the crown (top) width; "Base width" is the
    // full bottom width. No separate toe/heel slab — the whole section is
    // concrete, so no reinforcement design is performed (relies on mass).
    const topW = sw / 1000;   // m — crown width
    const botW = B;           // m — base width
    if (topW > botW) msgs.push('WARN: Top width exceeds base width — check geometry');

    const triW   = Math.max(botW - topW, 0);
    const A_rect = topW * H;
    const A_tri  = 0.5 * triW * H;
    const W_rect = A_rect * γc;
    const W_tri  = A_tri * γc;
    W_concrete = W_rect + W_tri;
    W_soil = 0;
    V_total = W_concrete;

    const x_rect = topW / 2;
    const x_tri  = topW + triW / 3;
    restoringM = W_rect * x_rect + W_tri * x_tri;

    msgs.push('Gravity wall — mass concrete section, no flexural reinforcement required');
  } else {
    // ── Cantilever RC wall ───────────────────────────────────────────────────
    const heel = B - a - sw / 1000;        // m

    // Self-weight of concrete (stem + base)
    const stemH = H - hb / 1000;
    const W_stem = stemH * sw / 1000 * γc;
    const W_base = B * hb / 1000 * γc;
    W_concrete = W_stem + W_base;

    // Soil on heel
    W_soil = heel * H * γs;

    // Surcharge on heel
    const W_surcharge = heel * q;

    // Total vertical
    V_total = W_concrete + W_soil + W_surcharge + Pv;

    // Moments about toe (restoring) — individual moments
    const x_stem    = a + sw / 2000;
    const x_base    = B / 2;
    const x_soilHeel = a + sw / 1000 + heel / 2;
    const x_surcharge = x_soilHeel;

    restoringM = W_stem * x_stem + W_base * x_base + W_soil * x_soilHeel + W_surcharge * x_surcharge;

    // Stem design — cantilever fixed at base of stem (top of footing), NOT at the
    // footing underside. The earth pressure diagram governing stem bending only
    // extends over the stem's own height (stemH), not the full retained height H
    // used for the overall overturning check about the toe.
    const Ph_soil_stem = 0.5 * Ka * γs * stemH * stemH;
    const Ph_surcharge_stem = Ka * q * stemH;
    Med_stem = Ph_soil_stem * stemH / 3 + Ph_surcharge_stem * stemH / 2;  // kNm/m — triangular soil block resultant at stemH/3, uniform surcharge resultant at stemH/2
    d_stem = Math.max(sw - cover - 10, 100);
    const z_stem = Math.min(0.9 * d_stem, d_stem - (d_stem - Math.sqrt(d_stem * d_stem - 2 * Med_stem * 1e6 / (fcd * 1000))) / 2);
    As_stem = (Med_stem * 1e6) / (fyd * Math.min(z_stem, 0.95 * d_stem));

    // Bearing needed below for toe/heel moments — computed after the shared block
    // (uses qmax/qmin, so those are recomputed here from this branch's V_total/restoringM)
    const xbar0 = (restoringM - overturningM) / V_total;
    const e0 = Math.abs(B / 2 - xbar0);
    const qmax0 = (V_total / B) * (1 + 6 * e0 / B);
    const qmin0 = (V_total / B) * (1 - 6 * e0 / B);

    // Toe moment (upward soil pressure minus base self-weight)
    const q_toe_avg = (qmax0 + (qmax0 - (qmax0 - qmin0) * a / B)) / 2;
    Med_toe = q_toe_avg * a * a / 2;

    // Heel moment (downward soil + surcharge minus upward pressure)
    const q_heel = (qmin0 + qmax0) / 2;   // simplified
    const wd_heel = (W_soil + W_surcharge) / heel;
    Med_heel = Math.max(0, (wd_heel - q_heel) * heel * heel / 2);

    const d_base = hb - cover - 10;
    As_toe  = (Med_toe  * 1e6) / (fyd * 0.9 * d_base);
    As_heel = (Med_heel * 1e6) / (fyd * 0.9 * d_base);
  }

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

  // Middle-third (kern) check — the defining serviceability criterion for an
  // unreinforced gravity wall, since the base cannot take tension.
  if (type === 'gravity') {
    const middleThird = B / 6;
    if (eccentricity > middleThird) msgs.push(`FAIL: Eccentricity ${eccentricity.toFixed(3)}m exceeds middle third B/6=${middleThird.toFixed(3)}m — resultant outside kern, tension at heel`);
    else msgs.push(`PASS: Eccentricity ${eccentricity.toFixed(3)}m within middle third (≤ ${middleThird.toFixed(3)}m)`);
  }

  const status: RetainingWallResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
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
