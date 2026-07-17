/**
 * reportBuilders — maps each module's inputs/results onto the shared ReportData
 * contract consumed by <ReportButton>.
 *
 * Kept out of the page components so that the report content for a module is
 * defined in one place and reads as a document outline rather than being tangled
 * into JSX.
 */
import BeamSection from '../components/visuals/BeamSection';
import { beamCalcNotes } from './calcNotes';
import type { ReportData } from '../types/report';
import type { BeamInputs, BeamResults } from '../types/structural';
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
