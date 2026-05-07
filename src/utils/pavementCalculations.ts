/**
 * Road Pavement Design — CBR Method
 * Reference: TRL Road Note 31 (4th Ed), AASHTO 1993 flexible pavement
 * Covers: flexible (bituminous) and rigid (concrete) pavement design
 * Common in Gambia: laterite sub-base, bituminous surfacing, concrete roads
 */

export type RoadClass = 'trunk' | 'main' | 'secondary' | 'access' | 'estate';
export type PavementType = 'flexible' | 'rigid';
export type SubgradeType = 'poor' | 'moderate' | 'good' | 'excellent';
export type TrafficGrowth = 'low' | 'medium' | 'high';

// Subgrade CBR values typical for Gambia
const SUBGRADE_CBR: Record<SubgradeType, { cbr: number; label: string }> = {
  'poor':      { cbr: 2,  label: 'Poor (laterite clay, wet season ≤ 2%)' },
  'moderate':  { cbr: 5,  label: 'Moderate (compacted laterite ~5%)' },
  'good':      { cbr: 10, label: 'Good (well-graded gravel ~10%)' },
  'excellent': { cbr: 15, label: 'Excellent (natural gravel >15%)' },
};

// Traffic factors per road class (AADT commercial vehicles)
const ROAD_TRAFFIC: Record<RoadClass, { aadt: number; label: string }> = {
  'trunk':     { aadt: 2000, label: 'Trunk Road (National highway)' },
  'main':      { aadt: 800,  label: 'Main Road (Regional)' },
  'secondary': { aadt: 300,  label: 'Secondary Road (Feeder)' },
  'access':    { aadt: 80,   label: 'Access Road (Rural)' },
  'estate':    { aadt: 30,   label: 'Estate / Compound Road' },
};

const GROWTH_RATE: Record<TrafficGrowth, number> = {
  'low': 0.02, 'medium': 0.04, 'high': 0.07,
};

export interface PavementInputs {
  roadClass: RoadClass;
  pavementType: PavementType;
  subgradeType: SubgradeType;
  customCBR?: number;          // override if known
  designLife: number;          // years (typically 20)
  trafficGrowth: TrafficGrowth;
  percentHeavy: number;        // % of AADT that are HGV/trucks
  equivalentAxleLoad: number;  // kN (standard = 80kN)
  // Layer material selection
  useImprovedSubgrade: boolean;  // 150mm improved subgrade (lime/cement treated)
}

export interface PavementLayer {
  name: string;
  thickness: number;  // mm
  material: string;
  note: string;
}

export interface PavementResults {
  status: 'pass' | 'warn' | 'fail';
  // Traffic
  designESAL: number;       // million equivalent standard axle loads
  msa: number;              // million standard axles
  // Pavement layers
  layers: PavementLayer[];
  totalThickness: number;   // mm (structural layers only)
  // CBR
  cbr: number;              // design CBR
  // Material volumes per km per lane
  surfacingVol: number;     // m³/km/lane
  basecourseVol: number;    // m³/km/lane
  subbaseVol: number;       // m³/km/lane
  messages: string[];
}

export function designPavement(inp: PavementInputs): PavementResults {
  const msgs: string[] = [];
  const { roadClass, pavementType, subgradeType, designLife, trafficGrowth, percentHeavy } = inp;

  const cbr = inp.customCBR ?? SUBGRADE_CBR[subgradeType].cbr;
  const { aadt } = ROAD_TRAFFIC[roadClass];
  const r = GROWTH_RATE[trafficGrowth];

  // ── Design traffic (ESAL) ─────────────────────────────────────────────────
  // Cumulative ESAL over design life
  // ESAL = AADT × %HGV/100 × growth factor × 365 × AADT_lane_factor × LEF
  const growthFactor = ((1 + r) ** designLife - 1) / r;
  const aadtHeavy = aadt * percentHeavy / 100;
  const LEF = inp.equivalentAxleLoad === 80 ? 1.0 : (inp.equivalentAxleLoad / 80) ** 4;  // 4th power law
  const designESAL = (aadtHeavy * growthFactor * 365 * LEF) / 1e6;  // million
  const msa = designESAL;

  msgs.push(`Design traffic: ${msa.toFixed(2)} million standard axles (MSA)`);

  // ── Layer thickness design (TRL RN31 CBR method) ────────────────────────
  // Granular base thickness from CBR and MSA
  // Using simplified TRL catalogue approach
  const layers: PavementLayer[] = [];
  let surfacingT = 0, basecourseT = 0, subbaseT = 0, subgradeImpT = 0;

  if (pavementType === 'flexible') {
    // Surfacing (AC / DBM)
    if (msa < 0.1) {
      surfacingT = 25;  // surface dressing
      layers.push({ name: 'Surface dressing', thickness: 25, material: 'Bituminous surface dressing', note: 'Single/double chip seal' });
    } else if (msa < 1.0) {
      surfacingT = 60;
      layers.push({ name: 'Wearing course', thickness: 40, material: 'Asphalt Concrete (AC)', note: 'AC 14 wearing course' });
      layers.push({ name: 'Binder course', thickness: 20, material: 'Dense Bitumen Macadam (DBM)', note: 'DBM 20' });
    } else if (msa < 5.0) {
      surfacingT = 90;
      layers.push({ name: 'Wearing course', thickness: 40, material: 'Asphalt Concrete (AC)', note: 'AC 14 wearing course' });
      layers.push({ name: 'Binder course', thickness: 50, material: 'Dense Bitumen Macadam', note: 'DBM 20 / DBM 25' });
    } else {
      surfacingT = 120;
      layers.push({ name: 'Wearing course', thickness: 40, material: 'Asphalt Concrete (AC)', note: 'AC 14 wearing course — high-stress' });
      layers.push({ name: 'Binder course', thickness: 80, material: 'Dense Bitumen Macadam', note: 'DBM 25 or EME2' });
    }

    // Granular base (crushed stone or stabilised laterite)
    const baseT_cbr = Math.max(0,
      msa < 0.5  ? (cbr < 5 ? 200 : 150) :
      msa < 2.0  ? (cbr < 5 ? 250 : 200) :
      msa < 10.0 ? (cbr < 5 ? 300 : 250) :
                   (cbr < 5 ? 350 : 300)
    );
    basecourseT = baseT_cbr;
    layers.push({ name: 'Roadbase', thickness: basecourseT, material: cbr < 5 ? 'Cement-stabilised laterite (3%)' : 'Crushed stone / graded laterite', note: `CBR${cbr}% subgrade` });

    // Sub-base (laterite gravel, CBR ≥ 30%)
    subbaseT = cbr < 5 ? 200 : (cbr < 10 ? 150 : 100);
    layers.push({ name: 'Sub-base', thickness: subbaseT, material: 'Laterite gravel (CBR ≥ 30%)', note: 'Compacted to 95% MDD' });

  } else {
    // Rigid pavement — jointed plain concrete (JPCP)
    // Westergaard k-value from CBR
    const k_sub = cbr < 3 ? 20 : cbr < 7 ? 40 : cbr < 15 ? 80 : 120;  // MN/m³
    // Required slab thickness (simplified AASHTO rigid)
    const slabT = msa < 0.5 ? 150 : msa < 2 ? 175 : msa < 7 ? 200 : 225;
    surfacingT = slabT;
    layers.push({ name: 'Concrete slab', thickness: slabT, material: `Concrete C30/37 (fck=${30}MPa)`, note: `k=${k_sub} MN/m³ — JPCP, 4.5m joint spacing` });
    subbaseT = cbr < 5 ? 200 : 150;
    layers.push({ name: 'Sub-base (concrete)', thickness: subbaseT, material: 'Lean concrete C10 or granular', note: 'Drainage layer below slab' });
    msgs.push(`Concrete slab: ${slabT}mm JPCP, joints at 4.5m, 12mm dowel bars @ 300mm c/c`);
  }

  // Improved subgrade
  if (inp.useImprovedSubgrade && cbr < 5) {
    subgradeImpT = 150;
    layers.push({ name: 'Improved subgrade', thickness: 150, material: 'Lime/cement stabilised subgrade', note: '2–4% cement by weight, 7-day soaked CBR ≥ 5%' });
    msgs.push('WARN: Poor subgrade — improved subgrade layer added. Consider geotextile separation.');
  }

  // Warnings
  if (cbr < 3) msgs.push('WARN: Very poor subgrade CBR < 3% — consider ground improvement or raised embankment');
  if (msa > 10) msgs.push('WARN: High traffic > 10 MSA — consider full-depth asphalt or rigid pavement option');
  msgs.push(`PASS: Pavement designed for ${msa.toFixed(1)} MSA on CBR ${cbr}% subgrade`);

  const totalThickness = surfacingT + basecourseT + subbaseT + subgradeImpT;

  // Material volumes per km per lane (3.5m lane width)
  const laneW = 3.5;  // m
  const vol = (t: number) => (t / 1000) * laneW * 1000;  // m³/km/lane

  const status: PavementResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, designESAL, msa: +msa.toFixed(2), cbr,
    layers, totalThickness,
    surfacingVol: +vol(surfacingT).toFixed(0),
    basecourseVol: +vol(basecourseT).toFixed(0),
    subbaseVol: +vol(subbaseT).toFixed(0),
    messages: msgs,
  };
}
