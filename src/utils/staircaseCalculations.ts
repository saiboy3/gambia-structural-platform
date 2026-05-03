import type { CodeFactors } from '../context/BuildingCodeContext';

export interface StaircaseInputs {
  riser: number;        // mm — R
  going: number;        // mm — G (tread plan)
  numRisers: number;    // number of risers in flight
  flightWidth: number;  // m
  liveLoad: number;     // kN/m²
  deadLoad: number;     // kN/m² (finishes, extra)
  material: { fck: number; fcd: number; fyk: number; fyd: number; concrete: string; rebar: string };
  cover: number;        // mm
  supportType: 'simply-supported' | 'continuous';
}

export interface StaircaseResults {
  status: 'pass' | 'warn' | 'fail';
  // Geometry
  slopeAngle: number;      // deg
  goingCheck: string;      // 2R+G rule
  waistDepth: number;      // mm — auto-sized
  effectiveSpan: number;   // m
  // Loading
  selfWeight: number;      // kN/m² on slope
  totalLoad: number;       // kN/m²
  wULS: number;            // kN/m (per metre width)
  // Design
  Med: number;             // kNm/m
  d: number;               // mm
  As_req: number;          // mm²/m
  bars: { dia: number; spacing: number; As: number };
  deflectionOK: boolean;
  spanRatio: number;
  messages: string[];
}

export function designStaircase(inp: StaircaseInputs, cf: CodeFactors): StaircaseResults {
  const msgs: string[] = [];
  const { riser: R, going: G, numRisers, liveLoad, deadLoad, cover } = inp;
  const { fck, fyd } = inp.material;
  const γG = cf.gammaG, γQ = cf.gammaQ;

  // Geometry
  const slopeAngle = Math.atan(R / G) * 180 / Math.PI;
  const goingVal = 2 * R + G;
  const goingOK = goingVal >= 580 && goingVal <= 700;
  const goingCheck = `2R+G = ${goingVal}mm — ${goingOK ? 'OK (580–700mm)' : 'OUTSIDE recommended range'}`;
  if (!goingOK) msgs.push(`WARN: 2R+G = ${goingVal}mm — recommended 580–700mm`);

  // Horizontal span of flight
  const effectiveSpan = (numRisers * G) / 1000 + 0.3; // add 150mm each end for support

  // Waist depth — span/depth rule
  const sdLimit = inp.supportType === 'continuous' ? cf.spanDepthContinuous : cf.spanDepthSimple;
  const waistDepthRaw = Math.ceil((effectiveSpan * 1000) / sdLimit / 10) * 10;
  const waistDepth = Math.max(waistDepthRaw, 125);

  // Self weight of inclined slab (per m² plan)
  const slopeRad = slopeAngle * Math.PI / 180;
  const slabSW = (waistDepth / 1000) * 24 / Math.cos(slopeRad);
  const stepSW = 0.5 * R / 1000 * 24;  // average step weight per m² plan
  const selfWeight = slabSW + stepSW;

  const totalLoad = selfWeight + deadLoad + liveLoad; // kN/m² on plan

  // ULS strip (per metre width)
  const wULS = γG * (selfWeight + deadLoad) + γQ * liveLoad;

  const mFac = inp.supportType === 'continuous' ? 10 : 8;
  const Med = wULS * effectiveSpan * effectiveSpan / mFac;

  // Reinforcement
  const d = waistDepth - cover - 8;
  const K = (Med * 1e6) / (fck * 1000 * d * d);
  const z = Math.min(d * (0.5 + Math.sqrt(Math.max(0, 0.25 - K / 1.134))), 0.95 * d);
  const As_req = Math.max((Med * 1e6) / (fyd * z), 0.26 * (fck ** 0.5 / fyk(inp)) * 1000 * d, 0.0013 * 1000 * d);

  // Bar selection
  const barDias = [10, 12, 16, 20];
  const barAs: Record<number, number> = { 10: 78.5, 12: 113, 16: 201, 20: 314 };
  let bestBar = { dia: 12, spacing: 150, As: 0 };
  for (const dia of barDias) {
    for (const sp of [100, 125, 150, 175, 200]) {
      const As = (barAs[dia] / sp) * 1000;
      if (As >= As_req) { bestBar = { dia, spacing: sp, As: +As.toFixed(0) }; break; }
    }
    if (bestBar.As >= As_req) break;
  }

  // Deflection span/depth check
  const spanRatio = (effectiveSpan * 1000) / waistDepth;
  const deflectionOK = spanRatio <= sdLimit * 1.1;
  if (!deflectionOK) msgs.push(`WARN: span/depth ratio ${spanRatio.toFixed(1)} may exceed limit`);
  msgs.push(`Waist depth: ${waistDepth}mm, slope: ${slopeAngle.toFixed(1)}°`);

  const status: StaircaseResults['status'] = msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, slopeAngle, goingCheck, waistDepth, effectiveSpan,
    selfWeight, totalLoad, wULS, Med, d, As_req, bars: bestBar,
    deflectionOK, spanRatio, messages: msgs,
  };
}

function fyk(inp: StaircaseInputs): number {
  return inp.material.fyk;
}
