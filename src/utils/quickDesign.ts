/**
 * Quick Design Wizard — chains slab → beam → column → foundation
 * from a handful of project-level inputs.
 */
import type { ConcreteGrade, RebarGrade } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { getMaterial } from './materials';
import { designSlab }       from './slabCalculations';
import { designBeam }       from './beamCalculations';
import { designColumn }     from './columnCalculations';
import { designFoundation } from './foundationCalculations';
import { calcWind }         from './windCalculations';
import type { WindResults, TerrainCategory, WindZone } from './windCalculations';
import type { SlabResults, BeamResults, ColumnResults, FoundationResults } from '../types/structural';

// ── Occupancy live loads (EN 1991-1-1 / Gambia practice) ─────────────────────
export const OCCUPANCY_TYPES = [
  { id: 'residential',  label: 'Residential',      qk: 2.0, icon: '🏠' },
  { id: 'office',       label: 'Office',            qk: 2.5, icon: '🏢' },
  { id: 'commercial',   label: 'Retail / Commercial', qk: 4.0, icon: '🏪' },
  { id: 'school',       label: 'School',            qk: 3.0, icon: '🏫' },
  { id: 'assembly',     label: 'Assembly / Public', qk: 5.0, icon: '🏛️' },
  { id: 'storage',      label: 'Storage',           qk: 7.5, icon: '📦' },
  { id: 'healthcare',   label: 'Healthcare',        qk: 3.0, icon: '🏥' },
] as const;

export type OccupancyId = (typeof OCCUPANCY_TYPES)[number]['id'];

// ── Location / wind ───────────────────────────────────────────────────────────
export const LOCATIONS = [
  { id: 'coastal',     label: 'Banjul / Coastal',    vb: 32, terrainCat: 2 },
  { id: 'inland_urban',label: 'Inland Urban',         vb: 28, terrainCat: 3 },
  { id: 'inland_rural',label: 'Inland Rural',         vb: 26, terrainCat: 2 },
] as const;

export type LocationId = (typeof LOCATIONS)[number]['id'];

// ── Column positions ──────────────────────────────────────────────────────────
export type ColumnPosition = 'interior' | 'edge' | 'corner';

// ── Wizard inputs ─────────────────────────────────────────────────────────────
export interface QuickDesignInputs {
  // Step 1 — Building
  occupancy:    OccupancyId;
  storeys:      number;
  bayX:         number;   // short span, m
  bayY:         number;   // long span, m
  storyHeight:  number;   // floor-to-floor, m

  // Step 2 — Location & materials
  location:     LocationId;
  concrete:     ConcreteGrade;
  rebar:        RebarGrade;
  soilBearing:  number;   // kN/m²
  colWidth:     number;   // mm (square assumed)

  // Results-page overrides — set by the user when tweaking sections
  overrides?: {
    slabThk?:   number;   // mm  (overrides auto lx/30 sizing)
    beamWidth?: number;   // mm
    beamDepth?: number;   // mm
  };
}

// ── Intermediate loads ────────────────────────────────────────────────────────
export interface QuickLoads {
  liveLoad:       number;   // kN/m²
  slabSW:         number;   // kN/m² slab self-weight
  finishes:       number;   // kN/m²
  partitions:     number;   // kN/m²
  deadLoad:       number;   // kN/m² total dead
  slabThk:        number;   // mm (as used — may be overridden)
  beamWidth:      number;   // mm (as used)
  beamDepth:      number;   // mm (as used)
  autoSlabThk:    number;   // mm auto-sized default (for UI hint)
  autoBeamWidth:  number;   // mm auto-sized default
  autoBeamDepth:  number;   // mm auto-sized default
}

// ── Results bundle ────────────────────────────────────────────────────────────
export interface QuickDesignResults {
  loads:     QuickLoads;
  slab:      SlabResults;
  beam:      BeamResults;
  columns:   Record<ColumnPosition, ColumnResults>;
  colNed:    Record<ColumnPosition, number>;   // kN (ULS) for reference
  foundation: Record<ColumnPosition, FoundationResults>;
  wind:          WindResults;   // EN 1991-1-4 estimate for this building's height/footprint
  windHedPerCol: number;        // kN — base shear applied to each perimeter (edge/corner) column
  windMedPerCol: number;        // kNm — simplified column/foundation moment from wind shear
}

// ── Main function ─────────────────────────────────────────────────────────────
export function runQuickDesign(
  inp: QuickDesignInputs,
  code: Partial<CodeFactors> = {},
): QuickDesignResults {

  const { bayX: lx, bayY: ly, storeys, storyHeight, colWidth } = inp;
  const γG = code.gammaG ?? 1.35;
  const γQ = code.gammaQ ?? 1.5;
  const mat = getMaterial(inp.concrete, inp.rebar);

  // ── Live load from occupancy ──────────────────────────────────────────────
  const occ = OCCUPANCY_TYPES.find(o => o.id === inp.occupancy)!;
  const liveLoad = occ.qk;   // kN/m²

  // ── Slab sizing (auto, overridable) ──────────────────────────────────────
  const autoSlabThk   = Math.max(Math.ceil((lx * 1000) / 30 / 5) * 5, 125);
  const autoBeamWidth = Math.max(250, colWidth);
  const autoBeamDepth = Math.max(400, Math.ceil((lx * 1000) / 12 / 50) * 50);

  const slabThk   = inp.overrides?.slabThk   ?? autoSlabThk;
  const beamWidth = inp.overrides?.beamWidth  ?? autoBeamWidth;
  const beamDepth = inp.overrides?.beamDepth  ?? autoBeamDepth;

  const slabSW   = (slabThk / 1000) * 25;    // kN/m²
  const finishes = 1.5;                       // screed + tiles
  const partitions = occ.id === 'residential' || occ.id === 'office' ? 1.0 : 0.5;
  const deadLoad = slabSW + finishes + partitions;

  const loads: QuickLoads = {
    liveLoad, slabSW, finishes, partitions, deadLoad,
    slabThk, beamWidth, beamDepth,
    autoSlabThk, autoBeamWidth, autoBeamDepth,
  };

  // ── 1. Slab design ────────────────────────────────────────────────────────
  const slab = designSlab({
    type: 'two-way',
    lx, ly,
    thickness: slabThk,
    cover: 25,
    deadLoad,
    liveLoad,
    material: mat,
    edgeCondition: 'continuous-all',
  }, code);

  // ── 2. Beam design ────────────────────────────────────────────────────────
  // Interior beam spanning lx (short), carrying slab load from full ly tributary
  // Slab UDL on beam = (γG×gk + γQ×qk) × ly/2 (each slab panel contributes ly/2)
  // Conservative for interior beam both sides: × ly (full bay width)
  const beamSW = (loads.beamWidth / 1000) * ((loads.beamDepth - slabThk) / 1000) * 25;

  const beam = designBeam({
    span: lx,
    width: loads.beamWidth,
    depth: loads.beamDepth,
    cover: 35,
    deadLoad: (deadLoad * ly) + beamSW,     // characteristic
    liveLoad: liveLoad * ly,
    supportType: 'continuous',
    material: mat,
  }, code);

  // ── 3. Column design ──────────────────────────────────────────────────────
  // Tributary area per column position
  const tribAreas: Record<ColumnPosition, number> = {
    interior: lx * ly,
    edge:     (lx / 2) * ly,
    corner:   (lx / 2) * (ly / 2),
  };

  // Load factors applied: ULS factored load for column tributary area
  const wULS  = γG * deadLoad + γQ * liveLoad;

  const colHeight = storyHeight;
  const cw = colWidth;

  const colNed: Record<ColumnPosition, number> = {
    interior: wULS * tribAreas.interior * storeys * 1.1,
    edge:     wULS * tribAreas.edge     * storeys * 1.1,
    corner:   wULS * tribAreas.corner   * storeys * 1.1,
  };

  // ── Wind load (simplified EN 1991-1-4 estimate) ──────────────────────────
  // Interior columns are treated as wind-sheltered (standard preliminary-design
  // assumption). The total base shear on a one-bay-wide perimeter strip over
  // the full building height is split between the two perimeter columns (edge
  // + corner) that make up that frame line. Column/foundation moment uses a
  // simplified braced-frame contraflexure-at-mid-storey approximation
  // (M = H × storyHeight / 2) — for a full second-order lateral analysis use
  // the individual Portal Frame / Column modules.
  const loc = LOCATIONS.find(l => l.id === inp.location)!;
  const TERRAIN_BY_CAT: Record<number, TerrainCategory> = { 0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const ZONE_BY_LOCATION: Record<LocationId, WindZone> = {
    coastal: 'Coastal', inland_urban: 'Urban', inland_rural: 'Inland',
  };
  const buildingHeight = storeys * storyHeight;

  const wind = calcWind({
    vb0: loc.vb,
    zone: ZONE_BY_LOCATION[inp.location],
    terrain: TERRAIN_BY_CAT[loc.terrainCat] ?? 'II',
    height: buildingHeight,
    breadth: ly,
    depth: lx,
    cdir: 1.0,
    cseason: 1.0,
    csCd: 1.0,
    internalPressure: 'closed',
    rho: 1.25,
  });

  const windHedPerCol = Math.abs(wind.Fw_total) / 2;      // kN
  const windMedPerCol = windHedPerCol * (colHeight / 2);  // kNm

  const columns: Record<ColumnPosition, ColumnResults> = {} as any;
  for (const pos of ['interior', 'edge', 'corner'] as ColumnPosition[]) {
    const windMed = pos === 'interior' ? 0 : windMedPerCol;
    columns[pos] = designColumn({
      shape: 'square',
      b: cw, h: cw,
      cover: 35,
      height: colHeight,
      Ned: colNed[pos],
      Medy: 0,
      Medx: windMed,
      material: mat,
      braced: true,
    }, code);
  }

  // ── 4. Foundation design ──────────────────────────────────────────────────
  const foundation: Record<ColumnPosition, FoundationResults> = {} as any;
  for (const pos of ['interior', 'edge', 'corner'] as ColumnPosition[]) {
    const windHed = pos === 'interior' ? 0 : windHedPerCol;
    const windMed = pos === 'interior' ? 0 : windMedPerCol;
    foundation[pos] = designFoundation({
      type: 'pad',
      columnB: cw,
      columnH: cw,
      Ned: colNed[pos],
      Med: windMed,
      Hed: windHed,
      selfWeight: 10,
      soilBearing: inp.soilBearing,
      cover: 50,
      depth: 500,
      material: mat,
    }, code);
  }

  return { loads, slab, beam, columns, colNed, foundation, wind, windHedPerCol, windMedPerCol };
}
