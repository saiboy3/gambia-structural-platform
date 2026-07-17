/**
 * reportBuildersTransport — ReportData builders for the transport/infrastructure
 * modules (pavement, culvert, bridge beam, abutment) and the Quick Design wizard.
 *
 * Split out from reportBuilders.tsx the same way calcNotesTransport.ts is split
 * from calcNotes.ts: same contract, same shape, kept independent.
 */
import {
  pavementCalcNotes, culvertCalcNotes, bridgeBeamCalcNotes, abutmentCalcNotes,
} from './calcNotesTransport';
import { quickDesignCalcNotes } from './calcNotesQuickDesign';
import type { ReportData, ReportGroup, ReportRow } from '../types/report';
import type { PavementInputs, PavementResults } from './pavementCalculations';
import type { CulvertInputs, CulvertResults } from './culvertCalculations';
import type { BridgeBeamInputs, BridgeBeamResults } from './bridgeBeamCalculations';
import type { AbutmentInputs, AbutmentResults } from './abutmentCalculations';
import {
  OCCUPANCY_TYPES, LOCATIONS,
  type QuickDesignInputs, type QuickDesignResults, type ColumnPosition,
} from './quickDesign';
import type { CodeFactors } from '../context/BuildingCodeContext';

type Factors = Partial<CodeFactors> & { code?: string; label?: string };

// ── Pavement ─────────────────────────────────────────────────────────────────

const ROAD_CLASS_LABEL: Record<PavementInputs['roadClass'], string> = {
  trunk: 'Trunk Road (National highway)',
  main: 'Main Road (Regional)',
  secondary: 'Secondary Road (Feeder)',
  access: 'Access Road (Rural)',
  estate: 'Estate / Compound Road',
};

const SUBGRADE_LABEL: Record<PavementInputs['subgradeType'], string> = {
  poor: 'Poor (laterite clay, wet season ≤ 2%)',
  moderate: 'Moderate (compacted laterite ~5%)',
  good: 'Good (well-graded gravel ~10%)',
  excellent: 'Excellent (natural gravel >15%)',
};

const GROWTH_LABEL: Record<PavementInputs['trafficGrowth'], string> = {
  low: 'Low (2% p.a.)', medium: 'Medium (4% p.a.)', high: 'High (7% p.a.)',
};

export function buildPavementReport(
  inp: PavementInputs,
  res: PavementResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Road Pavement Design (CBR Method)',
    elementRef: `${inp.pavementType === 'flexible' ? 'Flexible' : 'Rigid'} pavement · ${res.totalThickness} mm`,
    status: res.status,

    params: [
      {
        heading: 'Road classification',
        rows: [
          { label: 'Road class', value: ROAD_CLASS_LABEL[inp.roadClass] },
          { label: 'Pavement type', value: inp.pavementType === 'flexible' ? 'Flexible (bituminous)' : 'Rigid (concrete, JPCP)' },
          { label: 'Design life', value: inp.designLife, unit: 'years' },
        ],
      },
      {
        heading: 'Subgrade',
        rows: [
          { label: 'Subgrade type', value: SUBGRADE_LABEL[inp.subgradeType] },
          ...(inp.customCBR !== undefined
            ? [{ label: 'Custom CBR (override)', value: inp.customCBR, unit: '%' }]
            : []),
          { label: 'Improved subgrade layer', value: inp.useImprovedSubgrade ? 'Yes (lime/cement stabilised)' : 'No' },
        ],
      },
      {
        heading: 'Traffic',
        rows: [
          { label: 'Traffic growth', value: GROWTH_LABEL[inp.trafficGrowth] },
          { label: 'Heavy vehicles (HGV)', value: inp.percentHeavy, unit: '% of AADT' },
          { label: 'Equivalent axle load', value: inp.equivalentAxleLoad, unit: 'kN' },
        ],
      },
    ],

    results: [
      {
        heading: 'Design traffic',
        rows: [
          { label: 'Design ESAL', value: res.designESAL.toFixed(2), unit: 'million', key: true },
          { label: 'Million standard axles (MSA)', value: res.msa.toFixed(2), unit: 'MSA', key: true },
          { label: 'Design CBR', value: res.cbr, unit: '%', key: true },
        ],
      },
      {
        heading: 'Pavement structure',
        rows: [
          ...res.layers.map<ReportRow>(l => ({
            label: `${l.name} — ${l.material}`,
            value: l.thickness,
            unit: 'mm',
          })),
          { label: 'Total structural thickness', value: res.totalThickness, unit: 'mm', key: true },
        ],
      },
      {
        heading: 'Layer notes',
        rows: res.layers.map<ReportRow>(l => ({ label: l.name, value: l.note })),
      },
      {
        heading: 'Material quantities (per km per 3.5 m lane)',
        rows: [
          { label: 'Surfacing / slab', value: res.surfacingVol, unit: 'm³' },
          { label: 'Roadbase', value: res.basecourseVol, unit: 'm³' },
          { label: 'Sub-base', value: res.subbaseVol, unit: 'm³' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: pavementCalcNotes(inp, res, factors),
  };
}

// ── Culvert ──────────────────────────────────────────────────────────────────

export function buildCulvertReport(
  inp: CulvertInputs,
  res: CulvertResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'RC Box Culvert Design',
    elementRef: `Box culvert ${inp.span} × ${inp.height} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Internal clear span', value: inp.span, unit: 'm' },
          { label: 'Internal clear height', value: inp.height, unit: 'm' },
          { label: 'Wall / slab thickness', value: inp.wallThick, unit: 'mm' },
          { label: 'Nominal cover', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Fill & loading',
        rows: [
          { label: 'Fill depth above top slab', value: inp.fillDepth, unit: 'm' },
          { label: 'Fill unit weight', value: inp.fillDensity, unit: 'kN/m³' },
          { label: 'Traffic live load (equiv. HA)', value: inp.liveLoad, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete strength (fck)', value: inp.fck, unit: 'MPa' },
          { label: 'Rebar yield (fyk)', value: inp.fyk, unit: 'MPa' },
        ],
      },
      {
        heading: 'Hydraulics',
        rows: [
          { label: 'Design peak discharge', value: inp.designFlow, unit: 'm³/s' },
          { label: "Manning's roughness (n)", value: inp.Manning_n },
        ],
      },
    ],

    results: [
      {
        heading: 'External dimensions',
        rows: [
          { label: 'External span', value: res.externalSpan, unit: 'm' },
          { label: 'External height', value: res.externalHeight, unit: 'm' },
        ],
      },
      {
        heading: 'Loads',
        rows: [
          { label: 'Vertical earth pressure on top slab', value: res.earthPressure, unit: 'kPa' },
          { label: 'Lateral earth pressure at wall base', value: res.lateralEarth, unit: 'kPa' },
          { label: 'Total ULS UDL on top slab', value: res.totalUDL, unit: 'kPa', key: true },
        ],
      },
      {
        heading: 'Design moments (ULS)',
        rows: [
          { label: 'Top slab (MEd)', value: res.Med_topSlab, unit: 'kNm/m', key: true },
          { label: 'Wall (MEd)', value: res.Med_wall, unit: 'kNm/m', key: true },
          { label: 'Base slab (MEd)', value: res.Med_baseSlab, unit: 'kNm/m', key: true },
        ],
      },
      {
        heading: 'Reinforcement',
        rows: [
          { label: 'Effective depth (d)', value: res.d, unit: 'mm' },
          { label: 'Top slab — As required', value: res.As_top, unit: 'mm²/m' },
          { label: 'Top slab — bars', value: `T${res.bars_top.dia}@${res.bars_top.spacing}`, key: true },
          { label: 'Wall — As required', value: res.As_wall, unit: 'mm²/m' },
          { label: 'Wall — bars', value: `T${res.bars_wall.dia}@${res.bars_wall.spacing}`, key: true },
          { label: 'Base slab — As required', value: res.As_base, unit: 'mm²/m' },
          { label: 'Base slab — bars', value: `T${res.bars_base.dia}@${res.bars_base.spacing}`, key: true },
        ],
      },
      {
        heading: 'Hydraulic check (Manning, full bore)',
        rows: [
          { label: 'Flow velocity', value: res.flowVelocity, unit: 'm/s' },
          { label: 'Flow capacity', value: res.flowCapacity, unit: 'm³/s', key: true },
          { label: 'Capacity check', value: res.hydraulicOK ? 'Pass' : 'Fail' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: culvertCalcNotes(inp, res, factors),
  };
}

// ── Bridge beam ──────────────────────────────────────────────────────────────

export function buildBridgeBeamReport(
  inp: BridgeBeamInputs,
  res: BridgeBeamResults,
  factors: Factors,
): ReportData {
  const codeLabel = inp.bridgeCode === 'BS5400'
    ? 'BS 5400 Pt 2 — HA UDL + KEL'
    : 'EN 1991-2 Load Model 1 — UDL + tandem system (TS)';

  return {
    moduleTitle: 'Bridge Beam Design (RC, simply supported)',
    elementRef: `${inp.beamType} ${inp.bw}×${inp.h} · ${inp.span} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Beam type', value: inp.beamType },
          { label: 'Effective span', value: inp.span, unit: 'm' },
          { label: 'Beam spacing (CL–CL)', value: inp.beamSpacing, unit: 'm' },
          { label: 'Web width (bw)', value: inp.bw, unit: 'mm' },
          { label: 'Total depth (h)', value: inp.h, unit: 'mm' },
          ...(inp.beamType === 'T-beam' ? [
            { label: 'Flange width (bf)', value: inp.bf, unit: 'mm' },
            { label: 'Flange thickness (hf)', value: inp.hf, unit: 'mm' },
          ] : []),
          { label: 'Nominal cover', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Traffic loading code',
        rows: [
          { label: 'Bridge loading code', value: inp.bridgeCode, key: true },
          { label: 'Code path used', value: codeLabel, key: true },
          { label: 'Notional lanes', value: inp.noLanes },
          { label: 'Notional lane width', value: inp.laneWidth, unit: 'm' },
        ],
      },
      {
        heading: 'Permanent loading',
        rows: [
          { label: 'Deck dead load (slab + surfacing + parapets)', value: inp.deckDead, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete strength (fck)', value: inp.fck, unit: 'MPa' },
          { label: 'Rebar yield (fyk)', value: inp.fyk, unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Section',
        rows: [
          { label: 'Effective flange width (beff)', value: res.beff, unit: 'mm' },
          { label: 'Effective depth (d)', value: res.d, unit: 'mm' },
        ],
      },
      {
        heading: 'Line loads',
        rows: [
          { label: 'Permanent (gk)', value: res.gk, unit: 'kN/m' },
          { label: `Live (qk) — ${inp.bridgeCode}`, value: res.qk, unit: 'kN/m' },
          { label: 'Factored (wEd)', value: res.wEd, unit: 'kN/m', key: true },
        ],
      },
      {
        heading: 'ULS bending',
        rows: [
          { label: 'Design moment (MEd)', value: res.Med, unit: 'kNm', key: true },
          { label: 'Moment resistance (MRd)', value: res.MRd, unit: 'kNm', key: true },
          { label: 'Bending utilisation', value: (res.util_bending * 100).toFixed(0), unit: '%', key: true },
        ],
      },
      {
        heading: 'Reinforcement',
        rows: [
          { label: 'As required', value: res.As_req, unit: 'mm²' },
          { label: 'Bars provided', value: `${res.mainBars.count}T${res.mainBars.dia}`, key: true },
          { label: 'As provided', value: res.As_prov, unit: 'mm²', key: true },
        ],
      },
      {
        heading: 'Shear',
        rows: [
          { label: 'Design shear (VEd)', value: res.Ved, unit: 'kN', key: true },
          { label: 'Concrete resistance (VRd,c)', value: res.VRdc, unit: 'kN' },
          { label: 'Links', value: `T${res.linkDia}@${res.linkSpacing} (2 legs)`, key: true },
        ],
      },
      {
        heading: 'Serviceability',
        rows: [
          { label: 'Deflection (δ)', value: res.delta, unit: 'mm' },
          { label: 'Deflection limit (L/400)', value: res.deltaLimit, unit: 'mm' },
          { label: 'Deflection check', value: res.deflectionOK ? 'Pass' : 'Fail' },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: bridgeBeamCalcNotes(inp, res, factors),
  };
}

// ── Bridge abutment ──────────────────────────────────────────────────────────

export function buildAbutmentReport(
  inp: AbutmentInputs,
  res: AbutmentResults,
  factors: Factors,
): ReportData {
  return {
    moduleTitle: 'Bridge Abutment Design (RC cantilever)',
    elementRef: `Abutment H=${inp.stemHeight} m · base ${inp.baseLength} m`,
    status: res.status,

    params: [
      {
        heading: 'Geometry',
        rows: [
          { label: 'Stem height', value: inp.stemHeight, unit: 'm' },
          { label: 'Stem thickness at base', value: inp.stemThick, unit: 'mm' },
          { label: 'Stem thickness at top', value: inp.stemThickTop, unit: 'mm' },
          { label: 'Base length (toe + heel)', value: inp.baseLength, unit: 'm' },
          { label: 'Base thickness', value: inp.baseThick, unit: 'mm' },
          { label: 'Nominal cover', value: inp.cover, unit: 'mm' },
        ],
      },
      {
        heading: 'Soil',
        rows: [
          { label: 'Backfill friction angle (φ)', value: inp.phi, unit: '°' },
          { label: 'Backfill unit weight (γ)', value: inp.gamma, unit: 'kN/m³' },
          { label: 'Allowable bearing capacity', value: inp.bearingCapacity, unit: 'kPa' },
        ],
      },
      {
        heading: 'Bridge & surcharge loads (per metre width)',
        rows: [
          { label: 'Bridge vertical reaction', value: inp.bridgeReaction, unit: 'kN/m' },
          { label: 'Bridge braking / friction force', value: inp.bridgeFriction, unit: 'kN/m' },
          { label: 'Traffic surcharge on backfill', value: inp.surcharge, unit: 'kN/m²' },
        ],
      },
      {
        heading: 'Materials',
        rows: [
          { label: 'Concrete strength (fck)', value: inp.fck, unit: 'MPa' },
          { label: 'Rebar yield (fyk)', value: inp.fyk, unit: 'MPa' },
        ],
      },
    ],

    results: [
      {
        heading: 'Earth pressure',
        rows: [
          { label: 'Rankine active coefficient (Ka)', value: res.Ka },
          { label: 'Horizontal earth force (Hea)', value: res.Hea, unit: 'kN/m', key: true },
          { label: 'Backfill weight on heel', value: res.Vbackfill, unit: 'kN/m' },
        ],
      },
      {
        heading: 'Resultant forces',
        rows: [
          { label: 'Total vertical (V)', value: res.totalV, unit: 'kN/m', key: true },
          { label: 'Total horizontal (H)', value: res.totalH, unit: 'kN/m', key: true },
        ],
      },
      {
        heading: 'Stability',
        rows: [
          { label: 'Overturning FoS', value: res.FoS_overturning, key: true },
          { label: 'Sliding FoS', value: res.FoS_sliding, key: true },
          { label: 'Stability check', value: res.stabilityOK ? 'Pass' : 'Fail' },
        ],
      },
      {
        heading: 'Bearing',
        rows: [
          { label: 'Eccentricity of resultant (e)', value: res.eccentricity, unit: 'm' },
          { label: 'Max bearing pressure', value: res.bearingPressure, unit: 'kPa', key: true },
          { label: 'Bearing check', value: res.bearingOK ? 'Pass' : 'Fail' },
        ],
      },
      {
        heading: 'Stem reinforcement',
        rows: [
          { label: 'Effective depth (d)', value: res.d_stem, unit: 'mm' },
          { label: 'Moment at base of stem (MEd)', value: res.Med_stem, unit: 'kNm/m', key: true },
          { label: 'As required', value: res.As_stem, unit: 'mm²/m' },
          { label: 'Bars (rear face)', value: `T${res.bars_stem.dia}@${res.bars_stem.spacing}`, key: true },
        ],
      },
      {
        heading: 'Heel reinforcement',
        rows: [
          { label: 'Heel moment (MEd)', value: res.Med_heel, unit: 'kNm/m', key: true },
          { label: 'As required', value: res.As_heel, unit: 'mm²/m' },
          { label: 'Bars (top)', value: `T${res.bars_heel.dia}@${res.bars_heel.spacing}`, key: true },
        ],
      },
    ],

    messages: res.messages,
    calcSteps: abutmentCalcNotes(inp, res, factors),
  };
}

// ── Quick Design wizard (aggregate) ──────────────────────────────────────────

const POS_LABEL: Record<ColumnPosition, string> = {
  interior: 'Interior', edge: 'Edge', corner: 'Corner',
};

const POSITIONS: ColumnPosition[] = ['interior', 'edge', 'corner'];

type MemberStatus = 'OK' | 'WARN' | 'FAIL';

/** FAIL beats WARN beats OK — the wizard has no single engine status. */
function worstStatus(list: MemberStatus[]): MemberStatus {
  if (list.includes('FAIL')) return 'FAIL';
  if (list.includes('WARN')) return 'WARN';
  return 'OK';
}

export function buildQuickDesignReport(
  inp: QuickDesignInputs,
  res: QuickDesignResults,
  factors: Factors,
): ReportData {
  const L = res.loads;
  const occ = OCCUPANCY_TYPES.find(o => o.id === inp.occupancy);
  const loc = LOCATIONS.find(l => l.id === inp.location);

  const memberStatuses: MemberStatus[] = [
    res.slab.status, res.beam.status,
    ...POSITIONS.map(p => res.columns[p].status),
    ...POSITIONS.map(p => res.foundation[p].status),
  ];

  const messages: string[] = [
    ...res.slab.messages.map(m => `Slab: ${m}`),
    ...res.beam.messages.map(m => `Beam: ${m}`),
    ...POSITIONS.flatMap(p => res.columns[p].messages.map(m => `${POS_LABEL[p]} column: ${m}`)),
    ...POSITIONS.flatMap(p => res.foundation[p].messages.map(m => `${POS_LABEL[p]} foundation: ${m}`)),
  ];

  const columnGroup: ReportGroup = {
    heading: 'Columns (square, per position)',
    rows: POSITIONS.flatMap<ReportRow>(p => [
      { label: `${POS_LABEL[p]} — NEd`, value: res.colNed[p].toFixed(0), unit: 'kN', key: true },
      { label: `${POS_LABEL[p]} — capacity (NRd)`, value: res.columns[p].capacity.toFixed(0), unit: 'kN', key: true },
      { label: `${POS_LABEL[p]} — bars`, value: `${res.columns[p].mainBars.count}T${res.columns[p].mainBars.dia}` },
      { label: `${POS_LABEL[p]} — links`, value: `T${res.columns[p].links.dia}@${res.columns[p].links.spacing}` },
      { label: `${POS_LABEL[p]} — status`, value: res.columns[p].status, key: true },
    ]),
  };

  const foundationGroup: ReportGroup = {
    heading: 'Pad foundations (per column position)',
    rows: POSITIONS.flatMap<ReportRow>(p => [
      { label: `${POS_LABEL[p]} — size (L × B)`, value: `${res.foundation[p].L.toFixed(2)} × ${res.foundation[p].B.toFixed(2)}`, unit: 'm', key: true },
      { label: `${POS_LABEL[p]} — thickness (h)`, value: res.foundation[p].h.toFixed(0), unit: 'mm' },
      { label: `${POS_LABEL[p]} — net soil pressure (qEd)`, value: res.foundation[p].qEd.toFixed(1), unit: 'kN/m²' },
      { label: `${POS_LABEL[p]} — bottom steel`, value: `T${res.foundation[p].barsBot.dia}@${res.foundation[p].barsBot.spacing}` },
      { label: `${POS_LABEL[p]} — status`, value: res.foundation[p].status, key: true },
    ]),
  };

  return {
    moduleTitle: 'Quick Design Wizard — Preliminary Building Scheme',
    elementRef: `${occ?.label ?? inp.occupancy} · ${inp.storeys} storeys · ${inp.bayX}×${inp.bayY} m bay`,
    status: worstStatus(memberStatuses),

    params: [
      {
        heading: 'Building',
        rows: [
          { label: 'Occupancy', value: occ?.label ?? inp.occupancy },
          { label: 'Occupancy live load (qk)', value: occ?.qk ?? L.liveLoad, unit: 'kN/m²' },
          { label: 'Number of storeys', value: inp.storeys },
          { label: 'Bay — short span (lx)', value: inp.bayX, unit: 'm' },
          { label: 'Bay — long span (ly)', value: inp.bayY, unit: 'm' },
          { label: 'Storey height (floor-to-floor)', value: inp.storyHeight, unit: 'm' },
        ],
      },
      {
        heading: 'Location & wind',
        rows: [
          { label: 'Location', value: loc?.label ?? inp.location },
          { label: 'Basic wind speed (vb,0)', value: loc?.vb ?? '—', unit: 'm/s' },
          { label: 'Terrain category', value: loc?.terrainCat ?? '—' },
        ],
      },
      {
        heading: 'Materials & ground',
        rows: [
          { label: 'Concrete grade', value: inp.concrete },
          { label: 'Rebar grade', value: inp.rebar },
          { label: 'Allowable soil bearing', value: inp.soilBearing, unit: 'kN/m²' },
          { label: 'Column width (square)', value: inp.colWidth, unit: 'mm' },
        ],
      },
      {
        heading: 'Section sizing',
        rows: [
          { label: 'Slab thickness (used)', value: L.slabThk, unit: 'mm' },
          { label: 'Slab thickness (auto lx/30)', value: L.autoSlabThk, unit: 'mm' },
          { label: 'Beam width (used)', value: L.beamWidth, unit: 'mm' },
          { label: 'Beam width (auto)', value: L.autoBeamWidth, unit: 'mm' },
          { label: 'Beam depth (used)', value: L.beamDepth, unit: 'mm' },
          { label: 'Beam depth (auto lx/12)', value: L.autoBeamDepth, unit: 'mm' },
          {
            label: 'Overrides applied',
            value: inp.overrides && (inp.overrides.slabThk || inp.overrides.beamWidth || inp.overrides.beamDepth)
              ? 'Yes — engineer-set sections' : 'No — auto-sized',
          },
        ],
      },
    ],

    results: [
      {
        heading: 'Derived floor loading',
        rows: [
          { label: 'Slab self-weight', value: L.slabSW.toFixed(2), unit: 'kN/m²' },
          { label: 'Finishes', value: L.finishes.toFixed(2), unit: 'kN/m²' },
          { label: 'Partitions', value: L.partitions.toFixed(2), unit: 'kN/m²' },
          { label: 'Total dead load (gk)', value: L.deadLoad.toFixed(2), unit: 'kN/m²', key: true },
          { label: 'Live load (qk)', value: L.liveLoad.toFixed(2), unit: 'kN/m²', key: true },
        ],
      },
      {
        heading: 'Slab (two-way, continuous)',
        rows: [
          { label: 'Thickness', value: L.slabThk, unit: 'mm' },
          { label: 'Short-span moment (MEd,x)', value: res.slab.Med_x.toFixed(2), unit: 'kNm/m', key: true },
          { label: 'Long-span moment (MEd,y)', value: res.slab.Med_y.toFixed(2), unit: 'kNm/m' },
          { label: 'Short-span bars', value: `T${res.slab.barsX.dia}@${res.slab.barsX.spacing}`, key: true },
          { label: 'Long-span bars', value: `T${res.slab.barsY.dia}@${res.slab.barsY.spacing}`, key: true },
          { label: 'Span/depth ratio', value: res.slab.spanRatio.toFixed(1) },
          { label: 'Deflection check', value: res.slab.deflectionOK ? 'Pass' : 'Fail' },
          { label: 'Shear check', value: res.slab.shearOK ? 'Pass' : 'Fail' },
          { label: 'Status', value: res.slab.status, key: true },
        ],
      },
      {
        heading: 'Beam (interior, continuous)',
        rows: [
          { label: 'Section (b × h)', value: `${L.beamWidth} × ${L.beamDepth}`, unit: 'mm' },
          { label: 'Design moment (MEd)', value: res.beam.Med.toFixed(2), unit: 'kNm', key: true },
          { label: 'Design shear (VEd)', value: res.beam.Ved.toFixed(2), unit: 'kN', key: true },
          { label: 'Bars provided', value: `${res.beam.mainBars.count}T${res.beam.mainBars.dia}`, key: true },
          { label: 'Links', value: `T${res.beam.stirrups.dia}@${res.beam.stirrups.spacing} (${res.beam.stirrups.legs} legs)` },
          { label: 'Shear check', value: res.beam.shearOK ? 'Pass' : 'Fail' },
          { label: 'Deflection check', value: res.beam.deflectionOK ? 'Pass' : 'Fail' },
          { label: 'Status', value: res.beam.status, key: true },
        ],
      },
      {
        heading: 'Wind (EN 1991-1-4 estimate)',
        rows: [
          { label: 'Total base shear (Fw)', value: res.wind.Fw_total.toFixed(1), unit: 'kN' },
          { label: 'Shear per perimeter column', value: res.windHedPerCol.toFixed(1), unit: 'kN' },
          { label: 'Moment per perimeter column', value: res.windMedPerCol.toFixed(1), unit: 'kNm' },
        ],
      },
      columnGroup,
      foundationGroup,
    ],

    messages,
    calcSteps: quickDesignCalcNotes(inp, res, factors),
  };
}
