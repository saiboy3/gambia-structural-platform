import React, { createContext, useContext, useState } from 'react';

export type BuildingCode = 'EC2' | 'BS8110' | 'ACI318' | 'IBC';

export interface CodeFactors {
  code: BuildingCode;
  label: string;
  description: string;
  // Load factors
  gammaG: number;      // Permanent/dead
  gammaQ: number;      // Variable/live
  // Material factors
  gammaC: number;      // Concrete
  gammaS: number;      // Steel
  alphaCC: number;     // Long-term concrete strength reduction
  // Concrete strength interpretation
  fckFactor: number;   // multiplier to get design compressive strength basis
  // Span/depth limits (simply supported beam)
  spanDepthSimple: number;
  spanDepthContinuous: number;
  spanDepthCantilever: number;
  // Column min eccentricity (as fraction of height)
  minEccFraction: number;
  // Standard
  momentFactor: { simple: number; continuous: number; cantilever: number };
  shearFactor: { simple: number; continuous: number; cantilever: number };
}

const CODE_DATA: Record<BuildingCode, CodeFactors> = {
  EC2: {
    code: 'EC2',
    label: 'Eurocode 2',
    description: 'EN 1992-1-1:2004 — European Standard',
    gammaG: 1.35,
    gammaQ: 1.50,
    gammaC: 1.50,
    gammaS: 1.15,
    alphaCC: 0.85,
    fckFactor: 1.0,
    spanDepthSimple: 20,
    spanDepthContinuous: 26,
    spanDepthCantilever: 8,
    minEccFraction: 1 / 400,
    momentFactor: { simple: 8, continuous: 10, cantilever: 2 },
    shearFactor: { simple: 2, continuous: 1 / 0.6, cantilever: 1 },
  },
  BS8110: {
    code: 'BS8110',
    label: 'BS 8110',
    description: 'BS 8110-1:1997 — British Standard',
    gammaG: 1.40,
    gammaQ: 1.60,
    gammaC: 1.50,
    gammaS: 1.15,
    alphaCC: 0.67,   // BS8110 uses 0.67 * fcu
    fckFactor: 1.25, // fcu ≈ 1.25 * fck (cube vs cylinder)
    spanDepthSimple: 20,
    spanDepthContinuous: 26,
    spanDepthCantilever: 7,
    minEccFraction: 1 / 400,
    momentFactor: { simple: 8, continuous: 10, cantilever: 2 },
    shearFactor: { simple: 2, continuous: 1 / 0.6, cantilever: 1 },
  },
  ACI318: {
    code: 'ACI318',
    label: 'ACI 318',
    description: 'ACI 318-19 — American Concrete Institute',
    gammaG: 1.20,    // 1.2D
    gammaQ: 1.60,    // 1.6L
    gammaC: 1 / 0.65, // φ=0.65 for compression → effective γc
    gammaS: 1 / 0.90, // φ=0.90 for bending
    alphaCC: 0.85,   // β1 stress block factor (similar)
    fckFactor: 1.0,
    spanDepthSimple: 16,
    spanDepthContinuous: 21,
    spanDepthCantilever: 8,
    minEccFraction: 1 / 500,
    momentFactor: { simple: 8, continuous: 10, cantilever: 2 },
    shearFactor: { simple: 2, continuous: 1 / 0.6, cantilever: 1 },
  },
  IBC: {
    // IBC (International Building Code) is an umbrella code.
    // For RC structural design it references:
    //   • ACI 318-19 for concrete member design (φ-factor approach)
    //   • ASCE 7-22 for load determination and combinations
    // Load factors below are ASCE 7-22 §2.3.1 (strength design).
    // Material φ-factors match ACI 318-19 (same as the ACI318 entry above).
    code: 'IBC',
    label: 'IBC / ASCE 7',
    description: 'IBC 2021 — Concrete per ACI 318-19, Loads per ASCE 7-22',
    gammaG: 1.20,       // ASCE 7-22 §2.3.1 Combo 2: 1.2D
    gammaQ: 1.60,       // ASCE 7-22 §2.3.1 Combo 2: 1.6L
    gammaC: 1 / 0.65,  // ACI 318-19 φ = 0.65 tied columns → effective γc
    gammaS: 1 / 0.90,  // ACI 318-19 φ = 0.90 bending → effective γs
    alphaCC: 0.85,      // ACI 318 §22.2 equivalent stress block
    fckFactor: 1.0,
    spanDepthSimple: 16,       // ACI 318-19 Table 9.3.1.1
    spanDepthContinuous: 21,
    spanDepthCantilever: 8,
    minEccFraction: 1 / 500,
    momentFactor: { simple: 8, continuous: 10, cantilever: 2 },
    shearFactor: { simple: 2, continuous: 1 / 0.6, cantilever: 1 },
  },
};

interface BuildingCodeContextType {
  code: BuildingCode;
  factors: CodeFactors;
  setCode: (c: BuildingCode) => void;
  allCodes: CodeFactors[];
}

const BuildingCodeContext = createContext<BuildingCodeContextType | null>(null);

export function BuildingCodeProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<BuildingCode>('EC2');
  return (
    <BuildingCodeContext.Provider value={{
      code,
      factors: CODE_DATA[code],
      setCode,
      allCodes: Object.values(CODE_DATA),
    }}>
      {children}
    </BuildingCodeContext.Provider>
  );
}

export function useBuildingCode() {
  const ctx = useContext(BuildingCodeContext);
  if (!ctx) throw new Error('useBuildingCode must be inside BuildingCodeProvider');
  return ctx;
}

export { CODE_DATA };
