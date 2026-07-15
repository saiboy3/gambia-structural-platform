/**
 * calcNotes.ts
 * Generates step-by-step calculation breakdowns for QA/QC.
 * Each function takes the design inputs + results and returns CalcStep[].
 * References are tailored to the active building code.
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { BeamInputs, BeamResults, ColumnInputs, ColumnResults,
              SlabInputs, SlabResults, FoundationInputs, FoundationResults } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { barArea } from './materials';

// ── Code-aware reference lookup ───────────────────────────────────────────────

function r(code: string, ec2: string, bs: string, aci: string, ibc = aci): string {
  if (code === 'EC2')    return ec2;
  if (code === 'BS8110') return bs;
  if (code === 'IBC')    return ibc;
  return aci;
}

// ── Number formatting helpers ─────────────────────────────────────────────────
const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

// ── BEAM calc notes ───────────────────────────────────────────────────────────
export function beamCalcNotes(
  inp: BeamInputs,
  res: BeamResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const code = cf.code ?? 'EC2';
  const γG   = cf.gammaG ?? 1.35;
  const γQ   = cf.gammaQ ?? 1.50;
  const γc   = cf.gammaC ?? 1.50;
  const { fck, fcd, fyk, fyd, Ec } = inp.material;
  const { span: L, width: bw, depth: h, cover: c, deadLoad: gk, liveLoad: qk } = inp;
  const { d, x, Med, Ved, AsReq, AsProvMin, AsProvMax, mainBars, stirrups } = res;

  const wd = γG * gk + γQ * qk;
  const mFac = inp.supportType === 'cantilever' ? 2 : inp.supportType === 'continuous' ? 10 : 8;
  const vFac = inp.supportType === 'cantilever' ? 1 : inp.supportType === 'continuous' ? (1/0.6) : 2;
  const K     = (Med * 1e6) / (fck * bw * d * d);
  const Kbal  = 0.167;
  const zCalc = d * (0.5 + Math.sqrt(Math.max(0, 0.25 - K / 1.134)));
  const z     = Math.min(zCalc, 0.95 * d);
  const ρl    = Math.min(mainBars.As / (bw * d), 0.02);
  const k     = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc  = (0.18 / γc) * k * (100 * ρl * fck) ** (1/3) * bw * d / 1000;

  const isT = !!(inp as any).flange;

  const steps: CalcStep[] = [
    // ── 1. Materials ─────────────────────────────────────────────────────
    { heading: '1. Material Properties' },
    {
      label: 'Characteristic concrete strength',
      formula: 'fck — cylinder compressive strength',
      working: `fck = ${fck} MPa  (${inp.material.concrete})`,
      result: `${fck} MPa`,
      ref: r(code, 'EC2 §3.1.2 Table 3.1', 'BS8110 §2.4.2', 'ACI 318 §19.2.1.1', 'ACI 318 §19.2.1.1'),
    },
    {
      label: 'Design concrete strength',
      formula: code === 'BS8110'
        ? 'fcd = 0.67 · fcu / γc'
        : 'fcd = αcc · fck / γc  (αcc = 0.85)',
      working: code === 'BS8110'
        ? `= 0.67 × ${n(fck * 1.25, 0)} / 1.5`
        : `= 0.85 × ${fck} / ${n(γc, 2)}`,
      result: `${n(fcd, 1)} MPa`,
      ref: r(code, 'EC2 §3.1.6(1)', 'BS8110 §3.4.4.1', 'ACI 318 §22.2.2.4.1', 'ACI 318 §22.2.2.4.1'),
    },
    {
      label: 'Concrete elastic modulus',
      formula: 'Ecm — mean secant modulus',
      working: `Ecm = ${n0(Ec)} MPa`,
      result: `${n0(Ec)} MPa`,
      ref: r(code, 'EC2 §3.1.3 Table 3.1', 'BS8110 §2.5', 'ACI 318 §19.2.2', 'ACI 318 §19.2.2'),
    },
    {
      label: 'Characteristic rebar strength',
      formula: 'fyk — characteristic yield strength',
      working: `fyk = ${fyk} MPa  (${inp.material.rebar})`,
      result: `${fyk} MPa`,
      ref: r(code, 'EC2 §3.2.2(3)', 'BS8110 §3.4.4.1', 'ACI 318 §20.2.2.4', 'ACI 318 §20.2.2.4'),
    },
    {
      label: 'Design steel strength',
      formula: code === 'ACI318' || code === 'IBC'
        ? 'fyd = φ · fyk  (φ = 0.90 bending)'
        : 'fyd = fyk / γs',
      working: code === 'ACI318' || code === 'IBC'
        ? `= 0.90 × ${fyk}`
        : `= ${fyk} / 1.15`,
      result: `${n(fyd, 1)} MPa`,
      ref: r(code, 'EC2 §3.2.7(2)', 'BS8110 §2.4.4', 'ACI 318 §21.2.1', 'ACI 318 §21.2.1'),
    },

    // ── 2. Design Actions ─────────────────────────────────────────────────
    { heading: '2. Design Actions (ULS)' },
    {
      label: 'Design load combination',
      formula: 'wEd = γG · gk + γQ · qk',
      working: `= ${n(γG)} × ${gk} + ${n(γQ)} × ${qk}`,
      result: `${n(wd)} kN/m`,
      ref: r(code, 'EN 1990 Eq. 6.10', 'BS8110 Table 2.1', 'ASCE 7-22 §2.3.1 C2', 'ASCE 7-22 §2.3.1 C2'),
    },
    {
      label: 'Design moment (MEd)',
      formula: `MEd = wEd · L² / ${mFac}  [${inp.supportType}]`,
      working: `= ${n(wd)} × ${L}² / ${mFac}`,
      result: `${n(Med)} kNm`,
      ref: r(code, 'EC2 §5.4', 'BS8110 §3.4.3.2', 'ACI 318 §6.5', 'ACI 318 §6.5'),
    },
    {
      label: 'Design shear (VEd)',
      formula: `VEd = wEd · L / ${n(vFac)}`,
      working: `= ${n(wd)} × ${L} / ${n(vFac)}`,
      result: `${n(Ved)} kN`,
      ref: r(code, 'EC2 §6.2', 'BS8110 §3.4.5', 'ACI 318 §9.4.3', 'ACI 318 §9.4.3'),
    },

    // ── 3. Section Geometry ───────────────────────────────────────────────
    { heading: '3. Section Geometry' },
    {
      label: 'Overall depth',
      formula: 'h — as specified',
      working: `h = ${h} mm`,
      result: `${h} mm`,
      ref: '',
    },
    {
      label: 'Nominal cover',
      formula: 'c — to link reinforcement',
      working: `c = ${c} mm`,
      result: `${c} mm`,
      ref: r(code, 'EC2 §4.4.1 / Gambia XC3', 'BS8110 §3.3.1.2', 'ACI 318 §20.6.1', 'ACI 318 §20.6.1'),
    },
    {
      label: 'Effective depth',
      formula: 'd = h − c − φlink − φbar / 2',
      working: `= ${h} − ${c} − 10 − 10  (T10 links, T20 bars assumed)`,
      result: `${n0(d)} mm`,
      ref: r(code, 'EC2 §8.3.2', 'BS8110 §3.3.7', 'ACI 318 §20.6.1.3', 'ACI 318 §20.6.1.3'),
    },
    ...(isT ? [
      {
        label: 'Effective flange width',
        formula: 'beff — user-defined flanged section',
        working: `bf = ${(inp as any).flange?.width ?? '—'} mm,  hf = ${(inp as any).flange?.thickness ?? '—'} mm`,
        result: `${(res as any).bEff ?? '—'} mm`,
        ref: r(code, 'EC2 §5.3.2.1', 'BS8110 §3.4.1.5', 'ACI 318 §6.3.2', 'ACI 318 §6.3.2'),
      },
    ] : []),

    // ── 4. Bending Design ─────────────────────────────────────────────────
    { heading: '4. Bending Design' },
    {
      label: 'Moment capacity parameter',
      formula: 'K = MEd / (fck · bw · d²)',
      working: `= ${n(Med)}×10⁶ / (${fck} × ${bw} × ${n0(d)}²)`,
      result: `K = ${n(K, 4)}`,
      ref: r(code, 'EC2 Appendix B / §3.1.7', 'BS8110 §3.4.4.4', 'ACI 318 §22.2', 'ACI 318 §22.2'),
    },
    {
      label: 'Balanced moment limit',
      formula: 'Kbal = 0.167  (xu/d ≤ 0.45 per EC2)',
      working: K <= Kbal
        ? `K = ${n(K, 4)} ≤ 0.167  →  singly reinforced ✓`
        : `K = ${n(K, 4)} > 0.167  →  section requires compression steel`,
      result: K <= Kbal ? 'Pass' : 'Revise',
      ref: r(code, 'EC2 §5.5(4)', 'BS8110 §3.4.4.4', 'ACI 318 §9.3.3.1', 'ACI 318 §9.3.3.1'),
      status: K <= Kbal ? 'ok' : 'warn',
    },
    {
      label: 'Lever arm',
      formula: 'z = d · [0.5 + √(0.25 − K / 1.134)]  ≤ 0.95d',
      working: `= ${n0(d)} · [0.5 + √(0.25 − ${n(K,4)} / 1.134)] → min(${n(zCalc,1)}, ${n(0.95*d,1)})`,
      result: `${n(z, 1)} mm`,
      ref: r(code, 'EC2 Eq. C.4', 'BS8110 §3.4.4.4', 'ACI 318 §22.2.2.4.2', 'ACI 318 §22.2.2.4.2'),
    },
    {
      label: 'Required tension steel',
      formula: 'As,req = MEd / (fyd · z)',
      working: `= ${n(Med)}×10⁶ / (${n(fyd,1)} × ${n(z,1)})`,
      result: `${n0(AsReq)} mm²`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.4.4', 'ACI 318 §22.2.2', 'ACI 318 §22.2.2'),
    },
    {
      label: 'Neutral axis depth',
      formula: 'x = As,req · fyd / (0.8 · bw · fcd)',
      working: `= ${n0(AsReq)} × ${n(fyd,1)} / (0.8 × ${bw} × ${n(fcd,1)})`,
      result: `${n(x, 1)} mm`,
      ref: r(code, 'EC2 §3.1.7', 'BS8110 §3.4.4.4', 'ACI 318 §22.2.2.4.1', 'ACI 318 §22.2.2.4.1'),
      note: `x/d = ${n(x/d, 3)} ${x/d <= 0.45 ? '≤ 0.45  ✓' : '> 0.45  ✗ section over-reinforced'}`,
      status: x/d <= 0.45 ? 'ok' : 'fail',
    },

    // ── 5. Reinforcement Limits ───────────────────────────────────────────
    { heading: '5. Reinforcement Limits' },
    {
      label: 'Minimum steel area',
      formula: 'As,min = max(0.26·√fck/500·bw·d,  0.0013·bw·d)',
      working: `= max(${n(0.26*(fck**0.5)/500*bw*d,0)},  ${n(0.0013*bw*d,0)})`,
      result: `${n0(AsProvMin)} mm²`,
      ref: r(code, 'EC2 §9.2.1.1(1)', 'BS8110 §3.12.5.3', 'ACI 318 §9.6.1.2', 'ACI 318 §9.6.1.2'),
    },
    {
      label: 'Maximum steel area',
      formula: 'As,max = 0.04 · bw · h',
      working: `= 0.04 × ${bw} × ${h}`,
      result: `${n0(AsProvMax)} mm²`,
      ref: r(code, 'EC2 §9.2.1.1(3)', 'BS8110 §3.12.6.1', 'ACI 318 §9.6.1.2', 'ACI 318 §9.6.1.2'),
    },
    {
      label: 'Steel provided',
      formula: `${mainBars.count} × T${mainBars.dia} bars`,
      working: `As,prov = ${mainBars.count} × π/4 × ${mainBars.dia}² = ${n0(mainBars.As)} mm²`,
      result: `${n0(mainBars.As)} mm²`,
      ref: '',
      note: mainBars.As >= AsReq
        ? `As,prov (${n0(mainBars.As)}) ≥ As,req (${n0(AsReq)}) ✓`
        : `As,prov (${n0(mainBars.As)}) < As,req (${n0(AsReq)}) ✗`,
      status: mainBars.As >= AsReq ? 'ok' : 'fail',
    },

    // ── 6. Shear Design ──────────────────────────────────────────────────
    { heading: '6. Shear Design' },
    {
      label: 'Longitudinal steel ratio',
      formula: 'ρl = As,prov / (bw · d)  ≤ 0.02',
      working: `= ${n0(mainBars.As)} / (${bw} × ${n0(d)})`,
      result: `${n(ρl, 4)}`,
      ref: r(code, 'EC2 §6.2.2(1)', 'BS8110 §3.4.5.4', 'ACI 318 §22.5.5', 'ACI 318 §22.5.5'),
    },
    {
      label: 'Size effect factor',
      formula: 'k = 1 + √(200/d)  ≤ 2.0',
      working: `= 1 + √(200/${n0(d)}) = ${n(1+Math.sqrt(200/d),3)} → min(${n(1+Math.sqrt(200/d),3)}, 2.0)`,
      result: `${n(k, 3)}`,
      ref: r(code, 'EC2 Eq. 6.2a', 'BS8110 §3.4.5.4', 'ACI 318 §22.5.5.1', 'ACI 318 §22.5.5.1'),
    },
    {
      label: 'Concrete shear resistance',
      formula: 'VRd,c = (0.18/γc) · k · (100·ρl·fck)^(1/3) · bw · d',
      working: `= (0.18/${n(γc)}) × ${n(k,3)} × (100 × ${n(ρl,4)} × ${fck})^(1/3) × ${bw} × ${n0(d)} / 1000`,
      result: `${n(vRdc)} kN`,
      ref: r(code, 'EC2 Eq. 6.2a', 'BS8110 §3.4.5.4', 'ACI 318 §22.5.5.1', 'ACI 318 §22.5.5.1'),
    },
    {
      label: 'Shear capacity check',
      formula: 'VEd vs VRd,c',
      working: `${n(Ved)} kN ${Ved <= vRdc ? '≤' : '>'} ${n(vRdc)} kN`,
      result: Ved <= vRdc ? 'No links req.' : 'Links required',
      ref: r(code, 'EC2 §6.2.2', 'BS8110 §3.4.5.3', 'ACI 318 §9.6.3', 'ACI 318 §9.6.3'),
      status: ved_ok(res) ? 'ok' : 'warn',
      note: `Stirrups: T${stirrups.dia}@${stirrups.spacing} mm (${stirrups.legs} legs)`,
    },

    // ── 7. Deflection ─────────────────────────────────────────────────────
    { heading: '7. Deflection Check — Simplified Span/d Method' },
    {
      label: 'Actual span/d ratio',
      formula: 'λact = L × 1000 / d',
      working: `= ${L} × 1000 / ${n0(d)}`,
      result: `${n((L*1000)/d, 1)}`,
      ref: r(code, 'EC2 §7.4.2', 'BS8110 §3.4.6', 'ACI 318 Table 9.3.1.1', 'ACI 318 Table 9.3.1.1'),
    },
    {
      label: 'Span/d limit',
      formula: 'λlim = base ratio × √(fck/25)',
      working: `= ${inp.supportType === 'cantilever' ? (cf.spanDepthCantilever??8) : inp.supportType === 'continuous' ? (cf.spanDepthContinuous??26) : (cf.spanDepthSimple??20)} × √(${fck}/25)`,
      result: `${n(((inp.supportType === 'cantilever' ? (cf.spanDepthCantilever??8) : inp.supportType === 'continuous' ? (cf.spanDepthContinuous??26) : (cf.spanDepthSimple??20)) * Math.sqrt(fck/25)), 1)}`,
      ref: r(code, 'EC2 Table 7.4N', 'BS8110 Table 3.9', 'ACI 318 Table 9.3.1.1', 'ACI 318 Table 9.3.1.1'),
    },
    {
      label: 'Deflection check',
      formula: 'λact ≤ λlim',
      working: `${n((L*1000)/d,1)} ${res.deflectionOK ? '≤' : '>'} ${n(((inp.supportType === 'cantilever' ? (cf.spanDepthCantilever??8) : inp.supportType === 'continuous' ? (cf.spanDepthContinuous??26) : (cf.spanDepthSimple??20)) * Math.sqrt(fck/25)),1)}`,
      result: res.deflectionOK ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC2 §7.4.1', 'BS8110 §3.4.6.3', 'ACI 318 §24.2', 'ACI 318 §24.2'),
      status: res.deflectionOK ? 'ok' : 'warn',
    },

    // ── 8. Crack Width (SLS) ──────────────────────────────────────────────
    { heading: '8. Crack Width Check (SLS) — EC2 §7.3.4' },
    {
      label: 'SLS moment (characteristic)',
      formula: 'Mek = (gk + qk) · L² / mFac',
      working: `= (${gk} + ${qk}) × ${L}² / ${mFac}`,
      result: `${n((gk+qk)*L*L/mFac)} kNm`,
      ref: r(code, 'EC2 §7.3.4 / EN1990 §6.5.3', 'BS8110 §3.3', 'ACI 318 §24.3', 'ACI 318 §24.3'),
    },
    {
      label: 'Concrete mean tensile strength',
      formula: 'fctm = 0.30 · fck^(2/3)',
      working: `= 0.30 × ${fck}^(2/3)`,
      result: `${n(0.30 * fck**(2/3))} MPa`,
      ref: r(code, 'EC2 Table 3.1', 'BS8110 §3.8', 'ACI 318 §19.2.3', 'ACI 318 §19.2.3'),
    },
    {
      label: 'Crack width (wk)',
      formula: 'wk = sr,max · (εsm − εcm)',
      working: `Calculated per EC2 Eq. 7.8 / 7.11`,
      result: `${n((res as any).crackWidth ?? 0, 3)} mm`,
      ref: r(code, 'EC2 §7.3.4 Eq. 7.8', 'BS8110 §3.8', 'ACI 318 §24.3', 'ACI 318 §24.3'),
      note: `wmax = 0.300 mm (Exposure class XC1/XC2 — Gambia interior/exterior)`,
      status: (res as any).crackOK ? 'ok' : 'warn',
    },
    {
      label: 'Crack check',
      formula: 'wk ≤ wmax',
      working: `${n((res as any).crackWidth ?? 0, 3)} mm ${(res as any).crackOK ? '≤' : '>'} 0.300 mm`,
      result: (res as any).crackOK ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC2 Table 7.1N', 'BS8110 §3.8', 'ACI 318 §24.3.2', 'ACI 318 §24.3.2'),
      status: (res as any).crackOK ? 'ok' : 'warn',
    },
  ];

  return steps;
}

function ved_ok(res: BeamResults) { return res.shearOK; }

// ── SLAB calc notes ───────────────────────────────────────────────────────────
export function slabCalcNotes(
  inp: SlabInputs,
  res: SlabResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const code = cf.code ?? 'EC2';
  const γG   = cf.gammaG ?? 1.35;
  const γQ   = cf.gammaQ ?? 1.50;
  const { fck, fcd, fyk, fyd } = inp.material;
  const { lx, ly, thickness: h, cover: c, deadLoad: gk, liveLoad: qk } = inp;
  const { Med_x, Med_y, As_x, As_y, d, barsX, barsY } = res;

  const wd  = γG * gk + γQ * qk;
  const r_  = Math.min(ly / lx, 2.0);

  return [
    { heading: '1. Material Properties' },
    {
      label: 'Concrete / rebar',
      formula: 'fck / fyk',
      working: `fck = ${fck} MPa (${inp.material.concrete}),  fyk = ${fyk} MPa (${inp.material.rebar})`,
      result: `fcd = ${n(fcd,1)} MPa,  fyd = ${n(fyd,1)} MPa`,
      ref: r(code, 'EC2 §3.1.2 / §3.2.7', 'BS8110 §2.4.2–§2.4.4', 'ACI 318 §19.2 / §20.2', 'ACI 318 §19.2 / §20.2'),
    },

    { heading: '2. Geometry' },
    {
      label: 'Slab panel',
      formula: `lx (short span) = ${lx} m,  ly (long span) = ${ly} m`,
      working: `Ratio r = ly/lx = ${ly}/${lx} = ${n(ly/lx, 2)}  →  ${inp.type === 'two-way' ? 'Two-way' : 'One-way'} slab`,
      result: `r = ${n(r_,2)}`,
      ref: r(code, 'EC2 §5.3.1', 'BS8110 §3.5.1', 'ACI 318 §8.3.1', 'ACI 318 §8.3.1'),
    },
    {
      label: 'Effective depth',
      formula: 'd = h − c − φbar/2',
      working: `= ${h} − ${c} − 6  (T12 bars assumed)`,
      result: `${n0(d)} mm`,
      ref: r(code, 'EC2 §8.3.2', 'BS8110 §3.3.7', 'ACI 318 §20.6.1', 'ACI 318 §20.6.1'),
    },

    { heading: '3. Design Actions (ULS)' },
    {
      label: 'Design UDL',
      formula: 'wEd = γG · gk + γQ · qk',
      working: `= ${n(γG)} × ${gk} + ${n(γQ)} × ${qk}`,
      result: `${n(wd)} kN/m²`,
      ref: r(code, 'EN 1990 Eq. 6.10', 'BS8110 Table 2.1', 'ASCE 7-22 §2.3.1 C2', 'ASCE 7-22 §2.3.1 C2'),
    },
    {
      label: 'Short-span design moment',
      formula: inp.type === 'two-way'
        ? 'MEd,x = αsx · wEd · lx²'
        : `MEd,x = wEd · lx² / ${inp.edgeCondition === 'cantilever' ? 2 : inp.edgeCondition === 'continuous-all' ? 10 : 8}`,
      working: `= ${n(Med_x / (wd * lx * lx), 3)} × ${n(wd)} × ${lx}²`,
      result: `${n(Med_x)} kNm/m`,
      ref: r(code, inp.type === 'two-way' ? 'BS 8110 Table 3.14 (per EC2 §5.3.1)' : 'EC2 §5.4', 'BS8110 §3.5.3 Table 3.14', 'ACI 318 §8.5', 'ACI 318 §8.5'),
    },
    {
      label: 'Long-span design moment',
      formula: 'MEd,y = αsy · wEd · lx²',
      working: `= ${n(Med_y / (wd * lx * lx), 3)} × ${n(wd)} × ${lx}²`,
      result: `${n(Med_y)} kNm/m`,
      ref: r(code, 'BS 8110 Table 3.14 (per EC2 §5.3.1)', 'BS8110 §3.5.3 Table 3.14', 'ACI 318 §8.5', 'ACI 318 §8.5'),
    },

    { heading: '4. Steel Design' },
    {
      label: 'Short-span steel (per metre)',
      formula: 'As,x = MEd,x / (fyd · 0.9 · d)',
      working: `= ${n(Med_x)}×10⁶ / (${n(fyd,1)} × 0.9 × ${n0(d)})`,
      result: `${n0(As_x)} mm²/m`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.5.4', 'ACI 318 §22.2', 'ACI 318 §22.2'),
    },
    {
      label: 'Bars provided (short span)',
      formula: `T${barsX.dia} @ ${barsX.spacing} mm`,
      working: `As = π/4 × ${barsX.dia}² / ${barsX.spacing} × 1000 = ${n0(barsX.As)} mm²/m`,
      result: `${n0(barsX.As)} mm²/m`,
      ref: '',
      status: barsX.As >= As_x ? 'ok' : 'fail',
      note: `${barsX.As >= As_x ? '✓ Adequate' : '✗ Insufficient'}  (req. ${n0(As_x)} mm²/m)`,
    },
    {
      label: 'Long-span steel (per metre)',
      formula: 'As,y = MEd,y / (fyd · 0.9 · d)',
      working: `= ${n(Med_y)}×10⁶ / (${n(fyd,1)} × 0.9 × ${n0(d)})`,
      result: `${n0(As_y)} mm²/m`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.5.4', 'ACI 318 §22.2', 'ACI 318 §22.2'),
    },
    {
      label: 'Bars provided (long span)',
      formula: `T${barsY.dia} @ ${barsY.spacing} mm`,
      working: `As = π/4 × ${barsY.dia}² / ${barsY.spacing} × 1000 = ${n0(barsY.As)} mm²/m`,
      result: `${n0(barsY.As)} mm²/m`,
      ref: '',
      status: barsY.As >= As_y ? 'ok' : 'fail',
      note: `${barsY.As >= As_y ? '✓ Adequate' : '✗ Insufficient'}  (req. ${n0(As_y)} mm²/m)`,
    },

    { heading: '5. Deflection Check (Span/d)' },
    {
      label: 'Span/d actual',
      formula: 'λact = lx × 1000 / d',
      working: `= ${lx} × 1000 / ${n0(d)}`,
      result: n(res.spanRatio, 1),
      ref: r(code, 'EC2 §7.4.2', 'BS8110 §3.4.6', 'ACI 318 Table 9.3.1.1', 'ACI 318 Table 9.3.1.1'),
    },
    {
      label: 'Deflection check',
      formula: 'λact ≤ λlim',
      working: `${n(res.spanRatio,1)} ${res.deflectionOK ? '≤' : '>'} limit`,
      result: res.deflectionOK ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC2 §7.4.1', 'BS8110 §3.4.6.3', 'ACI 318 §24.2', 'ACI 318 §24.2'),
      status: res.deflectionOK ? 'ok' : 'warn',
    },
  ];
}

// ── COLUMN calc notes ─────────────────────────────────────────────────────────
export function columnCalcNotes(
  inp: ColumnInputs,
  res: ColumnResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const code = cf.code ?? 'EC2';
  const { fck, fcd, fyk, fyd } = inp.material;
  const { b, h, height, Ned, Medy } = inp;
  const Ac = inp.shape === 'circular' ? Math.PI * b * b / 4 : b * h;
  const lo = height * 1000 * (inp.braced ? 0.7 : 1.0);
  const e0 = Math.max(lo / 400, 20);

  return [
    { heading: '1. Material Properties' },
    {
      label: 'fck / fyk',
      formula: '',
      working: `fck = ${fck} MPa,  fyk = ${fyk} MPa`,
      result: `fcd = ${n(fcd,1)} MPa,  fyd = ${n(fyd,1)} MPa`,
      ref: r(code, 'EC2 §3.1.2 / §3.2.7', 'BS8110 §2.4.2', 'ACI 318 §19.2 / §20.2', 'ACI 318 §19.2 / §20.2'),
    },

    { heading: '2. Section Geometry & Slenderness' },
    {
      label: 'Gross area',
      formula: inp.shape === 'circular' ? 'Ac = π · b² / 4' : 'Ac = b · h',
      working: inp.shape === 'circular'
        ? `= π × ${b}² / 4`
        : `= ${b} × ${h}`,
      result: `${n0(Ac)} mm²`,
      ref: '',
    },
    {
      label: 'Effective (buckling) length',
      formula: inp.braced ? 'l₀ = 0.7 · L  (braced frame)' : 'l₀ = 1.0 · L  (unbraced)',
      working: `= ${inp.braced ? '0.7' : '1.0'} × ${height * 1000}  mm`,
      result: `${n0(lo)} mm`,
      ref: r(code, 'EC2 §5.8.3.2 Table 5.1', 'BS8110 §3.8.1.6', 'ACI 318 §6.2.5', 'ACI 318 §6.2.5'),
    },
    {
      label: 'Slenderness ratio λy',
      formula: 'λ = l₀ / i  where i = b / √12',
      working: `i = ${b} / √12 = ${n(b/Math.sqrt(12),1)} mm  →  λ = ${n0(lo)} / ${n(b/Math.sqrt(12),1)}`,
      result: `λ = ${n(res.slendernessY, 1)}`,
      ref: r(code, 'EC2 §5.8.3.1 Eq. 5.14', 'BS8110 §3.8.1.3', 'ACI 318 §6.2.5', 'ACI 318 §6.2.5'),
      note: `λlim = 20 (simplified EC2 §5.8.3.1).  ${res.isSlender ? '⚠ Slender — second-order effects apply' : '✓ Short column'}`,
      status: res.isSlender ? 'warn' : 'ok',
    },

    { heading: '3. Design Actions' },
    {
      label: 'Axial load (NEd)',
      formula: 'NEd — as applied',
      working: `NEd = ${Ned} kN`,
      result: `${Ned} kN`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.8.2', 'ACI 318 §22.4', 'ACI 318 §22.4'),
    },
    {
      label: 'Minimum eccentricity',
      formula: 'e₀ = max(l₀/400, 20 mm)',
      working: `= max(${n0(lo)}/400, 20) = max(${n(lo/400,1)}, 20)`,
      result: `${n(e0,1)} mm`,
      ref: r(code, 'EC2 §6.1(4)', 'BS8110 §3.8.2.4', 'ACI 318 §22.4.2.1', 'ACI 318 §22.4.2.1'),
    },
    {
      label: 'Effective moment y-axis',
      formula: 'MEd,eff = max(MEdy, NEd · e₀)',
      working: `= max(${Medy}×10⁶, ${Ned*1000} × ${n(e0,1)}) Nmm`,
      result: `${n(Math.max(Medy*1e6, Ned*1000*e0)/1e6)} kNm`,
      ref: r(code, 'EC2 §6.1(4)', 'BS8110 §3.8.2.4', 'ACI 318 §22.4.2', 'ACI 318 §22.4.2'),
    },

    { heading: '4. Required Steel' },
    {
      label: 'Section pure compression capacity',
      formula: 'Nud = fcd · Ac',
      working: `= ${n(fcd,1)} × ${n0(Ac)}`,
      result: `${n(fcd*Ac/1000,1)} kN`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.8.4', 'ACI 318 §22.4.2.2', 'ACI 318 §22.4.2.2'),
    },
    {
      label: 'Required steel area',
      formula: 'As,req = max((NEd − 0.8·Nud)/fyd + M/(0.9·d·fyd), As,min)',
      working: `Combined biaxial interaction — see EC2 §6.1 interaction diagram`,
      result: `${n0(res.AsReq)} mm²`,
      ref: r(code, 'EC2 §5.8.8 / §6.1', 'BS8110 §3.8.4', 'ACI 318 §22.4', 'ACI 318 §22.4'),
    },
    {
      label: 'Minimum steel',
      formula: 'As,min = max(0.1·NEd/fyd,  0.002·Ac)',
      working: `= max(${n(0.1*Ned*1000/fyd,0)},  ${n(0.002*Ac,0)})`,
      result: `${n0(res.minAs)} mm²`,
      ref: r(code, 'EC2 §9.5.2(2)', 'BS8110 §3.12.5.3', 'ACI 318 §10.6.1.1', 'ACI 318 §10.6.1.1'),
    },
    {
      label: 'Maximum steel',
      formula: 'As,max = 0.04 · Ac',
      working: `= 0.04 × ${n0(Ac)}`,
      result: `${n0(res.maxAs)} mm²`,
      ref: r(code, 'EC2 §9.5.2(3)', 'BS8110 §3.12.6.2', 'ACI 318 §10.6.1.1', 'ACI 318 §10.6.1.1'),
    },
    {
      label: 'Steel provided',
      formula: `${res.mainBars.count} × T${res.mainBars.dia}`,
      working: `As,prov = ${res.mainBars.count} × ${n(barArea(res.mainBars.dia),1)} = ${n0(res.mainBars.As)} mm²`,
      result: `${n0(res.mainBars.As)} mm²`,
      ref: '',
      status: res.mainBars.As >= res.AsReq ? 'ok' : 'fail',
      note: res.mainBars.As >= res.AsReq
        ? `✓ As,prov ≥ As,req`
        : `✗ As,prov < As,req`,
    },

    { heading: '5. Axial Capacity Check' },
    {
      label: 'Section capacity',
      formula: 'NRd = fcd · Ac + As,prov · fyd',
      working: `= ${n(fcd,1)} × ${n0(Ac)} + ${n0(res.mainBars.As)} × ${n(fyd,1)}`,
      result: `${n(res.capacity,0)} kN`,
      ref: r(code, 'EC2 §6.1 Eq. 6.73', 'BS8110 §3.8.4.3', 'ACI 318 §22.4.2.2', 'ACI 318 §22.4.2.2'),
    },
    {
      label: 'Capacity check',
      formula: 'NEd ≤ NRd',
      working: `${Ned} kN ${Ned <= res.capacity ? '≤' : '>'} ${n(res.capacity,0)} kN`,
      result: Ned <= res.capacity ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.8.4', 'ACI 318 §22.4.2', 'ACI 318 §22.4.2'),
      status: Ned <= res.capacity ? 'ok' : 'fail',
    },

    { heading: '6. Links / Transverse Reinforcement' },
    {
      label: 'Link diameter',
      formula: 'φlink ≥ max(6 mm,  0.25·φmain)',
      working: `= max(6,  0.25 × ${res.mainBars.dia}) = ${res.links.dia} mm`,
      result: `T${res.links.dia}`,
      ref: r(code, 'EC2 §9.5.3(1)', 'BS8110 §3.12.7.1', 'ACI 318 §25.7.2.2', 'ACI 318 §25.7.2.2'),
    },
    {
      label: 'Link spacing',
      formula: 'slink ≤ min(12·φmain,  0.6·bmin,  240 mm)',
      working: `= min(${12*res.mainBars.dia},  ${n(0.6*Math.min(b,h),0)},  240)`,
      result: `${res.links.spacing} mm`,
      ref: r(code, 'EC2 §9.5.3(3)', 'BS8110 §3.12.7.2', 'ACI 318 §25.7.2.1', 'ACI 318 §25.7.2.1'),
    },
  ];
}

// ── FOUNDATION calc notes ─────────────────────────────────────────────────────
export function foundationCalcNotes(
  inp: FoundationInputs,
  res: FoundationResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const code = cf.code ?? 'EC2';
  const { fck, fyd } = inp.material;
  const { columnB, columnH, Ned, selfWeight, soilBearing, cover } = inp;
  const Ntotal = Ned * (1 + selfWeight / 100);
  const { L, B, h, d, qEd, As_bot, barsBot } = res;

  const cx = columnB / 1000;
  const a  = (B - cx) / 2;
  const u1 = 2 * (columnB + columnH) + 2 * Math.PI * 2 * d;
  const βVed = Ned * 1000 * 1.15;
  const vEd  = βVed / (u1 * d);
  const ρl   = Math.min(barsBot.As / (1000 * d), 0.02);
  const k    = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc_punch = (0.18 / 1.5) * k * (100 * ρl * fck) ** (1/3);

  return [
    { heading: '1. Loading & Sizing' },
    {
      label: 'Total design load',
      formula: 'Ntotal = NEd × (1 + sw%/100)',
      working: `= ${Ned} × (1 + ${selfWeight}/100)`,
      result: `${n(Ntotal,1)} kN`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.11', 'ACI 318 §13.3', 'ACI 318 §13.3'),
    },
    {
      label: 'Required plan area',
      formula: 'A,req = Ntotal / qa',
      working: `= ${n(Ntotal,1)} / ${soilBearing}`,
      result: `${n(Ntotal/soilBearing,2)} m²`,
      ref: r(code, 'EC7 §6.5 / Annex D', 'BS8004 §2.3', 'IBC §1806.2', 'IBC §1806.2'),
    },
    {
      label: 'Pad size adopted',
      formula: 'L × B — rounded up to 100 mm',
      working: `L = ${n(L,2)} m,  B = ${n(B,2)} m  →  A = ${n(L*B,2)} m²`,
      result: `${n(L,2)} × ${n(B,2)} m`,
      ref: '',
    },

    { heading: '2. Net Soil Pressure (ULS)' },
    {
      label: 'Net upward pressure',
      formula: 'qEd = NEd / (L · B)  (NEd already the ULS design load)',
      working: `= ${Ned} / (${n(L,2)} × ${n(B,2)})`,
      result: `${n(qEd,1)} kN/m²`,
      ref: r(code, 'EC7 §2.4.7', 'BS8004 §2.3', 'IBC §1806.2 / ASCE 7 §13', 'IBC §1806.2'),
    },
    {
      label: 'Soil pressure check',
      formula: 'qEd ≤ qa',
      working: `${n(qEd,1)} kN/m² ${qEd <= soilBearing ? '≤' : '>'} ${soilBearing} kN/m²`,
      result: qEd <= soilBearing ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC7 §6.5', 'BS8004 §2.3', 'IBC §1806.2', 'IBC §1806.2'),
      status: qEd <= soilBearing ? 'ok' : 'warn',
    },

    { heading: '3. Bending Design' },
    {
      label: 'Critical section',
      formula: 'a = (B − cx) / 2  at column face',
      working: `= (${n(B,2)} − ${n(cx,3)}) / 2`,
      result: `${n(a,3)} m`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.11.2', 'ACI 318 §13.2.7.1', 'ACI 318 §13.2.7.1'),
    },
    {
      label: 'Design moment per metre',
      formula: 'MEd = qEd · a² / 2',
      working: `= ${n(qEd,1)} × ${n(a,3)}² / 2`,
      result: `${n(qEd*a*a/2,2)} kNm/m`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.11.2.2', 'ACI 318 §13.2.7', 'ACI 318 §13.2.7'),
    },
    {
      label: 'Effective depth',
      formula: 'd = h − cover − φbar/2',
      working: `= ${h} − ${cover} − 12  (T16 bars)`,
      result: `${n0(d)} mm`,
      ref: r(code, 'EC2 §8.3.2', 'BS8110 §3.11', 'ACI 318 §20.6.1', 'ACI 318 §20.6.1'),
    },
    {
      label: 'Bottom steel required',
      formula: 'As,req = MEd / (fyd · 0.9 · d)',
      working: `= ${n(qEd*a*a/2,2)}×10⁶ / (${n(fyd,1)} × 0.9 × ${n0(d)})`,
      result: `${n0(As_bot)} mm²/m`,
      ref: r(code, 'EC2 §6.1', 'BS8110 §3.11.3', 'ACI 318 §13.3.1', 'ACI 318 §13.3.1'),
    },
    {
      label: 'Steel provided',
      formula: `T${barsBot.dia} @ ${barsBot.spacing} mm`,
      working: `As = ${n0(barsBot.As)} mm²/m`,
      result: `${n0(barsBot.As)} mm²/m`,
      ref: '',
      status: res.bendingOK ? 'ok' : 'fail',
      note: res.bendingOK ? `✓ As,prov ≥ As,req` : `✗ As,prov < As,req`,
    },

    { heading: '4. Punching Shear Check' },
    {
      label: 'Control perimeter (u1)',
      formula: 'u1 = 2(cx + cy) + 2π·2d  at 2d from column face',
      working: `= 2(${columnB} + ${columnH}) + 2π × 2 × ${n0(d)}`,
      result: `${n0(u1)} mm`,
      ref: r(code, 'EC2 §6.4.2', 'BS8110 §3.7.6', 'ACI 318 §22.6.4', 'ACI 318 §22.6.4'),
    },
    {
      label: 'Punching shear stress',
      formula: 'vEd = β·NEd / (u1 · d)  (β=1.15 eccentricity)',
      working: `= 1.15 × ${Ned*1000} / (${n0(u1)} × ${n0(d)})`,
      result: `${n(vEd,4)} N/mm²`,
      ref: r(code, 'EC2 §6.4.3', 'BS8110 §3.7.7', 'ACI 318 §22.6.5', 'ACI 318 §22.6.5'),
    },
    {
      label: 'Concrete punching resistance',
      formula: 'vRd,c = (0.18/γc) · k · (100·ρl·fck)^(1/3)',
      working: `= (0.18/1.5) × ${n(k,3)} × (100 × ${n(ρl,4)} × ${fck})^(1/3)`,
      result: `${n(vRdc_punch,4)} N/mm²`,
      ref: r(code, 'EC2 §6.4.4 Eq. 6.47', 'BS8110 §3.7.7', 'ACI 318 §22.6.5.2', 'ACI 318 §22.6.5.2'),
    },
    {
      label: 'Punching shear check',
      formula: 'vEd ≤ vRd,c',
      working: `${n(vEd,4)} ${res.punchingOK ? '≤' : '>'} ${n(vRdc_punch,4)} N/mm²`,
      result: res.punchingOK ? 'Pass ✓' : 'Fail ✗',
      ref: r(code, 'EC2 §6.4.4', 'BS8110 §3.7.7', 'ACI 318 §22.6.5', 'ACI 318 §22.6.5'),
      status: res.punchingOK ? 'ok' : 'warn',
    },
  ];
}
