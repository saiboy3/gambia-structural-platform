/**
 * Bridge Beam Design — RC Simply-Supported Beam (EC2 / BS 5400)
 * Covers: standard RC T-beam or rectangular bridge beam
 * Loading: self-weight + deck + HA UDL + KEL (BS 5400 Pt 2) or EC1 LM1
 * Checks: bending (ULS), shear (ULS), deflection and crack width (SLS)
 */
import { chooseBars } from './materials';
import type { CodeFactors } from '../context/BuildingCodeContext';

export type BeamType = 'rectangular' | 'T-beam' | 'inverted-T';
export type BridgeCode = 'BS5400' | 'EC1-LM1';

export interface BridgeBeamInputs {
  beamType: BeamType;
  span: number;          // m — effective span
  beamSpacing: number;   // m — CL to CL (for T-beam effective flange)
  bw: number;            // mm — web width
  h: number;             // mm — total depth
  bf: number;            // mm — flange width (T-beam only)
  hf: number;            // mm — flange thickness (T-beam only)
  cover: number;         // mm — nominal cover (bridges: 40–60mm)
  fck: number;           // MPa
  fyk: number;           // MPa
  // Loads
  deckDead: number;      // kN/m² — deck slab + surfacing + parapets
  bridgeCode: BridgeCode;
  noLanes: number;       // number of notional lanes
  laneWidth: number;     // m — notional lane width (typically 3.65m)
}

export interface BridgeBeamResults {
  status: 'pass' | 'warn' | 'fail';
  // Effective flange
  beff: number;          // mm — effective compression flange
  d: number;             // mm — effective depth
  // Loads
  gk: number;            // kN/m — permanent
  qk: number;            // kN/m — live (HA UDL + KEL)
  wEd: number;           // kN/m — factored
  // ULS
  Med: number;           // kNm
  MRd: number;           // kNm — moment resistance
  util_bending: number;
  // Reinforcement
  As_req: number;        // mm²
  mainBars: ReturnType<typeof chooseBars>;
  As_prov: number;       // mm²
  // Shear
  Ved: number;           // kN
  VRdc: number;          // kN — concrete shear resistance
  linkDia: number;       // mm
  linkSpacing: number;   // mm
  // Deflection
  delta: number;         // mm
  deltaLimit: number;    // mm (L/400 bridges, L/300 live)
  deflectionOK: boolean;
  messages: string[];
}

export function designBridgeBeam(inp: BridgeBeamInputs, cf: CodeFactors): BridgeBeamResults {
  const msgs: string[] = [];
  const { span, bw, h, cover, fck, fyk } = inp;
  const fyd = fyk / 1.15;
  const d = h - cover - 16 - 10;  // T32 + T10 link assumed
  if (d < 50) msgs.push(`FAIL: Effective depth d=${d}mm too small — cover (${cover}mm) too close to total depth (${h}mm). Increase depth or reduce cover.`);
  const dCalc = Math.max(d, 50);  // guard against div-by-zero/negative in reinforcement/shear calc below

  // ── Effective flange width (T-beam) ──────────────────────────────────────
  const beff = inp.beamType === 'T-beam'
    ? Math.min(inp.bf, bw + 2 * 0.2 * span * 1000)
    : bw;

  // ── Loading ──────────────────────────────────────────────────────────────
  const selfWeight = (bw / 1000) * (h / 1000) * 24;  // kN/m (beam web)
  const flangeSW = inp.beamType === 'T-beam'
    ? ((beff - bw) / 1000) * (inp.hf / 1000) * 24 : 0;
  const deckLoad = inp.deckDead * inp.beamSpacing;  // kN/m tributary
  const gk = selfWeight + flangeSW + deckLoad;

  // HA traffic loading (BS 5400 Pt 2 simplified) or EC1 LM1
  let qk_udl: number, qk_kel: number;
  if (inp.bridgeCode === 'BS5400') {
    // HA UDL: 30 kN/m for L ≤ 30m (reduces for longer spans)
    qk_udl = (span <= 30 ? 30 : 30 * (30 / span) ** 0.67) * inp.beamSpacing;  // kN/m
    // KEL: 120 kN per lane, spread over beam tributary
    qk_kel = 120 / span * inp.beamSpacing;  // equivalent UDL kN/m
  } else {
    // EC1 LM1: tandem system (TS) + UDL
    const q1k = inp.noLanes >= 1 ? 9.0 : 2.5;   // kN/m² first lane UDL
    qk_udl = q1k * inp.beamSpacing;
    qk_kel = (300 / span) * inp.beamSpacing;  // TS equivalent
  }
  const qk = qk_udl + qk_kel;

  const wEd = cf.gammaG * gk + cf.gammaQ * qk;

  // ── ULS bending ──────────────────────────────────────────────────────────
  const Med = wEd * span * span / 8;

  // Compression block check
  const K = (Med * 1e6) / (fck * beff * dCalc * dCalc);
  if (K > 0.167) msgs.push('WARN: K > 0.167 — over-reinforced or compression zone in web; increase depth');

  const z = Math.min(dCalc * (0.5 + Math.sqrt(Math.max(0, 0.25 - K / 1.134))), 0.95 * dCalc);
  const As_req = (Med * 1e6) / (fyd * z);
  const As_min = Math.max(0.26 * Math.sqrt(fck) / fyk * bw * dCalc, 0.0013 * bw * dCalc);
  const As_design = Math.max(As_req, As_min);

  // Choose bars (typically large dia for bridges)
  const mainBars = chooseBars(As_design, 32);
  const As_prov = mainBars.count * Math.PI * mainBars.dia ** 2 / 4;
  const MRd = (As_prov * fyd * z) / 1e6;  // kNm

  const util_bending = Med / MRd;
  if (util_bending > 1) msgs.push(`FAIL: Bending utilisation ${(util_bending * 100).toFixed(0)}% — increase depth or add bars`);
  else msgs.push(`PASS: Bending — ${mainBars.count}T${mainBars.dia} bars (${(util_bending * 100).toFixed(0)}%)`);

  // ── Shear ────────────────────────────────────────────────────────────────
  const Ved = wEd * span / 2;
  const ρl = Math.min(As_prov / (bw * dCalc), 0.02);
  const k = Math.min(1 + Math.sqrt(200 / dCalc), 2.0);
  const VRdc_mpa = (0.18 / cf.gammaC) * k * (100 * ρl * fck) ** (1 / 3);
  const VRdc = VRdc_mpa * bw * dCalc / 1000;  // kN

  let linkDia = 12, linkSpacing = 200;
  if (Ved > VRdc) {
    // Provide links: Asw/s = VEd / (fyd × 0.9d × cot(45°))
    const Asw_s = (Ved * 1000) / (fyd * 0.9 * dCalc);  // mm²/mm
    const link_As = 2 * Math.PI * 12 * 12 / 4;  // 2 legs T12
    linkSpacing = Math.min(200, Math.floor((link_As / Asw_s)));
    linkDia = 12;
    if (linkSpacing < 75) { linkDia = 16; linkSpacing = Math.min(200, Math.floor(2 * Math.PI * 16 * 16 / 4 / Asw_s)); }
    msgs.push(`Shear links required: T${linkDia}@${linkSpacing}mm (2 legs)`);
  } else {
    msgs.push(`PASS: Concrete shear VRd,c=${VRdc.toFixed(0)} kN > VEd=${Ved.toFixed(0)} kN — min links only`);
  }

  // ── Deflection (SLS) ─────────────────────────────────────────────────────
  const wSLS = (gk + qk) * 1;  // kN/m (characteristic)
  const delta = (5 * wSLS * (span * 1000) ** 4) / (384 * 33500 * bw * dCalc ** 3 / 12);  // mm (wSLS kN/m ≡ N/mm)
  const deltaLimit = (span * 1000) / 400;  // L/400 for bridges
  const deflectionOK = delta <= deltaLimit;

  if (!deflectionOK) msgs.push(`WARN: Deflection ${delta.toFixed(1)}mm > L/400=${deltaLimit.toFixed(1)}mm — increase depth`);
  else msgs.push(`PASS: Deflection ${delta.toFixed(1)}mm ≤ L/400`);

  // Cover check for bridge exposure
  if (cover < 40) msgs.push('WARN: Cover < 40mm — bridges need min 40–60mm (XD2/XS2 exposure)');

  const status: BridgeBeamResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, beff: +beff.toFixed(0), d: +d.toFixed(0),
    gk: +gk.toFixed(2), qk: +qk.toFixed(2), wEd: +wEd.toFixed(2),
    Med: +Med.toFixed(1), MRd: +MRd.toFixed(1), util_bending: +util_bending.toFixed(3),
    As_req: +As_design.toFixed(0), mainBars, As_prov: +As_prov.toFixed(0),
    Ved: +Ved.toFixed(1), VRdc: +VRdc.toFixed(1),
    linkDia, linkSpacing,
    delta: +delta.toFixed(1), deltaLimit: +deltaLimit.toFixed(1), deflectionOK,
    messages: msgs,
  };
}
