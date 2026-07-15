/**
 * Pile capacity calculations — Gambia context
 * Methods: α-method (clay), β-method (sand), end bearing
 * Reference: BS 8004, EC7, and GEO publication guidance
 */

export interface SoilLayer {
  thickness: number;    // m
  soilType: 'soft-clay' | 'firm-clay' | 'stiff-clay' | 'loose-sand' | 'medium-sand' | 'dense-sand' | 'laterite-soft' | 'laterite-hard' | 'rock';
  cu?: number;          // kPa — undrained shear strength (clay)
  phi?: number;         // degrees — friction angle (sand/laterite)
  gamma?: number;       // kN/m³ — unit weight
  nValue?: number;      // SPT N (optional, for reference)
}

export interface PileInputs {
  pileType: 'bored' | 'driven-precast' | 'driven-timber';
  diameter: number;     // mm
  length: number;       // m — embedded length
  layers: SoilLayer[];
  gwt: number;          // m — groundwater table depth from surface
  FoS: number;          // factor of safety (typically 2.5)
  loadType: 'compression' | 'tension';
}

export interface PileResults {
  status: 'pass' | 'warn' | 'fail';
  // Capacities
  Qs: number;           // kN — total shaft friction (characteristic)
  Qb: number;           // kN — end bearing (characteristic)
  Qu: number;           // kN — ultimate capacity
  Qa: number;           // kN — allowable capacity (Qu / FoS)
  // Shaft friction by layer
  layerFriction: { label: string; qs: number; Qs_layer: number }[];
  // Geometry
  perimetre: number;    // m
  area_tip: number;     // m²
  messages: string[];
}

// Alpha factors for shaft friction in clay (α-method)
const ALPHA: Record<string, number> = {
  'soft-clay':  0.8,
  'firm-clay':  0.6,
  'stiff-clay': 0.4,
};

// Default cu values (kPa) if not provided
const DEFAULT_CU: Record<string, number> = {
  'soft-clay': 25, 'firm-clay': 50, 'stiff-clay': 100,
};

// Default phi values if not provided
const DEFAULT_PHI: Record<string, number> = {
  'loose-sand': 28, 'medium-sand': 32, 'dense-sand': 36,
  'laterite-soft': 26, 'laterite-hard': 33,
};

// End-bearing factors (Nq for sand; Nc for clay ≈ 9)
const END_BEARING_FACTOR: Record<string, number> = {
  'soft-clay': 9, 'firm-clay': 9, 'stiff-clay': 9,
  'loose-sand': 10, 'medium-sand': 20, 'dense-sand': 40,
  'laterite-soft': 15, 'laterite-hard': 40,
  'rock': 300,
};

export function designPile(inp: PileInputs): PileResults {
  const msgs: string[] = [];
  const { diameter, length, layers, gwt, FoS } = inp;

  const d = diameter / 1000;   // m
  const perimeter = Math.PI * d;
  const area_tip = Math.PI * d * d / 4;

  // Reduction factor for bored piles (lower than driven)
  const boreRed = inp.pileType === 'bored' ? 0.7 : 1.0;

  const layerFriction: PileResults['layerFriction'] = [];
  let depth = 0;
  let Qs = 0;
  let sigma_v = 0;  // effective vertical stress at top of each layer
  let toeLayer: SoilLayer | undefined;  // soil layer actually at the pile toe

  for (const layer of layers) {
    const thick = Math.min(layer.thickness, Math.max(0, length - depth));
    if (thick <= 0) break;
    toeLayer = layer;

    const gamma = layer.gamma ?? (depth < gwt ? 18 : 10);  // kN/m³
    const sigma_mid = sigma_v + gamma * thick / 2;  // effective stress at mid-layer

    let qs = 0;  // unit shaft friction (kPa)

    if (layer.soilType.includes('clay')) {
      const cu = layer.cu ?? DEFAULT_CU[layer.soilType] ?? 50;
      const alpha = ALPHA[layer.soilType] ?? 0.5;
      qs = alpha * cu * boreRed;
    } else if (layer.soilType === 'rock') {
      qs = 200 * boreRed;  // conserv. for weak rock
    } else {
      // Sand / laterite — β-method
      const phi = layer.phi ?? DEFAULT_PHI[layer.soilType] ?? 30;
      const delta = 0.8 * phi * Math.PI / 180;  // interface friction angle
      const Ks = inp.pileType === 'driven-precast' ? 1.0 : 0.7;
      qs = Math.min(Ks * sigma_mid * Math.tan(delta) * boreRed, 100);  // cap at 100 kPa
    }

    const Qs_layer = qs * perimeter * thick;
    layerFriction.push({ label: `${layer.soilType} (${thick.toFixed(1)}m)`, qs: +qs.toFixed(1), Qs_layer: +Qs_layer.toFixed(1) });
    Qs += Qs_layer;
    sigma_v += gamma * thick;
    depth += thick;
  }

  // End bearing — use soil type at pile toe (the layer actually reached by the pile length)
  toeLayer = toeLayer ?? layers[layers.length - 1];
  const sigma_toe = sigma_v;
  let qb = 0;
  if (toeLayer.soilType.includes('clay')) {
    const cu = toeLayer.cu ?? DEFAULT_CU[toeLayer.soilType] ?? 50;
    qb = 9 * cu;
  } else if (toeLayer.soilType === 'rock') {
    qb = 3000;  // very conservative weak rock
  } else {
    const Nq = END_BEARING_FACTOR[toeLayer.soilType] ?? 20;
    qb = Math.min(Nq * sigma_toe, 5000);  // cap per BS 8004
  }
  // Bored pile: reduce end bearing by 50% (unclean base)
  const Qb = qb * area_tip * (inp.pileType === 'bored' ? 0.5 : 1.0);

  const Qu = Qs + Qb;
  const Qa = Qu / FoS;

  if (inp.loadType === 'tension') {
    const Qa_tension = Qs / FoS;
    msgs.push(`Tension capacity (shaft only) = ${Qa_tension.toFixed(0)} kN`);
  }
  msgs.push(`PASS: Qa = ${Qa.toFixed(0)} kN (Qu = ${Qu.toFixed(0)} kN, FoS = ${FoS})`);
  msgs.push(`Shaft: ${Qs.toFixed(0)} kN (${((Qs / Qu) * 100).toFixed(0)}%)  |  Base: ${Qb.toFixed(0)} kN (${((Qb / Qu) * 100).toFixed(0)}%)`);

  if (Qb / Qu > 0.5 && inp.pileType === 'bored') {
    msgs.push('WARN: End bearing > 50% — ensure base is properly cleaned for bored pile');
  }

  return {
    status: 'pass', Qs: +Qs.toFixed(1), Qb: +Qb.toFixed(1),
    Qu: +Qu.toFixed(1), Qa: +Qa.toFixed(1),
    layerFriction, perimetre: +perimeter.toFixed(3), area_tip: +area_tip.toFixed(4),
    messages: msgs,
  };
}
