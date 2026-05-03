// ── Unit conversion factors → base SI (N, Pa, m) ─────────────────────────────
const FORCE_TO_N: Record<string, number> = {
  'N': 1, 'kN': 1e3, 'MN': 1e6, 'kgf': 9.807, 'tf': 9807, 'lbf': 4.448, 'kip': 4448,
};
const PRESSURE_TO_PA: Record<string, number> = {
  'Pa': 1, 'kPa': 1e3, 'MPa': 1e6, 'GPa': 1e9,
  'N/mm²': 1e6, 'kN/m²': 1e3, 'kN/mm²': 1e9,
  'psi': 6894.76, 'ksi': 6.895e6, 'bar': 1e5,
};
const LENGTH_TO_M: Record<string, number> = {
  'mm': 1e-3, 'cm': 1e-2, 'm': 1, 'km': 1e3,
  'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144,
};
const MASS_TO_KG: Record<string, number> = {
  'kg': 1, 'g': 1e-3, 't': 1e3, 'lb': 0.4536, 'ton (US)': 907.2,
};

type Category = 'force' | 'pressure' | 'length' | 'mass';

const TABLES: Record<Category, Record<string, number>> = {
  force: FORCE_TO_N,
  pressure: PRESSURE_TO_PA,
  length: LENGTH_TO_M,
  mass: MASS_TO_KG,
};

export function getUnits(cat: Category): string[] {
  return Object.keys(TABLES[cat]);
}

export function convert(value: number, from: string, to: string, cat: Category): number {
  const table = TABLES[cat];
  if (!table[from] || !table[to]) return NaN;
  return value * table[from] / table[to];
}

// ── Bar areas (mm²) ───────────────────────────────────────────────────────────
export const BAR_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32, 40];

export const SINGLE_BAR_AREA: Record<number, number> = {
  6: 28.3, 8: 50.3, 10: 78.5, 12: 113, 16: 201, 20: 314, 25: 491, 32: 804, 40: 1257,
};

export function nBarsArea(dia: number, count: number): number {
  return (SINGLE_BAR_AREA[dia] ?? 0) * count;
}

// Bars per metre — given spacing
export function barsPerMetre(dia: number, spacing: number): number {
  return Math.round((1000 / spacing) * (SINGLE_BAR_AREA[dia] ?? 0));
}

// ── Section properties ────────────────────────────────────────────────────────
export interface SectionProps {
  A: number;    // mm²
  Ix: number;   // mm⁴
  Iy: number;   // mm⁴
  Zx: number;   // mm³
  Zy: number;   // mm³
  rx: number;   // mm
  ry: number;   // mm
}

export function rectangleProps(b: number, h: number): SectionProps {
  const A = b * h;
  const Ix = b * h ** 3 / 12;
  const Iy = h * b ** 3 / 12;
  return { A, Ix, Iy, Zx: Ix / (h / 2), Zy: Iy / (b / 2), rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) };
}

export function circleProps(d: number): SectionProps {
  const r = d / 2;
  const A = Math.PI * r ** 2;
  const I = Math.PI * r ** 4 / 4;
  return { A, Ix: I, Iy: I, Zx: I / r, Zy: I / r, rx: Math.sqrt(I / A), ry: Math.sqrt(I / A) };
}
