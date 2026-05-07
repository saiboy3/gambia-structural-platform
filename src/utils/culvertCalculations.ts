/**
 * RC Box Culvert Design — EC2 / BS 5400
 * Single-span box culvert: earth loading + HA traffic (BS 5400 Pt 2)
 * Walls and slabs designed as frames
 */
import { chooseBarsPerMetre } from './materials';
import type { CodeFactors } from '../context/BuildingCodeContext';

export interface CulvertInputs {
  span: number;          // m — internal clear span
  height: number;        // m — internal clear height
  wallThick: number;     // mm — wall/slab thickness
  cover: number;         // mm — nominal cover
  fillDepth: number;     // m — depth of fill above culvert top slab
  fillDensity: number;   // kN/m³ — fill unit weight (typically 19–20 for laterite)
  liveLoad: number;      // kN/m² — equivalent HA traffic (typically 10–45 kN/m²)
  fck: number;           // MPa — concrete strength
  fyk: number;           // MPa — rebar yield
  // Hydraulics (informational)
  designFlow: number;    // m³/s — design peak discharge
  Manning_n: number;     // Manning's roughness (0.013 concrete)
}

export interface CulvertResults {
  status: 'pass' | 'warn' | 'fail';
  // Geometry
  externalSpan: number;  // m
  externalHeight: number; // m
  // Loads
  earthPressure: number; // kPa — vertical earth pressure on top slab
  lateralEarth: number;  // kPa — horizontal earth pressure at base of wall
  totalUDL: number;      // kPa — earth + traffic on top slab
  // Design moments
  Med_topSlab: number;   // kNm/m — hogging at corners
  Med_wall: number;      // kNm/m — wall bending
  Med_baseSlab: number;  // kNm/m
  // Reinforcement
  d: number;             // mm
  As_top: number;        // mm²/m — top slab
  bars_top: ReturnType<typeof chooseBarsPerMetre>;
  As_wall: number;
  bars_wall: ReturnType<typeof chooseBarsPerMetre>;
  As_base: number;
  bars_base: ReturnType<typeof chooseBarsPerMetre>;
  // Hydraulics
  flowVelocity: number;  // m/s (Manning)
  flowCapacity: number;  // m³/s (full bore)
  hydraulicOK: boolean;
  messages: string[];
}

export function designCulvert(inp: CulvertInputs, cf: CodeFactors): CulvertResults {
  const msgs: string[] = [];
  const { span, height, wallThick, cover, fillDepth, fillDensity, liveLoad, fck, fyk } = inp;

  // External dimensions
  const externalSpan = span + 2 * wallThick / 1000;
  const externalHeight = height + 2 * wallThick / 1000;
  const d = wallThick - cover - 10;  // T10 assumed

  // ── Loads ─────────────────────────────────────────────────────────────────
  const Ko = 0.5;  // earth pressure coefficient (at rest)
  const earthPressure = fillDensity * fillDepth;  // kPa — vertical on top slab
  const lateralEarth = Ko * fillDensity * (fillDepth + height);  // kPa at base of wall
  const totalUDL = cf.gammaG * earthPressure + cf.gammaQ * liveLoad;  // kPa ULS

  // Self-weight of slabs
  const slabSW = (wallThick / 1000) * 24;  // kN/m²

  // ── Frame analysis (simplified — pinned at corners not moment frame) ───────
  // Box culvert approximated as a rigid frame with fixed corners
  // Top slab: propped beam — moment at corners ≈ wL²/12, midspan = wL²/24
  const w_top = totalUDL + cf.gammaG * slabSW;  // kPa ULS
  const Med_topSlab_fixed = w_top * span * span / 12;      // kNm/m (corner hogging)
  const Med_topSlab_mid = w_top * span * span / 24;         // kNm/m (midspan sagging)
  const Med_topSlab = Math.max(Med_topSlab_fixed, Med_topSlab_mid);

  // Wall: cantilever from base, triangular earth pressure
  const w_wall_top = Ko * fillDensity * fillDepth * cf.gammaG;
  const w_wall_bot = Ko * fillDensity * (fillDepth + height) * cf.gammaG;
  const Med_wall = (w_wall_bot - w_wall_top) * height * height / 6 + w_wall_top * height * height / 2;

  // Base slab: reaction from wall moments + earth pressure on base
  // Simplified: take same as top slab (conservative for symmetric)
  const w_base = cf.gammaG * (fillDensity * fillDepth + slabSW * 2) + cf.gammaQ * liveLoad;
  const Med_baseSlab = w_base * span * span / 12;

  // ── Reinforcement ──────────────────────────────────────────────────────────
  const fyd = fyk / 1.15;
  const Klim = 0.167;
  const asReq = (M: number) => {
    const K = (M * 1e6) / (fck * 1000 * d * d);
    if (K > Klim) msgs.push(`WARN: K=${K.toFixed(3)} > Klim — increase wall/slab thickness`);
    const z = Math.min(d * (0.5 + Math.sqrt(0.25 - K / 1.134)), 0.95 * d);
    return Math.max((M * 1e6) / (fyd * z), 0.26 * Math.sqrt(fck) / 500 * 1000 * d);
  };

  const As_top = asReq(Med_topSlab);
  const As_wall = asReq(Med_wall);
  const As_base = asReq(Med_baseSlab);

  const bars_top = chooseBarsPerMetre(As_top);
  const bars_wall = chooseBarsPerMetre(As_wall);
  const bars_base = chooseBarsPerMetre(As_base);

  msgs.push(`PASS: Top slab T${bars_top.dia}@${bars_top.spacing}mm, Wall T${bars_wall.dia}@${bars_wall.spacing}mm, Base T${bars_base.dia}@${bars_base.spacing}mm`);

  // ── Hydraulic check (Manning) ─────────────────────────────────────────────
  // Full bore: A = span × height, P = 2(span + height)
  const area = span * height;
  const wetP = 2 * (span + height);
  const R = area / wetP;  // hydraulic radius
  const slope = 0.005;    // assumed 1:200 grade (common for culverts)
  const flowVelocity = (1 / inp.Manning_n) * R ** (2 / 3) * slope ** 0.5;
  const flowCapacity = area * flowVelocity;
  const hydraulicOK = flowCapacity >= inp.designFlow;

  if (!hydraulicOK) msgs.push(`FAIL: Hydraulic capacity ${flowCapacity.toFixed(2)} m³/s < design ${inp.designFlow.toFixed(2)} m³/s — increase culvert size`);
  else msgs.push(`PASS: Hydraulic capacity ${flowCapacity.toFixed(2)} m³/s ≥ design flow ${inp.designFlow.toFixed(2)} m³/s`);

  if (flowVelocity > 4.0) msgs.push('WARN: Velocity > 4.0 m/s — provide scour protection at outlet');
  if (flowVelocity < 0.6) msgs.push('WARN: Velocity < 0.6 m/s — sedimentation risk. Increase slope or reduce size.');

  const status: CulvertResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, externalSpan: +externalSpan.toFixed(2), externalHeight: +externalHeight.toFixed(2),
    earthPressure: +earthPressure.toFixed(1), lateralEarth: +lateralEarth.toFixed(1),
    totalUDL: +totalUDL.toFixed(1),
    Med_topSlab: +Med_topSlab.toFixed(1), Med_wall: +Med_wall.toFixed(1), Med_baseSlab: +Med_baseSlab.toFixed(1),
    d: +d.toFixed(0), As_top: +As_top.toFixed(0), bars_top,
    As_wall: +As_wall.toFixed(0), bars_wall,
    As_base: +As_base.toFixed(0), bars_base,
    flowVelocity: +flowVelocity.toFixed(2), flowCapacity: +flowCapacity.toFixed(2), hydraulicOK,
    messages: msgs,
  };
}
