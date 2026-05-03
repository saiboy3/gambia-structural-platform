import type { ConcreteGrade, RebarGrade, Material } from '../types/structural';

const concreteProps: Record<ConcreteGrade, { fck: number; Ec: number }> = {
  'C20/25': { fck: 20, Ec: 29000 },
  'C25/30': { fck: 25, Ec: 30500 },
  'C30/37': { fck: 30, Ec: 32000 },
  'C35/45': { fck: 35, Ec: 33500 },
  'C40/50': { fck: 40, Ec: 35000 },
};

const rebarProps: Record<RebarGrade, { fyk: number }> = {
  'B500B': { fyk: 500 },
  'B500C': { fyk: 500 },
  'B250':  { fyk: 250 },
};

export function getMaterial(concrete: ConcreteGrade, rebar: RebarGrade): Material {
  const { fck, Ec } = concreteProps[concrete];
  const { fyk } = rebarProps[rebar];
  return {
    concrete,
    rebar,
    fck,
    fyk,
    fcd: (fck * 0.85) / 1.5,   // EC2 αcc=0.85, γc=1.5
    fyd: fyk / 1.15,            // EC2 γs=1.15
    Ec,
    Es: 200000,
  };
}

// Standard bar diameters available in Gambia (mm)
export const BAR_DIAMETERS = [8, 10, 12, 16, 20, 25, 32];

export function barArea(dia: number): number {
  return Math.PI * dia * dia / 4;
}

// Pick smallest bar count ≥ AsReq using given diameter
export function chooseBars(AsReq: number, preferDia?: number): { dia: number; count: number; As: number } {
  const diameters = preferDia ? [preferDia] : BAR_DIAMETERS;
  let best = { dia: 32, count: Math.ceil(AsReq / barArea(32)), As: 0 };
  for (const dia of diameters) {
    const a = barArea(dia);
    const count = Math.max(2, Math.ceil(AsReq / a));
    if (count <= 8) {
      best = { dia, count, As: count * a };
      break;
    }
  }
  if (best.As === 0) best.As = best.count * barArea(best.dia);
  return best;
}

// Choose bar spacing (mm) for slab/wall steel (per metre)
export function chooseSpacing(AsReq: number): { dia: number; spacing: number; As: number } {
  for (const dia of BAR_DIAMETERS) {
    const a = barArea(dia);
    for (const s of [75, 100, 125, 150, 175, 200, 225, 250]) {
      const As = (a / s) * 1000;
      if (As >= AsReq) return { dia, spacing: s, As };
    }
  }
  return { dia: 32, spacing: 75, As: (barArea(32) / 75) * 1000 };
}
