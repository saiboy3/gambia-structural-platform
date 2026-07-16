import type { ColumnInputs, ColumnResults } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { barArea, chooseBars } from './materials';

export function designColumn(inp: ColumnInputs, _code: Partial<CodeFactors> = {}): ColumnResults {
  const msgs: string[] = [];
  const { fcd, fyd } = inp.material;

  const b = inp.b, h = inp.h;
  const Ac = inp.shape === 'circular' ? Math.PI * b * b / 4 : b * h;
  const lo = inp.height * 1000 * (inp.braced ? 0.7 : 1.0); // effective length mm

  // Slenderness (EC2 5.8.3)
  const iy = b / Math.sqrt(12), ix = h / Math.sqrt(12); // radius of gyration rectangular
  const λy = lo / iy, λx = lo / ix;
  const λlim = 20; // simplified
  const isSlender = λy > λlim || λx > λlim;
  if (isSlender) msgs.push('WARN: Column is slender — second-order effects may apply');

  // Biaxial bending capacity check (simplified interaction)
  const Ned = inp.Ned * 1000;  // N
  const Med_y = inp.Medy * 1e6, Med_x = inp.Medx * 1e6; // Nmm

  // Minimum eccentricity
  const e0 = Math.max(lo / 400, 20); // mm
  const Med_eff_y = Math.max(Med_y, Ned * e0);
  const Med_eff_x = Math.max(Med_x, Ned * e0);

  // Required steel (simplified)
  const Nud = fcd * Ac;

  let AsReq = Math.max(
    ((Ned - 0.8 * Nud) / fyd) + (Med_eff_y / (0.9 * h * fyd)),
    ((Ned - 0.8 * Nud) / fyd) + (Med_eff_x / (0.9 * b * fyd)),
    0
  );

  const minAs = Math.max(0.1 * Ned / fyd, 0.002 * Ac);
  const maxAs = 0.04 * Ac;
  AsReq = Math.max(AsReq, minAs);
  if (AsReq > maxAs) msgs.push('FAIL: Steel exceeds 4% — increase section size');

  // EC2 §9.5.2(4): a polygonal column needs a bar at every corner (so ≥4 for a
  // rectangle/square), and a circular column needs ≥4 longitudinal bars.
  // chooseBars() floors at 2, which is right for a beam but not for a column —
  // a lightly-loaded column governed by As,min would otherwise be detailed with
  // 2 bars, which is not buildable and not code-compliant.
  const chosen = chooseBars(AsReq, 20);
  const minBarCount = 4;
  const barCount = Math.max(chosen.count, minBarCount);
  const mainBars = barCount === chosen.count
    ? chosen
    : { dia: chosen.dia, count: barCount, As: barCount * barArea(chosen.dia) };

  // Links (EC2 9.5.3): ≥ 6mm, ≤ min(12φ, 0.6b, 240mm)
  const linkDia = Math.max(6, Math.floor(mainBars.dia * 0.25 / 2) * 2);
  const linkSpacing = Math.min(12 * mainBars.dia, Math.min(0.6 * Math.min(b, h), 240));

  // Axial capacity
  const capacity = (fcd * Ac + mainBars.As * fyd) / 1000; // kN

  if (inp.Ned > capacity) msgs.push('FAIL: Axial load exceeds capacity');
  if (msgs.length === 0) msgs.push('OK: Column adequate');

  const status = msgs.some(m => m.startsWith('FAIL')) ? 'FAIL'
               : msgs.some(m => m.startsWith('WARN')) ? 'WARN' : 'OK';

  return {
    slendernessY: λy, slendernessX: λx, isSlender,
    AsReq, minAs, maxAs,
    mainBars,
    links: { dia: linkDia, spacing: Math.floor(linkSpacing) },
    capacity,
    status,
    messages: msgs,
  };
}
