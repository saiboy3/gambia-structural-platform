/**
 * Bridge Abutment Design — RC Cantilever Abutment
 * EC2 / BS 5400 — gravity and sliding stability, stem bending
 * Loads: backfill earth pressure (Rankine), traffic surcharge, bridge reaction
 */
import { chooseBarsPerMetre } from './materials';
import type { CodeFactors } from '../context/BuildingCodeContext';

export type SoilAngle = 20 | 25 | 30 | 35;  // degrees friction angle

export interface AbutmentInputs {
  // Geometry
  stemHeight: number;    // m — total height from base to bearing shelf
  stemThick: number;     // mm — base of stem
  stemThickTop: number;  // mm — top of stem (can taper)
  baseLength: number;    // m — footing length (heel + toe)
  baseThick: number;     // mm — footing thickness
  cover: number;         // mm
  // Soil
  phi: number;           // degrees — backfill friction angle
  gamma: number;         // kN/m³ — backfill unit weight
  bearingCapacity: number; // kPa — allowable bearing of foundation soil
  // Bridge loads (per metre width)
  bridgeReaction: number;   // kN/m — vertical reaction from bridge beam
  bridgeFriction: number;   // kN/m — horizontal braking/friction force
  surcharge: number;     // kN/m² — traffic surcharge on backfill (typ. 10–15 kN/m²)
  fck: number;
  fyk: number;
}

export interface AbutmentResults {
  status: 'pass' | 'warn' | 'fail';
  // Earth pressure
  Ka: number;            // Rankine active coefficient
  Hea: number;           // kN/m — total horizontal earth force
  Vbackfill: number;     // kN/m — vertical weight of backfill on heel
  // Resultant forces
  totalV: number;        // kN/m — total vertical (self-weight + backfill + bridge)
  totalH: number;        // kN/m — total horizontal
  // Stability
  eccentricity: number;  // m — eccentricity of resultant
  bearingPressure: number; // kPa — max bearing pressure
  bearingOK: boolean;
  FoS_overturning: number;
  FoS_sliding: number;
  stabilityOK: boolean;
  // Stem reinforcement
  d_stem: number;        // mm — effective depth of stem
  Med_stem: number;      // kNm/m — moment at base of stem
  As_stem: number;       // mm²/m
  bars_stem: ReturnType<typeof chooseBarsPerMetre>;
  // Base slab reinforcement
  Med_heel: number;      // kNm/m
  As_heel: number;
  bars_heel: ReturnType<typeof chooseBarsPerMetre>;
  messages: string[];
}

export function designAbutment(inp: AbutmentInputs, cf: CodeFactors): AbutmentResults {
  const msgs: string[] = [];
  const { stemHeight, stemThick, baseLength, baseThick, cover, phi, gamma, fck, fyk } = inp;
  const fyd = fyk / 1.15;

  // ── Rankine active earth pressure ─────────────────────────────────────────
  const Ka = Math.tan((45 - phi / 2) * Math.PI / 180) ** 2;

  // Total horizontal earth force (triangular) + surcharge
  const Hea_earth = 0.5 * Ka * gamma * stemHeight ** 2;   // kN/m
  const Hea_surcharge = Ka * inp.surcharge * stemHeight;   // kN/m
  const totalH_earth = Hea_earth + Hea_surcharge;
  const totalH = totalH_earth + inp.bridgeFriction;  // kN/m

  // ── Self-weights ──────────────────────────────────────────────────────────
  const stemThickAvg = (stemThick + inp.stemThickTop) / 2 / 1000;  // m
  const W_stem = stemThickAvg * stemHeight * 24;     // kN/m (concrete)
  const W_base = baseLength * (baseThick / 1000) * 24;
  const heelLen = baseLength - stemThick / 1000 - 0.3;  // approximate heel length
  const W_backfill = heelLen * stemHeight * inp.gamma;

  const Vbackfill = W_backfill;
  const totalV = W_stem + W_base + W_backfill + inp.bridgeReaction;

  // ── Overturning / sliding stability ──────────────────────────────────────
  // Overturning about toe
  const restoring_moment = (
    W_stem * (0.3 + stemThickAvg / 2) +
    W_base * (baseLength / 2) +
    W_backfill * (baseLength - heelLen / 2) +
    inp.bridgeReaction * (stemThick / 1000)
  );
  const overturning_moment = (
    Hea_earth * (stemHeight / 3) +
    Hea_surcharge * (stemHeight / 2) +
    inp.bridgeFriction * stemHeight
  );

  const FoS_overturning = restoring_moment / overturning_moment;
  const mu = Math.tan(phi * Math.PI / 180) * 0.8;  // friction coeff
  const FoS_sliding = (mu * totalV) / totalH;

  if (FoS_overturning < 2.0) msgs.push(`FAIL: Overturning FoS=${FoS_overturning.toFixed(2)} < 2.0 — increase base length or add kentledge`);
  else msgs.push(`PASS: Overturning FoS=${FoS_overturning.toFixed(2)} ≥ 2.0`);

  if (FoS_sliding < 1.5) msgs.push(`FAIL: Sliding FoS=${FoS_sliding.toFixed(2)} < 1.5 — add shear key or increase base`);
  else msgs.push(`PASS: Sliding FoS=${FoS_sliding.toFixed(2)} ≥ 1.5`);

  // ── Bearing pressure ─────────────────────────────────────────────────────
  const xbar = (restoring_moment - overturning_moment) / totalV;  // resultant distance from toe
  const eccentricity = Math.abs(baseLength / 2 - xbar);
  const bearingPressure = (totalV / baseLength) * (1 + 6 * eccentricity / baseLength);
  const bearingOK = bearingPressure <= inp.bearingCapacity;

  if (!bearingOK) msgs.push(`FAIL: Bearing ${bearingPressure.toFixed(0)} kPa > ${inp.bearingCapacity} kPa — increase base or improve foundation`);
  else msgs.push(`PASS: Bearing ${bearingPressure.toFixed(0)} kPa ≤ ${inp.bearingCapacity} kPa`);

  const stabilityOK = FoS_overturning >= 2.0 && FoS_sliding >= 1.5;

  // ── Stem reinforcement (ULS) ───────────────────────────────────────────────
  const d_stem = stemThick - cover - 10;
  const Med_stem_earth = cf.gammaG * Hea_earth * (stemHeight / 3);
  const Med_stem_surcharge = cf.gammaQ * Hea_surcharge * (stemHeight / 2);
  const Med_stem_brake = cf.gammaQ * inp.bridgeFriction * stemHeight;
  const Med_stem = Med_stem_earth + Med_stem_surcharge + Med_stem_brake;

  const K_stem = (Med_stem * 1e6) / (fck * 1000 * d_stem ** 2);
  if (K_stem > 0.167) msgs.push('WARN: Stem K > 0.167 — increase stem thickness');
  const z_stem = Math.min(d_stem * (0.5 + Math.sqrt(Math.max(0, 0.25 - K_stem / 1.134))), 0.95 * d_stem);
  const As_stem = Math.max((Med_stem * 1e6) / (fyd * z_stem), 0.0013 * 1000 * d_stem);
  const bars_stem = chooseBarsPerMetre(As_stem);

  // ── Heel reinforcement (ULS) ───────────────────────────────────────────────
  const d_heel = baseThick - cover - 10;
  // Heel: upward soil pressure - downward weight of backfill
  const q_heel = bearingPressure;  // conservative: use max bearing
  const Med_heel = q_heel * heelLen * heelLen / 2 - W_backfill * heelLen / 2 * cf.gammaG;
  const As_heel_req = Math.max((Math.abs(Med_heel) * 1e6) / (fyd * 0.9 * d_heel), 0.0013 * 1000 * d_heel);
  const bars_heel = chooseBarsPerMetre(As_heel_req);

  msgs.push(`Stem: T${bars_stem.dia}@${bars_stem.spacing}mm at rear face, Heel: T${bars_heel.dia}@${bars_heel.spacing}mm top`);

  const status: AbutmentResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, Ka: +Ka.toFixed(3),
    Hea: +(Hea_earth + Hea_surcharge).toFixed(1),
    Vbackfill: +Vbackfill.toFixed(1),
    totalV: +totalV.toFixed(1), totalH: +totalH.toFixed(1),
    eccentricity: +eccentricity.toFixed(3),
    bearingPressure: +bearingPressure.toFixed(1), bearingOK,
    FoS_overturning: +FoS_overturning.toFixed(2),
    FoS_sliding: +FoS_sliding.toFixed(2), stabilityOK,
    d_stem: +d_stem.toFixed(0), Med_stem: +Med_stem.toFixed(1),
    As_stem: +As_stem.toFixed(0), bars_stem,
    Med_heel: +Math.abs(Med_heel).toFixed(1), As_heel: +As_heel_req.toFixed(0), bars_heel,
    messages: msgs,
  };
}
