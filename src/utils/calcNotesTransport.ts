/**
 * calcNotesTransport.ts
 * Generates step-by-step calculation breakdowns for QA/QC on transportation modules:
 * Road Pavement, Box Culvert, Bridge Beam, Bridge Abutment.
 * References EC2 / BS5400 clause numbers directly (no full multi-code branching).
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { CodeFactors } from '../context/BuildingCodeContext';
import type { PavementInputs, PavementResults } from './pavementCalculations';
import type { CulvertInputs, CulvertResults } from './culvertCalculations';
import type { BridgeBeamInputs, BridgeBeamResults } from './bridgeBeamCalculations';
import type { AbutmentInputs, AbutmentResults } from './abutmentCalculations';

// ── Number formatting helpers ─────────────────────────────────────────────────
const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

const GROWTH_RATE: Record<string, number> = { low: 0.02, medium: 0.04, high: 0.07 };
const ROAD_AADT: Record<string, number> = { trunk: 2000, main: 800, secondary: 300, access: 80, estate: 30 };
const SUBGRADE_CBR: Record<string, number> = { poor: 2, moderate: 5, good: 10, excellent: 15 };

// ── PAVEMENT calc notes ────────────────────────────────────────────────────────
export function pavementCalcNotes(
  inp: PavementInputs,
  res: PavementResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const cbr = inp.customCBR ?? SUBGRADE_CBR[inp.subgradeType];
  const aadt = ROAD_AADT[inp.roadClass];
  const rGrowth = GROWTH_RATE[inp.trafficGrowth];
  const growthFactor = ((1 + rGrowth) ** inp.designLife - 1) / rGrowth;
  const aadtHeavy = aadt * inp.percentHeavy / 100;
  const LEF = inp.equivalentAxleLoad === 80 ? 1.0 : (inp.equivalentAxleLoad / 80) ** 4;

  const steps: CalcStep[] = [
    { heading: '1. Design CBR & Subgrade' },
    {
      label: 'Subgrade CBR',
      formula: 'CBR — from subgrade classification or user override',
      working: `${inp.customCBR ? `Custom CBR = ${inp.customCBR}%` : `${inp.subgradeType} subgrade → CBR = ${cbr}%`}`,
      result: `${cbr}%`,
      ref: 'TRL RN31 §2 — Subgrade Strength Classes',
    },

    { heading: '2. Design Traffic (Cumulative ESAL)' },
    {
      label: 'Base traffic (AADT, heavy vehicles)',
      formula: 'AADT_heavy = AADT × %HGV / 100',
      working: `= ${aadt} × ${inp.percentHeavy} / 100`,
      result: `${n(aadtHeavy, 1)} veh/day`,
      ref: 'TRL RN31 §3 — Traffic Assessment',
    },
    {
      label: 'Growth factor',
      formula: 'GF = [(1+r)^n − 1] / r',
      working: `= [(1+${rGrowth})^${inp.designLife} − 1] / ${rGrowth}`,
      result: `${n(growthFactor, 2)}`,
      ref: 'TRL RN31 §3.4',
    },
    {
      label: 'Load equivalency factor',
      formula: 'LEF = (axle / 80)⁴  (4th power law)',
      working: inp.equivalentAxleLoad === 80
        ? `= 80 kN standard axle → LEF = 1.0`
        : `= (${inp.equivalentAxleLoad} / 80)⁴`,
      result: `${n(LEF, 3)}`,
      ref: 'AASHTO 1993 §2 — Equivalent Axle Loads',
    },
    {
      label: 'Design traffic (MSA)',
      formula: 'MSA = AADT_heavy × GF × 365 × LEF / 1e6',
      working: `= ${n(aadtHeavy, 1)} × ${n(growthFactor, 2)} × 365 × ${n(LEF, 3)} / 1,000,000`,
      result: `${n(res.msa, 2)} MSA`,
      ref: 'TRL RN31 §3 — Cumulative Traffic',
      status: 'info',
    },

    { heading: `3. Pavement Layer Design (${inp.pavementType === 'flexible' ? 'Flexible — TRL RN31' : 'Rigid — AASHTO simplified'})` },
    ...res.layers.map((l): CalcStep => ({
      label: l.name,
      formula: 'Thickness from CBR/MSA design chart (TRL RN31 Fig. 2–4 / catalogue)',
      working: `${l.material}, CBR=${cbr}%, MSA=${n(res.msa, 2)}`,
      result: `${l.thickness} mm`,
      ref: inp.pavementType === 'flexible' ? 'TRL RN31 §5–6' : 'AASHTO 1993 Rigid Pavement Design (simplified)',
    })),
    {
      label: 'Total structural thickness',
      formula: 'ΣT = surfacing + base + sub-base (+ improved subgrade)',
      working: `= ${res.layers.map(l => l.thickness).join(' + ')}`,
      result: `${n0(res.totalThickness)} mm`,
      ref: 'TRL RN31 §6 — Structural Catalogue',
      status: res.status === 'fail' ? 'fail' : res.status === 'warn' ? 'warn' : 'ok',
      note: res.messages.filter(m => m.startsWith('WARN') || m.startsWith('FAIL')).join('; ') || 'Design within catalogue limits',
    },
  ];

  return steps;
}

// ── CULVERT calc notes ─────────────────────────────────────────────────────────
export function culvertCalcNotes(
  inp: CulvertInputs,
  res: CulvertResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const Ko = 0.5;
  const w_wall_top = Ko * inp.fillDensity * inp.fillDepth * γG;
  const w_wall_bot = Ko * inp.fillDensity * (inp.fillDepth + inp.height) * γG;
  const uniformComp = w_wall_top * inp.height * inp.height / 2;
  const triComp = (w_wall_bot - w_wall_top) * inp.height * inp.height / 6;
  const slabSW = (inp.wallThick / 1000) * 24;
  const w_top = res.totalUDL + γG * slabSW;

  const steps: CalcStep[] = [
    { heading: '1. Geometry & Effective Depth' },
    {
      label: 'External span / height',
      formula: 'ext = clear + 2 × wallThick',
      working: `Span = ${inp.span} + 2×${inp.wallThick}/1000,  Height = ${inp.height} + 2×${inp.wallThick}/1000`,
      result: `${n(res.externalSpan, 2)} m × ${n(res.externalHeight, 2)} m`,
      ref: '',
    },
    {
      label: 'Effective depth',
      formula: 'd = wallThick − cover − φ/2  (T10 assumed)',
      working: `= ${inp.wallThick} − ${inp.cover} − 10`,
      result: `${res.d} mm`,
      ref: 'EC2 §8.3.2',
    },

    { heading: '2. Earth & Traffic Loading' },
    {
      label: 'Vertical earth pressure (top slab)',
      formula: 'p = γfill × Hfill',
      working: `= ${inp.fillDensity} × ${inp.fillDepth}`,
      result: `${n(res.earthPressure, 1)} kPa`,
      ref: 'BS5400 Pt2 §5.8 / EC1-2',
    },
    {
      label: 'Lateral earth pressure at base of wall',
      formula: 'σh = Ko × γfill × (Hfill + H)   [Ko = 0.5 at-rest]',
      working: `= ${Ko} × ${inp.fillDensity} × (${inp.fillDepth} + ${inp.height})`,
      result: `${n(res.lateralEarth, 1)} kPa`,
      ref: 'EC7 §9.5.1 (at-rest Ko)',
    },
    {
      label: 'Total ULS UDL on top slab',
      formula: 'wEd = γG·p_earth + γQ·q_traffic',
      working: `= ${n(γG)} × ${n(res.earthPressure, 1)} + ${n(γQ)} × ${inp.liveLoad}`,
      result: `${n(res.totalUDL, 1)} kPa`,
      ref: 'EN 1990 Eq. 6.10',
    },

    { heading: '3. Top Slab Bending' },
    {
      label: 'Total factored UDL on top slab (incl. self-weight)',
      formula: 'w_top = wEd + γG · slabSW',
      working: `= ${n(res.totalUDL, 1)} + ${n(γG)} × ${n(slabSW, 2)}`,
      result: `${n(w_top, 1)} kPa`,
      ref: '',
    },
    {
      label: 'Top slab design moment',
      formula: 'MEd = max(w·L²/12 [corner hogging], w·L²/24 [midspan])',
      working: `= max(${n(w_top,1)}×${inp.span}²/12, ${n(w_top,1)}×${inp.span}²/24)`,
      result: `${n(res.Med_topSlab, 1)} kNm/m`,
      ref: 'BS5400 Pt4 §5 — Box culvert frame analysis',
    },

    { heading: '4. Wall Bending — Trapezoidal Earth Pressure Split' },
    {
      label: 'Uniform pressure component (rectangular block)',
      formula: 'M_uniform = w_top,wall × H² / 2   (lever arm H/2)',
      working: `w_top,wall = Ko·γfill·Dfill·γG = ${Ko}×${inp.fillDensity}×${inp.fillDepth}×${n(γG)} = ${n(w_wall_top,2)} kPa; M = ${n(w_wall_top,2)} × ${inp.height}² / 2`,
      result: `${n(uniformComp, 1)} kNm/m`,
      ref: 'BS5400 Pt4 §5.2 — cantilever wall, uniform component',
    },
    {
      label: 'Triangular pressure component (increasing with depth)',
      formula: 'M_triangular = (w_bot,wall − w_top,wall) × H² / 6   (lever arm H/3)',
      working: `w_bot,wall = ${n(w_wall_bot,2)} kPa; M = (${n(w_wall_bot,2)} − ${n(w_wall_top,2)}) × ${inp.height}² / 6`,
      result: `${n(triComp, 1)} kNm/m`,
      ref: 'BS5400 Pt4 §5.2 — cantilever wall, triangular component',
    },
    {
      label: 'Total wall design moment',
      formula: 'MEd,wall = M_uniform + M_triangular',
      working: `= ${n(uniformComp,1)} + ${n(triComp,1)}`,
      result: `${n(res.Med_wall, 1)} kNm/m`,
      ref: 'BS5400 Pt4 §5.2',
    },

    { heading: '5. Base Slab Bending' },
    {
      label: 'Base slab design moment',
      formula: 'MEd = w_base · L² / 12  (fixed-end approximation)',
      working: `w_base = γG(γfill·Dfill + 2·slabSW) + γQ·q ≈ ${n(res.Med_baseSlab / (inp.span*inp.span/12), 2)} kPa; M = w_base × ${inp.span}² / 12`,
      result: `${n(res.Med_baseSlab, 1)} kNm/m`,
      ref: 'BS5400 Pt4 §5 — symmetric conservative assumption',
    },

    { heading: '6. Reinforcement' },
    {
      label: 'Top slab steel',
      formula: `As,req from MEd = ${n(res.Med_topSlab,1)} kNm/m`,
      working: `As,req = ${res.As_top} mm²/m → T${res.bars_top.dia}@${res.bars_top.spacing}mm`,
      result: `${res.As_top} mm²/m`,
      ref: 'EC2 §6.1',
      status: 'ok',
    },
    {
      label: 'Wall steel',
      formula: `As,req from MEd = ${n(res.Med_wall,1)} kNm/m`,
      working: `As,req = ${res.As_wall} mm²/m → T${res.bars_wall.dia}@${res.bars_wall.spacing}mm`,
      result: `${res.As_wall} mm²/m`,
      ref: 'EC2 §6.1',
      status: 'ok',
    },
    {
      label: 'Base slab steel',
      formula: `As,req from MEd = ${n(res.Med_baseSlab,1)} kNm/m`,
      working: `As,req = ${res.As_base} mm²/m → T${res.bars_base.dia}@${res.bars_base.spacing}mm`,
      result: `${res.As_base} mm²/m`,
      ref: 'EC2 §6.1',
      status: 'ok',
    },

    { heading: '7. Hydraulic Capacity Check (Manning\'s Equation)' },
    {
      label: 'Flow area & wetted perimeter (full bore)',
      formula: 'A = span × height,  P = 2(span + height)',
      working: `A = ${inp.span} × ${inp.height} = ${n(inp.span*inp.height,2)} m²,  P = 2(${inp.span} + ${inp.height}) = ${n(2*(inp.span+inp.height),2)} m`,
      result: `A = ${n(inp.span*inp.height,2)} m²`,
      ref: "Manning's Equation — hydraulic radius R = A/P",
    },
    {
      label: 'Flow velocity',
      formula: 'V = (1/n) × R^(2/3) × S^(1/2)   (S assumed 1:200 = 0.005)',
      working: `n = ${inp.Manning_n}, R = ${n(inp.span*inp.height/(2*(inp.span+inp.height)),3)} m`,
      result: `${n(res.flowVelocity, 2)} m/s`,
      ref: "Manning's Equation",
    },
    {
      label: 'Flow capacity vs design flow',
      formula: 'Qcap = A × V   vs   Qdesign',
      working: `${n(inp.span*inp.height,2)} × ${n(res.flowVelocity,2)} = ${n(res.flowCapacity,2)} m³/s   vs   Qdesign = ${n(inp.designFlow,2)} m³/s`,
      result: res.hydraulicOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'Culvert hydraulic design — capacity check',
      status: res.hydraulicOK ? 'ok' : 'fail',
      note: `Velocity = ${n(res.flowVelocity,2)} m/s (target 0.6–4.0 m/s for self-cleansing / scour)`,
    },
  ];

  return steps;
}

// ── BRIDGE BEAM calc notes ─────────────────────────────────────────────────────
export function bridgeBeamCalcNotes(
  inp: BridgeBeamInputs,
  res: BridgeBeamResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const γc = cf.gammaC ?? 1.50;
  const fyd = inp.fyk / 1.15;
  const selfWeight = (inp.bw / 1000) * (inp.h / 1000) * 24;
  const flangeSW = inp.beamType === 'T-beam' ? ((res.beff - inp.bw) / 1000) * (inp.hf / 1000) * 24 : 0;
  const deckLoad = inp.deckDead * inp.beamSpacing;
  const K = (res.Med * 1e6) / (inp.fck * res.beff * res.d * res.d);
  const z = Math.min(res.d * (0.5 + Math.sqrt(Math.max(0, 0.25 - K / 1.134))), 0.95 * res.d);
  const ρl = Math.min(res.As_prov / (inp.bw * res.d), 0.02);
  const k_size = Math.min(1 + Math.sqrt(200 / res.d), 2.0);

  const steps: CalcStep[] = [
    { heading: '1. Effective Flange Width (T-beam)' },
    {
      label: 'Effective flange width',
      formula: inp.beamType === 'T-beam' ? 'beff = min(bf, bw + 2 × 0.2 × L)' : 'beff = bw  (rectangular section)',
      working: inp.beamType === 'T-beam'
        ? `= min(${inp.bf}, ${inp.bw} + 2 × 0.2 × ${inp.span}×1000)`
        : `= ${inp.bw} mm`,
      result: `${res.beff} mm`,
      ref: 'EC2 §5.3.2.1 / BS5400 Pt4 §4.2',
    },
    {
      label: 'Effective depth',
      formula: 'd = h − cover − φmain/2 − φlink  (T32 bars + T10 links assumed)',
      working: `= ${inp.h} − ${inp.cover} − 16 − 10`,
      result: `${res.d} mm`,
      ref: 'EC2 §8.3.2',
    },

    { heading: '2. Loading' },
    {
      label: 'Self-weight (web)',
      formula: 'gk,web = (bw/1000) × (h/1000) × 24',
      working: `= (${inp.bw}/1000) × (${inp.h}/1000) × 24`,
      result: `${n(selfWeight, 2)} kN/m`,
      ref: '',
    },
    ...(inp.beamType === 'T-beam' ? [{
      label: 'Flange self-weight',
      formula: 'gk,flange = ((beff−bw)/1000) × (hf/1000) × 24',
      working: `= ((${res.beff}−${inp.bw})/1000) × (${inp.hf}/1000) × 24`,
      result: `${n(flangeSW, 2)} kN/m`,
      ref: '',
    }] : []),
    {
      label: 'Deck tributary dead load',
      formula: 'gk,deck = deckDead × beamSpacing',
      working: `= ${inp.deckDead} × ${inp.beamSpacing}`,
      result: `${n(deckLoad, 2)} kN/m`,
      ref: '',
    },
    {
      label: 'Total permanent load',
      formula: 'gk = gk,web + gk,flange + gk,deck',
      working: `= ${n(selfWeight,2)} + ${n(flangeSW,2)} + ${n(deckLoad,2)}`,
      result: `${n(res.gk, 2)} kN/m`,
      ref: '',
    },
    {
      label: `Traffic loading (${inp.bridgeCode})`,
      formula: inp.bridgeCode === 'BS5400'
        ? 'qk = HA UDL × spacing + KEL/L × spacing'
        : 'qk = q1k × spacing + TS/L × spacing  (EC1 LM1)',
      working: inp.bridgeCode === 'BS5400'
        ? `HA UDL = ${inp.span <= 30 ? '30' : `30×(30/${inp.span})^0.67`} kN/m × ${inp.beamSpacing};  KEL = 120/${inp.span} × ${inp.beamSpacing}`
        : `q1k = ${inp.noLanes >= 1 ? '9.0' : '2.5'} kN/m² × ${inp.beamSpacing};  TS = 300/${inp.span} × ${inp.beamSpacing}`,
      result: `${n(res.qk, 2)} kN/m`,
      ref: inp.bridgeCode === 'BS5400' ? 'BS5400 Pt2 §6 — HA loading' : 'EC1-2 §4.3 — Load Model 1',
    },
    {
      label: 'Design UDL (ULS)',
      formula: 'wEd = γG·gk + γQ·qk',
      working: `= ${n(γG)} × ${n(res.gk,2)} + ${n(γQ)} × ${n(res.qk,2)}`,
      result: `${n(res.wEd, 2)} kN/m`,
      ref: 'EN 1990 Eq. 6.10',
    },

    { heading: '3. Bending Design (ULS)' },
    {
      label: 'Design moment',
      formula: 'MEd = wEd · L² / 8  (simply supported)',
      working: `= ${n(res.wEd,2)} × ${inp.span}² / 8`,
      result: `${n(res.Med, 1)} kNm`,
      ref: 'EC2 §5.4 / BS5400 Pt4 §4',
    },
    {
      label: 'Moment capacity parameter',
      formula: 'K = MEd / (fck · beff · d²)',
      working: `= ${n(res.Med,1)}×10⁶ / (${inp.fck} × ${res.beff} × ${res.d}²)`,
      result: `K = ${n(K, 4)}`,
      ref: 'EC2 §3.1.7 / Appendix B',
      status: K <= 0.167 ? 'ok' : 'warn',
      note: K <= 0.167 ? 'K ≤ 0.167 — singly reinforced ✓' : 'K > 0.167 — over-reinforced, revise depth',
    },
    {
      label: 'Lever arm',
      formula: 'z = d·[0.5 + √(0.25 − K/1.134)] ≤ 0.95d',
      working: `= ${res.d} × [0.5 + √(0.25 − ${n(K,4)}/1.134)]`,
      result: `${n(z, 1)} mm`,
      ref: 'EC2 Eq. C.4',
    },
    {
      label: 'Required steel & bars provided',
      formula: 'As,req = MEd / (fyd · z)',
      working: `= ${n(res.Med,1)}×10⁶ / (${n(fyd,1)} × ${n(z,1)})  →  ${res.mainBars.count} × T${res.mainBars.dia}`,
      result: `${res.As_req} mm² (prov. ${res.As_prov} mm²)`,
      ref: 'EC2 §6.1',
      status: res.As_prov >= res.As_req ? 'ok' : 'fail',
    },
    {
      label: 'Moment capacity check',
      formula: 'MEd ≤ MRd',
      working: `${n(res.Med,1)} kNm ${res.Med <= res.MRd ? '≤' : '>'} ${n(res.MRd,1)} kNm`,
      result: `Utilisation = ${n(res.util_bending * 100, 0)}%`,
      ref: 'EC2 §6.1',
      status: res.util_bending <= 1 ? 'ok' : 'fail',
    },

    { heading: '4. Shear Design (ULS)' },
    {
      label: 'Design shear',
      formula: 'VEd = wEd · L / 2',
      working: `= ${n(res.wEd,2)} × ${inp.span} / 2`,
      result: `${n(res.Ved, 1)} kN`,
      ref: 'EC2 §6.2 / BS5400 Pt4 §7',
    },
    {
      label: 'Concrete shear resistance',
      formula: 'VRd,c = (0.18/γc) · k · (100·ρl·fck)^(1/3) · bw · d',
      working: `k = 1+√(200/${res.d}) = ${n(k_size,3)};  ρl = ${res.As_prov}/(${inp.bw}×${res.d}) = ${n(ρl,4)};  VRd,c = (0.18/${n(γc)}) × ${n(k_size,3)} × (100×${n(ρl,4)}×${inp.fck})^(1/3) × ${inp.bw} × ${res.d} / 1000`,
      result: `${n(res.VRdc, 1)} kN`,
      ref: 'EC2 Eq. 6.2a',
    },
    {
      label: 'Shear capacity check',
      formula: 'VEd vs VRd,c',
      working: `${n(res.Ved,1)} kN ${res.Ved <= res.VRdc ? '≤' : '>'} ${n(res.VRdc,1)} kN`,
      result: res.Ved <= res.VRdc ? 'Min links only' : 'Links required',
      ref: 'EC2 §6.2.2',
      status: res.Ved <= res.VRdc ? 'ok' : 'warn',
      note: `Links provided: T${res.linkDia}@${res.linkSpacing}mm (2 legs)`,
    },

    { heading: '5. Deflection Check (SLS)' },
    {
      label: 'SLS characteristic UDL',
      formula: 'wSLS = gk + qk',
      working: `= ${n(res.gk,2)} + ${n(res.qk,2)}`,
      result: `${n(res.gk + res.qk, 2)} kN/m`,
      ref: '',
    },
    {
      label: 'Mid-span deflection',
      formula: 'δ = 5·wSLS·L⁴ / (384·Ec·I)   (Ec=33,500 MPa assumed, I=bw·d³/12)',
      working: `L = ${inp.span}×1000 mm, I = ${inp.bw}×${res.d}³/12`,
      result: `${n(res.delta, 1)} mm`,
      ref: 'EC2 §7.4 / BS5400 Pt4 §5',
    },
    {
      label: 'Deflection check',
      formula: 'δ ≤ L/400  (bridge limit)',
      working: `${n(res.delta,1)} mm ${res.deflectionOK ? '≤' : '>'} ${n(res.deltaLimit,1)} mm`,
      result: res.deflectionOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'BS5400 Pt4 §5 — L/400 deflection limit',
      status: res.deflectionOK ? 'ok' : 'warn',
    },
  ];

  return steps;
}

// ── ABUTMENT calc notes ────────────────────────────────────────────────────────
export function abutmentCalcNotes(
  inp: AbutmentInputs,
  res: AbutmentResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;
  const Hea_earth = 0.5 * res.Ka * inp.gamma * inp.stemHeight ** 2;
  const Hea_surcharge = res.Ka * inp.surcharge * inp.stemHeight;
  const stemThickAvg = (inp.stemThick + inp.stemThickTop) / 2 / 1000;
  const W_stem = stemThickAvg * inp.stemHeight * 24;
  const W_base = inp.baseLength * (inp.baseThick / 1000) * 24;
  const heelLen = inp.baseLength - inp.stemThick / 1000 - 0.3;
  const restoring_moment = (
    W_stem * (0.3 + stemThickAvg / 2) +
    W_base * (inp.baseLength / 2) +
    res.Vbackfill * (inp.baseLength - heelLen / 2) +
    inp.bridgeReaction * (inp.stemThick / 1000)
  );
  const OT_earth = Hea_earth * (inp.stemHeight / 3);
  const OT_surcharge = Hea_surcharge * (inp.stemHeight / 2);
  const OT_brake = inp.bridgeFriction * inp.stemHeight;
  const mu = Math.tan(inp.phi * Math.PI / 180) * 0.8;
  const Med_stem_earth = γG * Hea_earth * (inp.stemHeight / 3);
  const Med_stem_surcharge = γQ * Hea_surcharge * (inp.stemHeight / 2);
  const Med_stem_brake = γQ * inp.bridgeFriction * inp.stemHeight;
  const K_stem = (res.Med_stem * 1e6) / (inp.fck * 1000 * res.d_stem ** 2);
  const z_stem = Math.min(res.d_stem * (0.5 + Math.sqrt(Math.max(0, 0.25 - K_stem / 1.134))), 0.95 * res.d_stem);

  const steps: CalcStep[] = [
    { heading: '1. Rankine Active Earth Pressure' },
    {
      label: 'Rankine active coefficient',
      formula: 'Ka = tan²(45° − φ/2)',
      working: `= tan²(45 − ${inp.phi}/2)`,
      result: `${n(res.Ka, 3)}`,
      ref: 'EC7 §9.5.1 / Rankine theory',
    },
    {
      label: 'Horizontal earth force (triangular, soil only)',
      formula: 'Hea,earth = 0.5 · Ka · γ · H²',
      working: `= 0.5 × ${n(res.Ka,3)} × ${inp.gamma} × ${inp.stemHeight}²`,
      result: `${n(Hea_earth, 1)} kN/m`,
      ref: 'EC7 §9.5.1',
    },
    {
      label: 'Horizontal force from traffic surcharge (uniform)',
      formula: 'Hea,surcharge = Ka · q · H',
      working: `= ${n(res.Ka,3)} × ${inp.surcharge} × ${inp.stemHeight}`,
      result: `${n(Hea_surcharge, 1)} kN/m`,
      ref: 'BS5400 Pt2 §5.8.2 — surcharge 10 kN/m²',
    },
    {
      label: 'Total horizontal force',
      formula: 'H = Hea,earth + Hea,surcharge + Fbraking',
      working: `= ${n(Hea_earth,1)} + ${n(Hea_surcharge,1)} + ${inp.bridgeFriction}`,
      result: `${n(res.totalH, 1)} kN/m`,
      ref: '',
    },

    { heading: '2. Self-Weights' },
    {
      label: 'Stem self-weight',
      formula: 'Wstem = ((tbase+ttop)/2 /1000) × H × 24',
      working: `= ((${inp.stemThick}+${inp.stemThickTop})/2/1000) × ${inp.stemHeight} × 24`,
      result: `${n(W_stem, 1)} kN/m`,
      ref: '',
    },
    {
      label: 'Base slab self-weight',
      formula: 'Wbase = B × (tbase/1000) × 24',
      working: `= ${inp.baseLength} × (${inp.baseThick}/1000) × 24`,
      result: `${n(W_base, 1)} kN/m`,
      ref: '',
    },
    {
      label: 'Backfill weight on heel',
      formula: 'Wbackfill = heelLen × H × γbackfill',
      working: `heelLen = ${inp.baseLength} − ${inp.stemThick}/1000 − 0.3 = ${n(heelLen,2)} m;  W = ${n(heelLen,2)} × ${inp.stemHeight} × ${inp.gamma}`,
      result: `${n(res.Vbackfill, 1)} kN/m`,
      ref: '',
    },
    {
      label: 'Total vertical load',
      formula: 'V = Wstem + Wbase + Wbackfill + Vbridge',
      working: `= ${n(W_stem,1)} + ${n(W_base,1)} + ${n(res.Vbackfill,1)} + ${inp.bridgeReaction}`,
      result: `${n(res.totalV, 1)} kN/m`,
      ref: '',
    },

    { heading: '3. Overturning Stability — Earth Pressure Split' },
    {
      label: 'Overturning moment — triangular soil component',
      formula: 'M_OT,soil = Hea,earth × H/3   (triangular pressure, lever arm H/3)',
      working: `= ${n(Hea_earth,1)} × ${inp.stemHeight}/3`,
      result: `${n(OT_earth, 1)} kNm/m`,
      ref: 'EC7 §9.5.1 — triangular pressure resultant at H/3',
    },
    {
      label: 'Overturning moment — uniform surcharge component',
      formula: 'M_OT,surcharge = Hea,surcharge × H/2   (uniform pressure, lever arm H/2)',
      working: `= ${n(Hea_surcharge,1)} × ${inp.stemHeight}/2`,
      result: `${n(OT_surcharge, 1)} kNm/m`,
      ref: 'BS5400 Pt2 §5.8.2 — uniform surcharge resultant at H/2',
    },
    {
      label: 'Overturning moment — braking force',
      formula: 'M_OT,brake = Fbraking × H',
      working: `= ${inp.bridgeFriction} × ${inp.stemHeight}`,
      result: `${n(OT_brake, 1)} kNm/m`,
      ref: '',
    },
    {
      label: 'Total overturning moment (about toe)',
      formula: 'M_OT = M_OT,soil + M_OT,surcharge + M_OT,brake',
      working: `= ${n(OT_earth,1)} + ${n(OT_surcharge,1)} + ${n(OT_brake,1)}`,
      result: `${n(OT_earth + OT_surcharge + OT_brake, 1)} kNm/m`,
      ref: '',
    },
    {
      label: 'Restoring moment (self-weight + backfill + bridge)',
      formula: 'M_R = ΣW·x  about toe',
      working: `Wstem×${n(0.3+stemThickAvg/2,2)} + Wbase×${n(inp.baseLength/2,2)} + Wbackfill×${n(inp.baseLength - heelLen/2,2)} + Vbridge×${n(inp.stemThick/1000,2)}`,
      result: `${n(restoring_moment, 1)} kNm/m`,
      ref: '',
    },
    {
      label: 'Factor of safety — overturning',
      formula: 'FoS_OT = M_R / M_OT  ≥ 2.0',
      working: `= ${n(restoring_moment,1)} / ${n(OT_earth+OT_surcharge+OT_brake,1)}`,
      result: `${n(res.FoS_overturning, 2)}`,
      ref: 'BS5400 Pt1 §4 — stability requirement',
      status: res.FoS_overturning >= 2.0 ? 'ok' : 'fail',
      note: res.FoS_overturning >= 2.0 ? '≥ 2.0 ✓' : '< 2.0 ✗ — increase base length',
    },

    { heading: '4. Sliding Stability' },
    {
      label: 'Friction coefficient at base',
      formula: 'μ = 0.8 · tan(φ)',
      working: `= 0.8 × tan(${inp.phi}°)`,
      result: `${n(mu, 3)}`,
      ref: 'BS5400 Pt1 §4 — sliding friction factor',
    },
    {
      label: 'Factor of safety — sliding',
      formula: 'FoS_sliding = μ·V / H  ≥ 1.5',
      working: `= ${n(mu,3)} × ${n(res.totalV,1)} / ${n(res.totalH,1)}`,
      result: `${n(res.FoS_sliding, 2)}`,
      ref: 'BS5400 Pt1 §4',
      status: res.FoS_sliding >= 1.5 ? 'ok' : 'fail',
      note: res.FoS_sliding >= 1.5 ? '≥ 1.5 ✓' : '< 1.5 ✗ — widen base or add shear key',
    },

    { heading: '5. Eccentricity & Bearing Pressure' },
    {
      label: 'Eccentricity of resultant',
      formula: 'e = |B/2 − x̄|,  x̄ = (M_R − M_OT)/V',
      working: `x̄ = (${n(restoring_moment,1)} − ${n(OT_earth+OT_surcharge+OT_brake,1)}) / ${n(res.totalV,1)}`,
      result: `${n(res.eccentricity, 3)} m`,
      ref: 'BS8004 §2.3',
      note: res.eccentricity <= inp.baseLength / 6 ? `≤ B/6 (${n(inp.baseLength/6,3)} m) — no tension ✓` : `> B/6 — tension at heel, review`,
      status: res.eccentricity <= inp.baseLength / 6 ? 'ok' : 'warn',
    },
    {
      label: 'Max bearing pressure',
      formula: 'σmax = (V/B) × (1 + 6e/B)',
      working: `= (${n(res.totalV,1)}/${inp.baseLength}) × (1 + 6×${n(res.eccentricity,3)}/${inp.baseLength})`,
      result: `${n(res.bearingPressure, 1)} kPa`,
      ref: 'BS8004 §2.3',
    },
    {
      label: 'Bearing check',
      formula: 'σmax ≤ qallow',
      working: `${n(res.bearingPressure,1)} kPa ${res.bearingOK ? '≤' : '>'} ${inp.bearingCapacity} kPa`,
      result: res.bearingOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'BS8004 §2.3',
      status: res.bearingOK ? 'ok' : 'fail',
    },

    { heading: '6. Stem Reinforcement (ULS, at base of stem)' },
    {
      label: 'Design moment components',
      formula: 'Med,earth = γG·Hea,earth·H/3;  Med,surcharge = γQ·Hea,surcharge·H/2;  Med,brake = γQ·Fbrake·H',
      working: `= ${n(γG)}×${n(Hea_earth,1)}×${inp.stemHeight}/3 + ${n(γQ)}×${n(Hea_surcharge,1)}×${inp.stemHeight}/2 + ${n(γQ)}×${inp.bridgeFriction}×${inp.stemHeight}`,
      result: `${n(Med_stem_earth,1)} + ${n(Med_stem_surcharge,1)} + ${n(Med_stem_brake,1)} kNm/m`,
      ref: 'EC2 §6.1',
    },
    {
      label: 'Total design moment at stem base',
      formula: 'MEd,stem = ΣMed components',
      working: `= ${n(Med_stem_earth,1)} + ${n(Med_stem_surcharge,1)} + ${n(Med_stem_brake,1)}`,
      result: `${n(res.Med_stem, 1)} kNm/m`,
      ref: 'EC2 §6.1',
    },
    {
      label: 'Effective depth & lever arm',
      formula: 'd = tstem − cover − φ/2;  z = d[0.5+√(0.25−K/1.134)]',
      working: `d = ${inp.stemThick} − ${inp.cover} − 10 = ${res.d_stem} mm;  K = ${n(K_stem,4)}`,
      result: `z = ${n(z_stem, 1)} mm`,
      ref: 'EC2 Eq. C.4',
      status: K_stem <= 0.167 ? 'ok' : 'warn',
    },
    {
      label: 'Stem steel required & provided',
      formula: 'As,req = MEd / (fyd · z)',
      working: `= ${n(res.Med_stem,1)}×10⁶ / (${n(inp.fyk/1.15,1)} × ${n(z_stem,1)})  →  T${res.bars_stem.dia}@${res.bars_stem.spacing}mm`,
      result: `${res.As_stem} mm²/m`,
      ref: 'EC2 §6.1',
      status: 'ok',
    },

    { heading: '7. Heel Slab Reinforcement' },
    {
      label: 'Heel design moment',
      formula: 'MEd,heel = qheel·Lheel²/2 − γG·Wbackfill·Lheel/2',
      working: `Lheel = ${n(heelLen,2)} m, qheel = σmax = ${n(res.bearingPressure,1)} kPa`,
      result: `${n(res.Med_heel, 1)} kNm/m`,
      ref: 'EC2 §6.1 — cantilever heel slab',
    },
    {
      label: 'Heel steel required & provided',
      formula: 'As,req = MEd / (fyd · 0.9 · d)',
      working: `d_heel = ${inp.baseThick} − ${inp.cover} − 10 mm  →  T${res.bars_heel.dia}@${res.bars_heel.spacing}mm`,
      result: `${res.As_heel} mm²/m`,
      ref: 'EC2 §6.1',
      status: 'ok',
    },
  ];

  return steps;
}
