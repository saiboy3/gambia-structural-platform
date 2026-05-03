import type { ColumnInputs } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';

export interface PMPoint { P: number; M: number; }

export interface PMDiagramData {
  envelope: PMPoint[];
  designPoint: PMPoint;
  insideCurve: boolean;
}

export function computePMDiagram(inp: ColumnInputs, cf: CodeFactors): PMDiagramData {
  const { b, h, cover } = inp;
  const { fck, fyd } = inp.material;
  const Ned = inp.Ned;
  const Med = Math.sqrt(inp.Medy ** 2 + inp.Medx ** 2); // resultant

  const fcd = cf.alphaCC * fck / cf.gammaC;
  const Ac = inp.shape === 'circular' ? Math.PI * b * b / 4 : b * h;

  // Estimate reinforcement area from design
  // Use 1% to 4% range for envelope
  const AsEst = Math.max(0.01 * Ac, 0.002 * Ac); // min steel
  const As = AsEst * 4;   // for the envelope use 4% (envelope envelope)
  const d = h - cover - 10; // effective depth (approx)
  const d2 = cover + 10;    // cover to compression steel centre

  const envelope: PMPoint[] = [];

  // Pure axial (all compression)
  const P0 = fcd * Ac / 1000 + fyd * As / 1000; // kN (approximate)

  // Pure bending (zero axial — balanced roughly)
  const M0 = (0.85 * fcd * b * d * 0.8 * d / 2 + fyd * As / 2 * (d - d2)) / 1e6; // kNm

  // Generate envelope points from P0 → 0 axial → tension
  const numPoints = 30;
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    // Simplified linear interaction (conservative envelope)
    // Tri-linear: P0 at M=0 → Pbal at Mmax → 0 at M0
    let P: number, M: number;
    if (ratio <= 0.5) {
      // upper branch: from P0,0 to Pbal,Mmax
      const t = ratio / 0.5;
      P = P0 * (1 - t * 0.4);
      M = M0 * t;
    } else {
      // lower branch: from Pbal,Mmax to 0,M0*0.85
      const t = (ratio - 0.5) / 0.5;
      P = P0 * 0.6 * (1 - t);
      M = M0 * (1 - t * 0.15);
    }
    envelope.push({ P: Math.max(P, 0), M: Math.max(M, 0) });
  }
  // Close to origin for M=0 tension side (zero capacity)
  envelope.push({ P: 0, M: 0 });

  const designPoint: PMPoint = { P: Ned, M: Med };

  // Check if design point is inside — simple linear check relative to envelope
  const insideCurve = Ned <= P0 && Med <= M0 && (Ned / P0 + Med / M0) <= 1.05;

  return { envelope, designPoint, insideCurve };
}
