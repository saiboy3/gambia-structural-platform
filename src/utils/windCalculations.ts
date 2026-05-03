// EN 1991-1-4 Wind load calculations
// Gambia-specific defaults: coastal West Africa, vb,0 ≈ 35 m/s

export type TerrainCategory = '0' | 'I' | 'II' | 'III' | 'IV';
export type WindZone = 'Coastal' | 'Inland' | 'Urban';

export interface WindInputs {
  vb0: number;          // Basic wind speed (m/s) — map value
  zone: WindZone;
  terrain: TerrainCategory;
  height: number;       // m — reference height ze
  breadth: number;      // m — crosswind dimension
  depth: number;        // m — along-wind dimension
  cdir: number;         // Directional factor (default 1.0)
  cseason: number;      // Season factor (default 1.0)
  csCd: number;         // Structural factor (default 1.0 for rigid)
  internalPressure: 'open' | 'closed' | 'dominant'; // for cpi
  rho: number;          // Air density kg/m³ (1.25 for Gambia)
}

export interface WindResults {
  vb: number;           // Basic wind velocity (m/s)
  vm: number;           // Mean wind velocity at ze (m/s)
  vp: number;           // Peak wind velocity (m/s)
  qb: number;           // Basic velocity pressure (kN/m²)
  qp: number;           // Peak velocity pressure (kN/m²)
  ce: number;           // Exposure factor
  cr: number;           // Roughness factor
  co: number;           // Orography factor (1.0 assumed flat)
  cpe_wall: number;     // External pressure coeff — windward wall
  cpe_lee: number;      // External pressure coeff — leeward wall
  cpe_roof: number;     // External pressure coeff — roof (suction)
  cpi: number;          // Internal pressure coefficient
  we_wind: number;      // Net wind pressure on windward wall (kN/m²)
  we_lee: number;       // Net wind pressure on leeward wall (kN/m²)
  we_roof: number;      // Net roof pressure (kN/m²)
  Fw_total: number;     // Total wind force on building (kN)
  Fw_perM: number;      // Wind force per m height (kN/m)
}

// Terrain roughness length z0 and min height zmin (EC1 Table 4.1)
const TERRAIN: Record<TerrainCategory, { z0: number; zmin: number; label: string }> = {
  '0':   { z0: 0.003, zmin: 1,  label: 'Sea / coastal strip' },
  'I':   { z0: 0.01,  zmin: 1,  label: 'Open country, lakes' },
  'II':  { z0: 0.05,  zmin: 2,  label: 'Farmland with hedges' },
  'III': { z0: 0.3,   zmin: 5,  label: 'Suburban / forest' },
  'IV':  { z0: 1.0,   zmin: 10, label: 'Urban / city centre' },
};

// Gambia default wind speeds by zone (m/s, 10-min mean, 50-year return)
export const GAMBIA_WIND: Record<WindZone, { vb0: number; note: string }> = {
  'Coastal': { vb0: 37, note: 'Atlantic coast — higher exposure' },
  'Inland':  { vb0: 32, note: 'Central Gambia — reduced exposure' },
  'Urban':   { vb0: 28, note: 'Urban areas — sheltered' },
};

export function calcWind(inp: WindInputs): WindResults {
  const { z0, zmin } = TERRAIN[inp.terrain];
  const z  = Math.max(inp.height, zmin);
  const kr = 0.19 * (z0 / 0.05) ** 0.07;  // roughness factor coefficient

  // Basic & mean wind velocity
  const vb = inp.cdir * inp.cseason * inp.vb0;
  const cr = kr * Math.log(z / z0);                // roughness factor
  const co = 1.0;                                    // flat terrain
  const vm = cr * co * vb;                          // mean wind velocity

  // Turbulence intensity Iv
  const kI = 1.0;  // turbulence factor
  const Iv = kI / (co * Math.log(z / z0));

  // Peak velocity pressure qp (kN/m²)
  const qb = 0.5 * inp.rho * vb * vb / 1000;       // kN/m²
  const ce = (1 + 7 * Iv) * cr * cr * co * co;     // exposure factor
  const qp = ce * qb;
  const vp = Math.sqrt(2 * qp * 1000 / inp.rho);   // peak gust velocity

  // External pressure coefficients (EC1 Table 7.1)
  const hd = inp.height / inp.depth;
  // Windward wall cpe,10
  const cpe_wall = hd <= 0.25 ? 0.7 : hd >= 1 ? 0.8 : 0.7 + 0.1 * (hd - 0.25) / 0.75;
  // Leeward wall
  const cpe_lee  = hd <= 0.25 ? -0.3 : hd >= 1 ? -0.5 : -0.3 - 0.2 * (hd - 0.25) / 0.75;
  // Flat/duopitch roof (simplified — suction dominant)
  const cpe_roof = -0.7;

  // Internal pressure coefficient
  const cpi = inp.internalPressure === 'open' ? 0.7
            : inp.internalPressure === 'dominant' ? 0.7
            : -0.3; // closed

  // Net pressures we = qp × (cpe − cpi)  kN/m²
  const we_wind = qp * (cpe_wall - cpi);
  const we_lee  = qp * (cpe_lee  - cpi);
  const we_roof = qp * (cpe_roof - cpi);

  // Total wind force (simplified — windward + leeward on elevation)
  const Aref     = inp.height * inp.breadth;  // reference area m²
  const cf       = cpe_wall - cpe_lee;        // force coefficient
  const Fw_total = inp.csCd * qp * cf * Aref;
  const Fw_perM  = inp.csCd * qp * cf * inp.breadth;

  return { vb, vm, vp, qb, qp, ce, cr, co, cpe_wall, cpe_lee, cpe_roof, cpi, we_wind, we_lee, we_roof, Fw_total, Fw_perM };
}

export { TERRAIN };
