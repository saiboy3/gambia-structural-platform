export interface WorkedExample {
  id: string;
  title: string;
  category: 'beam' | 'column' | 'slab' | 'foundation' | 'retaining-wall' | 'staircase' | 'steel';
  code: 'EC2' | 'BS8110' | 'ACI318';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  description: string;
  steps: WorkedStep[];
  conclusion: string;
}

export interface WorkedStep {
  heading: string;
  body: string;        // may contain markdown-style bold: **text**
  equation?: string;   // displayed in monospace block
  result?: string;     // short result line, e.g. "As,req = 942 mm²/m"
}

export const WORKED_EXAMPLES: WorkedExample[] = [

  // ─── BEAM ──────────────────────────────────────────────────────────────────
  {
    id: 'beam-01',
    title: 'Simply-Supported RC Beam — Bending & Shear (EC2)',
    category: 'beam',
    code: 'EC2',
    difficulty: 'basic',
    description: 'Design a rectangular RC beam spanning 6 m carrying a UDL of 30 kN/m (including self-weight) in bending and shear to EC2.',
    steps: [
      {
        heading: '1. Design moment',
        body: 'For a simply-supported beam under UDL **w = 30 kN/m** and **L = 6 m**:',
        equation: 'MEd = wL²/8 = 30 × 6² / 8 = 135 kNm',
        result: 'MEd = 135 kNm',
      },
      {
        heading: '2. Initial sizing',
        body: 'Assume **b = 300 mm**, **h = 550 mm**, cover = 30 mm, T20 bars ⇒ **d = 550 − 30 − 10 − 10 = 500 mm**.',
        result: 'd = 500 mm',
      },
      {
        heading: '3. Normalised moment (K)',
        body: 'Using **fck = 25 MPa**, **fcd = 25/1.5 = 16.67 MPa**:',
        equation: "K = MEd / (fcd × b × d²) = 135×10⁶ / (16.67 × 300 × 500²) = 0.108",
        result: 'K = 0.108 < Klim = 0.167 ✓ (singly reinforced)',
      },
      {
        heading: '4. Lever arm (z)',
        body: 'EC2 lever arm formula:',
        equation: 'z = d × [0.5 + √(0.25 − K/1.134)] = 500 × [0.5 + √(0.25 − 0.0953)] = 432 mm',
        result: 'z = 432 mm (≤ 0.95d = 475 mm ✓)',
      },
      {
        heading: '5. Tensile steel area',
        body: '**fyk = 500 MPa**, **fyd = 500/1.15 = 435 MPa**:',
        equation: 'As,req = MEd / (fyd × z) = 135×10⁶ / (435 × 432) = 719 mm²',
        result: 'As,req = 719 mm² → Provide 3T20 (As = 942 mm²) ✓',
      },
      {
        heading: '6. Minimum steel check',
        body: 'EC2 Cl 9.2.1.1:',
        equation: 'As,min = max(0.26×fctm/fyk, 0.0013) × b × d = max(0.26×2.6/500, 0.0013) × 300 × 500 = 202 mm²',
        result: '942 mm² > 202 mm² ✓',
      },
      {
        heading: '7. Design shear force',
        body: 'At support, **VEd = wL/2 = 30×6/2 = 90 kN**.',
        result: 'VEd = 90 kN',
      },
      {
        heading: '8. Concrete shear capacity (VRd,c)',
        body: 'ρl = 942 / (300×500) = 0.00628; k = 1 + √(200/500) = 1.632',
        equation: 'VRd,c = [0.12 × 1.632 × (100 × 0.00628 × 25)^(1/3)] × 300 × 500 = 63.4 kN',
        result: 'VRd,c = 63.4 kN < VEd = 90 kN → links required',
      },
      {
        heading: '9. Shear links',
        body: 'Using T8 2-leg links (Asw = 101 mm²), cot θ = 2.5, z = 432 mm:',
        equation: 's = Asw × fyd × z × cotθ / VEd = 101 × 435 × 432 × 2.5 / 90000 = 527 mm',
        result: 'Provide T8 links @ 200 mm c/c (Asw/s = 0.50 mm²/mm)',
      },
    ],
    conclusion: 'Provide 3T20 bottom longitudinal bars and T8 2-leg links at 200 mm centres throughout. Check deflection using EC2 Cl 7.4.2 span/depth approach (L/d = 6000/500 = 12 < basic ratio ≈ 20 ✓).',
  },

  // ─── COLUMN ────────────────────────────────────────────────────────────────
  {
    id: 'col-01',
    title: 'Short Braced RC Column — Axial Load & Bending (EC2)',
    category: 'column',
    code: 'EC2',
    difficulty: 'basic',
    description: 'Design a 300×300 mm short braced column carrying NEd = 1 200 kN and MEd = 45 kNm.',
    steps: [
      {
        heading: '1. Check slenderness (EC2 Cl 5.8.3)',
        body: 'Effective length **l₀ = 0.7 × 3.5 = 2.45 m** (braced, fixed-pinned approx). Radius of gyration **i = h/√12 = 300/√12 = 86.6 mm**.',
        equation: 'λ = l₀/i = 2450/86.6 = 28.3',
        result: 'λlim = 20 × A × B × C / √n ≈ 26.8 → λ = 28.3 > λlim — slender, but only marginally; use nominal moment method.',
      },
      {
        heading: '2. Additional eccentricity (geometric imperfection)',
        body: 'ei = l₀/400 = 2450/400 = 6.1 mm → **MEd,imp = NEd × ei = 1200 × 0.0061 = 7.3 kNm**.',
        result: 'Total MEd = 45 + 7.3 = 52.3 kNm',
      },
      {
        heading: '3. Normalised design forces',
        body: 'fck = 25 MPa, fcd = 16.67 MPa, b = h = 300 mm',
        equation: 'ν = NEd/(fcd×b×h) = 1200×10³/(16.67×300×300) = 0.800\nμ = MEd/(fcd×b×h²) = 52.3×10⁶/(16.67×300×300²) = 0.116',
        result: 'ν = 0.800, μ = 0.116',
      },
      {
        heading: '4. Reinforcement ratio from interaction diagram',
        body: 'Reading a standard EC2 P-M interaction diagram for **d\'/h = 0.10** gives **ω ≈ 0.35**.',
        equation: 'As,tot = ω × fcd/fyd × b × h = 0.35 × 16.67/435 × 300 × 300 = 1 203 mm²',
        result: 'Provide 4T20 (As = 1 257 mm²) ✓',
      },
      {
        heading: '5. Minimum steel check',
        body: 'EC2 Cl 9.5.2: As,min = max(0.10×NEd/fyd, 0.002×b×h)',
        equation: 'As,min = max(0.10×1200000/435, 0.002×300×300) = max(276, 180) = 276 mm²',
        result: '1 257 mm² > 276 mm² ✓',
      },
      {
        heading: '6. Links',
        body: 'Maximum spacing = min(20×Ø_long, min dimension, 400 mm) = min(400, 300, 400) = 300 mm.',
        result: 'Provide T8 links @ 300 mm c/c',
      },
    ],
    conclusion: 'Use 4T20 longitudinal bars with T8 links at 300 mm centres. Provide a minimum of 4 bars in rectangular column sections.',
  },

  // ─── SLAB ──────────────────────────────────────────────────────────────────
  {
    id: 'slab-01',
    title: 'One-Way Spanning RC Slab (EC2)',
    category: 'slab',
    code: 'EC2',
    difficulty: 'basic',
    description: 'Design a one-way spanning slab, span L = 4.5 m, imposed load qk = 3.0 kN/m², finishes = 1.5 kN/m².',
    steps: [
      {
        heading: '1. Initial slab depth',
        body: 'EC2 span/depth basic ratio = 20 (simply supported). Assume **d = 4500/20 = 225 mm** → **h = 250 mm**.',
        result: 'Try h = 250 mm, d = 215 mm (cover 25 mm + T10/2)',
      },
      {
        heading: '2. Design loads (ULS)',
        body: 'Self-weight: 0.25 × 24 = 6.0 kN/m²',
        equation: 'wEd = 1.35(6.0 + 1.5) + 1.5(3.0) = 1.35 × 7.5 + 4.5 = 14.63 kN/m²',
        result: 'wEd = 14.63 kN/m²',
      },
      {
        heading: '3. Design moment (per metre width)',
        body: 'Simply supported:',
        equation: 'MEd = wEd × L² / 8 = 14.63 × 4.5² / 8 = 37.0 kNm/m',
        result: 'MEd = 37.0 kNm/m',
      },
      {
        heading: '4. Flexural reinforcement',
        body: 'fck = 25 MPa, fcd = 16.67 MPa, fyd = 435 MPa',
        equation: 'K = 37.0×10⁶/(16.67×1000×215²) = 0.048\nz = 215×[0.5+√(0.25−0.048/1.134)] = 202 mm\nAs,req = 37.0×10⁶/(435×202) = 421 mm²/m',
        result: 'Provide T10@175mm (As = 449 mm²/m) ✓',
      },
      {
        heading: '5. Deflection check (span/depth)',
        body: 'Actual L/d = 4500/215 = 20.9. Basic ratio = 20. Apply modification for ρ = 449/(1000×215) = 0.00209.',
        equation: 'Factor = 11/(ρ × √fck) × 0.0035^0.5 ≈ 1.06 → Limit = 20 × 1.06 = 21.2 > 20.9 ✓',
        result: 'Deflection OK ✓',
      },
      {
        heading: '6. Secondary reinforcement',
        body: 'Transverse bars: min 20% of main steel.',
        equation: 'As,secondary = 0.2 × 449 = 90 mm²/m → Provide T8@300mm (168 mm²/m) ✓',
        result: 'T8@300 transverse',
      },
    ],
    conclusion: 'Provide T10@175mm bottom bars (spanning direction) and T8@300mm distribution bars. Slab depth 250 mm.',
  },

  // ─── FOUNDATION ────────────────────────────────────────────────────────────
  {
    id: 'fdn-01',
    title: 'Pad Foundation — Bearing & Punching Check (EC2)',
    category: 'foundation',
    code: 'EC2',
    difficulty: 'intermediate',
    description: 'Design a square pad foundation for a 300×300 mm column carrying NEd = 800 kN. Allowable bearing capacity qa = 100 kPa.',
    steps: [
      {
        heading: '1. Foundation size (SLS)',
        body: 'Service load: N_ser ≈ 800/1.35 = 593 kN. Allow 10% for self-weight: 653 kN.',
        equation: 'A_req = 653/100 = 6.53 m² → B = √6.53 = 2.56 m → Use **2.6 × 2.6 m**',
        result: 'Pad: 2.6 × 2.6 m',
      },
      {
        heading: '2. Net ULS bearing pressure',
        body: 'Pad self-weight: 2.6² × 0.5 × 24 = 81 kN. Net reaction = 800 kN.',
        equation: 'pnet = NEd / A = 800 / 2.6² = 118 kPa',
        result: 'pnet = 118 kPa',
      },
      {
        heading: '3. Bending reinforcement',
        body: 'Critical section at column face; cantilever = (2600−300)/2 = 1150 mm.',
        equation: 'MEd = pnet × B × c²/2 = 118 × 2.6 × 1.15² / 2 = 203 kNm\n(per 2.6 m width → 78 kNm/m)',
        result: 'MEd = 78 kNm/m per metre width',
      },
      {
        heading: '4. Steel area',
        body: 'Assume h = 500 mm, d = 440 mm, fck = 25 MPa, fyd = 435 MPa.',
        equation: 'K = 78×10⁶/(16.67×1000×440²) = 0.024\nz = min(0.95d, ...) = 418 mm\nAs,req = 78×10⁶/(435×418) = 429 mm²/m',
        result: 'Provide T16@300mm (As = 670 mm²/m) ✓ each way',
      },
      {
        heading: '5. Punching shear check',
        body: 'Control perimeter at 2d = 880 mm from column face.',
        equation: 'u = 4×(300 + 2×2×440) = 8 240 mm\nvEd = NEd / (u × d) = 800 000 / (8240 × 440) = 0.221 MPa',
        result: 'vEd = 0.221 MPa < vRd,c ≈ 0.47 MPa ✓',
      },
    ],
    conclusion: 'Provide 2.6×2.6 m pad, 500 mm deep, with T16@300mm EW bottom reinforcement. No punching shear reinforcement required.',
  },

  // ─── RETAINING WALL ────────────────────────────────────────────────────────
  {
    id: 'rw-01',
    title: 'Cantilever Retaining Wall — Stability (EC2 / Rankine)',
    category: 'retaining-wall',
    code: 'EC2',
    difficulty: 'intermediate',
    description: 'Check stability of a 3 m cantilever retaining wall: base B = 2.4 m, toe = 0.6 m, stem 300 mm wide, surcharge 10 kPa, φ\' = 30°, γs = 18 kN/m³.',
    steps: [
      {
        heading: '1. Active earth pressure coefficient',
        body: 'Rankine formula for cohesionless soil:',
        equation: 'Ka = (1 − sin 30°)/(1 + sin 30°) = 0.5/1.5 = 0.333',
        result: 'Ka = 0.333',
      },
      {
        heading: '2. Horizontal thrust',
        body: '**H = 3 m**, **q = 10 kPa**:',
        equation: 'Ph,soil = 0.5 × Ka × γs × H² = 0.5 × 0.333 × 18 × 9 = 27.0 kN/m\nPh,surcharge = Ka × q × H = 0.333 × 10 × 3 = 10.0 kN/m\nPh = 37.0 kN/m',
        result: 'Ph = 37.0 kN/m',
      },
      {
        heading: '3. Overturning moment (about toe)',
        body: 'Soil pressure acts at H/3; surcharge at H/2:',
        equation: 'Mot = 27.0 × 3/3 + 10.0 × 3/2 = 27.0 + 15.0 = 42.0 kNm/m',
        result: 'Mot = 42.0 kNm/m',
      },
      {
        heading: '4. Restoring moment (about toe)',
        body: 'Heel = 2.4 − 0.6 − 0.3 = 1.5 m; stem height = 3.0 − 0.4 = 2.6 m (base thk 400 mm).',
        equation: 'W_stem = 2.6 × 0.3 × 24 = 18.7 kN → x = 0.6 + 0.15 = 0.75 m → M = 14.0\nW_base = 2.4 × 0.4 × 24 = 23.0 kN → x = 1.2 m → M = 27.6\nW_soil = 1.5 × 3.0 × 18 = 81.0 kN → x = 0.6+0.3+0.75 = 1.65 m → M = 133.7\nW_surcharge = 1.5 × 10 = 15.0 kN → x = 1.65 m → M = 24.8\nMr = 200.1 kNm/m',
        result: 'Mr = 200.1 kNm/m',
      },
      {
        heading: '5. Factors of safety',
        body: '',
        equation: 'FoS_overturning = Mr/Mot = 200.1/42.0 = 4.76 > 1.5 ✓\nμ = tan(0.67×30°) = tan(20°) = 0.364\nFr = 0.364 × (18.7+23.0+81.0+15.0) = 0.364 × 137.7 = 50.1 kN\nFoS_sliding = 50.1/37.0 = 1.35 < 1.5 ✗ → Need key or increase base',
        result: 'Sliding FAILS — increase base width or add shear key',
      },
    ],
    conclusion: 'Overturning is satisfactory but sliding factor of safety (1.35) is below the 1.5 minimum. Increase base width to 2.8 m or add a 400 mm deep shear key at mid-base.',
  },

  // ─── STAIRCASE ─────────────────────────────────────────────────────────────
  {
    id: 'stair-01',
    title: 'RC Staircase Flight Design (EC2)',
    category: 'staircase',
    code: 'EC2',
    difficulty: 'basic',
    description: 'Design a simply-supported RC staircase flight: 14 risers, R = 175 mm, G = 270 mm, width 1.2 m, live load 3.0 kN/m².',
    steps: [
      {
        heading: '1. Geometry check',
        body: '2R + G rule for comfortable stair pitch:',
        equation: '2×175 + 270 = 620 mm (should be 580–700 mm) ✓\nSlope angle = arctan(175/270) = 33.0°',
        result: 'Geometry satisfactory ✓',
      },
      {
        heading: '2. Effective span',
        body: 'Horizontal projection of flight: (14−1) × 270 mm = 3.51 m. Add landing supports ≈ 0.25 m each.',
        equation: 'Leff = 3.51 + 0.25 + 0.25 = 4.01 m',
        result: 'Leff = 4.01 m',
      },
      {
        heading: '3. Waist depth',
        body: 'EC2 span/depth for simply-supported ≈ 20:',
        equation: 'd_waist = 4010/20 = 200 mm → h_waist = 225 mm (with cover 25 mm)',
        result: 'Waist depth = 225 mm',
      },
      {
        heading: '4. Loads along slope',
        body: 'cos θ = cos 33° = 0.839; slope correction factor = 1/cos θ = 1.19.',
        equation: 'SW_slab = 0.225 × 24 / cos θ = 0.225 × 24 × 1.19 = 6.43 kN/m²\nSW_steps = 0.5 × 0.175 × 24 = 2.10 kN/m²\nDead total = 6.43 + 2.10 + 1.50 = 10.03 kN/m²\nwEd = 1.35×10.03 + 1.5×3.0 = 13.54 + 4.5 = 18.04 kN/m²',
        result: 'wEd = 18.04 kN/m²',
      },
      {
        heading: '5. Design moment',
        body: 'Loading per metre run of flight width 1.2 m: **w = 18.04 × 1.2 = 21.65 kN/m**',
        equation: 'MEd = wL²/8 = 21.65 × 4.01²/8 = 43.6 kNm',
        result: 'MEd = 43.6 kNm',
      },
      {
        heading: '6. Reinforcement',
        body: 'd = 195 mm (cover 25 mm + T10/2), b = 1200 mm, fck = 25 MPa, fyd = 435 MPa',
        equation: 'K = 43.6×10⁶/(16.67×1200×195²) = 0.057\nz = 185 mm\nAs = 43.6×10⁶/(435×185) = 541 mm² total for 1.2 m → 451 mm²/m',
        result: 'Provide T12@225mm (As = 503 mm²/m) ✓',
      },
    ],
    conclusion: 'Provide T12@225mm main bars in the bottom of the waist (225 mm deep) with T8@300mm transverse distribution bars. Check bearing at landings.',
  },

];
