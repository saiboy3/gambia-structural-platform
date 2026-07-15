/**
 * Pile cap design — 2-pile, 3-pile, 4-pile
 * Method: truss analogy (2-pile) and bending (4-pile) per BS 8110 / EC2
 */
import { chooseBarsPerMetre } from './materials';
import type { CodeFactors } from '../context/BuildingCodeContext';

export type PileArrangement = '2-pile' | '3-pile' | '4-pile';

export interface PileCapInputs {
  arrangement: PileArrangement;
  pileDia: number;        // mm — pile diameter
  pileSpacing: number;    // mm — centre-to-centre spacing
  capThickness: number;   // mm — pile cap depth
  capProjection: number;  // mm — projection beyond outer pile CL
  cover: number;          // mm
  colB: number;           // mm — column width
  colH: number;           // mm — column depth
  Ned: number;            // kN — column axial load (ULS)
  material: { fck: number; fcd: number; fyk: number; fyd: number; concrete: string; rebar: string };
}

export interface PileCapResults {
  status: 'pass' | 'warn' | 'fail';
  // Geometry
  capSizeX: number;       // mm
  capSizeY: number;       // mm
  // Pile loads
  pileLoad: number;       // kN per pile
  pileCap_weight: number; // kN — self-weight of cap
  // Bending design
  Med: number;            // kNm — critical bending moment
  d: number;              // mm — effective depth
  As_req: number;         // mm²/m
  bars: { dia: number; spacing: number; As: number };
  // Punching at column
  vEd_col: number;        // MPa
  vRdc: number;           // MPa
  punchOK: boolean;
  messages: string[];
}

export function designPileCap(inp: PileCapInputs, cf: CodeFactors): PileCapResults {
  const msgs: string[] = [];
  const { pileDia, pileSpacing, capThickness, capProjection, cover, colB, colH, Ned } = inp;
  const { fck, fyd } = inp.material;
  const s = pileSpacing;   // pile CtoC

  // ── Cap plan dimensions ────────────────────────────────────────────────────
  let capSizeX: number, capSizeY: number, nPiles: number;
  switch (inp.arrangement) {
    case '2-pile':
      capSizeX = s + 2 * capProjection;
      capSizeY = pileDia + 2 * capProjection;
      nPiles = 2;
      break;
    case '3-pile':
      capSizeX = s + 2 * capProjection;
      capSizeY = s * Math.sin(60 * Math.PI / 180) + 2 * capProjection;
      nPiles = 3;
      break;
    default: // 4-pile
      capSizeX = s + 2 * capProjection;
      capSizeY = s + 2 * capProjection;
      nPiles = 4;
  }

  // Effective depth
  const d = capThickness - cover - 16;  // T16 assumed

  // Cap self-weight
  const capVol = (capSizeX / 1000) * (capSizeY / 1000) * (capThickness / 1000);
  const pileCap_weight = capVol * 24 * 1.35;  // ULS

  // Total load including cap
  const NEdTotal = Ned + pileCap_weight;
  const pileLoad = NEdTotal / nPiles;

  msgs.push(`Pile load = ${pileLoad.toFixed(0)} kN per pile`);

  // ── Bending moment (truss analogy for 2-pile; cantilever for 4-pile) ───────
  // If the column is wider than the pile spacing, the pile centreline falls
  // inside (or at) the column face — there is no cantilever action left, so
  // clamp the lever arm at zero rather than letting it go negative (which
  // would flow through as a negative, nonsensical design moment).
  let Med: number;
  if (inp.arrangement === '2-pile') {
    // Moment at face of column: tension tie force T = pileLoad × lever arm
    // T = Ned × s / (2 × z) where z = 0.9d (lever arm in strut-and-tie)
    // Simpler: Med at column face = pileLoad × (s/2 - colB/2) / 1000
    const x_crit = Math.max(s / 2 - colB / 2, 0);  // mm — cantilever from column face to pile CL
    Med = pileLoad * x_crit / 1000;   // kNm (per cap width)
    if (s / 2 - colB / 2 < 0) msgs.push('WARN: Column wider than pile spacing — check geometry, cantilever moment clamped to zero');
  } else {
    // Critical section at column face; moment per metre
    const x_crit = Math.max(s / 2 - colB / 2, 0);
    Med = pileLoad * x_crit / 1000;   // kNm per pile pair
    if (s / 2 - colB / 2 < 0) msgs.push('WARN: Column wider than pile spacing — check geometry, cantilever moment clamped to zero');
  }

  // As per metre width
  const z = Math.min(0.95 * d, 0.9 * d);
  // Cap width at critical section
  const bCrit = inp.arrangement === '2-pile' ? (pileDia + 2 * capProjection) : capSizeY;
  const Med_pm = (Med * 1e6) / bCrit;   // Nmm per mm width

  const K = Med_pm / (fck * d * d);
  if (K > 0.167) msgs.push('WARN: K > 0.167 — cap may be over-stressed; increase thickness');
  const As_req = Math.max(Med_pm / (fyd * z), 0.0013 * bCrit * d);

  const bars = chooseBarsPerMetre(As_req);

  // ── Punching at column ─────────────────────────────────────────────────────
  const u1_col = 2 * (colB + colH) + 2 * Math.PI * 2 * d;
  const ρl = Math.min(bars.As / (1000 * d), 0.02);
  const k = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc = (0.18 / cf.gammaC) * k * (100 * ρl * fck) ** (1 / 3);
  const vEd_col = (Ned * 1e3) / (u1_col * d);
  const punchOK = vEd_col <= vRdc;

  if (!punchOK) msgs.push(`FAIL: Punching at column vEd=${vEd_col.toFixed(3)} > vRd,c=${vRdc.toFixed(3)} MPa`);
  else msgs.push(`PASS: Punching at column OK`);
  msgs.push(`Provide T${bars.dia}@${bars.spacing}mm EW bottom bars`);

  const status: PileCapResults['status'] = msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, capSizeX, capSizeY, pileLoad: +pileLoad.toFixed(0),
    pileCap_weight: +pileCap_weight.toFixed(0),
    Med: +Med.toFixed(1), d: +d.toFixed(0), As_req: +As_req.toFixed(0), bars,
    vEd_col: +vEd_col.toFixed(3), vRdc: +vRdc.toFixed(3), punchOK,
    messages: msgs,
  };
}
