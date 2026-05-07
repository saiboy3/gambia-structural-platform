import { chooseBarsPerMetre } from './materials';
import type { CodeFactors } from '../context/BuildingCodeContext';

export interface FlatSlabInputs {
  lx: number;           // m — shorter span (x-direction)
  ly: number;           // m — longer span (y-direction)
  thickness: number;    // mm — overall slab depth
  cover: number;        // mm — nominal cover
  columnCx: number;     // mm — column dim in x
  columnCy: number;     // mm — column dim in y
  liveLoad: number;     // kN/m²
  deadLoad: number;     // kN/m² — superimposed (excl self-weight)
  interiorCol: boolean; // true = interior, false = edge
  material: { fck: number; fcd: number; fyk: number; fyd: number; concrete: string; rebar: string };
}

export interface FlatSlabResults {
  status: 'pass' | 'warn' | 'fail';
  d: number;             // mm — effective depth
  wEd: number;           // kN/m²
  // Column strip moments (per metre)
  Med_cs_neg: number;    // kNm/m — hogging over column
  Med_cs_pos: number;    // kNm/m — sagging in span
  Med_ms_pos: number;    // kNm/m — middle strip sagging
  // Reinforcement
  As_cs_top: number;     // mm²/m — column strip top
  As_cs_bot: number;     // mm²/m — column strip bottom
  As_ms_bot: number;     // mm²/m — middle strip bottom
  bars_cs_top: ReturnType<typeof chooseBarsPerMetre>;
  bars_cs_bot: ReturnType<typeof chooseBarsPerMetre>;
  bars_ms_bot: ReturnType<typeof chooseBarsPerMetre>;
  // Punching shear
  VEd: number;           // kN — punching load
  u1: number;            // mm — basic control perimeter
  vEd: number;           // MPa
  vRdc: number;          // MPa
  punchingOK: boolean;
  // Deflection
  spanRatio: number;
  deflectionOK: boolean;
  messages: string[];
}

export function designFlatSlab(inp: FlatSlabInputs, cf: CodeFactors): FlatSlabResults {
  const msgs: string[] = [];
  const { fck, fyd } = inp.material;
  const { lx, ly, thickness, cover, columnCx, columnCy, liveLoad, deadLoad } = inp;

  // Effective depth (average of x and y directions)
  const dx = thickness - cover - 10;  // T10 assumed
  const dy = thickness - cover - 20;
  const d = (dx + dy) / 2;

  // Self-weight + superimposed dead
  const sw = (thickness / 1000) * 24;
  const wEd = cf.gammaG * (sw + deadLoad) + cf.gammaQ * liveLoad;

  // Minimum thickness check (EC2 §7.4 flat slab: L/31 interior, L/28 edge)
  const ldLimit = inp.interiorCol ? 31 : 28;
  const actualLD = (lx * 1000) / d;
  const deflectionOK = actualLD <= ldLimit;
  if (!deflectionOK) msgs.push(`WARN: Span/depth ${actualLD.toFixed(1)} > ${ldLimit} — increase thickness or add drops`);

  // ── Design moments using simplified coefficients (EC2 Annex I) ─────────────
  // Total static moment per panel
  const L2 = ly;  // strip width = span in y
  const M0 = wEd * L2 * lx * lx / 8;   // kNm total static moment

  // Distribution: interior column strip carries 60–75% of hogging, 55% of sagging
  const cs_neg_frac = 0.65;    // column strip — hogging over column
  const cs_pos_frac = 0.55;    // column strip — sagging in span
  const ms_pos_frac = 0.45;    // middle strip — sagging in span
  // Hogging/sagging split: ~65% hogging, 35% sagging for interior spans
  const M_neg = 0.65 * M0;
  const M_pos = 0.35 * M0;

  // Column strip width = min(lx, ly)/2 each side → total = min(lx, ly)
  const cs_width = Math.min(lx, ly);  // m
  const Med_cs_neg = (cs_neg_frac * M_neg) / cs_width;  // kNm/m
  const Med_cs_pos = (cs_pos_frac * M_pos) / cs_width;
  const Med_ms_pos = (ms_pos_frac * M_pos) / ((lx - cs_width));   // kNm/m on middle strip

  // ── Reinforcement ──────────────────────────────────────────────────────────
  const Klim = 0.167;
  const asReq = (M: number, depth: number) => {
    const K = (M * 1e6) / (fck * 1000 * depth * depth);
    if (K > Klim) msgs.push(`WARN: K=${K.toFixed(3)} > Klim — increase thickness`);
    const z = Math.min(depth * (0.5 + Math.sqrt(0.25 - K / 1.134)), 0.95 * depth);
    return Math.max((M * 1e6) / (fyd * z), 0.26 * (fck ** 0.5 / 500) * 1000 * depth);
  };

  const As_cs_top = asReq(Med_cs_neg, dx);
  const As_cs_bot = asReq(Med_cs_pos, dx);
  const As_ms_bot = asReq(Math.max(Med_ms_pos, 0.1), dy);

  const bars_cs_top = chooseBarsPerMetre(As_cs_top);
  const bars_cs_bot = chooseBarsPerMetre(As_cs_bot);
  const bars_ms_bot = chooseBarsPerMetre(As_ms_bot);

  // ── Punching shear (EC2 6.4) ───────────────────────────────────────────────
  // Load on column (tributary area approximation)
  const VEd = wEd * lx * ly * (inp.interiorCol ? 1.0 : 0.5);

  // Basic control perimeter u1 at 2d from column face
  const u1 = 2 * (columnCx + columnCy) + 2 * Math.PI * 2 * d;

  // Average reinforcement ratio
  const ρl = Math.min(
    Math.sqrt((bars_cs_top.As / (1000 * dx)) * (bars_cs_top.As / (1000 * dy))),
    0.02
  );
  const k = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc = (0.18 / cf.gammaC) * k * (100 * ρl * fck) ** (1 / 3);

  // β factor (eccentricity): 1.15 interior, 1.4 edge
  const β = inp.interiorCol ? 1.15 : 1.4;
  const vEd = β * (VEd * 1e3) / (u1 * d);

  const punchingOK = vEd <= vRdc;
  if (!punchingOK) msgs.push(`FAIL: Punching vEd ${vEd.toFixed(3)} > vRd,c ${vRdc.toFixed(3)} MPa — provide shear studs or increase slab thickness`);
  else msgs.push(`PASS: Punching vEd ${vEd.toFixed(3)} < vRd,c ${vRdc.toFixed(3)} MPa`);

  if (deflectionOK) msgs.push(`PASS: Span/depth ${actualLD.toFixed(1)} ≤ ${ldLimit}`);

  const status: FlatSlabResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, d, wEd,
    Med_cs_neg, Med_cs_pos, Med_ms_pos,
    As_cs_top, As_cs_bot, As_ms_bot,
    bars_cs_top, bars_cs_bot, bars_ms_bot,
    VEd, u1, vEd, vRdc, punchingOK,
    spanRatio: +actualLD.toFixed(1), deflectionOK,
    messages: msgs,
  };
}
