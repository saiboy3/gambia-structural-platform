import type { SlabInputs, SlabResults } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { chooseSpacing } from './materials';

// EC2 two-way slab moment coefficients (BS 8110 Table 3.14 style)
// αsx, αsy for short-span and long-span moments
function twoWayCoefficients(ly_lx: number, edge: SlabInputs['edgeCondition']): { asx: number; asy: number } {
  // Simplified linear interpolation between ly/lx = 1.0 and 2.0
  const r = Math.min(ly_lx, 2.0);
  const t = (r - 1.0);  // 0..1
  if (edge === 'simply-supported') {
    return { asx: 0.062 + t * 0.020, asy: 0.062 - t * 0.024 };
  } else if (edge === 'continuous-all') {
    return { asx: 0.031 + t * 0.018, asy: 0.031 - t * 0.014 };
  } else if (edge === 'continuous-one') {
    return { asx: 0.047 + t * 0.018, asy: 0.047 - t * 0.018 };
  } else {  // cantilever — treat as one-way
    return { asx: 0.5, asy: 0 };
  }
}

export function designSlab(inp: SlabInputs, code: Partial<CodeFactors> = {}): SlabResults {
  const msgs: string[] = [];
  const { fck, fyk, fyd } = inp.material;
  const γG = code.gammaG ?? 1.35, γQ = code.gammaQ ?? 1.5;

  const h  = inp.thickness;
  const dia = 12;
  const d  = h - inp.cover - dia / 2;
  const wd = γG * inp.deadLoad + γQ * inp.liveLoad; // kN/m²

  let Med_x = 0, Med_y = 0;

  if (inp.type === 'one-way') {
    const L = inp.lx;
    if (inp.edgeCondition === 'simply-supported') Med_x = wd * L * L / 8;
    else if (inp.edgeCondition === 'continuous-all') Med_x = wd * L * L / 10;
    else if (inp.edgeCondition === 'continuous-one') Med_x = wd * L * L / 9;
    else Med_x = wd * L * L / 2; // cantilever
    Med_y = 0.2 * Med_x; // distribution steel
  } else {
    const lx = inp.lx, ly = inp.ly;
    const r = ly / lx;
    const { asx, asy } = twoWayCoefficients(r, inp.edgeCondition);
    Med_x = asx * wd * lx * lx;
    Med_y = asy * wd * lx * lx;
  }

  // ── Bending design (EC2 6.1) ──────────────────────────────────────────────
  // Derive the lever arm from K rather than assuming a fixed 0.9d, so that
  // an under-depth / over-reinforced slab is actually flagged.
  const Kbal = 0.167;
  const K = (Med_x * 1e6) / (fck * 1000 * d * d);
  if (K > Kbal) {
    msgs.push(`FAIL: K=${K.toFixed(3)} > ${Kbal} — compression zone overstressed; increase slab depth`);
  }
  const leverArm = (M: number) => {
    const k = (M * 1e6) / (fck * 1000 * d * d);
    return Math.min(d * (0.5 + Math.sqrt(Math.max(0, 0.25 - k / 1.134))), 0.95 * d);
  };
  const z = leverArm(Med_x);
  const z_y = leverArm(Med_y);

  // ── Reinforcement limits (EC2 9.2.1.1 / 9.3.1.1) ──────────────────────────
  // As,min = max(0.26·fctm/fyk·b·d, 0.0013·b·d) — the fctm term governs for
  // higher concrete grades and was previously omitted.
  const fctm  = 0.30 * fck ** (2 / 3);
  const As_min = Math.max(0.26 * (fctm / fyk) * 1000 * d, 0.0013 * 1000 * d);
  const As_max = 0.04 * 1000 * h;   // 4% of gross concrete area

  const As_x = Math.max((Med_x * 1e6) / (fyd * z), As_min);
  const As_y = Math.max((Med_y * 1e6) / (fyd * z_y), As_min);

  if (As_x > As_max) {
    msgs.push(`FAIL: As,x ${As_x.toFixed(0)} > As,max ${As_max.toFixed(0)} mm²/m (4% limit) — increase slab depth`);
  }

  const barsX = chooseSpacing(As_x);
  const barsY = chooseSpacing(As_y);

  // ── Shear (EC2 6.2.2) ─────────────────────────────────────────────────────
  // Slabs rarely need shear links, but the check must still be made.
  const Lshear = inp.type === 'one-way' ? inp.lx : Math.min(inp.lx, inp.ly);
  const Ved = inp.edgeCondition === 'cantilever' ? wd * Lshear : wd * Lshear / 2;  // kN/m
  const ρl  = Math.min(barsX.As / (1000 * d), 0.02);
  const kSize = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vmin  = 0.035 * kSize ** 1.5 * Math.sqrt(fck);
  const vRdc_mpa = Math.max((0.18 / (code.gammaC ?? 1.5)) * kSize * (100 * ρl * fck) ** (1 / 3), vmin);
  const VRdc = vRdc_mpa * 1000 * d / 1000;  // kN/m
  const shearOK = VRdc >= Ved;
  if (!shearOK) {
    msgs.push(`FAIL: VEd ${Ved.toFixed(1)} > VRd,c ${VRdc.toFixed(1)} kN/m — increase depth or add shear links`);
  }

  // ── Deflection: EC2 span/d limit ──────────────────────────────────────────
  // lx is the short span for two-way slabs, which governs deflection.
  const spanRef = inp.lx;
  let limit = inp.edgeCondition === 'cantilever' ? 8 : inp.edgeCondition === 'continuous-all' ? 26 : 20;
  limit *= Math.sqrt(fck / 25);
  const actualRatio = (spanRef * 1000) / d;
  const deflectionOK = actualRatio <= limit;
  if (!deflectionOK) msgs.push(`WARN: Span/depth ratio ${actualRatio.toFixed(1)} > limit ${limit.toFixed(1)}`);

  if (msgs.length === 0) msgs.push('OK: Slab adequate');

  const status = msgs.some(m => m.startsWith('FAIL')) ? 'FAIL'
               : msgs.some(m => m.startsWith('WARN')) ? 'WARN' : 'OK';

  return {
    Med_x, Med_y, As_x, As_y, As_min, As_max,
    K: +K.toFixed(3), z: +z.toFixed(1),
    d, barsX, barsY,
    Ved: +Ved.toFixed(1), VRdc: +VRdc.toFixed(1), shearOK,
    deflectionOK, spanRatio: actualRatio, status, messages: msgs,
  };
}
