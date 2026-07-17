/**
 * reportBuilders — maps each module's inputs/results onto the shared ReportData
 * contract consumed by <ReportButton>.
 *
 * Kept out of the page components so that the report content for a module is
 * defined in one place and reads as a document outline rather than being tangled
 * into JSX.
 */
import BeamSection from '../components/visuals/BeamSection';
import ColumnSection from '../components/visuals/ColumnSection';
import SlabSection from '../components/visuals/SlabSection';
import FoundationSection from '../components/visuals/FoundationSection';
import { beamCalcNotes, columnCalcNotes, slabCalcNotes, foundationCalcNotes } from './calcNotes';
import { flatSlabCalcNotes, retainingWallCalcNotes, staircaseCalcNotes } from './calcNotesGeotechSlab';
import { pileCalcNotes, pileCapCalcNotes, masonryCalcNotes } from './calcNotesPileMasonry';
import type { ReportData } from '../types/report';
import type { RetainingWallInputs, RetainingWallResults } from './retainingWallCalculations';
import type { StaircaseInputs, StaircaseResults } from './staircaseCalculations';
import type { PileInputs, PileResults } from './pileCalculations';
import type { PileCapInputs, PileCapResults } from './pileCapCalculations';
import type { MasonryInputs, MasonryResults } from './masonryCalculations';
import type {
  BeamInputs, BeamResults,
  ColumnInputs, ColumnResults,
  SlabInputs, SlabResults,
  FoundationInputs, FoundationResults,
} from '../types/structural';
import type { FlatSlabInputs, FlatSlabResults } from './flatSlabCalculations';
import type { CodeFactors } from '../context/BuildingCodeContext';

type Factors = Partial<CodeFactors> & { code?: string; label?: string };

// BeamResults carries a few SLS extras that aren't on the declared interface.
interface BeamExtras { crackWidth?: number; crackOK?: boolean; isT?: boolean; bEff?: number }

export function buildBeamReport(
  inp: BeamInputs,
  res: BeamResults,
  factors: Factors,
): ReportData {
  const x = res as unknown as BeamExtras;
  const support = inp.supportType === 'simply-supported' ? 'Simply supported'
    : inp.supportType === 'continuous' ? 'Continuous' : 'Cantilever';

  return {
    moduleTitle: 'RC Beam Design',
    elementRef: `Beam ${inp.width}×${inp.depth} · ${inp.span} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry & support',
        rows: [
          { label: 'Support condition', value: support },
          { label: 'Section type', value: x.isT ? 'T-beam / flanged' : 'Rectangular' },
          { label: 'Span (L)', value: inp.span, unit: 'm' },
          { label: 'Web width (bw)', value: inp.width, unit: 'mm' },
          { label: 'Overall depth (h)', value: inp.depth, unit: 'mm' },
          ...(inp.flange ? [
            { label: 'Flange width (bf)', value: inp.flange.width, unit: 'mm' },
            { label: 'Flange thickness (hf)', value: inp.flange.thickness, unit: 'mm' },
          ] : []),
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Dead load (Gk)', value: inp.deadLoad, unit: 'kN/m' },
          { label: 'Live load (Qk)', value: inp.liveLoad, unit: 'kN/m' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
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
        heading: 'Section & bending reinforcement',
        rows: [
          { label: 'Effective depth (d)', value: res.d.toFixed(1), unit: 'mm' },
          { label: 'Neutral axis depth (x)', value: res.x.toFixed(1), unit: 'mm' },
          ...(x.bEff ? [{ label: 'Effective flange width (beff)', value: x.bEff.toFixed(0), unit: 'mm' }] : []),
          { label: 'As required', value: res.AsReq.toFixed(0), unit: 'mm²' },
          { label: 'As minimum', value: res.AsProvMin.toFixed(0), unit: 'mm²' },
          { label: 'As maximum', value: res.AsProvMax.toFixed(0), unit: 'mm²' },
          { label: 'Bars provided', value: `${res.mainBars.count}T${res.mainBars.dia}`, key: true },
          { label: 'As provided', value: res.mainBars.As.toFixed(0), unit: 'mm²', key: true },
        ],
      },
      {
        heading: 'Shear reinforcement',
        rows: [
          { label: 'Links', value: `T${res.stirrups.dia}@${res.stirrups.spacing} (${res.stirrups.legs} legs)`, key: true },
          { label: 'Shear check', value: res.shearOK ? 'Pass' : 'Fail' },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail' },
          ...(x.crackWidth !== undefined ? [
            { label: 'Crack width (wk)', value: x.crackWidth.toFixed(3), unit: 'mm' },
            { label: 'Crack check', value: x.crackOK ? 'Pass' : 'Fail' },
          ] : []),
        ],
      },
    ],

    messages: res.messages,
    calcSteps: beamCalcNotes(inp, res, factors),
    visuals: [
      { label: 'Beam cross-section, reinforcement and stress block', node: <BeamSection inputs={inp} results={res} /> },
    ],
  };
}

export function buildColumnReport(
  inp: ColumnInputs,
  res: ColumnResults,
  factors: Factors,
): ReportData {
  const isCirc = inp.shape === 'circular';
  const shape = isCirc ? 'Circular' : inp.shape === 'square' ? 'Square' : 'Rectangular';

  return {
    moduleTitle: 'RC Column Design',
    elementRef: isCirc ? `Column Ø${inp.b}` : `Column ${inp.b}×${inp.h}`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Section shape', value: shape },
          ...(isCirc
            ? [{ label: 'Diameter (D)', value: inp.b, unit: 'mm' }]
            : [
                { label: 'Width (b)', value: inp.b, unit: 'mm' },
                { label: 'Depth (h)', value: inp.h, unit: 'mm' },
              ]),
          { label: 'Effective length / height', value: inp.height, unit: 'm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
          { label: 'Bracing', value: inp.braced ? 'Braced' : 'Unbraced' },
        ],
      },
      {
        heading: 'Loading (design actions)',
        rows: [
          { label: 'Axial load (NEd)', value: inp.Ned, unit: 'kN' },
          { label: 'Moment about x (MEd,x)', value: inp.Medx, unit: 'kNm' },
          { label: 'Moment about y (MEd,y)', value: inp.Medy, unit: 'kNm' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Slenderness',
        rows: [
          { label: 'Slenderness ratio (λy)', value: res.slendernessY.toFixed(1) },
          { label: 'Slenderness ratio (λx)', value: res.slendernessX.toFixed(1) },
          { label: 'Classification', value: res.isSlender ? 'Slender' : 'Short', key: true },
        ],
      },
      {
        heading: 'Longitudinal reinforcement',
        rows: [
          { label: 'As required', value: res.AsReq.toFixed(0), unit: 'mm²' },
          { label: 'As minimum', value: res.minAs.toFixed(0), unit: 'mm²' },
          { label: 'As maximum', value: res.maxAs.toFixed(0), unit: 'mm²' },
          { label: 'Bars provided', value: `${res.mainBars.count}T${res.mainBars.dia}`, key: true },
          { label: 'As provided', value: res.mainBars.As.toFixed(0), unit: 'mm²', key: true },
        ],
      },
      {
        heading: 'Links & capacity',
        rows: [
          { label: 'Links', value: `T${res.links.dia}@${res.links.spacing}` },
          { label: 'Axial capacity (NRd)', value: res.capacity.toFixed(1), unit: 'kN', key: true },
          { label: 'Utilisation (NEd/NRd)', value: `${((inp.Ned / res.capacity) * 100).toFixed(0)}%`, key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: columnCalcNotes(inp, res, factors),
    visuals: [
      { label: 'Column cross-section and reinforcement arrangement', node: <ColumnSection inputs={inp} results={res} /> },
    ],
  };
}

export function buildSlabReport(
  inp: SlabInputs,
  res: SlabResults,
  factors: Factors,
): ReportData {
  const edge = inp.edgeCondition === 'simply-supported' ? 'Simply supported'
    : inp.edgeCondition === 'continuous-all' ? 'Continuous all edges'
    : inp.edgeCondition === 'continuous-one' ? 'Continuous one edge' : 'Cantilever';

  return {
    moduleTitle: 'RC Slab Design',
    elementRef: `Slab ${inp.lx}×${inp.ly} m · ${inp.thickness} mm`,
    status: res.status,

    params: [
      {
        heading: 'Geometry & support',
        rows: [
          { label: 'Slab type', value: inp.type === 'one-way' ? 'One-way spanning' : 'Two-way spanning' },
          { label: 'Edge condition', value: edge },
          { label: 'Short span (lx)', value: inp.lx, unit: 'm' },
          { label: 'Long span (ly)', value: inp.ly, unit: 'm' },
          { label: 'Overall thickness (h)', value: inp.thickness, unit: 'mm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Dead load (gk)', value: inp.deadLoad, unit: 'kN/m²' },
          { label: 'Live load (qk)', value: inp.liveLoad, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Design moments (ULS)',
        rows: [
          { label: 'Moment, short span (MEd,x)', value: res.Med_x.toFixed(2), unit: 'kNm/m', key: true },
          { label: 'Moment, long span (MEd,y)', value: res.Med_y.toFixed(2), unit: 'kNm/m' },
          { label: 'K = MEd/(fck·b·d²)', value: res.K.toFixed(3) },
          { label: 'Lever arm (z)', value: res.z.toFixed(1), unit: 'mm' },
          { label: 'Effective depth (d)', value: res.d.toFixed(1), unit: 'mm' },
        ],
      },
      {
        heading: 'Reinforcement',
        rows: [
          { label: 'As required, short span', value: res.As_x.toFixed(0), unit: 'mm²/m' },
          { label: 'As required, long span', value: res.As_y.toFixed(0), unit: 'mm²/m' },
          { label: 'As minimum', value: res.As_min.toFixed(0), unit: 'mm²/m' },
          { label: 'As maximum', value: res.As_max.toFixed(0), unit: 'mm²/m' },
          { label: 'Bars, short span', value: `T${res.barsX.dia}@${res.barsX.spacing}`, key: true },
          { label: 'As provided, short span', value: res.barsX.As.toFixed(0), unit: 'mm²/m', key: true },
          { label: 'Bars, long span', value: `T${res.barsY.dia}@${res.barsY.spacing}`, key: true },
          { label: 'As provided, long span', value: res.barsY.As.toFixed(0), unit: 'mm²/m', key: true },
        ],
      },
      {
        heading: 'Shear',
        rows: [
          { label: 'Design shear (VEd)', value: res.Ved.toFixed(2), unit: 'kN/m' },
          { label: 'Concrete resistance (VRd,c)', value: res.VRdc.toFixed(2), unit: 'kN/m' },
          { label: 'Shear check', value: res.shearOK ? 'Pass' : 'Fail', key: true },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Span/depth ratio', value: res.spanRatio.toFixed(1) },
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: slabCalcNotes(inp, res, factors),
    visuals: [
      { label: 'Slab section and reinforcement arrangement', node: <SlabSection inputs={inp} results={res} /> },
    ],
  };
}

export function buildFoundationReport(
  inp: FoundationInputs,
  res: FoundationResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Foundation Design',
    elementRef: `${inp.type === 'pad' ? 'Pad' : 'Strip'} footing ${res.B.toFixed(2)}×${res.L.toFixed(2)} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Foundation type', value: inp.type === 'pad' ? 'Pad footing' : 'Strip footing' },
          { label: 'Column width (b)', value: inp.columnB, unit: 'mm' },
          { label: 'Column depth (h)', value: inp.columnH, unit: 'mm' },
          { label: 'Founding depth below GL', value: inp.depth, unit: 'mm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
          ...(inp.stripLength !== undefined
            ? [{ label: 'Strip length', value: inp.stripLength, unit: 'm' }]
            : []),
        ],
      },
      {
        heading: 'Loading',
        rows: [
          { label: 'Column axial load (NEd)', value: inp.Ned, unit: 'kN' },
          { label: 'Column moment (MEd)', value: inp.Med, unit: 'kNm' },
          { label: 'Horizontal force (HEd)', value: inp.Hed, unit: 'kN' },
          { label: 'Self-weight allowance', value: inp.selfWeight, unit: '% of NEd' },
        ],
      },
      {
        heading: 'Ground',
        rows: [
          { label: 'Allowable bearing pressure', value: inp.soilBearing, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Base sizing & bearing',
        rows: [
          { label: 'Base length (L)', value: res.L.toFixed(2), unit: 'm', key: true },
          { label: 'Base width (B)', value: res.B.toFixed(2), unit: 'm', key: true },
          { label: 'Base thickness (h)', value: res.h.toFixed(0), unit: 'mm', key: true },
          { label: 'Effective depth (d)', value: res.d.toFixed(1), unit: 'mm' },
          { label: 'Net soil pressure (qEd)', value: res.qEd.toFixed(1), unit: 'kN/m²', key: true },
        ],
      },
      {
        heading: 'Reinforcement',
        rows: [
          { label: 'As required (bottom)', value: res.As_bot.toFixed(0), unit: 'mm²/m' },
          { label: 'Bars provided (bottom)', value: `T${res.barsBot.dia}@${res.barsBot.spacing}`, key: true },
          { label: 'As provided (bottom)', value: res.barsBot.As.toFixed(0), unit: 'mm²/m', key: true },
        ],
      },
      {
        heading: 'Design checks',
        rows: [
          { label: 'Bending check', value: res.bendingOK ? 'Pass' : 'Fail', key: true },
          { label: 'Punching shear check', value: res.punchingOK ? 'Pass' : 'Fail', key: true },
          // FoS_sliding is Infinity when there is no horizontal load — show that
          // rather than a literal "Infinity" in a record issued for approval.
          { label: 'Factor of safety, sliding',
            value: Number.isFinite(res.FoS_sliding) ? res.FoS_sliding.toFixed(2) : 'N/A — no horizontal load' },
          { label: 'Sliding check', value: res.slidingOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: foundationCalcNotes(inp, res, factors),
    visuals: [
      { label: 'Foundation section and reinforcement arrangement', node: <FoundationSection inputs={inp} results={res} /> },
    ],
  };
}

export function buildFlatSlabReport(
  inp: FlatSlabInputs,
  res: FlatSlabResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Flat Slab Design',
    elementRef: `Flat slab ${inp.lx}×${inp.ly} m · ${inp.thickness} mm`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Span, x-direction (lx)', value: inp.lx, unit: 'm' },
          { label: 'Span, y-direction (ly)', value: inp.ly, unit: 'm' },
          { label: 'Overall thickness (h)', value: inp.thickness, unit: 'mm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
          { label: 'Column dimension, x (cx)', value: inp.columnCx, unit: 'mm' },
          { label: 'Column dimension, y (cy)', value: inp.columnCy, unit: 'mm' },
          { label: 'Column location', value: inp.interiorCol ? 'Interior' : 'Edge' },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Superimposed dead load (gk)', value: inp.deadLoad, unit: 'kN/m²' },
          { label: 'Live load (qk)', value: inp.liveLoad, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Design actions (ULS)',
        rows: [
          { label: 'Design load (wEd)', value: res.wEd.toFixed(2), unit: 'kN/m²', key: true },
          { label: 'Effective depth (d)', value: res.d.toFixed(1), unit: 'mm' },
          { label: 'Column strip hogging (MEd)', value: res.Med_cs_neg.toFixed(2), unit: 'kNm/m', key: true },
          { label: 'Column strip sagging (MEd)', value: res.Med_cs_pos.toFixed(2), unit: 'kNm/m' },
          { label: 'Middle strip sagging (MEd)', value: res.Med_ms_pos.toFixed(2), unit: 'kNm/m' },
        ],
      },
      {
        heading: 'Reinforcement',
        rows: [
          { label: 'As required, column strip top', value: res.As_cs_top.toFixed(0), unit: 'mm²/m' },
          { label: 'Bars, column strip top', value: `T${res.bars_cs_top.dia}@${res.bars_cs_top.spacing}`, key: true },
          { label: 'As provided, column strip top', value: res.bars_cs_top.As.toFixed(0), unit: 'mm²/m' },
          { label: 'As required, column strip bottom', value: res.As_cs_bot.toFixed(0), unit: 'mm²/m' },
          { label: 'Bars, column strip bottom', value: `T${res.bars_cs_bot.dia}@${res.bars_cs_bot.spacing}`, key: true },
          { label: 'As provided, column strip bottom', value: res.bars_cs_bot.As.toFixed(0), unit: 'mm²/m' },
          { label: 'As required, middle strip bottom', value: res.As_ms_bot.toFixed(0), unit: 'mm²/m' },
          { label: 'Bars, middle strip bottom', value: `T${res.bars_ms_bot.dia}@${res.bars_ms_bot.spacing}`, key: true },
          { label: 'As provided, middle strip bottom', value: res.bars_ms_bot.As.toFixed(0), unit: 'mm²/m' },
        ],
      },
      {
        heading: 'Punching shear',
        rows: [
          { label: 'Punching load (VEd)', value: res.VEd.toFixed(1), unit: 'kN' },
          { label: 'Basic control perimeter (u1)', value: res.u1.toFixed(0), unit: 'mm' },
          { label: 'Shear stress (vEd)', value: res.vEd.toFixed(3), unit: 'MPa', key: true },
          { label: 'Concrete resistance (vRd,c)', value: res.vRdc.toFixed(3), unit: 'MPa', key: true },
          { label: 'Punching check', value: res.punchingOK ? 'Pass' : 'Fail', key: true },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Span/depth ratio', value: res.spanRatio.toFixed(1) },
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: flatSlabCalcNotes(inp, res, factors),
  };
}

// â”€â”€â”€ Retaining Wall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildRetainingWallReport(
  inp: RetainingWallInputs,
  res: RetainingWallResults,
  factors: Factors,
): ReportData {
  const isCantilever = inp.type === 'cantilever';
  const heel = inp.baseWidth - inp.toeTip - inp.stemWidth / 1000;

  return {
    moduleTitle: 'Retaining Wall Design',
    elementRef: `${isCantilever ? 'Cantilever' : 'Gravity'} wall Â· H ${inp.height} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Wall type', value: isCantilever ? 'Cantilever RC' : 'Gravity (mass concrete)' },
          { label: 'Retained height (H)', value: inp.height, unit: 'm' },
          { label: 'Base width (B)', value: inp.baseWidth, unit: 'm' },
          { label: 'Toe length (a)', value: inp.toeTip, unit: 'm' },
          { label: isCantilever ? 'Stem width' : 'Crown (top) width', value: inp.stemWidth, unit: 'mm' },
          ...(isCantilever ? [
            { label: 'Heel length', value: heel.toFixed(3), unit: 'm' },
            { label: 'Base slab thickness', value: inp.baseThk, unit: 'mm' },
          ] : []),
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Soil & loading',
        rows: [
          { label: 'Soil unit weight (Î³s)', value: inp.soilDensity, unit: 'kN/mÂ³' },
          { label: 'Internal friction angle (Ï†â€²)', value: inp.soilAngle, unit: 'Â°' },
          { label: 'Cohesion (câ€²)', value: inp.soilCohesion, unit: 'kPa' },
          { label: 'Surcharge (q)', value: inp.surcharge, unit: 'kPa' },
          { label: 'Concrete unit weight (Î³c)', value: inp.concreteDensity, unit: 'kN/mÂ³' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Earth pressure',
        rows: [
          { label: 'Active pressure coefficient (Ka)', value: res.Ka.toFixed(3), key: true },
          { label: 'Horizontal thrust (Ph)', value: res.Ph.toFixed(2), unit: 'kN/m', key: true },
          { label: 'Vertical component (Pv)', value: res.Pv.toFixed(2), unit: 'kN/m' },
        ],
      },
      {
        heading: 'Stability',
        rows: [
          { label: 'Concrete self-weight', value: res.W_concrete.toFixed(2), unit: 'kN/m' },
          { label: 'Soil weight on heel', value: res.W_soil.toFixed(2), unit: 'kN/m' },
          { label: 'Total vertical load', value: res.V_total.toFixed(2), unit: 'kN/m' },
          { label: 'Restoring moment', value: res.restoringM.toFixed(2), unit: 'kNm/m' },
          { label: 'Overturning moment', value: res.overturningM.toFixed(2), unit: 'kNm/m' },
          { label: 'FoS overturning', value: res.FoS_overturning.toFixed(2), key: true },
          { label: 'FoS sliding', value: res.FoS_sliding.toFixed(2), key: true },
        ],
      },
      {
        heading: 'Bearing pressure',
        rows: [
          { label: 'Eccentricity (e)', value: res.eccentricity.toFixed(3), unit: 'm', key: true },
          { label: 'Middle third (B/6)', value: (inp.baseWidth / 6).toFixed(3), unit: 'm' },
          { label: 'Maximum pressure (qmax)', value: res.qmax.toFixed(1), unit: 'kPa', key: true },
          { label: 'Minimum pressure (qmin)', value: res.qmin.toFixed(1), unit: 'kPa' },
        ],
      },
      ...(isCantilever ? [
        {
          heading: 'Stem design',
          rows: [
            { label: 'Design moment at stem base (MEd)', value: res.Med_stem.toFixed(2), unit: 'kNm/m', key: true },
            { label: 'Effective depth (d)', value: res.d_stem.toFixed(1), unit: 'mm' },
            { label: 'As required (stem)', value: res.As_stem.toFixed(0), unit: 'mmÂ²/m', key: true },
          ],
        },
        {
          heading: 'Base design',
          rows: [
            { label: 'Toe moment (MEd,toe)', value: res.Med_toe.toFixed(2), unit: 'kNm/m' },
            { label: 'As required (toe)', value: res.As_toe.toFixed(0), unit: 'mmÂ²/m', key: true },
            { label: 'Heel moment (MEd,heel)', value: res.Med_heel.toFixed(2), unit: 'kNm/m' },
            { label: 'As required (heel)', value: res.As_heel.toFixed(0), unit: 'mmÂ²/m', key: true },
          ],
        },
      ] : []),
    ],

    messages: res.messages,
    calcSteps: retainingWallCalcNotes(inp, res, factors),
  };
}

// â”€â”€â”€ RC Staircase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildStaircaseReport(
  inp: StaircaseInputs,
  res: StaircaseResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'RC Staircase Design',
    elementRef: `Flight ${inp.numRisers}R Â· ${inp.riser}/${inp.going} mm`,
    status: res.status,

    params: [
      {
        heading: 'Flight geometry',
        rows: [
          { label: 'Support condition', value: inp.supportType === 'continuous' ? 'Continuous' : 'Simply supported' },
          { label: 'Riser (R)', value: inp.riser, unit: 'mm' },
          { label: 'Going (G)', value: inp.going, unit: 'mm' },
          { label: 'Number of risers', value: inp.numRisers },
          { label: 'Flight width', value: inp.flightWidth, unit: 'm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Loading (characteristic)',
        rows: [
          { label: 'Additional dead load (Gk)', value: inp.deadLoad, unit: 'kN/mÂ²' },
          { label: 'Live load (Qk)', value: inp.liveLoad, unit: 'kN/mÂ²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Slope angle', value: res.slopeAngle.toFixed(1), unit: 'Â°' },
          { label: 'Stepping rule', value: res.goingCheck },
          { label: 'Waist depth', value: res.waistDepth, unit: 'mm', key: true },
          { label: 'Effective span', value: res.effectiveSpan.toFixed(3), unit: 'm', key: true },
        ],
      },
      {
        heading: 'Loading',
        rows: [
          { label: 'Self-weight (waist + steps)', value: res.selfWeight.toFixed(2), unit: 'kN/mÂ²' },
          { label: 'Total load (characteristic)', value: res.totalLoad.toFixed(2), unit: 'kN/mÂ²' },
          { label: 'Design load (wULS)', value: res.wULS.toFixed(2), unit: 'kN/m', key: true },
        ],
      },
      {
        heading: 'Bending reinforcement',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med.toFixed(2), unit: 'kNm/m', key: true },
          { label: 'Effective depth (d)', value: res.d.toFixed(1), unit: 'mm' },
          { label: 'As required', value: res.As_req.toFixed(0), unit: 'mmÂ²/m' },
          { label: 'Bars provided', value: `T${res.bars.dia}@${res.bars.spacing}`, key: true },
          { label: 'As provided', value: res.bars.As.toFixed(0), unit: 'mmÂ²/m', key: true },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Span/depth ratio', value: res.spanRatio.toFixed(1) },
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: staircaseCalcNotes(inp, res, factors),
  };
}

// â”€â”€â”€ Pile Design â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PILE_TYPE_LABEL: Record<PileInputs['pileType'], string> = {
  'bored': 'Bored (cast in-situ)',
  'driven-precast': 'Driven precast concrete',
  'driven-timber': 'Driven timber',
};

export function buildPileReport(
  inp: PileInputs,
  res: PileResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Pile Design',
    elementRef: `Ã˜${inp.diameter} Ã— ${inp.length} m ${inp.pileType}`,
    status: res.status,

    params: [
      {
        heading: 'Pile geometry & type',
        rows: [
          { label: 'Pile type', value: PILE_TYPE_LABEL[inp.pileType] },
          { label: 'Load type', value: inp.loadType === 'tension' ? 'Tension' : 'Compression' },
          { label: 'Diameter', value: inp.diameter, unit: 'mm' },
          { label: 'Embedded length', value: inp.length, unit: 'm' },
          { label: 'Groundwater table depth', value: inp.gwt, unit: 'm' },
          { label: 'Factor of safety (FoS)', value: inp.FoS },
        ],
      },
      {
        heading: 'Soil profile',
        rows: inp.layers.map((l, i) => ({
          label: `Layer ${i + 1} â€” ${l.soilType}`,
          value: [
            `${l.thickness} m`,
            l.cu !== undefined ? `cu = ${l.cu} kPa` : null,
            l.phi !== undefined ? `Ï† = ${l.phi}Â°` : null,
            l.gamma !== undefined ? `Î³ = ${l.gamma} kN/mÂ³` : null,
            l.nValue !== undefined ? `N = ${l.nValue}` : null,
          ].filter(Boolean).join(' Â· '),
        })),
      },
    ],

    results: [
      {
        heading: 'Section properties',
        rows: [
          { label: 'Shaft perimeter', value: res.perimetre.toFixed(3), unit: 'm' },
          { label: 'Tip area', value: res.area_tip.toFixed(4), unit: 'mÂ²' },
        ],
      },
      ...(res.layerFriction.length ? [{
        heading: 'Shaft friction by layer',
        rows: res.layerFriction.map(l => ({
          label: l.label,
          value: `qs = ${l.qs.toFixed(1)} kPa â†’ Qs = ${l.Qs_layer.toFixed(1)} kN`,
        })),
      }] : []),
      {
        heading: 'Capacity',
        rows: [
          { label: 'Shaft friction (Qs)', value: res.Qs.toFixed(1), unit: 'kN', key: true },
          { label: 'End bearing (Qb)', value: res.Qb.toFixed(1), unit: 'kN', key: true },
          { label: 'Ultimate capacity (Qu)', value: res.Qu.toFixed(1), unit: 'kN', key: true },
          { label: 'Allowable capacity (Qa = Qu/FoS)', value: res.Qa.toFixed(1), unit: 'kN', key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: pileCalcNotes(inp, res, factors),
  };
}

// â”€â”€â”€ Pile Cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildPileCapReport(
  inp: PileCapInputs,
  res: PileCapResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Pile Cap Design',
    elementRef: `${inp.arrangement} cap Â· ${inp.capThickness} mm thick`,
    status: res.status,

    params: [
      {
        heading: 'Arrangement & geometry',
        rows: [
          { label: 'Pile arrangement', value: inp.arrangement },
          { label: 'Pile diameter', value: inp.pileDia, unit: 'mm' },
          { label: 'Pile spacing (c/c)', value: inp.pileSpacing, unit: 'mm' },
          { label: 'Cap thickness', value: inp.capThickness, unit: 'mm' },
          { label: 'Projection beyond outer pile CL', value: inp.capProjection, unit: 'mm' },
          { label: 'Nominal cover (c)', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Column & loading',
        rows: [
          { label: 'Column width (b)', value: inp.colB, unit: 'mm' },
          { label: 'Column depth (h)', value: inp.colH, unit: 'mm' },
          { label: 'Column axial load (NEd, ULS)', value: inp.Ned, unit: 'kN' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete grade', value: inp.material.concrete },
          { label: 'Characteristic strength (fck)', value: inp.material.fck, unit: 'MPa' },
          { label: 'Design strength (fcd)', value: inp.material.fcd.toFixed(1), unit: 'MPa' },
          { label: 'Rebar grade', value: inp.material.rebar },
          { label: 'Characteristic yield (fyk)', value: inp.material.fyk, unit: 'MPa' },
          { label: 'Design yield (fyd)', value: inp.material.fyd.toFixed(1), unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Cap geometry & pile loads',
        rows: [
          { label: 'Cap plan size X', value: res.capSizeX.toFixed(0), unit: 'mm' },
          { label: 'Cap plan size Y', value: res.capSizeY.toFixed(0), unit: 'mm' },
          { label: 'Cap self-weight (ULS)', value: res.pileCap_weight.toFixed(0), unit: 'kN' },
          { label: 'Load per pile', value: res.pileLoad.toFixed(0), unit: 'kN', key: true },
        ],
      },
      {
        heading: 'Bending design',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med.toFixed(1), unit: 'kNm', key: true },
          { label: 'Effective depth (d)', value: res.d.toFixed(0), unit: 'mm' },
          { label: 'As required', value: res.As_req.toFixed(0), unit: 'mmÂ²/m' },
          { label: 'Bars provided (EW bottom)', value: `T${res.bars.dia}@${res.bars.spacing}`, key: true },
          { label: 'As provided', value: res.bars.As.toFixed(0), unit: 'mmÂ²/m', key: true },
        ],
      },
      {
        heading: 'Punching shear at column',
        rows: [
          { label: 'Design shear stress (vEd)', value: res.vEd_col.toFixed(3), unit: 'MPa', key: true },
          { label: 'Concrete resistance (vRd,c)', value: res.vRdc.toFixed(3), unit: 'MPa', key: true },
          { label: 'Punching check', value: res.punchOK ? 'Pass' : 'Fail' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: pileCapCalcNotes(inp, res, factors),
  };
}

// â”€â”€â”€ Masonry Wall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESTRAINT_LABEL: Record<MasonryInputs['floorCondition'], string> = {
  'both-fixed': 'Both ends fixed/restrained',
  'one-fixed': 'One end fixed, one pinned',
  'both-pinned': 'Both ends pinned',
};

export function buildMasonryReport(
  inp: MasonryInputs,
  res: MasonryResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Masonry Wall Design',
    elementRef: `${inp.thickness} mm ${inp.wallType} Â· ${inp.clearHeight} m`,
    status: res.status,

    params: [
      {
        heading: 'Wall construction',
        rows: [
          { label: 'Unit type', value: inp.unitType },
          { label: 'Mortar class', value: inp.mortar },
          { label: 'Wall type', value: inp.wallType },
          { label: 'Leaf thickness (t)', value: inp.thickness, unit: 'mm' },
          { label: 'Clear storey height (h)', value: inp.clearHeight, unit: 'm' },
          { label: 'Restraint condition', value: RESTRAINT_LABEL[inp.floorCondition] },
        ],
      },
      {
        heading: 'Loading (characteristic, per metre run)',
        rows: [
          { label: 'Permanent load (Gk)', value: inp.Gk, unit: 'kN/m' },
          { label: 'Variable load (Qk)', value: inp.Qk, unit: 'kN/m' },
          { label: 'Load eccentricity (ek)', value: inp.ek, unit: 'mm' },
          { label: 'Wind pressure', value: inp.windPressure, unit: 'kN/mÂ²' },
        ],
      },
    ],

    results: [
      {
        heading: 'Masonry strength',
        rows: [
          { label: 'Characteristic strength (fk)', value: res.fk.toFixed(2), unit: 'MPa', key: true },
          { label: 'Design strength (fkd)', value: res.fkd.toFixed(3), unit: 'MPa', key: true },
        ],
      },
      {
        heading: 'Slenderness',
        rows: [
          { label: 'Effective height (hef)', value: res.hef.toFixed(2), unit: 'm' },
          { label: 'Effective thickness (tef)', value: res.tef.toFixed(3), unit: 'm' },
          { label: 'Slenderness ratio (Î»)', value: res.slenderness.toFixed(1), key: true },
          { label: 'Slenderness check (Î» â‰¤ 27)', value: res.slenderness_ok ? 'Pass' : 'Fail' },
        ],
      },
      {
        heading: 'Eccentricity & capacity reduction',
        rows: [
          { label: 'Total eccentricity (e)', value: res.e_total.toFixed(1), unit: 'mm', key: true },
          { label: 'Reduction factor (Î¦)', value: res.Phi.toFixed(3), key: true },
        ],
      },
      {
        heading: 'Vertical load capacity',
        rows: [
          { label: 'Design vertical load (NEd)', value: res.NEdpm.toFixed(1), unit: 'kN/m', key: true },
          { label: 'Design resistance (NRd)', value: res.NRd.toFixed(1), unit: 'kN/m', key: true },
          { label: 'Utilisation (NEd/NRd)', value: res.utilisation.toFixed(3), key: true },
        ],
      },
      {
        heading: 'Lateral (wind) bending',
        rows: [
          { label: 'Design moment (MEd,wind)', value: res.Med_wind.toFixed(3), unit: 'kNm/m' },
          { label: 'Bending resistance (MRd,wind)', value: res.MRd_wind.toFixed(3), unit: 'kNm/m' },
          { label: 'Wind bending check', value: inp.windPressure > 0 ? (res.windOK ? 'Pass' : 'Fail') : 'Not applicable' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: masonryCalcNotes(inp, res, factors),
  };
}
