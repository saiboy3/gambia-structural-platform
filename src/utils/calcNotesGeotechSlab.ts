/**
 * calcNotesGeotechSlab.ts
 * Step-by-step QA/QC calculation breakdowns for Retaining Wall, Staircase and
 * Flat Slab modules. Follows the same pattern as calcNotes.ts but references
 * EC2 clause numbers directly (no multi-code branching).
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { CodeFactors } from '../context/BuildingCodeContext';
import type { RetainingWallInputs, RetainingWallResults } from './retainingWallCalculations';
import type { StaircaseInputs, StaircaseResults } from './staircaseCalculations';
import type { FlatSlabInputs, FlatSlabResults } from './flatSlabCalculations';

const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

// ── RETAINING WALL calc notes ──────────────────────────────────────────────
export function retainingWallCalcNotes(
  inp: RetainingWallInputs,
  res: RetainingWallResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { type, height: H, baseWidth: B, toeTip: a, stemWidth: sw, baseThk: hb,
          soilDensity: γs, soilAngle: φ_deg, surcharge: q, concreteDensity: γc, cover } = inp;
  const { fyd } = inp.material;
  const φ = (φ_deg * Math.PI) / 180;
  const Ph_soil = 0.5 * res.Ka * γs * H * H;
  const Ph_surcharge = res.Ka * q * H;
  const stemH = H - hb / 1000;
  const Ph_soil_stem = 0.5 * res.Ka * γs * stemH * stemH;
  const Ph_surcharge_stem = res.Ka * q * stemH;

  const steps: CalcStep[] = [
    { heading: '1. Earth Pressure' },
    {
      label: 'Active pressure coefficient',
      formula: "Ka = (1 − sin φ') / (1 + sin φ')",
      working: `= (1 − sin${φ_deg}°) / (1 + sin${φ_deg}°) = (1 − ${n(Math.sin(φ),3)}) / (1 + ${n(Math.sin(φ),3)})`,
      result: `Ka = ${n(res.Ka, 3)}`,
      ref: 'EC2/EC7 — Rankine theory',
    },
    {
      label: 'Horizontal thrust from soil',
      formula: 'Ph,soil = 0.5 · Ka · γs · H²',
      working: `= 0.5 × ${n(res.Ka,3)} × ${γs} × ${H}²`,
      result: `${n(Ph_soil)} kN/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Horizontal thrust from surcharge',
      formula: 'Ph,surcharge = Ka · q · H',
      working: `= ${n(res.Ka,3)} × ${q} × ${H}`,
      result: `${n(Ph_surcharge)} kN/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Total horizontal thrust',
      formula: 'Ph = Ph,soil + Ph,surcharge',
      working: `= ${n(Ph_soil)} + ${n(Ph_surcharge)}`,
      result: `${n(res.Ph)} kN/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Overturning moment about toe',
      formula: 'Mot = Ph,soil · H/3 + Ph,surcharge · H/2',
      working: `= ${n(Ph_soil)} × ${H}/3 + ${n(Ph_surcharge)} × ${H}/2`,
      result: `${n(res.overturningM)} kNm/m`,
      ref: 'EC7 §9.5.1',
    },

    { heading: '2. Self-Weight & Stability' },
    {
      label: type === 'gravity' ? 'Concrete self-weight (mass section)' : 'Concrete self-weight (stem + base)',
      formula: type === 'gravity'
        ? 'W = [topW·H + 0.5·(botW−topW)·H] · γc'
        : 'W = stemH·sw·γc + B·hb·γc',
      working: type === 'gravity'
        ? `topW = ${n(sw/1000,3)} m, botW = ${B} m, H = ${H} m, γc = ${γc} kN/m³`
        : `stemH = ${H}−${hb}/1000 = ${n(H - hb/1000,3)} m, sw = ${n(sw/1000,3)} m, B = ${B} m, hb = ${hb} mm, γc = ${γc} kN/m³`,
      result: `${n(res.W_concrete)} kN/m`,
      ref: 'EC2 §5.1.3 (self-weight)',
    },
    ...(type === 'cantilever' ? [{
      label: 'Soil weight on heel',
      formula: 'W_soil = heel · H · γs',
      working: `heel = B − a − sw/1000 = ${B} − ${a} − ${n(sw/1000,3)}`,
      result: `${n(res.W_soil)} kN/m`,
      ref: 'EC7 §9.5.1',
    }] : []),
    {
      label: 'Total vertical load',
      formula: 'V = W_concrete + W_soil + W_surcharge + Pv',
      working: `sum of vertical components on base`,
      result: `${n(res.V_total)} kN/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Restoring moment about toe',
      formula: 'Mrest = Σ(Wi · xi)',
      working: `weighted sum of self-weight and (for cantilever) soil/surcharge moment arms about the toe`,
      result: `${n(res.restoringM)} kNm/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Factor of safety — overturning',
      formula: 'FoS_ot = Mrest / Mot',
      working: `= ${n(res.restoringM)} / ${n(res.overturningM)}`,
      result: `${n(res.FoS_overturning, 2)}`,
      ref: 'EC7 §9.7.5 (min. 1.5)',
      status: res.FoS_overturning >= 1.5 ? 'ok' : 'fail',
      note: res.FoS_overturning >= 1.5 ? 'Pass ✓ (≥ 1.5)' : 'Fail ✗ (< 1.5)',
    },
    {
      label: 'Base friction coefficient',
      formula: 'μ = tan(2φ/3)',
      working: `= tan(2×${φ_deg}°/3) = tan(${n(2*φ_deg/3,1)}°)`,
      result: `${n(Math.tan(0.67*φ), 3)}`,
      ref: 'EC7 §6.5.3',
    },
    {
      label: 'Factor of safety — sliding',
      formula: 'FoS_sl = μ·V / Ph',
      working: `= ${n(Math.tan(0.67*φ),3)} × ${n(res.V_total)} / ${n(res.Ph)}`,
      result: `${n(res.FoS_sliding, 2)}`,
      ref: 'EC7 §9.7.4 (min. 1.5)',
      status: res.FoS_sliding >= 1.5 ? 'ok' : 'fail',
      note: res.FoS_sliding >= 1.5 ? 'Pass ✓ (≥ 1.5)' : 'Fail ✗ (< 1.5)',
    },

    { heading: '3. Bearing Pressure' },
    {
      label: 'Resultant eccentricity',
      formula: 'e = |B/2 − x̄|,  x̄ = (Mrest − Mot)/V',
      working: `x̄ = (${n(res.restoringM)} − ${n(res.overturningM)}) / ${n(res.V_total)},  e = |${n(B,2)}/2 − x̄|`,
      result: `${n(res.eccentricity, 3)} m`,
      ref: 'EC7 Annex D',
    },
    {
      label: 'Maximum bearing pressure',
      formula: 'qmax = (V/B) · (1 + 6e/B)',
      working: `= (${n(res.V_total)}/${n(B,2)}) × (1 + 6×${n(res.eccentricity,3)}/${n(B,2)})`,
      result: `${n(res.qmax, 1)} kPa`,
      ref: 'EC7 Annex D',
    },
    {
      label: 'Minimum bearing pressure',
      formula: 'qmin = (V/B) · (1 − 6e/B)',
      working: `= (${n(res.V_total)}/${n(B,2)}) × (1 − 6×${n(res.eccentricity,3)}/${n(B,2)})`,
      result: `${n(res.qmin, 1)} kPa`,
      ref: 'EC7 Annex D',
      status: res.qmin >= 0 ? 'ok' : 'warn',
      note: res.qmin >= 0 ? 'No uplift/tension at heel ✓' : 'Tension at heel — resultant outside base ✗',
    },
    ...(type === 'gravity' ? [{
      label: 'Middle-third (kern) check',
      formula: 'e ≤ B/6',
      working: `${n(res.eccentricity,3)} m ${res.eccentricity <= B/6 ? '≤' : '>'} ${n(B/6,3)} m`,
      result: res.eccentricity <= B/6 ? 'Pass ✓' : 'Fail ✗',
      ref: 'Middle-third rule — unreinforced gravity section',
      status: (res.eccentricity <= B/6 ? 'ok' : 'fail') as 'ok' | 'fail',
      note: 'Governs instead of a stem-moment check since the mass section has no flexural reinforcement',
    }] : []),

    ...(type === 'cantilever' ? [
      { heading: '4. Stem Design (Cantilever RC)' },
      {
        label: 'Design moment at base of stem',
        formula: 'Med,stem = Ph,soil,stem·stemH/3 + Ph,surcharge,stem·stemH/2  [stemH = H − hb/1000]',
        working: `stemH = ${H} − ${hb}/1000 = ${n(stemH,3)} m; = ${n(Ph_soil_stem)} × ${n(stemH,3)}/3 + ${n(Ph_surcharge_stem)} × ${n(stemH,3)}/2`,
        result: `${n(res.Med_stem)} kNm/m`,
        ref: 'EC2 §5.4',
      },
      {
        label: 'Effective depth of stem',
        formula: 'd_stem = sw − cover − φ/2',
        working: `= ${sw} − ${cover} − 10`,
        result: `${n0(res.d_stem)} mm`,
        ref: 'EC2 §8.3.2',
      },
      {
        label: 'Required stem reinforcement',
        formula: 'As,stem = Med,stem / (fyd · z)',
        working: `= ${n(res.Med_stem)}×10⁶ / (${n(fyd,1)} × z),  z ≈ 0.9·d`,
        result: `${n0(res.As_stem)} mm²/m`,
        ref: 'EC2 §6.1',
      },
      { heading: '5. Toe & Heel Design' },
      {
        label: 'Toe design moment',
        formula: 'Med,toe = q_toe,avg · a² / 2',
        working: `a = ${a} m (critical section at column/stem face)`,
        result: `${n(res.Med_toe)} kNm/m`,
        ref: 'EC2 §6.1',
      },
      {
        label: 'Toe reinforcement required',
        formula: 'As,toe = Med,toe / (fyd · 0.9 · d_base)',
        working: `d_base = ${hb} − ${cover} − 10 = ${n0(hb - cover - 10)} mm`,
        result: `${n0(res.As_toe)} mm²/m`,
        ref: 'EC2 §6.1',
      },
      {
        label: 'Heel design moment',
        formula: 'Med,heel = max(0, (w_heel − q_heel)·heel²/2)',
        working: `net downward load on heel (soil + surcharge) minus upward bearing`,
        result: `${n(res.Med_heel)} kNm/m`,
        ref: 'EC2 §6.1',
      },
      {
        label: 'Heel reinforcement required',
        formula: 'As,heel = Med,heel / (fyd · 0.9 · d_base)',
        working: `d_base = ${n0(hb - cover - 10)} mm`,
        result: `${n0(res.As_heel)} mm²/m`,
        ref: 'EC2 §6.1',
      },
    ] : []),
  ];

  return steps;
}

// ── STAIRCASE calc notes ───────────────────────────────────────────────────
export function staircaseCalcNotes(
  inp: StaircaseInputs,
  res: StaircaseResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { riser: R, going: G, numRisers, liveLoad, deadLoad, cover } = inp;
  const { fck } = inp.material;
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const sdLimit = inp.supportType === 'continuous' ? (cf.spanDepthContinuous ?? 26) : (cf.spanDepthSimple ?? 20);
  const mFac = inp.supportType === 'continuous' ? 10 : 8;

  return [
    { heading: '1. Geometry' },
    {
      label: 'Slope angle',
      formula: 'θ = atan(R/G)',
      working: `= atan(${R}/${G})`,
      result: `${n(res.slopeAngle, 1)}°`,
      ref: '',
    },
    {
      label: '2R + G rule',
      formula: '580 mm ≤ 2R + G ≤ 700 mm',
      working: `= 2×${R} + ${G} = ${2*R + G} mm`,
      result: res.goingCheck,
      ref: 'Ergonomic step-proportion rule',
      status: (2*R + G) >= 580 && (2*R + G) <= 700 ? 'ok' : 'warn',
    },
    {
      label: 'Effective span',
      formula: 'Leff = numRisers × G / 1000 + 0.3',
      working: `= ${numRisers} × ${G} / 1000 + 0.3`,
      result: `${n(res.effectiveSpan, 2)} m`,
      ref: 'EC2 §5.3.2.2',
    },
    {
      label: 'Waist depth (span/depth sizing)',
      formula: `h = Leff × 1000 / λlim  [λlim = ${sdLimit}]`,
      working: `= ${n(res.effectiveSpan,2)} × 1000 / ${sdLimit} → rounded up to nearest 10mm, min 125mm`,
      result: `${res.waistDepth} mm`,
      ref: 'EC2 §7.4.2 Table 7.4N',
    },

    { heading: '2. Loading' },
    {
      label: 'Self-weight (waist + steps)',
      formula: 'sw = (h/1000)·24/cosθ + 0.5·R/1000·24',
      working: `= (${res.waistDepth}/1000)×24/cos(${n(res.slopeAngle,1)}°) + 0.5×${R}/1000×24`,
      result: `${n(res.selfWeight, 2)} kN/m²`,
      ref: 'EC2 §5.1.3',
    },
    {
      label: 'Total service load',
      formula: 'w = selfWeight + gk + qk',
      working: `= ${n(res.selfWeight,2)} + ${deadLoad} + ${liveLoad}`,
      result: `${n(res.totalLoad, 2)} kN/m²`,
      ref: '',
    },
    {
      label: 'Design load (ULS, per metre width)',
      formula: 'wEd = γG·(sw + gk) + γQ·qk',
      working: `= ${n(γG)}×(${n(res.selfWeight,2)} + ${deadLoad}) + ${n(γQ)}×${liveLoad}`,
      result: `${n(res.wULS, 2)} kN/m`,
      ref: 'EN 1990 Eq. 6.10',
    },

    { heading: '3. Bending Design' },
    {
      label: 'Design moment',
      formula: `Med = wEd · Leff² / ${mFac}  [${inp.supportType}]`,
      working: `= ${n(res.wULS,2)} × ${n(res.effectiveSpan,2)}² / ${mFac}`,
      result: `${n(res.Med, 2)} kNm/m`,
      ref: 'EC2 §5.4',
    },
    {
      label: 'Effective depth',
      formula: 'd = h − cover − φ/2',
      working: `= ${res.waistDepth} − ${cover} − 8  (T16 bars assumed)`,
      result: `${n0(res.d)} mm`,
      ref: 'EC2 §8.3.2',
    },
    {
      label: 'Required reinforcement',
      formula: 'As,req = max(Med/(fyd·z), As,min)',
      working: `K = ${n((res.Med*1e6)/(fck*1000*res.d*res.d),4)},  z ≈ 0.9d,  As,min = max(0.26√fck/fyk·b·d, 0.0013·b·d)`,
      result: `${n0(res.As_req)} mm²/m`,
      ref: 'EC2 §9.2.1.1(1)',
    },
    {
      label: 'Bars provided',
      formula: `T${res.bars.dia} @ ${res.bars.spacing} mm`,
      working: `As,prov = ${res.bars.As} mm²/m`,
      result: `${res.bars.As} mm²/m`,
      ref: '',
      status: res.bars.As >= res.As_req ? 'ok' : 'fail',
      note: res.bars.As >= res.As_req
        ? `As,prov (${res.bars.As}) ≥ As,req (${n0(res.As_req)}) ✓`
        : `As,prov (${res.bars.As}) < As,req (${n0(res.As_req)}) ✗`,
    },

    { heading: '4. Deflection Check' },
    {
      label: 'Span/depth ratio',
      formula: 'λact = Leff × 1000 / h',
      working: `= ${n(res.effectiveSpan,2)} × 1000 / ${res.waistDepth}`,
      result: `${n(res.spanRatio, 1)}`,
      ref: 'EC2 §7.4.2',
    },
    {
      label: 'Deflection check',
      formula: 'λact ≤ 1.1 × λlim',
      working: `${n(res.spanRatio,1)} ${res.deflectionOK ? '≤' : '>'} ${n(sdLimit * 1.1, 1)}`,
      result: res.deflectionOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'EC2 §7.4.1',
      status: res.deflectionOK ? 'ok' : 'warn',
    },
  ];
}

// ── FLAT SLAB calc notes ───────────────────────────────────────────────────
export function flatSlabCalcNotes(
  inp: FlatSlabInputs,
  res: FlatSlabResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { lx, ly, thickness, cover, columnCx, columnCy, liveLoad, deadLoad } = inp;
  const { fck } = inp.material;
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const γc = cf.gammaC ?? 1.50;
  const sw = (thickness / 1000) * 24;
  const cs_width = Math.min(lx, ly);
  const ms_width = Math.max(Math.abs(lx - ly), 0.5 * Math.min(lx, ly));
  const M0 = res.wEd * ly * lx * lx / 8;
  const ldLimit = inp.interiorCol ? 31 : 28;
  const β = inp.interiorCol ? 1.15 : 1.4;

  return [
    { heading: '1. Section & Loading' },
    {
      label: 'Effective depth (avg. of x/y)',
      formula: 'd = [(h−c−10) + (h−c−20)] / 2',
      working: `dx = ${thickness}−${cover}−10 = ${n0(thickness-cover-10)},  dy = ${thickness}−${cover}−20 = ${n0(thickness-cover-20)}`,
      result: `${n(res.d, 1)} mm`,
      ref: 'EC2 §8.3.2',
    },
    {
      label: 'Self-weight',
      formula: 'sw = (h/1000) × 24',
      working: `= (${thickness}/1000) × 24`,
      result: `${n(sw, 2)} kN/m²`,
      ref: 'EC2 §5.1.3',
    },
    {
      label: 'Design load (ULS)',
      formula: 'wEd = γG·(sw + gk) + γQ·qk',
      working: `= ${n(γG)}×(${n(sw,2)} + ${deadLoad}) + ${n(γQ)}×${liveLoad}`,
      result: `${n(res.wEd, 2)} kN/m²`,
      ref: 'EN 1990 Eq. 6.10',
    },
    {
      label: 'Span/depth deflection check',
      formula: `λact = lx×1000/d ≤ ${ldLimit}  [${inp.interiorCol ? 'interior' : 'edge'} column, EC2 §7.4 flat slab]`,
      working: `= ${lx} × 1000 / ${n(res.d,1)}`,
      result: `${n(res.spanRatio, 1)}`,
      ref: 'EC2 §7.4.2 / §9.4',
      status: res.deflectionOK ? 'ok' : 'warn',
      note: res.deflectionOK ? `Pass ✓ (≤ ${ldLimit})` : `Fail ✗ (> ${ldLimit})`,
    },

    { heading: '2. Total Static Moment & Distribution' },
    {
      label: 'Total static moment M0',
      formula: 'M0 = wEd · ly · lx² / 8',
      working: `= ${n(res.wEd,2)} × ${ly} × ${lx}² / 8`,
      result: `${n(M0, 2)} kNm`,
      ref: 'EC2 Annex I §I.1.2',
    },
    {
      label: 'Hogging / sagging split',
      formula: 'M_neg = 0.65·M0,  M_pos = 0.35·M0',
      working: `= 0.65×${n(M0,2)},  0.35×${n(M0,2)}`,
      result: `M_neg = ${n(0.65*M0,2)} kNm,  M_pos = ${n(0.35*M0,2)} kNm`,
      ref: 'EC2 Annex I Table I.1',
    },
    {
      label: 'Column strip width',
      formula: 'cs_width = min(lx, ly)',
      working: `= min(${lx}, ${ly})`,
      result: `${n(cs_width, 2)} m`,
      ref: 'EC2 Annex I §I.1.2',
    },
    {
      label: 'Column strip hogging moment',
      formula: 'Med,cs,neg = 0.65 · M_neg / cs_width',
      working: `= 0.65 × ${n(0.65*M0,2)} / ${n(cs_width,2)}`,
      result: `${n(res.Med_cs_neg, 2)} kNm/m`,
      ref: 'EC2 Annex I Table I.1',
    },
    {
      label: 'Column strip sagging moment',
      formula: 'Med,cs,pos = 0.55 · M_pos / cs_width',
      working: `= 0.55 × ${n(0.35*M0,2)} / ${n(cs_width,2)}`,
      result: `${n(res.Med_cs_pos, 2)} kNm/m`,
      ref: 'EC2 Annex I Table I.1',
    },
    {
      label: 'Middle strip width',
      formula: 'ms_width = max(|lx−ly|, 0.5·min(lx,ly))',
      working: `= max(|${lx}−${ly}|, 0.5×${n(Math.min(lx,ly),2)})`,
      result: `${n(ms_width, 2)} m`,
      ref: 'EC2 Annex I §I.1.2',
    },
    {
      label: 'Middle strip sagging moment',
      formula: 'Med,ms,pos = 0.45 · M_pos / ms_width',
      working: `= 0.45 × ${n(0.35*M0,2)} / ${n(ms_width,2)}`,
      result: `${n(res.Med_ms_pos, 2)} kNm/m`,
      ref: 'EC2 Annex I Table I.1',
    },

    { heading: '3. Reinforcement' },
    {
      label: 'Column strip top steel required',
      formula: 'As = Med,cs,neg / (fyd · z)',
      working: `K = ${n((res.Med_cs_neg*1e6)/(fck*1000*res.d*res.d),4)},  z ≈ 0.9d`,
      result: `${n0(res.As_cs_top)} mm²/m`,
      ref: 'EC2 §9.2.1.1(1)',
    },
    {
      label: 'Column strip top bars provided',
      formula: `T${res.bars_cs_top.dia} @ ${res.bars_cs_top.spacing} mm`,
      working: `As,prov = ${n0(res.bars_cs_top.As)} mm²/m`,
      result: `${n0(res.bars_cs_top.As)} mm²/m`,
      ref: '',
      status: res.bars_cs_top.As >= res.As_cs_top ? 'ok' : 'fail',
      note: res.bars_cs_top.As >= res.As_cs_top ? 'Adequate ✓' : 'Insufficient ✗',
    },
    {
      label: 'Column strip bottom steel required',
      formula: 'As = Med,cs,pos / (fyd · z)',
      working: `K = ${n((res.Med_cs_pos*1e6)/(fck*1000*res.d*res.d),4)},  z ≈ 0.9d`,
      result: `${n0(res.As_cs_bot)} mm²/m`,
      ref: 'EC2 §9.2.1.1(1)',
    },
    {
      label: 'Column strip bottom bars provided',
      formula: `T${res.bars_cs_bot.dia} @ ${res.bars_cs_bot.spacing} mm`,
      working: `As,prov = ${n0(res.bars_cs_bot.As)} mm²/m`,
      result: `${n0(res.bars_cs_bot.As)} mm²/m`,
      ref: '',
      status: res.bars_cs_bot.As >= res.As_cs_bot ? 'ok' : 'fail',
      note: res.bars_cs_bot.As >= res.As_cs_bot ? 'Adequate ✓' : 'Insufficient ✗',
    },
    {
      label: 'Middle strip bottom steel required',
      formula: 'As = Med,ms,pos / (fyd · z)',
      working: `K = ${n((res.Med_ms_pos*1e6)/(fck*1000*res.d*res.d),4)},  z ≈ 0.9d`,
      result: `${n0(res.As_ms_bot)} mm²/m`,
      ref: 'EC2 §9.2.1.1(1)',
    },
    {
      label: 'Middle strip bottom bars provided',
      formula: `T${res.bars_ms_bot.dia} @ ${res.bars_ms_bot.spacing} mm`,
      working: `As,prov = ${n0(res.bars_ms_bot.As)} mm²/m`,
      result: `${n0(res.bars_ms_bot.As)} mm²/m`,
      ref: '',
      status: res.bars_ms_bot.As >= res.As_ms_bot ? 'ok' : 'fail',
      note: res.bars_ms_bot.As >= res.As_ms_bot ? 'Adequate ✓' : 'Insufficient ✗',
    },

    { heading: '4. Punching Shear Check' },
    {
      label: 'Punching load',
      formula: `VEd = wEd · lx · ly × ${inp.interiorCol ? '1.0 (interior)' : '0.5 (edge)'}`,
      working: `= ${n(res.wEd,2)} × ${lx} × ${ly} × ${inp.interiorCol ? 1.0 : 0.5}`,
      result: `${n(res.VEd, 1)} kN`,
      ref: 'EC2 §6.4.3',
    },
    {
      label: 'Control perimeter u1',
      formula: 'u1 = 2(cx+cy) + 2π·2d  at 2d from column face',
      working: `= 2(${columnCx}+${columnCy}) + 2π × 2 × ${n(res.d,1)}`,
      result: `${n0(res.u1)} mm`,
      ref: 'EC2 §6.4.2',
    },
    {
      label: 'Punching shear stress',
      formula: `vEd = β·VEd / (u1·d)  [β = ${β} — ${inp.interiorCol ? 'interior' : 'edge'} column]`,
      working: `= ${β} × ${n(res.VEd,1)}×10³ / (${n0(res.u1)} × ${n(res.d,1)})`,
      result: `${n(res.vEd, 4)} N/mm²`,
      ref: 'EC2 §6.4.3',
    },
    {
      label: 'Concrete punching resistance',
      formula: 'vRd,c = (0.18/γc)·k·(100·ρl·fck)^(1/3)',
      working: `γc = ${n(γc,2)}, k = min(1+√(200/d), 2.0), ρl from provided top steel`,
      result: `${n(res.vRdc, 4)} N/mm²`,
      ref: 'EC2 §6.4.4 Eq. 6.47',
    },
    {
      label: 'Punching shear check',
      formula: 'vEd ≤ vRd,c',
      working: `${n(res.vEd,4)} ${res.punchingOK ? '≤' : '>'} ${n(res.vRdc,4)} N/mm²`,
      result: res.punchingOK ? 'Pass ✓' : 'Fail ✗ — shear studs or thicker slab',
      ref: 'EC2 §6.4.4',
      status: res.punchingOK ? 'ok' : 'fail',
    },
  ];
}
