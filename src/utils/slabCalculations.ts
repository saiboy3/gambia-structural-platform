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
  const { fck, fyd } = inp.material;
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

  // Steel areas (per metre)
  const As_x = Math.max((Med_x * 1e6) / (fyd * 0.9 * d), 0.0013 * 1000 * h);
  const As_y = Math.max((Med_y * 1e6) / (fyd * 0.9 * d), 0.0013 * 1000 * h);

  const barsX = chooseSpacing(As_x);
  const barsY = chooseSpacing(As_y);

  // Deflection: EC2 span/d limit
  const spanRef = inp.type === 'one-way' ? inp.lx : inp.lx;
  let limit = inp.edgeCondition === 'cantilever' ? 8 : inp.edgeCondition === 'continuous-all' ? 26 : 20;
  limit *= Math.sqrt(fck / 25);
  const actualRatio = (spanRef * 1000) / d;
  const deflectionOK = actualRatio <= limit;
  if (!deflectionOK) msgs.push(`WARN: Span/depth ratio ${actualRatio.toFixed(1)} > limit ${limit.toFixed(1)}`);

  if (msgs.length === 0) msgs.push('OK: Slab adequate');

  const status = msgs.some(m => m.startsWith('FAIL')) ? 'FAIL'
               : msgs.some(m => m.startsWith('WARN')) ? 'WARN' : 'OK';

  return { Med_x, Med_y, As_x, As_y, d, barsX, barsY, deflectionOK, spanRatio: actualRatio, status, messages: msgs };
}
