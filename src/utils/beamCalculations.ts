import type { BeamInputs, BeamResults } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { barArea, chooseBars } from './materials';

const DEFAULT_CODE: Pick<CodeFactors,'gammaG'|'gammaQ'|'gammaC'|'gammaS'|'alphaCC'|'spanDepthSimple'|'spanDepthContinuous'|'spanDepthCantilever'> = {
  gammaG: 1.35, gammaQ: 1.5, gammaC: 1.5, gammaS: 1.15, alphaCC: 0.85,
  spanDepthSimple: 20, spanDepthContinuous: 26, spanDepthCantilever: 8,
};

export function designBeam(inp: BeamInputs, code: Partial<CodeFactors> = {}): BeamResults {
  const msgs: string[] = [];
  const cf = { ...DEFAULT_CODE, ...code };
  const { fck, fcd, fyd, Es } = inp.material;
  const γG = cf.gammaG, γQ = cf.gammaQ;

  const wd = γG * inp.deadLoad + γQ * inp.liveLoad;
  const wk = inp.deadLoad + inp.liveLoad;   // SLS characteristic
  const L  = inp.span;

  let Med = 0, Ved = 0, Mek = 0;
  if (inp.supportType === 'simply-supported') {
    Med = wd * L * L / 8;
    Mek = wk * L * L / 8;
    Ved = wd * L / 2;
  } else if (inp.supportType === 'continuous') {
    Med = wd * L * L / 10;
    Mek = wk * L * L / 10;
    Ved = 0.6 * wd * L;
  } else {
    Med = wd * L * L / 2;
    Mek = wk * L * L / 2;
    Ved = wd * L;
  }

  const dia_main = 20, dia_stir = 10;
  const d  = inp.depth - inp.cover - dia_stir - dia_main / 2;

  // ── T-beam / flanged section ──────────────────────────────────────────────
  const isT = !!inp.flange;
  const bf  = isT ? inp.flange!.width : inp.width;   // effective flange width
  const hf  = isT ? inp.flange!.thickness : 0;        // flange thickness
  const bw  = inp.width;                               // web width

  // Check if NA is in flange (T-beam bending)
  let AsReq: number;
  let x: number;
  let bEff = bw;  // effective width for K calculation (may be bf for T)

  if (isT) {
    // Moment capacity of flange only: Mf = fcd × bf × hf × (d - hf/2)
    const Mf_flange = (fcd * bf * hf * (d - hf / 2)) / 1e6; // kNm
    if (Med <= Mf_flange) {
      // NA in flange — treat as rectangular b=bf
      bEff = bf;
      const K = (Med * 1e6) / (fck * bf * d * d);
      const Kbal = 0.167;
      if (K > Kbal) {
        msgs.push('WARN: Flange in compression — section doubly reinforced');
        AsReq = (Med * 1e6) / (fyd * d * 0.82);
      } else {
        const z = Math.min(d * (0.5 + Math.sqrt(0.25 - K / 1.134)), 0.95 * d);
        AsReq = (Med * 1e6) / (fyd * z);
      }
      x = (AsReq * fyd) / (0.8 * bf * fcd);
      msgs.push('INFO: Neutral axis in flange — T-beam acts as rectangular');
    } else {
      // NA in web — T-beam bending
      const Mf = fcd * (bf - bw) * hf * (d - hf / 2) / 1e6;
      const Mw = Med - Mf;
      const Kw = (Mw * 1e6) / (fck * bw * d * d);
      if (Kw > 0.167) msgs.push('WARN: T-beam web over-stressed — increase section');
      const zw = Math.min(d * (0.5 + Math.sqrt(0.25 - Kw / 1.134)), 0.95 * d);
      const As_flange = (Mf * 1e6) / (fyd * (d - hf / 2));
      const As_web    = (Mw * 1e6) / (fyd * zw);
      AsReq = As_flange + As_web;
      x = hf + ((AsReq * fyd - fcd * (bf - bw) * hf) / (0.8 * bw * fcd));
      msgs.push('INFO: Neutral axis in web — true T-beam behaviour');
    }
  } else {
    // Rectangular section
    const K = (Med * 1e6) / (fck * bw * d * d);
    const Kbal = 0.167;
    if (K > Kbal) {
      msgs.push('WARN: Section doubly reinforced — increase depth');
      AsReq = (Med * 1e6) / (fyd * d * 0.82);
    } else {
      const z = Math.min(d * (0.5 + Math.sqrt(0.25 - K / 1.134)), 0.95 * d);
      AsReq = (Med * 1e6) / (fyd * z);
    }
    x = (AsReq * fyd) / (0.8 * bw * fcd);
  }

  const AsMin = Math.max(0.26 * (fck ** 0.5 / 500) * bw * d, 0.0013 * bw * d);
  const AsMax = 0.04 * bw * inp.depth;
  AsReq = Math.max(AsReq, AsMin);
  if (AsReq > AsMax) msgs.push('FAIL: Steel exceeds maximum — increase section');

  const mainBars = chooseBars(AsReq);

  // ── Shear (EC2 6.2) ──────────────────────────────────────────────────────
  const ρl  = Math.min(mainBars.As / (bw * d), 0.02);
  const k   = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc = (0.18 / cf.gammaC) * k * (100 * ρl * fck) ** (1/3) * bw * d / 1000;
  let shearOK = vRdc >= Ved;
  const diaStir = 10;
  let stirSpacing = 200;
  if (!shearOK) {
    const VRd_needed = Ved - vRdc;
    const Asw_s = (VRd_needed * 1000) / (fyd * 0.9 * d);
    stirSpacing = Math.min(200, Math.floor((2 * barArea(diaStir)) / Asw_s * 1000 / 10) * 10);
    shearOK = stirSpacing >= 50;
    if (!shearOK) msgs.push('FAIL: Shear links too close — increase section size');
  }
  const stirrups = { dia: diaStir, spacing: stirSpacing, legs: 2 };

  // ── Deflection (EC2 7.4 simplified span/d) ───────────────────────────────
  let limitRatio = inp.supportType === 'cantilever' ? cf.spanDepthCantilever
    : inp.supportType === 'continuous' ? cf.spanDepthContinuous : cf.spanDepthSimple;
  limitRatio *= Math.sqrt(fck / 25);
  const actualRatio = (L * 1000) / d;
  const deflectionOK = actualRatio <= limitRatio;
  if (!deflectionOK) msgs.push(`WARN: Span/depth ${actualRatio.toFixed(1)} > limit ${limitRatio.toFixed(1)}`);

  // ── SLS Crack width (EC2 7.3) ────────────────────────────────────────────
  // Simplified: maximum bar spacing / bar diameter limits (Table 7.3N)
  // Assuming wmax = 0.3mm (exposure XC1/XC2 typical interior/exterior Gambia)
  const wmax   = 0.3;   // mm
  const fctm   = 0.30 * fck ** (2 / 3);   // MPa mean tensile strength
  const As_prov = mainBars.As;
  const Ac_eff  = Math.min(2.5 * (inp.depth - d), (inp.depth - x) / 3, inp.depth / 2) * bw;
  const ρp_eff  = As_prov / Ac_eff;
  // Stress in steel at SLS
  const z_sls   = d - x / 3;
  const σs      = (Mek * 1e6) / (As_prov * z_sls);  // MPa
  const sr_max   = 3.4 * inp.cover + 0.425 * (mainBars.dia / ρp_eff) * (1 / 1); // EC2 7.11
  // Crack width estimate
  const εsm_εcm = Math.max(
    (σs - 0.4 * fctm / ρp_eff * (1 + (Es / (inp.material.Ec)) * ρp_eff)) / Es,
    0.6 * σs / Es
  );
  const wk_calc = sr_max * Math.abs(εsm_εcm);
  const crackOK = wk_calc <= wmax;
  if (!crackOK) msgs.push(`WARN: Crack width wk≈${wk_calc.toFixed(3)}mm > wmax ${wmax}mm — reduce bar spacing`);

  if (msgs.filter(m => !m.startsWith('INFO')).length === 0) msgs.push('OK: Section adequate');

  const status = msgs.some(m => m.startsWith('FAIL')) ? 'FAIL'
               : msgs.some(m => m.startsWith('WARN')) ? 'WARN' : 'OK';

  return {
    Med, Ved, AsReq, AsProvMin: AsMin, AsProvMax: AsMax, d, x,
    mainBars, stirrups, deflectionOK, shearOK, status, messages: msgs,
    // @ts-expect-error — extending results with extra SLS fields
    crackWidth: wk_calc, crackOK, isT, bEff,
  };
}
