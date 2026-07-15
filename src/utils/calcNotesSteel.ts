/**
 * calcNotesSteel.ts
 * Step-by-step calculation breakdowns for QA/QC of steel modules.
 * References EC3 (EN 1993) clause numbers directly (no multi-code branching).
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { CodeFactors } from '../context/BuildingCodeContext';
import type { SteelMemberInputs, SteelMemberResults } from './steelCalculations';
import type { ConnectionInputs, ConnectionResults } from './steelConnectionCalculations';
import type { PortalFrameInputs, PortalFrameResults } from './portalFrameCalculations';
import type { CompositeBeamInputs, CompositeBeamResults } from './compositeBeamCalculations';

const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

// ── STEEL MEMBER calc notes ───────────────────────────────────────────────────
export function steelCalcNotes(
  inp: SteelMemberInputs,
  res: SteelMemberResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { span: L, udl: w, pointLoad: P, fyk, gammaM0, gammaM1, supportType, lateralRestraint } = inp;
  const sec = res.section;
  const mFac = supportType === 'cantilever' ? 2 : supportType === 'continuous' ? 10 : 8;
  const vFac = supportType === 'cantilever' ? 1 : 2;
  const Med_udl = w * L * L / mFac;
  const Med_pl  = P * L / 4;

  const steps: CalcStep[] = [
    { heading: '1. Section & Material Properties' },
    {
      label: 'Section',
      formula: sec.name,
      working: `A = ${sec.A} mm²,  h = ${sec.h} mm,  b = ${sec.b} mm,  tf = ${sec.tf} mm,  tw = ${sec.tw} mm`,
      result: `${sec.mass} kg/m`,
      ref: 'EC3 §1.5 / product tables',
    },
    {
      label: 'Yield strength',
      formula: 'fy — characteristic yield strength',
      working: `fy = ${fyk} MPa`,
      result: `${fyk} MPa`,
      ref: 'EC3 §3.2.1 Table 3.1',
    },
    {
      label: 'Partial factors',
      formula: 'γM0 (resistance), γM1 (instability)',
      working: `γM0 = ${n(gammaM0)},  γM1 = ${n(gammaM1)}`,
      result: `γM0 = ${n(gammaM0)}, γM1 = ${n(gammaM1)}`,
      ref: 'EC3 §6.1',
    },

    { heading: '2. Design Actions' },
    {
      label: `Design moment (MEd) [${supportType}]`,
      formula: `MEd = wEd·L²/${mFac} + P·L/4`,
      working: `= ${n(w)}×${L}²/${mFac} + ${n(P)}×${L}/4 = ${n(Med_udl)} + ${n(Med_pl)}`,
      result: `${n(res.Med)} kNm`,
      ref: 'EC3 §5.4',
    },
    {
      label: 'Design shear (VEd)',
      formula: `VEd = wEd·L/${vFac} + P/2`,
      working: `= ${n(w)}×${L}/${vFac} + ${n(P)}/2`,
      result: `${n(res.Ved)} kN`,
      ref: 'EC3 §6.2.6',
    },

    { heading: '3. Bending Resistance' },
    {
      label: 'Plastic moment resistance',
      formula: 'Mc,Rd = Wpl,y · fy / γM0',
      working: `= ${sec.Wpl_y}×10³ × ${fyk} / ${n(gammaM0)}`,
      result: `${n(res.McRd)} kNm`,
      ref: 'EC3 §6.2.5(2)',
    },
    {
      label: 'Bending utilisation',
      formula: 'UC = MEd / Mc,Rd',
      working: `= ${n(res.Med)} / ${n(res.McRd)}`,
      result: `${n(res.bendingUtil * 100, 1)}%`,
      ref: 'EC3 §6.2.5(1)',
      status: res.bendingUtil > 1 ? 'fail' : res.bendingUtil > 0.9 ? 'warn' : 'ok',
      note: res.bendingUtil <= 1 ? 'Pass ✓' : 'Fail ✗ — increase section',
    },

    { heading: '4. Shear Resistance' },
    {
      label: 'Shear area',
      formula: 'Av = h · tw  (rolled I/H, simplified)',
      working: `= ${sec.h} × ${sec.tw}`,
      result: `${n0(sec.h * sec.tw)} mm²`,
      ref: 'EC3 §6.2.6(3)',
    },
    {
      label: 'Shear resistance',
      formula: 'Vc,Rd = Av · fy / (√3 · γM0)',
      working: `= ${n0(sec.h * sec.tw)} × ${fyk} / (√3 × ${n(gammaM0)}) / 1000`,
      result: `${n(res.VcRd)} kN`,
      ref: 'EC3 §6.2.6(2)',
    },
    {
      label: 'Shear utilisation',
      formula: 'UC = VEd / Vc,Rd',
      working: `= ${n(res.Ved)} / ${n(res.VcRd)}`,
      result: `${n(res.shearUtil * 100, 1)}%`,
      ref: 'EC3 §6.2.6(1)',
      status: res.shearUtil > 1 ? 'fail' : 'ok',
      note: res.shearUtil <= 1 ? 'Pass ✓' : 'Fail ✗',
    },

    { heading: '5. Lateral-Torsional Buckling (LTB)' },
    {
      label: 'Lateral restraint condition',
      formula: 'Restraint: ' + lateralRestraint,
      working: lateralRestraint === 'full'
        ? 'Compression flange fully restrained — LTB not critical, Mb,Rd = Mc,Rd'
        : `Restraint = ${lateralRestraint} — reduced buckling resistance χLT applied`,
      result: lateralRestraint === 'full' ? 'χLT = 1.0' : 'see below',
      ref: 'EC3 §6.3.2.1',
    },
    {
      label: 'LTB resistance',
      formula: 'Mb,Rd = χLT · Mc,Rd / γM1',
      working: `Mc,Rd = ${n(res.McRd)} kNm, γM1 = ${n(gammaM1)} → Mb,Rd`,
      result: `${n(res.MbRd)} kNm`,
      ref: 'EC3 §6.3.2.1 Eq. 6.55',
    },
    {
      label: 'LTB utilisation',
      formula: 'UC = MEd / Mb,Rd',
      working: `= ${n(res.Med)} / ${n(res.MbRd)}`,
      result: `${n(res.ltbUtil * 100, 1)}%`,
      ref: 'EC3 §6.3.2.1',
      status: res.ltbUtil > 1 ? 'fail' : res.ltbUtil > 0.9 ? 'warn' : 'ok',
      note: res.ltbUtil <= 1 ? 'Pass ✓' : 'Fail ✗ — add restraint or increase section',
    },

    { heading: '6. Deflection (SLS)' },
    {
      label: 'Deflection check',
      formula: 'δ ≤ L/250',
      working: `δ = ${n(res.deflection, 1)} mm  vs  limit = ${n(res.deflLimit, 1)} mm`,
      result: res.deflOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'EC3 §7.2.1 / NA',
      status: res.deflOK ? 'ok' : 'warn',
    },
  ];

  return steps;
}

// ── STEEL CONNECTION calc notes ───────────────────────────────────────────────
export function steelConnectionCalcNotes(
  inp: ConnectionInputs,
  res: ConnectionResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { Ved, Ned, Med, plateFy, plateThickness, plateHeight, bolt, type } = inp;
  const gammaM2 = 1.25, gammaM0 = 1.0;
  const FvEd_per_bolt = Ved / res.nBolts;

  const steps: CalcStep[] = [
    { heading: '1. Connection Type & Loads' },
    {
      label: 'Connection type',
      formula: type,
      working: `Ved = ${Ved} kN,  Ned = ${Ned} kN${type === 'end-plate' ? `,  Med = ${Med} kNm` : ''}`,
      result: type,
      ref: 'EC3-1-8 §1.5',
    },
    {
      label: 'Bolt group',
      formula: `${bolt.rows} rows × ${bolt.cols} cols`,
      working: `${res.nBolts} × M${bolt.diameter} grade ${bolt.grade}`,
      result: `nBolts = ${res.nBolts}`,
      ref: 'EC3-1-8 Table 3.1',
    },

    { heading: '2. Bolt Shear Resistance' },
    {
      label: 'Bolt shear resistance',
      formula: 'Fv,Rd = 0.6 · fub · As / γM2',
      working: `= 0.6 × ${bolt.grade === '10.9' ? 1000 : 800} × As(M${bolt.diameter}) / ${n(gammaM2)}`,
      result: `${n(res.FvRd, 1)} kN/bolt`,
      ref: 'EC3-1-8 Table 3.4',
    },
    {
      label: 'Applied shear per bolt',
      formula: 'FvEd = VEd / nBolts',
      working: `= ${Ved} / ${res.nBolts}`,
      result: `${n(FvEd_per_bolt, 1)} kN`,
      ref: 'EC3-1-8 §3.6.1',
    },
    {
      label: 'Bolt shear utilisation',
      formula: 'UC = FvEd / Fv,Rd',
      working: `= ${n(FvEd_per_bolt, 1)} / ${n(res.FvRd, 1)}`,
      result: `${n(res.util_bolt_shear * 100, 1)}%`,
      ref: 'EC3-1-8 §3.6.1',
      status: res.util_bolt_shear > 1 ? 'fail' : 'ok',
      note: res.util_bolt_shear <= 1 ? 'Pass ✓' : 'Fail ✗',
    },

    ...(type === 'end-plate' ? [
      { heading: '3. Bolt Tension (Moment Connection)' },
      {
        label: 'Bolt tension resistance',
        formula: 'Ft,Rd = 0.9 · fub · As / γM2',
        working: `= 0.9 × ${bolt.grade === '10.9' ? 1000 : 800} × As(M${bolt.diameter}) / ${n(gammaM2)}`,
        result: `${n(res.FtRd, 1)} kN/bolt`,
        ref: 'EC3-1-8 Table 3.4',
      } as CalcStep,
      {
        label: 'Tension from applied moment',
        formula: 'FtEd = MEd / (nCols · zA)  (top row lever arm)',
        working: `MEd = ${Med} kNm distributed to top row bolts`,
        result: `UC = ${n(res.util_bolt_tension * 100, 1)}%`,
        ref: 'EC3-1-8 §6.2.7',
      } as CalcStep,
      {
        label: 'Shear + tension interaction',
        formula: 'FvEd/Fv,Rd + FtEd/(1.4·Ft,Rd) ≤ 1.0',
        working: `Shear UC = ${n(res.util_bolt_shear * 100, 1)}%,  tension UC = ${n(res.util_bolt_tension * 100, 1)}%`,
        result: (res.util_bolt_shear + res.util_bolt_tension / 1.4) <= 1 ? 'Pass ✓' : 'Fail ✗',
        ref: 'EC3-1-8 Table 3.4',
        status: (res.util_bolt_shear + res.util_bolt_tension / 1.4) > 1 ? 'fail' : 'ok',
      } as CalcStep,
    ] : []),

    { heading: `${type === 'end-plate' ? '4' : '3'}. Plate Shear Resistance` },
    {
      label: 'Plate shear area',
      formula: 'Av = t · h',
      working: `= ${plateThickness} × ${plateHeight}`,
      result: `${n0(res.Av_plate)} mm²`,
      ref: 'EC3-1-8 §6.2.6',
    },
    {
      label: 'Plate shear resistance',
      formula: 'Vpl,Rd = (fy/√3/γM0) · Av',
      working: `= (${plateFy}/√3/${n(gammaM0)}) × ${n0(res.Av_plate)} / 1000`,
      result: `${n(res.VplRd_plate, 1)} kN`,
      ref: 'EC3-1-8 §6.2.6',
    },
    {
      label: 'Plate shear utilisation',
      formula: 'UC = VEd / Vpl,Rd',
      working: `= ${Ved} / ${n(res.VplRd_plate, 1)}`,
      result: `${n(res.util_plate_shear * 100, 1)}%`,
      ref: 'EC3-1-8 §6.2.6',
      status: res.util_plate_shear > 1 ? 'fail' : 'ok',
      note: res.util_plate_shear <= 1 ? 'Pass ✓' : 'Fail ✗',
    },

    { heading: `${type === 'end-plate' ? '5' : '4'}. Block Shear` },
    {
      label: 'Block shear resistance',
      formula: 'Vbs,Rd = (0.5·fub·Ant/γM2) + (fy/√3·Anv/γM0)',
      working: `Assumed e1=40mm, p1=70mm edge/pitch — see EC3-1-8 §3.10.2`,
      result: `${n(res.VbsRd, 1)} kN`,
      ref: 'EC3-1-8 §3.10.2',
    },
    {
      label: 'Block shear utilisation',
      formula: 'UC = VEd / Vbs,Rd',
      working: `= ${Ved} / ${n(res.VbsRd, 1)}`,
      result: `${n(res.util_block * 100, 1)}%`,
      ref: 'EC3-1-8 §3.10.2',
      status: res.util_block > 1 ? 'fail' : 'ok',
      note: res.util_block <= 1 ? 'Pass ✓' : 'Fail ✗',
    },

    ...(type === 'base-plate' ? [
      { heading: '6. Bearing on Grout/Concrete' },
      {
        label: 'Bearing stress',
        formula: 'σ = |NEd| / (plateWidth × plateHeight)',
        working: `= |${Ned}|×1000 / (${inp.plateWidth} × ${plateHeight})`,
        result: `${n(res.bearing_stress, 3)} MPa`,
        ref: 'EC4 §6.2.5',
      } as CalcStep,
      {
        label: 'Bearing limit',
        formula: 'σlimit = 0.67 · fck,grout',
        working: `= 0.67 × ${inp.fck_grout}`,
        result: `${n(res.bearing_limit, 2)} MPa`,
        ref: 'EC4 §6.2.5',
      } as CalcStep,
      {
        label: 'Bearing check',
        formula: 'σ ≤ σlimit',
        working: `${n(res.bearing_stress, 3)} ${res.bearingOK ? '≤' : '>'} ${n(res.bearing_limit, 2)} MPa`,
        result: res.bearingOK ? 'Pass ✓' : 'Fail ✗',
        ref: 'EC4 §6.2.5',
        status: res.bearingOK ? 'ok' : 'fail',
      } as CalcStep,
      { heading: '7. Column Squash Capacity' },
      {
        label: 'Column axial resistance',
        formula: 'Nc,Rd = A · fy / γM0',
        working: `= ${inp.columnA} × ${inp.columnFy} / (10 × ${n(gammaM0)})`,
        result: `${n(res.NcRd_column, 1)} kN`,
        ref: 'EC3 §6.2.4',
      } as CalcStep,
      {
        label: 'Column axial utilisation',
        formula: 'UC = |NEd| / Nc,Rd',
        working: `= |${Ned}| / ${n(res.NcRd_column, 1)}`,
        result: `${n(res.util_column_axial * 100, 1)}%`,
        ref: 'EC3 §6.2.4',
        status: res.util_column_axial > 1 ? 'fail' : 'ok',
        note: res.util_column_axial <= 1 ? 'Pass ✓' : 'Fail ✗',
      } as CalcStep,
    ] : []),

    { heading: 'Weld Design' },
    {
      label: 'Fillet weld size',
      formula: 'a: from Fw,Rd = fvw · a · Σlw ≥ VEd',
      working: `fvw = fu/(√3·βw·γM2),  Σlw = 2 × ${plateHeight} mm`,
      result: `${res.weldSize} mm fillet`,
      ref: 'EC3-1-8 §4.5.3',
      note: `Weld utilisation ${n(res.weldUtil * 100, 1)}%`,
      status: res.weldUtil > 1 ? 'fail' : 'ok',
    },
  ];

  return steps;
}

// ── PORTAL FRAME calc notes ───────────────────────────────────────────────────
export function portalFrameCalcNotes(
  inp: PortalFrameInputs,
  res: PortalFrameResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { span, height, pitch, spacing, roofDL, roofLL, fyk, base, lateralRestraint } = inp;
  const gammaG = 1.35, gammaQ = 1.5;

  const steps: CalcStep[] = [
    { heading: '1. Geometry & Loads' },
    {
      label: 'Rafter length (per side)',
      formula: 'Lr = (span/2) / cos(pitch)',
      working: `= (${span}/2) / cos(${pitch}°)`,
      result: `${n(res.rafterLength)} m`,
      ref: 'Geometry',
    },
    {
      label: 'Design UDL on rafter',
      formula: 'wEd = γG·gk·spacing + γQ·qk·spacing',
      working: `= ${n(gammaG)} × ${roofDL} × ${spacing} + ${n(gammaQ)} × ${roofLL} × ${spacing}`,
      result: `${n(res.wEd_rafter)} kN/m`,
      ref: 'EN 1990 Eq. 6.10',
    },

    { heading: '2. Frame Reactions' },
    {
      label: 'Vertical reaction per column',
      formula: 'VEd = wEd · Lr',
      working: `= ${n(res.wEd_rafter)} × ${n(res.rafterLength)}`,
      result: `${n(res.VEd_col)} kN`,
      ref: 'EC3 §5.4 (statics)',
    },
    {
      label: `Horizontal thrust (base = ${base})`,
      formula: base === 'fixed' ? 'HEd = H(pinned) × 0.75' : 'HEd = wH·(span/2)²/(2·(h+rise/2))',
      working: `Projected horizontal component of rafter load, resolved at base`,
      result: `${n(res.HEd)} kN`,
      ref: 'EC3 simplified portal method',
    },

    { heading: '3. Rafter Bending & LTB' },
    {
      label: 'Rafter design moment',
      formula: 'MEd,rafter = wEd · Lr² / 10  (approx, propped rafter)',
      working: `= ${n(res.wEd_rafter)} × ${n(res.rafterLength)}² / 10`,
      result: `${n(res.Med_rafter)} kNm`,
      ref: 'EC3 simplified portal method',
    },
    {
      label: 'Rafter plastic moment resistance',
      formula: 'McRd = Sx · fy / γM0',
      working: `Sx from ${inp.rafterSection} section table, fy = ${fyk} MPa`,
      result: `see MbRd below`,
      ref: 'EC3 §6.2.5(2)',
    },
    {
      label: `LTB resistance (restraint = ${lateralRestraint})`,
      formula: 'MbRd = χLT · McRd',
      working: `χLT taken per restraint condition (full=1.0, purlins≈0.85, none=calc); McRd = ${n(res.McRd_rafter)} kNm`,
      result: `${n(res.MbRd_rafter)} kNm`,
      ref: 'EC3 §6.3.2.1',
    },
    {
      label: 'Rafter utilisation (incl. LTB)',
      formula: 'UC = MEd / MbRd',
      working: `= ${n(res.Med_rafter)} / ${n(res.MbRd_rafter)}`,
      result: `${n(res.util_rafter * 100, 1)}%`,
      ref: 'EC3 §6.3.2.1',
      status: res.LTB_rafter === 'fail' ? 'fail' : res.LTB_rafter === 'warn' ? 'warn' : 'ok',
      note: res.LTB_rafter === 'pass' ? 'Pass ✓' : res.LTB_rafter === 'warn' ? 'Borderline — check restraint spacing' : 'Fail ✗ — increase section or add purlins',
    },

    { heading: '4. Column Moment/Axial Interaction' },
    {
      label: 'Column design moment (at knee)',
      formula: 'MEd,col = HEd · height',
      working: `= ${n(res.HEd)} × ${height}`,
      result: `${n(res.Med_col)} kNm`,
      ref: 'EC3 statics',
    },
    {
      label: 'Column axial load',
      formula: 'NEd,col = VEd (from rafter reaction)',
      working: `= ${n(res.VEd_col)} kN`,
      result: `${n(res.NEd_col)} kN`,
      ref: 'EC3 statics',
    },
    {
      label: 'Column resistances',
      formula: 'McRd = Sx·fy/γM0,  NcRd = A·fy/γM0',
      working: `Section ${inp.columnSection}, fy = ${fyk} MPa`,
      result: `McRd = ${n(res.McRd_col)} kNm,  NcRd = ${n(res.NcRd_col)} kN`,
      ref: 'EC3 §6.2.4 / §6.2.5',
    },
    {
      label: 'Combined interaction',
      formula: 'UC = MEd/McRd + NEd/NcRd ≤ 1.0',
      working: `= ${n(res.Med_col)}/${n(res.McRd_col)} + ${n(res.NEd_col)}/${n(res.NcRd_col)}`,
      result: `${n(res.util_col * 100, 1)}%`,
      ref: 'EC3 §6.2.9 (simplified)',
      status: res.util_col > 1 ? 'fail' : res.util_col > 0.85 ? 'warn' : 'ok',
      note: res.util_col <= 1 ? 'Pass ✓' : 'Fail ✗ — increase column section',
    },

    { heading: '5. Sway Stability' },
    {
      label: 'Notional horizontal force',
      formula: 'NHF = 0.005 · ΣVEd',
      working: `= 0.005 × (2 × ${n(res.VEd_col)})`,
      result: `${n(0.005 * 2 * res.VEd_col)} kN`,
      ref: 'EC3 §5.3.2',
    },
    {
      label: 'Sway deflection check',
      formula: 'δ ≤ h/250',
      working: `Sway ratio δ/(h/250) = ${n(res.swayRatio * 100, 1)}%`,
      result: res.swayOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'EC3 §5.3.2 / NA sway limit',
      status: res.swayOK ? 'ok' : 'fail',
    },
  ];

  return steps;
}

// ── COMPOSITE BEAM calc notes ─────────────────────────────────────────────────
export function compositeBeamCalcNotes(
  inp: CompositeBeamInputs,
  res: CompositeBeamResults,
  _cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const { span, beamSpacing, fyk, fck, deadLoadConst, deadLoadFinal, liveLoad, interaction, studDia, studFu } = inp;
  const gammaG = 1.35, gammaQ = 1.5;

  const steps: CalcStep[] = [
    { heading: '1. Effective Flange Width' },
    {
      label: 'Effective width (each side)',
      formula: 'beff,i = min(span/8, spacing/2)',
      working: `= min(${span}/8, ${beamSpacing}/2)`,
      result: `${n(res.beff / 2)} m`,
      ref: 'EC4 §5.4.1.2',
    },
    {
      label: 'Total effective width',
      formula: 'beff = 2 × beff,i',
      working: `= 2 × ${n(res.beff / 2)}`,
      result: `${n(res.beff)} m`,
      ref: 'EC4 §5.4.1.2',
    },

    { heading: '2. Design Actions' },
    {
      label: 'Design UDL',
      formula: 'wEd = γG·(gk,const+gk,final)·spacing + γQ·qk·spacing',
      working: `= ${n(gammaG)}×(${deadLoadConst}+${deadLoadFinal})×${beamSpacing} + ${n(gammaQ)}×${liveLoad}×${beamSpacing}`,
      result: `${n(res.Med / (span * span / 8))} kN/m`,
      ref: 'EN 1990 Eq. 6.10',
    },
    {
      label: 'Design moment (MEd)',
      formula: 'MEd = wEd · L² / 8',
      working: `= wEd × ${span}² / 8`,
      result: `${n(res.Med)} kNm`,
      ref: 'EC4 §6.1',
    },
    {
      label: 'Design shear (VEd)',
      formula: 'VEd = wEd · L / 2',
      working: `= wEd × ${span} / 2`,
      result: `${n(res.Ved)} kN`,
      ref: 'EC4 §6.1',
    },

    { heading: '3. Moment Resistance — Full/Partial Composite' },
    {
      label: 'Concrete compression force (full)',
      formula: 'Nc,full = (0.85·fck/1.5) · beff · hc',
      working: `= (0.85×${fck}/1.5) × ${n(res.beff)}×1000 × ${res.hc}mm /1000`,
      result: `see Mpl,Rd`,
      ref: 'EC4 §6.2.1.2',
    },
    {
      label: 'Steel yield force',
      formula: 'Na,full = fy · Aa / γM0',
      working: `Aa = ${res.Aa} cm² (${inp.steelSection}), fy = ${fyk} MPa`,
      result: `see Mpl,Rd`,
      ref: 'EC4 §6.2.1.2',
    },
    {
      label: 'Full composite moment resistance',
      formula: 'Mpl,Rd = Na,full · z',
      working: `governing compression force × lever arm to concrete block centroid`,
      result: `${n(res.Mpl_Rd, 1)} kNm`,
      ref: 'EC4 §6.2.1.2',
    },
    {
      label: 'Partial composite resistance',
      formula: `Mpl,partial = Ma,Rd + η·(Mpl,Rd − Ma,Rd),  η = ${interaction}`,
      working: `Interpolated between steel-alone (Ma,Rd) and full composite (Mpl,Rd) resistance`,
      result: `${n(res.Mpl_partial, 1)} kNm`,
      ref: 'EC4 §6.2.1.3',
    },
    {
      label: 'Bending utilisation',
      formula: 'UC = MEd / Mpl,partial',
      working: `= ${n(res.Med)} / ${n(res.Mpl_partial, 1)}`,
      result: `${n(res.util_bending * 100, 1)}%`,
      ref: 'EC4 §6.2.1',
      status: res.util_bending > 1 ? 'fail' : res.util_bending > 0.9 ? 'warn' : 'ok',
      note: res.util_bending <= 1 ? 'Pass ✓' : 'Fail ✗ — increase section or interaction',
    },

    { heading: '4. Shear Connector (Stud) Design' },
    {
      label: 'Stud shear resistance (steel failure)',
      formula: 'PRd,1 = 0.8·fu·π·d²/4 / γV',
      working: `= 0.8 × ${studFu} × π × ${studDia}²/4 / 1250`,
      result: `see PRd`,
      ref: 'EC4 §6.6.3.1',
    },
    {
      label: 'Stud shear resistance (concrete failure)',
      formula: 'PRd,2 = 0.29·d²·√(fck·Ecm) / γV',
      working: `d = ${studDia}mm, fck = ${fck} MPa`,
      result: `${n(res.PRd_stud, 1)} kN/stud (governing, incl. deck factor kt)`,
      ref: 'EC4 §6.6.3.1',
    },
    {
      label: 'Studs required (half span)',
      formula: 'n,req = Nc,partial / PRd,stud',
      working: `η × Nc,eff / ${n(res.PRd_stud, 1)}`,
      result: `${res.nStudsRequired} studs`,
      ref: 'EC4 §6.6.1.1',
    },
    {
      label: 'Studs provided (half span)',
      formula: `spacing = ${n0(res.studSpacing)} mm`,
      working: `n,prov = ⌈(L/2) / spacing⌉ = ⌈${(span * 1000 / 2).toFixed(0)} / ${n0(res.studSpacing)}⌉`,
      result: `${res.nStudsProvided} studs`,
      ref: 'EC4 §6.6.5.5 (spacing limits)',
      status: res.nStudsProvided >= res.nStudsRequired ? 'ok' : 'warn',
      note: res.nStudsProvided >= res.nStudsRequired ? 'Pass ✓' : 'Insufficient — reduce spacing',
    },

    { heading: '5. Vertical Shear (Steel Web)' },
    {
      label: 'Web shear resistance',
      formula: 'Vpl,Rd = fy/√3 · (hw·tw)',
      working: `hw = ha − 2tf,  fy = ${fyk} MPa`,
      result: `${n(res.VplRd, 1)} kN`,
      ref: 'EC3 §6.2.6(2)',
    },
    {
      label: 'Shear utilisation',
      formula: 'UC = VEd / Vpl,Rd',
      working: `= ${n(res.Ved)} / ${n(res.VplRd, 1)}`,
      result: `${n(res.util_shear * 100, 1)}%`,
      ref: 'EC3 §6.2.6(1)',
      status: res.util_shear > 1 ? 'fail' : 'ok',
      note: res.util_shear <= 1 ? 'Pass ✓' : 'Fail ✗',
    },

    { heading: '6. Deflection — Construction & Composite Stage' },
    {
      label: 'Construction stage (steel alone, unpropped)',
      formula: 'δconst = 5·wSLS,const·L⁴ / (384·Ea·Ia)',
      working: `wSLS,const = ${deadLoadConst} × ${beamSpacing} kN/m`,
      result: `${n(res.delta_const, 1)} mm`,
      ref: 'EC3 §7.2.1',
    },
    {
      label: 'Composite stage (imposed load, transformed section)',
      formula: 'δcomp = 5·wSLS,imposed·L⁴ / (384·Ea·Icomp),  n = Ea/Ecm',
      working: `wSLS,imposed = ${liveLoad} × ${beamSpacing} kN/m`,
      result: `${n(res.delta_comp, 1)} mm`,
      ref: 'EC4 §7.3.1',
    },
    {
      label: 'Total deflection check',
      formula: 'δtotal = δconst + δcomp ≤ L/360',
      working: `${n(res.delta_total, 1)} mm  vs  limit ${n(res.deltaLimit, 1)} mm`,
      result: res.deflectionOK ? 'Pass ✓' : 'Fail ✗',
      ref: 'EC4 §7.2.2',
      status: res.deflectionOK ? 'ok' : 'warn',
    },
  ];

  return steps;
}
