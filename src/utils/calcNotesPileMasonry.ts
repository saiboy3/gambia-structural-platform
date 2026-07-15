/**
 * calcNotesPileMasonry.ts
 * Generates step-by-step calculation breakdowns for QA/QC — Pile, Pile Cap, Masonry.
 * References EC2/EC6/EC7 clause numbers directly (app defaults to EC2).
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { PileInputs, PileResults } from './pileCalculations';
import type { PileCapInputs, PileCapResults } from './pileCapCalculations';
import type { MasonryInputs, MasonryResults } from './masonryCalculations';
import type { CodeFactors } from '../context/BuildingCodeContext';

// ── Number formatting helpers ─────────────────────────────────────────────────
const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

// ── PILE calc notes ────────────────────────────────────────────────────────────
export function pileCalcNotes(
  inp: PileInputs,
  res: PileResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { diameter, length, gwt, FoS, pileType, loadType } = inp;
  const d = diameter / 1000;
  const boreRed = pileType === 'bored' ? 0.7 : 1.0;

  const steps: CalcStep[] = [
    { heading: '1. Pile Geometry' },
    {
      label: 'Pile diameter / length',
      formula: 'd, L — as specified',
      working: `d = ${diameter} mm,  L = ${length} m,  type = ${pileType}`,
      result: `⌀${diameter} × ${length} m`,
      ref: 'BS 8004 §7 / EC7 §7',
    },
    {
      label: 'Shaft perimeter',
      formula: 'perimeter = π · d',
      working: `= π × ${n(d, 3)}`,
      result: `${n(res.perimetre, 3)} m`,
      ref: '',
    },
    {
      label: 'Toe area',
      formula: 'Ab = π · d² / 4',
      working: `= π × ${n(d, 3)}² / 4`,
      result: `${n(res.area_tip, 4)} m²`,
      ref: '',
    },
    {
      label: 'Groundwater table',
      formula: 'gwt — depth from surface',
      working: `gwt = ${gwt} m  (affects effective stress γ below GWT)`,
      result: `${gwt} m`,
      ref: 'EC7 §7',
    },
    {
      label: 'Bored pile reduction',
      formula: 'boreRed = 0.7 (bored) or 1.0 (driven)',
      working: `pileType = ${pileType}  →  boreRed = ${boreRed}`,
      result: `${boreRed}`,
      ref: 'BS 8004 §7.3',
    },

    { heading: '2. Shaft Friction by Layer (α / β methods)' },
    ...res.layerFriction.flatMap((lf, i): CalcStep[] => [{
      label: `Layer ${i + 1}: ${lf.label}`,
      formula: 'α-method (clay): qs = α·cu   |   β-method (sand/laterite): qs = Ks·σ′v·tanδ',
      working: `qs = ${lf.qs} kPa  →  Qs,layer = qs × perimeter × thickness`,
      result: `${lf.Qs_layer.toFixed(1)} kN`,
      ref: 'BS 8004 §7.3.3 / EC7 Annex',
    }]),
    {
      label: 'Total shaft friction',
      formula: 'Qs = Σ Qs,layer',
      working: `= ${res.layerFriction.map(l => l.Qs_layer.toFixed(0)).join(' + ')}`,
      result: `${n(res.Qs, 1)} kN`,
      ref: 'BS 8004 §7.3',
    },

    { heading: '3. End Bearing' },
    {
      label: 'End-bearing pressure',
      formula: 'qb = Nc·cu (clay)  or  qb = min(Nq·σ′v, cap) (sand/rock)',
      working: `qb evaluated at pile toe soil type; Qb = qb × Ab${pileType === 'bored' ? ' × 0.5 (unclean base)' : ''}`,
      result: `Qb = ${n(res.Qb, 1)} kN`,
      ref: 'BS 8004 §7.4 / EC7 Annex D',
    },

    { heading: '4. Ultimate & Allowable Capacity' },
    {
      label: 'Ultimate capacity',
      formula: 'Qu = Qs + Qb',
      working: `= ${n(res.Qs, 1)} + ${n(res.Qb, 1)}`,
      result: `${n(res.Qu, 1)} kN`,
      ref: 'BS 8004 §7.2',
    },
    {
      label: 'Allowable capacity',
      formula: 'Qa = Qu / FoS',
      working: `= ${n(res.Qu, 1)} / ${FoS}`,
      result: `${n(res.Qa, 1)} kN`,
      ref: 'BS 8004 §7.2',
      note: loadType === 'tension' ? `Tension capacity (shaft only) = Qs/FoS = ${n(res.Qs / FoS, 1)} kN` : `Load type: ${loadType}`,
      status: 'info',
    },
    {
      label: 'Capacity split',
      formula: 'Qs/Qu, Qb/Qu',
      working: `Shaft ${((res.Qs / res.Qu) * 100).toFixed(0)}% : Base ${((res.Qb / res.Qu) * 100).toFixed(0)}%`,
      result: res.Qb / res.Qu > 0.5 && pileType === 'bored' ? 'End-bearing dominant' : 'Shaft dominant',
      ref: '',
      status: res.Qb / res.Qu > 0.5 && pileType === 'bored' ? 'warn' : 'ok',
      note: res.Qb / res.Qu > 0.5 && pileType === 'bored'
        ? 'End bearing > 50% — ensure base is properly cleaned for bored pile'
        : undefined,
    },
  ];

  return steps;
}

// ── PILE CAP calc notes ────────────────────────────────────────────────────────
export function pileCapCalcNotes(
  inp: PileCapInputs,
  res: PileCapResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { pileDia, pileSpacing, capThickness, capProjection, cover, colB, colH, Ned, arrangement } = inp;
  const { fck, fyd } = inp.material;
  const gammaC = cf.gammaC ?? 1.5;

  const nPiles = arrangement === '2-pile' ? 2 : arrangement === '3-pile' ? 3 : 4;
  const x_crit = pileSpacing / 2 - colB / 2;
  const bCrit = arrangement === '2-pile' ? (pileDia + 2 * capProjection) : res.capSizeY;
  const Med_pm = (res.Med * 1e6) / bCrit;
  const K = Med_pm / (fck * res.d * res.d);

  return [
    { heading: '1. Cap Geometry & Loads' },
    {
      label: 'Pile arrangement',
      formula: `${arrangement}, spacing s = ${pileSpacing} mm, ⌀${pileDia} mm piles`,
      working: `Cap plan sized as spacing + 2 × projection (${capProjection} mm)`,
      result: `${n(res.capSizeX, 0)} × ${n(res.capSizeY, 0)} mm`,
      ref: 'EC2 §9.8.1',
    },
    {
      label: 'Effective depth',
      formula: 'd = h − cover − φbar  (T16 assumed)',
      working: `= ${capThickness} − ${cover} − 16`,
      result: `${n0(res.d)} mm`,
      ref: 'EC2 §8.3.2',
    },
    {
      label: 'Cap self-weight (ULS)',
      formula: 'W = capSizeX·capSizeY·capThickness × 24 kN/m³ × γG',
      working: `= (${n(res.capSizeX / 1000, 2)} × ${n(res.capSizeY / 1000, 2)} × ${n(capThickness / 1000, 3)}) × 24 × 1.35`,
      result: `${n(res.pileCap_weight, 0)} kN`,
      ref: 'EN 1990 Eq. 6.10',
    },
    {
      label: 'Load per pile',
      formula: `Pile load = (NEd + Wcap) / n  (n = ${nPiles})`,
      working: `= (${Ned} + ${n(res.pileCap_weight, 0)}) / ${nPiles}`,
      result: `${n(res.pileLoad, 0)} kN`,
      ref: 'EC2 §9.8.1(2)',
    },

    { heading: '2. Bending Design (Truss / Cantilever Method)' },
    {
      label: 'Critical section',
      formula: 'x = s/2 − colB/2  (cantilever from column face to pile CL)',
      working: `= ${pileSpacing}/2 − ${colB}/2`,
      result: `${n(x_crit, 1)} mm`,
      ref: 'EC2 §9.8.1 / strut-and-tie',
    },
    {
      label: 'Design moment',
      formula: `MEd = pileLoad × x_crit${arrangement === '2-pile' ? ' (per cap width)' : ' (per pile pair)'}`,
      working: `= ${n(res.pileLoad, 0)} × ${n(x_crit, 1)} / 1000`,
      result: `${n(res.Med, 1)} kNm`,
      ref: 'EC2 §9.8.1',
    },
    {
      label: 'Moment per metre width',
      formula: 'MEd,pm = MEd × 1e6 / bCrit',
      working: `= ${n(res.Med, 1)}×10⁶ / ${n(bCrit, 0)}`,
      result: `${n(Med_pm, 1)} N·mm/mm`,
      ref: 'EC2 §6.1',
    },
    {
      label: 'Moment capacity parameter',
      formula: 'K = MEd,pm / (fck · d²)',
      working: `= ${n(Med_pm, 1)} / (${fck} × ${n0(res.d)}²)`,
      result: `K = ${n(K, 4)}`,
      ref: 'EC2 Appendix B',
      status: K <= 0.167 ? 'ok' : 'warn',
      note: K <= 0.167 ? 'K ≤ 0.167 — singly reinforced ✓' : 'K > 0.167 — cap may be over-stressed; increase thickness',
    },
    {
      label: 'Required steel',
      formula: 'As,req = max(MEd,pm/(fyd·0.9d), 0.0013·b·d)',
      working: `= max(${n(Med_pm, 1)}/(${n(fyd, 1)}×0.9×${n0(res.d)}), 0.0013×${n(bCrit, 0)}×${n0(res.d)})`,
      result: `${n0(res.As_req)} mm²/m`,
      ref: 'EC2 §9.2.1.1',
    },
    {
      label: 'Steel provided (EW bottom)',
      formula: `T${res.bars.dia} @ ${res.bars.spacing} mm`,
      working: `As,prov = ${n0(res.bars.As)} mm²/m`,
      result: `${n0(res.bars.As)} mm²/m`,
      ref: '',
      status: res.bars.As >= res.As_req ? 'ok' : 'fail',
      note: res.bars.As >= res.As_req ? '✓ As,prov ≥ As,req' : '✗ As,prov < As,req',
    },

    { heading: '3. Punching Shear at Column' },
    {
      label: 'Control perimeter (u1)',
      formula: 'u1 = 2(colB + colH) + 2π·2d  at 2d from column face',
      working: `= 2(${colB} + ${colH}) + 2π × 2 × ${n0(res.d)}`,
      result: `${n0(2 * (colB + colH) + 2 * Math.PI * 2 * res.d)} mm`,
      ref: 'EC2 §6.4.2',
    },
    {
      label: 'Punching shear stress',
      formula: 'vEd = NEd × 1000 / (u1 · d)',
      working: `= ${Ned}×1000 / (u1 × ${n0(res.d)})`,
      result: `${n(res.vEd_col, 4)} N/mm²`,
      ref: 'EC2 §6.4.3',
    },
    {
      label: 'Concrete punching resistance',
      formula: 'vRd,c = (0.18/γc) · k · (100·ρl·fck)^(1/3)',
      working: `γc = ${n(gammaC, 2)},  ρl = min(As,prov/(1000·d), 0.02)`,
      result: `${n(res.vRdc, 4)} N/mm²`,
      ref: 'EC2 §6.4.4 Eq. 6.47',
    },
    {
      label: 'Punching shear check',
      formula: 'vEd ≤ vRd,c',
      working: `${n(res.vEd_col, 4)} ${res.punchOK ? '≤' : '>'} ${n(res.vRdc, 4)} N/mm²`,
      result: res.punchOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'EC2 §6.4.4',
      status: res.punchOK ? 'ok' : 'fail',
    },
  ];
}

// ── MASONRY calc notes ─────────────────────────────────────────────────────────
export function masonryCalcNotes(
  inp: MasonryInputs,
  res: MasonryResults,
  cf:  Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { unitType, mortar, wallType, thickness, clearHeight, floorCondition, Gk, Qk, ek, windPressure } = inp;
  const γG = cf.gammaG ?? 1.35;
  const γQ = cf.gammaQ ?? 1.50;

  const gammaM: Record<string, number> = { 'single-leaf': 2.7, 'cavity': 3.0, 'grouted-cavity': 2.5 };
  const rho: Record<string, number> = { 'both-fixed': 0.75, 'one-fixed': 0.85, 'both-pinned': 1.0 };
  const gM = gammaM[wallType];
  const e_init = (res.hef * 1000) / 450;
  const fxk1 = unitType === 'burnt-brick' ? 0.3 : 0.15;

  return [
    { heading: '1. Material Properties' },
    {
      label: 'Characteristic compressive strength',
      formula: 'fk — from unit/mortar strength table',
      working: `${unitType}, mortar ${mortar}  →  fk = ${res.fk} MPa`,
      result: `${res.fk} MPa`,
      ref: 'EC6 §3.6.1.2 / Table',
    },
    {
      label: 'Material partial factor',
      formula: 'γM — per wall type (EC6 NA Table)',
      working: `wallType = ${wallType}  →  γM = ${gM}`,
      result: `${gM}`,
      ref: 'EC6 NA.2.9 Table NA.1',
    },
    {
      label: 'Design compressive strength',
      formula: 'fkd = fk / γM',
      working: `= ${res.fk} / ${gM}`,
      result: `${n(res.fkd, 3)} MPa`,
      ref: 'EC6 §6.1.2',
    },

    { heading: '2. Slenderness' },
    {
      label: 'Effective height',
      formula: 'hef = ρ · clearHeight',
      working: `ρ (${floorCondition}) = ${rho[floorCondition]}  →  = ${rho[floorCondition]} × ${clearHeight}`,
      result: `${n(res.hef, 2)} m`,
      ref: 'EC6 §5.5.1.2',
    },
    {
      label: 'Effective thickness',
      formula: wallType === 'cavity' ? 'tef = (t1³+t2³)^(1/3)  (cavity, equal leaves)' : 'tef = t  (single leaf)',
      working: `t = ${thickness} mm = ${n(thickness / 1000, 3)} m`,
      result: `${n(res.tef * 1000, 0)} mm`,
      ref: 'EC6 §5.5.1.3',
    },
    {
      label: 'Slenderness ratio',
      formula: 'λ = hef / tef',
      working: `= ${n(res.hef, 2)} / ${n(res.tef, 3)}`,
      result: `λ = ${n(res.slenderness, 1)}`,
      ref: 'EC6 §5.5.1.1',
      status: res.slenderness_ok ? 'ok' : 'fail',
      note: res.slenderness_ok ? 'λ ≤ 27  ✓' : 'λ > 27 — wall too slender ✗',
    },

    { heading: '3. Eccentricity & Reduction Factor' },
    {
      label: 'Initial (accidental) eccentricity',
      formula: 'e_init = hef × 1000 / 450',
      working: `= ${n(res.hef, 2)} × 1000 / 450`,
      result: `${n(e_init, 1)} mm`,
      ref: 'EC6 §5.5.1.1(4)',
    },
    {
      label: 'Total eccentricity',
      formula: 'e_total = max(ek + e_init, 0.05·t)',
      working: `= max(${ek} + ${n(e_init, 1)}, 0.05 × ${thickness})`,
      result: `${n(res.e_total, 1)} mm`,
      ref: 'EC6 §6.1.2.2',
    },
    {
      label: 'Capacity reduction factor',
      formula: 'Φ = 1 − 2·e_total/t',
      working: `= 1 − 2 × ${n(res.e_total, 1)} / ${thickness}`,
      result: `Φ = ${n(res.Phi, 3)}`,
      ref: 'EC6 §6.1.2.2 Eq. 6.4',
      status: res.Phi >= 0.5 ? 'ok' : 'warn',
      note: res.Phi < 0.5 ? 'Eccentricity large — consider thicker wall or improved bearing detail' : undefined,
    },

    { heading: '4. Vertical Load Capacity Check' },
    {
      label: 'Design vertical load',
      formula: 'NEd = γG · Gk + γQ · Qk',
      working: `= ${n(γG)} × ${Gk} + ${n(γQ)} × ${Qk}`,
      result: `${n(res.NEdpm, 1)} kN/m`,
      ref: 'EN 1990 Eq. 6.10',
    },
    {
      label: 'Design vertical resistance',
      formula: 'NRd = Φ · fkd · t',
      working: `= ${n(res.Phi, 3)} × ${n(res.fkd, 3)} × ${thickness}`,
      result: `${n(res.NRd, 1)} kN/m`,
      ref: 'EC6 §6.1.2.1',
    },
    {
      label: 'Compression utilisation',
      formula: 'NEd / NRd ≤ 1.0',
      working: `${n(res.NEdpm, 1)} / ${n(res.NRd, 1)}`,
      result: `${(res.utilisation * 100).toFixed(0)}%`,
      ref: 'EC6 §6.1.2.1',
      status: res.utilisation <= 1 ? 'ok' : 'fail',
      note: res.utilisation <= 1 ? 'Pass ✓' : 'Fail — wall capacity exceeded ✗',
    },

    ...(windPressure > 0 ? [
      { heading: '5. Lateral (Wind) Bending Check' },
      {
        label: 'Design wind moment',
        formula: 'MEd,wind = w · h² / 8  (simply-supported approx.)',
        working: `= ${windPressure} × ${clearHeight}² / 8`,
        result: `${n(res.Med_wind, 3)} kNm/m`,
        ref: 'EC6 §5.5 / EN 1991-1-4',
      } as CalcStep,
      {
        label: 'Lateral flexural resistance',
        formula: 'MRd = (fxk1/γM) · t² / 6',
        working: `fxk1 (${unitType}) = ${fxk1} MPa  →  = (${fxk1}/${gM}) × ${thickness}²/6 /1000`,
        result: `${n(res.MRd_wind, 3)} kNm/m`,
        ref: 'EC6 Annex D',
      } as CalcStep,
      {
        label: 'Wind bending check',
        formula: 'MEd ≤ MRd',
        working: `${n(res.Med_wind, 3)} ${res.windOK ? '≤' : '>'} ${n(res.MRd_wind, 3)} kNm/m`,
        result: res.windOK ? 'Pass ✓' : 'Fail ✗',
        ref: 'EC6 §5.5',
        status: res.windOK ? 'ok' : 'fail',
      } as CalcStep,
    ] : []),
  ];
}
