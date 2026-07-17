/**
 * reportBuildersSteel — ReportData builders for the steel modules
 * (member design, connections, portal frames, composite beams).
 *
 * Mirrors the calcNotesSteel.ts split: the steel modules keep their report
 * outlines here so reportBuilders.tsx stays focused on the RC modules.
 */
import {
  steelCalcNotes,
  steelConnectionCalcNotes,
  portalFrameCalcNotes,
  compositeBeamCalcNotes,
} from './calcNotesSteel';
import type { ReportData, ReportGroup } from '../types/report';
import type { SteelMemberInputs, SteelMemberResults } from './steelCalculations';
import type { ConnectionInputs, ConnectionResults } from './steelConnectionCalculations';
import type { PortalFrameInputs, PortalFrameResults } from './portalFrameCalculations';
import type { CompositeBeamInputs, CompositeBeamResults } from './compositeBeamCalculations';
import type { CodeFactors } from '../context/BuildingCodeContext';

type Factors = Partial<CodeFactors> & { code?: string; label?: string };

const pct = (u: number) => `${(u * 100).toFixed(1)}%`;

// ── Steel member ───────────────────────────────────────────────────────────
export function buildSteelReport(
  inp: SteelMemberInputs,
  res: SteelMemberResults,
  factors: Factors,
): ReportData {
  const support = inp.supportType === 'simply-supported' ? 'Simply supported'
    : inp.supportType === 'continuous' ? 'Continuous' : 'Cantilever';
  const restraint = inp.lateralRestraint === 'full' ? 'Full lateral restraint'
    : inp.lateralRestraint === 'intermediate' ? 'Intermediate restraint' : 'Unrestrained';
  const sec = res.section;

  return {
    moduleTitle: 'Steel Member Design',
    elementRef: `${inp.sectionName} · ${inp.span} m`,
    status: res.status,

    params: [
      {
        heading: 'Section',
        rows: [
          { label: 'Section', value: inp.sectionName },
          { label: 'Mass', value: sec.mass, unit: 'kg/m' },
          { label: 'Area (A)', value: sec.A, unit: 'mm²' },
          { label: 'Overall depth (h)', value: sec.h, unit: 'mm' },
          { label: 'Flange width (b)', value: sec.b, unit: 'mm' },
          { label: 'Flange thickness (tf)', value: sec.tf, unit: 'mm' },
          { label: 'Web thickness (tw)', value: sec.tw, unit: 'mm' },
          { label: 'Second moment of area (Iy)', value: sec.Iy, unit: '×10⁴ mm⁴' },
          { label: 'Second moment of area (Iz)', value: sec.Iz, unit: '×10⁴ mm⁴' },
          { label: 'Plastic modulus (Wpl,y)', value: sec.Wpl_y, unit: '×10³ mm³' },
          { label: 'Elastic modulus (Wel,y)', value: sec.Wel_y, unit: '×10³ mm³' },
          { label: 'Radius of gyration (iy)', value: sec.iy, unit: 'mm' },
          { label: 'Radius of gyration (iz)', value: sec.iz, unit: 'mm' },
        ],
      },
      {
        heading: 'Geometry & restraint',
        rows: [
          { label: 'Span (L)', value: inp.span, unit: 'm' },
          { label: 'Support condition', value: support },
          { label: 'Lateral restraint', value: restraint },
        ],
      },
      {
        heading: 'Loading (design)',
        rows: [
          { label: 'Uniform load (w)', value: inp.udl, unit: 'kN/m' },
          { label: 'Midspan point load (P)', value: inp.pointLoad, unit: 'kN' },
        ],
      },
      {
        heading: 'Materials & partial factors',
        rows: [
          { label: 'Yield strength (fy)', value: inp.fyk, unit: 'MPa' },
          { label: 'γM0 (cross-section)', value: inp.gammaM0 },
          { label: 'γM1 (instability)', value: inp.gammaM1 },
        ],
      },
    ],

    results: [
      {
        heading: 'Design actions (ULS)',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med.toFixed(2), unit: 'kNm', key: true },
          { label: 'Design shear (VEd)', value: res.Ved.toFixed(2), unit: 'kN', key: true },
        ],
      },
      {
        heading: 'Resistances',
        rows: [
          { label: 'Bending resistance (Mc,Rd)', value: res.McRd.toFixed(2), unit: 'kNm' },
          { label: 'Shear resistance (Vc,Rd)', value: res.VcRd.toFixed(2), unit: 'kN' },
          { label: 'LTB resistance (Mb,Rd)', value: res.MbRd.toFixed(2), unit: 'kNm' },
        ],
      },
      {
        heading: 'Utilisation',
        rows: [
          { label: 'Bending', value: pct(res.bendingUtil), key: true },
          { label: 'Shear', value: pct(res.shearUtil), key: true },
          { label: 'Lateral–torsional buckling', value: pct(res.ltbUtil), key: true },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Deflection (δ)', value: res.deflection.toFixed(1), unit: 'mm' },
          { label: 'Limit (L/250)', value: res.deflLimit.toFixed(1), unit: 'mm' },
          { label: 'Deflection check', value: res.deflOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: steelCalcNotes(inp, res, factors),
  };
}

// ── Steel connection ───────────────────────────────────────────────────────
export function buildSteelConnectionReport(
  inp: ConnectionInputs,
  res: ConnectionResults,
  factors: Factors,
): ReportData {
  const typeLabel = inp.type === 'end-plate' ? 'End-plate (beam-to-column)'
    : inp.type === 'base-plate' ? 'Base plate (column to foundation)'
    : 'Fin plate (shear only)';

  const params: ReportGroup[] = [
    {
      heading: 'Connection',
      rows: [{ label: 'Connection type', value: typeLabel }],
    },
    {
      heading: 'Design actions',
      rows: [
        { label: 'Design shear (VEd)', value: inp.Ved, unit: 'kN' },
        { label: 'Design axial (NEd)', value: inp.Ned, unit: 'kN' },
        ...(inp.type === 'end-plate'
          ? [{ label: 'Design moment (MEd)', value: inp.Med, unit: 'kNm' }]
          : []),
      ],
    },
    {
      heading: 'Plate',
      rows: [
        { label: 'Plate yield (fy)', value: inp.plateFy, unit: 'MPa' },
        { label: 'Plate thickness (tp)', value: inp.plateThickness, unit: 'mm' },
        { label: 'Plate width', value: inp.plateWidth, unit: 'mm' },
        { label: 'Plate height', value: inp.plateHeight, unit: 'mm' },
      ],
    },
    {
      heading: 'Bolts',
      rows: [
        { label: 'Bolt size', value: `M${inp.bolt.diameter}` },
        { label: 'Bolt grade', value: inp.bolt.grade },
        { label: 'Rows', value: inp.bolt.rows },
        { label: 'Columns', value: inp.bolt.cols },
      ],
    },
  ];

  if (inp.type === 'base-plate') {
    params.push({
      heading: 'Base & column',
      rows: [
        { label: 'Grout/concrete strength (fck)', value: inp.fck_grout, unit: 'MPa' },
        { label: 'Column yield (fy)', value: inp.columnFy, unit: 'MPa' },
        { label: 'Column area (A)', value: inp.columnA, unit: 'cm²' },
      ],
    });
  }

  const results: ReportGroup[] = [
    {
      heading: 'Bolt group',
      rows: [
        { label: 'Number of bolts', value: res.nBolts },
        { label: 'Shear resistance per bolt (Fv,Rd)', value: res.FvRd, unit: 'kN' },
        { label: 'Tension resistance per bolt (Ft,Rd)', value: res.FtRd, unit: 'kN' },
        { label: 'Bolt shear utilisation', value: pct(res.util_bolt_shear), key: true },
        { label: 'Bolt tension utilisation', value: pct(res.util_bolt_tension), key: true },
      ],
    },
    {
      heading: 'Plate checks',
      rows: [
        { label: 'Plate shear area (Av)', value: res.Av_plate.toFixed(0), unit: 'mm²' },
        { label: 'Plate shear resistance (Vpl,Rd)', value: res.VplRd_plate, unit: 'kN' },
        { label: 'Plate shear utilisation', value: pct(res.util_plate_shear), key: true },
      ],
    },
    {
      heading: 'Block shear',
      rows: [
        { label: 'Block shear resistance (Vbs,Rd)', value: res.VbsRd, unit: 'kN' },
        { label: 'Block shear utilisation', value: pct(res.util_block), key: true },
      ],
    },
  ];

  if (inp.type === 'base-plate') {
    results.push({
      heading: 'Base plate bearing & column axial',
      rows: [
        { label: 'Bearing stress', value: res.bearing_stress.toFixed(3), unit: 'MPa' },
        { label: 'Bearing limit (0.67 fck)', value: res.bearing_limit.toFixed(2), unit: 'MPa' },
        { label: 'Bearing check', value: res.bearingOK ? 'Pass' : 'Fail', key: true },
        { label: 'Column squash resistance (Nc,Rd)', value: res.NcRd_column, unit: 'kN' },
        { label: 'Column axial utilisation', value: pct(res.util_column_axial), key: true },
      ],
    });
  }

  results.push({
    heading: 'Weld',
    rows: [
      { label: 'Fillet weld leg size', value: res.weldSize, unit: 'mm', key: true },
      { label: 'Weld utilisation', value: pct(res.weldUtil), key: true },
    ],
  });

  return {
    moduleTitle: 'Steel Connection Design',
    elementRef: `${typeLabel.split(' (')[0]} · ${res.nBolts}×M${inp.bolt.diameter}/${inp.bolt.grade}`,
    status: res.status,
    params,
    results,
    messages: res.messages,
    calcSteps: steelConnectionCalcNotes(inp, res, factors),
  };
}

// ── Portal frame ───────────────────────────────────────────────────────────
export function buildPortalFrameReport(
  inp: PortalFrameInputs,
  res: PortalFrameResults,
  factors: Factors,
): ReportData {
  const restraint = inp.lateralRestraint === 'full' ? 'Full lateral restraint'
    : inp.lateralRestraint === 'intermediate' ? 'Intermediate restraint' : 'Unrestrained';

  return {
    moduleTitle: 'Steel Portal Frame Design',
    elementRef: `Portal ${inp.span} m × ${inp.height} m @ ${inp.spacing} m`,
    status: res.status,

    params: [
      {
        heading: 'Frame geometry',
        rows: [
          { label: 'Span', value: inp.span, unit: 'm' },
          { label: 'Eaves height', value: inp.height, unit: 'm' },
          { label: 'Roof pitch', value: inp.pitch, unit: '°' },
          { label: 'Frame spacing', value: inp.spacing, unit: 'm' },
          { label: 'Base condition', value: inp.base === 'fixed' ? 'Fixed' : 'Pinned' },
        ],
      },
      {
        heading: 'Sections',
        rows: [
          { label: 'Rafter section', value: inp.rafterSection },
          { label: 'Column section', value: inp.columnSection },
          { label: 'Lateral restraint', value: restraint },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Roof dead load', value: inp.roofDL, unit: 'kN/m²' },
          { label: 'Roof live load', value: inp.roofLL, unit: 'kN/m²' },
          { label: 'Wind pressure', value: inp.windPressure, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Yield strength (fy)', value: inp.fyk, unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Geometry & actions',
        rows: [
          { label: 'Rafter length (along slope)', value: res.rafterLength, unit: 'm' },
          { label: 'Frame elevation area', value: res.frameArea, unit: 'm²' },
          { label: 'Factored rafter UDL (wEd)', value: res.wEd_rafter, unit: 'kN/m' },
          { label: 'Horizontal thrust (HEd)', value: res.HEd, unit: 'kN', key: true },
          { label: 'Vertical reaction per column (VEd)', value: res.VEd_col, unit: 'kN', key: true },
        ],
      },
      {
        heading: 'Rafter',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med_rafter, unit: 'kNm' },
          { label: 'Moment resistance (Mc,Rd)', value: res.McRd_rafter, unit: 'kNm' },
          { label: 'LTB resistance (Mb,Rd)', value: res.MbRd_rafter, unit: 'kNm' },
          { label: 'Rafter utilisation', value: pct(res.util_rafter), key: true },
          { label: 'LTB check', value: res.LTB_rafter.toUpperCase(), key: true },
        ],
      },
      {
        heading: 'Column',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med_col, unit: 'kNm' },
          { label: 'Moment resistance (Mc,Rd)', value: res.McRd_col, unit: 'kNm' },
          { label: 'Design axial (NEd)', value: res.NEd_col, unit: 'kN' },
          { label: 'Axial resistance (Nc,Rd)', value: res.NcRd_col, unit: 'kN' },
          { label: 'Column interaction utilisation', value: pct(res.util_col), key: true },
        ],
      },
      {
        heading: 'Sway stability',
        rows: [
          { label: 'Sway ratio (δ / h/250)', value: pct(res.swayRatio), key: true },
          { label: 'Sway check', value: res.swayOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: portalFrameCalcNotes(inp, res, factors),
  };
}

// ── Composite beam ─────────────────────────────────────────────────────────
export function buildCompositeBeamReport(
  inp: CompositeBeamInputs,
  res: CompositeBeamResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Composite Beam Design',
    elementRef: `${inp.steelSection} · ${inp.span} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Span', value: inp.span, unit: 'm' },
          { label: 'Beam spacing', value: inp.beamSpacing, unit: 'm' },
          { label: 'Steel section', value: inp.steelSection },
          { label: 'Slab depth (overall)', value: inp.slabDepth, unit: 'mm' },
          { label: 'Deck profile depth', value: inp.deckDepth, unit: 'mm' },
          { label: 'Slab type', value: inp.deckDepth > 0 ? 'Profiled metal deck' : 'Solid slab' },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Construction dead load', value: inp.deadLoadConst, unit: 'kN/m²' },
          { label: 'Superimposed dead load', value: inp.deadLoadFinal, unit: 'kN/m²' },
          { label: 'Live load', value: inp.liveLoad, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Steel yield (fy)', value: inp.fyk, unit: 'MPa' },
          { label: 'Concrete strength (fck)', value: inp.fck, unit: 'MPa' },
        ],
      },
      {
        heading: 'Shear connection',
        rows: [
          { label: 'Degree of interaction (η)', value: inp.interaction },
          { label: 'Stud diameter', value: inp.studDia, unit: 'mm' },
          { label: 'Stud height', value: inp.studHeight, unit: 'mm' },
          { label: 'Stud ultimate strength (fu)', value: inp.studFu, unit: 'MPa' },
          { label: 'Studs per row', value: inp.studsPerRow },
        ],
      },
    ],

    results: [
      {
        heading: 'Effective section',
        rows: [
          { label: 'Effective slab width (beff)', value: res.beff, unit: 'm', key: true },
          { label: 'Steel area (Aa)', value: res.Aa, unit: 'cm²' },
          { label: 'Steel depth (ha)', value: res.ha, unit: 'mm' },
          { label: 'Concrete depth above deck (hc)', value: res.hc, unit: 'mm' },
        ],
      },
      {
        heading: 'Bending',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med, unit: 'kNm', key: true },
          { label: 'Full composite resistance (Mpl,Rd)', value: res.Mpl_Rd, unit: 'kNm' },
          { label: 'Partial composite resistance', value: res.Mpl_partial, unit: 'kNm', key: true },
          { label: 'Bending utilisation', value: pct(res.util_bending), key: true },
        ],
      },
      {
        heading: 'Shear connectors',
        rows: [
          { label: 'Resistance per stud (PRd)', value: res.PRd_stud, unit: 'kN' },
          { label: 'Studs required (per half span)', value: res.nStudsRequired },
          { label: 'Studs provided (per half span)', value: res.nStudsProvided, key: true },
          { label: 'Stud spacing', value: res.studSpacing, unit: 'mm', key: true },
        ],
      },
      {
        heading: 'Vertical shear',
        rows: [
          { label: 'Design shear (VEd)', value: res.Ved, unit: 'kN', key: true },
          { label: 'Shear resistance (Vpl,Rd)', value: res.VplRd, unit: 'kN' },
          { label: 'Shear utilisation', value: pct(res.util_shear), key: true },
        ],
      },
      {
        heading: 'Deflection (SLS)',
        rows: [
          { label: 'Construction stage (steel alone)', value: res.delta_const, unit: 'mm' },
          { label: 'Composite stage (imposed)', value: res.delta_comp, unit: 'mm' },
          { label: 'Total deflection', value: res.delta_total, unit: 'mm', key: true },
          { label: 'Limit (L/360)', value: res.deltaLimit, unit: 'mm' },
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: compositeBeamCalcNotes(inp, res, factors),
  };
}
