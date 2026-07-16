/**
 * calcNotesQuickDesign — QA/QC audit trail for the Quick Design wizard.
 *
 * Unlike the single-member sheets, the value here is the LOAD PATH: how an
 * occupancy choice becomes an area load, how that load is auto-sized into
 * sections, and how it accumulates through slab → beam → column → foundation.
 * The per-member bending/shear workings live in each member's own module and
 * calculation sheet; this sheet documents the chain and the assumptions that
 * the wizard makes on the engineer's behalf.
 */
import type { CalcStep } from '../components/ui/CalcSheet';
import type { CodeFactors } from '../context/BuildingCodeContext';
import {
  OCCUPANCY_TYPES, LOCATIONS,
  type QuickDesignInputs, type QuickDesignResults, type ColumnPosition,
} from './quickDesign';

const n  = (v: number, dp = 2) => v.toFixed(dp);
const n0 = (v: number)         => v.toFixed(0);

const POS_LABEL: Record<ColumnPosition, string> = {
  interior: 'Interior', edge: 'Edge', corner: 'Corner',
};

export function quickDesignCalcNotes(
  inp: QuickDesignInputs,
  res: QuickDesignResults,
  cf: Partial<CodeFactors> & { code?: string },
): CalcStep[] {
  const L   = res.loads;
  const occ = OCCUPANCY_TYPES.find(o => o.id === inp.occupancy);
  const loc = LOCATIONS.find(l => l.id === inp.location);
  const γG  = cf.gammaG ?? 1.35;
  const γQ  = cf.gammaQ ?? 1.5;
  const wULS = γG * L.deadLoad + γQ * L.liveLoad;
  const { bayX: lx, bayY: ly, storeys, storyHeight } = inp;

  const tribAreas: Record<ColumnPosition, number> = {
    interior: lx * ly,
    edge:     (lx / 2) * ly,
    corner:   (lx / 2) * (ly / 2),
  };

  const overridden = (used: number, auto: number) =>
    used !== auto ? ` (overridden — auto ${auto})` : ' (auto)';

  const steps: CalcStep[] = [
    { heading: '1. Design Basis & Assumptions' },
    {
      label: 'Occupancy',
      formula: 'qk — from occupancy classification',
      working: `${occ?.label ?? inp.occupancy}`,
      result: `qk = ${n(L.liveLoad, 1)} kN/m²`,
      ref: 'EN 1991-1-1 Table 6.1',
    },
    {
      label: 'Building geometry',
      formula: 'Bay lx × ly, storeys × floor height',
      working: `${lx} × ${ly} m bay, ${storeys} storey(s) @ ${storyHeight} m`,
      result: `H = ${n(storeys * storyHeight, 1)} m`,
    },
    {
      label: 'Standing assumptions',
      formula: 'Fixed by the wizard',
      working: 'Two-way slab, continuous on all edges · continuous beam spanning lx · braced square columns · pad foundations · slab cover 25 mm, beam 35 mm, column 35 mm, foundation 50 mm',
      result: '—',
      status: 'info',
      note: 'Use the individual member modules to vary any of these.',
    },

    { heading: '2. Section Auto-Sizing' },
    {
      label: 'Slab thickness',
      formula: 'h = max(lx/30 rounded up to 5 mm, 125 mm)',
      working: `= max(${lx}×1000/30, 125)${overridden(L.slabThk, L.autoSlabThk)}`,
      result: `${L.slabThk} mm`,
      ref: 'EC2 §7.4 span/depth guidance',
    },
    {
      label: 'Beam width',
      formula: 'bw = max(250 mm, column width)',
      working: `= max(250, ${inp.colWidth})${overridden(L.beamWidth, L.autoBeamWidth)}`,
      result: `${L.beamWidth} mm`,
    },
    {
      label: 'Beam depth',
      formula: 'h = max(400 mm, lx/12 rounded up to 50 mm)',
      working: `= max(400, ${lx}×1000/12)${overridden(L.beamDepth, L.autoBeamDepth)}`,
      result: `${L.beamDepth} mm`,
    },

    { heading: '3. Load Build-Up (per m² of floor)' },
    {
      label: 'Slab self-weight',
      formula: 'gk,slab = h/1000 × 25 kN/m³',
      working: `= ${L.slabThk}/1000 × 25`,
      result: `${n(L.slabSW)} kN/m²`,
      ref: 'EN 1991-1-1 Table A.1 (reinforced concrete)',
    },
    {
      label: 'Finishes',
      formula: 'Screed + tiles allowance',
      working: 'Standing allowance',
      result: `${n(L.finishes, 1)} kN/m²`,
    },
    {
      label: 'Partitions',
      formula: 'Movable partition allowance',
      working: `${occ?.label ?? inp.occupancy} → ${n(L.partitions, 1)} kN/m²`,
      result: `${n(L.partitions, 1)} kN/m²`,
      ref: 'EN 1991-1-1 §6.3.1.2(8)',
    },
    {
      label: 'Total dead load',
      formula: 'gk = gk,slab + finishes + partitions',
      working: `= ${n(L.slabSW)} + ${n(L.finishes, 1)} + ${n(L.partitions, 1)}`,
      result: `${n(L.deadLoad)} kN/m²`,
      status: 'ok',
    },
    {
      label: 'ULS design load',
      formula: 'wEd = γG · gk + γQ · qk',
      working: `= ${n(γG)} × ${n(L.deadLoad)} + ${n(γQ)} × ${n(L.liveLoad, 1)}`,
      result: `${n(wULS)} kN/m²`,
      ref: 'EN 1990 Eq. 6.10',
      status: 'ok',
    },

    { heading: '4. Slab → Beam Load Transfer' },
    {
      label: 'Slab panel',
      formula: 'Two-way, continuous all edges',
      working: `${lx} × ${ly} m, ${L.slabThk} mm thick`,
      result: `MEd,x = ${n(res.slab.Med_x)} kNm/m`,
      status: res.slab.status === 'OK' ? 'ok' : res.slab.status === 'WARN' ? 'warn' : 'fail',
      note: res.slab.messages[0],
    },
    {
      label: 'Beam self-weight',
      formula: 'gk,beam = bw × (h − hslab) × 25 kN/m³',
      working: `= ${L.beamWidth}/1000 × (${L.beamDepth} − ${L.slabThk})/1000 × 25`,
      result: `${n((L.beamWidth / 1000) * ((L.beamDepth - L.slabThk) / 1000) * 25)} kN/m`,
    },
    {
      label: 'Line load on beam',
      formula: 'gk,line = gk · ly + gk,beam ;  qk,line = qk · ly',
      working: `Full bay width ly = ${ly} m taken onto the interior beam (conservative — both panels)`,
      result: `gk = ${n(L.deadLoad * ly + (L.beamWidth / 1000) * ((L.beamDepth - L.slabThk) / 1000) * 25)} kN/m, qk = ${n(L.liveLoad * ly)} kN/m`,
      status: 'info',
    },
    {
      label: 'Beam design',
      formula: `Continuous, span lx = ${lx} m`,
      working: `${L.beamWidth}×${L.beamDepth} mm → ${res.beam.mainBars.count}T${res.beam.mainBars.dia}`,
      result: `MEd = ${n(res.beam.Med, 1)} kNm`,
      status: res.beam.status === 'OK' ? 'ok' : res.beam.status === 'WARN' ? 'warn' : 'fail',
      note: res.beam.messages.find(m => !m.startsWith('INFO')),
    },

    { heading: '5. Column Axial Loads (tributary-area method)' },
  ];

  (['interior', 'edge', 'corner'] as ColumnPosition[]).forEach(pos => {
    const frac = pos === 'interior' ? 'lx · ly' : pos === 'edge' ? '(lx/2) · ly' : '(lx/2) · (ly/2)';
    steps.push({
      label: `${POS_LABEL[pos]} column — NEd`,
      formula: `NEd = wEd · A,trib · storeys · 1.1     [A,trib = ${frac}]`,
      working: `= ${n(wULS)} × ${n(tribAreas[pos], 1)} × ${storeys} × 1.1`,
      result: `${n0(res.colNed[pos])} kN`,
      ref: 'Tributary-area load-down',
      status: res.columns[pos].status === 'OK' ? 'ok' : res.columns[pos].status === 'WARN' ? 'warn' : 'fail',
      note: `NRd = ${n0(res.columns[pos].capacity)} kN · ${res.columns[pos].mainBars.count}T${res.columns[pos].mainBars.dia}`,
    });
  });

  steps.push({
    label: 'Self-weight allowance',
    formula: '× 1.1 on the accumulated floor load',
    working: 'Covers column and beam self-weight over the height of the building',
    result: '+10%',
    status: 'info',
    note: 'A blanket allowance — for a final design, sum the actual member self-weights.',
  });

  steps.push(
    { heading: '6. Wind Load (EN 1991-1-4 estimate)' },
    {
      label: 'Site wind climate',
      formula: 'vb,0 and terrain category from location',
      working: `${loc?.label ?? inp.location} → vb,0 = ${loc?.vb} m/s, terrain Cat ${loc?.terrainCat}`,
      result: `qp = ${n(res.wind.qp)} kN/m²`,
      ref: 'EN 1991-1-4 §4.2 / §4.5',
    },
    {
      label: 'Base shear on this bay',
      formula: 'Fw = qp · cscd · Σ(cpe · Aref) over height H',
      working: `H = ${n(storeys * storyHeight, 1)} m, exposed width b = ${ly} m`,
      result: `${n0(Math.abs(res.wind.Fw_total))} kN`,
      ref: 'EN 1991-1-4 §5.3',
    },
    {
      label: 'Shear per perimeter column',
      formula: 'HEd = Fw / 2',
      working: `= ${n0(Math.abs(res.wind.Fw_total))} / 2  (edge + corner share the frame line)`,
      result: `${n0(res.windHedPerCol)} kN`,
      status: 'info',
      note: 'Interior columns are treated as wind-sheltered.',
    },
    {
      label: 'Column / foundation moment',
      formula: 'MEd,wind = HEd × (storey height / 2)',
      working: `= ${n0(res.windHedPerCol)} × ${storyHeight}/2   (contraflexure assumed at mid-storey)`,
      result: `${n(res.windMedPerCol, 1)} kNm`,
      status: 'warn',
      note: 'Simplified braced-frame approximation — use the Portal Frame or Wind Load module for a full lateral analysis.',
    },

    { heading: '7. Foundations' },
  );

  (['interior', 'edge', 'corner'] as ColumnPosition[]).forEach(pos => {
    const f = res.foundation[pos];
    steps.push({
      label: `${POS_LABEL[pos]} pad`,
      formula: 'Sized on NEd (+10% self-weight) vs allowable bearing',
      working: `NEd = ${n0(res.colNed[pos])} kN, qa = ${inp.soilBearing} kN/m²${pos !== 'interior' ? `, HEd = ${n0(res.windHedPerCol)} kN` : ''}`,
      result: `${n(f.L)} × ${n(f.B)} m`,
      status: f.status === 'OK' ? 'ok' : f.status === 'WARN' ? 'warn' : 'fail',
      note: `qEd = ${n(f.qEd, 1)} kN/m² · ${f.messages[0] ?? ''}`,
    });
  });

  steps.push({
    label: 'Scope of this sheet',
    formula: '—',
    working: 'Preliminary sizing only. Each member is designed by the same engine as its standalone module — open that module for the full bending/shear/deflection workings and its own calculation sheet.',
    result: '—',
    status: 'info',
  });

  return steps;
}
