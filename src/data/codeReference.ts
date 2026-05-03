import type { BuildingCode } from '../context/BuildingCodeContext';

export interface ClauseEntry {
  id: string;
  code: BuildingCode | 'ALL';
  clause: string;
  topic: string;
  summary: string;
  equation?: string;
  note?: string;
  tableData?: { headers: string[]; rows: string[][] };
}

export const CODE_CLAUSES: ClauseEntry[] = [
  // ── EC2 ─────────────────────────────────────────────────────────────────────
  { id:'ec2-1', code:'EC2', clause:'EC2 §3.1.2 Table 3.1', topic:'Concrete grades — strength classes',
    summary:'Characteristic cylinder compressive strength fck for standard concrete grades.',
    tableData:{ headers:['Grade','fck (MPa)','fctm (MPa)','Ecm (GPa)'],
      rows:[['C20/25','20','2.21','30'],['C25/30','25','2.56','31'],['C30/37','30','2.90','33'],['C35/45','35','3.21','34'],['C40/50','40','3.51','35']] } },
  { id:'ec2-2', code:'EC2', clause:'EC2 §3.1.6(1)', topic:'Design concrete strength',
    summary:'Design compressive strength fcd = αcc × fck / γc, where αcc = 0.85 and γc = 1.5.',
    equation:'fcd = 0.85 × fck / 1.5' },
  { id:'ec2-3', code:'EC2', clause:'EC2 §3.2.7', topic:'Design steel strength',
    summary:'Design yield strength fyd = fyk / γs, where γs = 1.15.',
    equation:'fyd = fyk / 1.15' },
  { id:'ec2-4', code:'EC2', clause:'EC2 §4.4.1 Table 4.4N', topic:'Minimum concrete cover',
    summary:'Nominal cover = cmin + Δcdev (Δcdev = 10 mm typically). cmin depends on exposure class.',
    tableData:{ headers:['Exposure class','cmin,dur (mm)'],
      rows:[['XC1 (dry/perm. wet)','15'],['XC2 (wet, rarely dry)','25'],['XC3 (moderate humidity)','25'],['XC4 (cyclic wet/dry)','30'],['XS1 (airborne sea salt)','35']] } },
  { id:'ec2-5', code:'EC2', clause:'EC2 §9.2.1.1', topic:'Minimum longitudinal steel (beams)',
    summary:'As,min = 0.26 × (fctm/fyk) × bw × d but not less than 0.0013 × bw × d.',
    equation:'As,min = max(0.26 × fctm/fyk × bw × d, 0.0013 × bw × d)' },
  { id:'ec2-6', code:'EC2', clause:'EC2 §9.2.1.1', topic:'Maximum longitudinal steel (beams)',
    summary:'As,max = 0.04 × Ac (at any section, including laps).',
    equation:'As,max = 0.04 × b × h' },
  { id:'ec2-7', code:'EC2', clause:'EC2 §6.2.2', topic:'Shear resistance without shear reinforcement (VRd,c)',
    summary:'VRd,c = [CRd,c × k × (100ρl × fck)^(1/3) + k1 × σcp] × bw × d; min value applies.',
    equation:'VRd,c = 0.12 × k × (100ρl × fck)^(1/3) × bw × d (γc=1.5)',
    note:'k = 1 + √(200/d) ≤ 2.0; ρl = As/(bw×d) ≤ 0.02' },
  { id:'ec2-8', code:'EC2', clause:'EC2 §7.4.2', topic:'Span-to-depth deflection limits (simplified)',
    summary:'Basic span/effective depth ratios for deflection control without explicit calculation.',
    tableData:{ headers:['Support condition','Span/depth limit'],
      rows:[['Simply supported','20'],['End span (continuous)','26'],['Interior span','30'],['Cantilever','8']] } },
  { id:'ec2-9', code:'EC2', clause:'EC2 §7.3.1', topic:'Crack width limit (wmax)',
    summary:'For reinforced members in XC1: wmax = 0.4 mm. For XC2–XC4: wmax = 0.3 mm.',
    equation:'wmax = 0.3 mm (general for Gambia coastal/humid exposure)' },
  { id:'ec2-10', code:'EC2', clause:'EC2 §5.8.3', topic:'Column slenderness limit',
    summary:'Second-order effects may be ignored if λ ≤ λlim. Simplified: λlim = 20 for braced frames.',
    equation:'λ = l₀/i where i = radius of gyration; λlim ≈ 20 (braced)' },
  { id:'ec2-11', code:'EC2', clause:'EC2 §9.5.2', topic:'Column reinforcement limits',
    summary:'Min As = 0.1×NEd/fyd but ≥ 0.002×Ac; Max As = 0.04×Ac.',
    equation:'0.002Ac ≤ As ≤ 0.04Ac' },
  { id:'ec2-12', code:'EC2', clause:'EC2 §9.5.3', topic:'Column links (stirrups)',
    summary:'Max spacing: min(12×φlong, 0.6×h, 240 mm). Min diameter: max(6mm, φlong/4).',
    equation:'smax = min(12φ, 0.6h, 240 mm)' },
  { id:'ec2-13', code:'EC2', clause:'EC2 §6.4', topic:'Punching shear (slabs / foundations)',
    summary:'Control perimeter u1 at 2d from column face. VRd,c per unit length of perimeter.',
    equation:'u1 = 2(c1+c2) + 4πd; vEd = β×VEd/(u1×d)' },

  // ── BS 8110 ──────────────────────────────────────────────────────────────────
  { id:'bs-1', code:'BS8110', clause:'BS8110 §3.4.4.1', topic:'Design concrete strength',
    summary:'Design strength in compression = 0.67 × fcu / γm where γm = 1.5.',
    equation:'0.67 × fcu / 1.5 = 0.447 fcu' },
  { id:'bs-2', code:'BS8110', clause:'BS8110 §3.4.4.4', topic:'Bending — beam design',
    summary:'K = M/(fcu × b × d²); K must ≤ 0.156 (singly reinforced). Lever arm z = d(0.5 + √(0.25 − K/0.9)).',
    equation:'K = M / (fcu × b × d²); z = d(0.5 + √(0.25 − K/0.9)) ≤ 0.95d' },
  { id:'bs-3', code:'BS8110', clause:'BS8110 §3.4.5.2', topic:'Shear stress limit',
    summary:'Design shear stress v = V/(bv×d); maximum allowable = min(0.8√fcu, 5 N/mm²).',
    equation:'v = V/(bv×d); vmax = min(0.8√fcu, 5) MPa' },
  { id:'bs-4', code:'BS8110', clause:'BS8110 Table 3.10', topic:'Span-to-depth basic ratios',
    summary:'Basic span-to-effective-depth ratios for deflection control without explicit calculation.',
    tableData:{ headers:['Support condition','Ratio'],
      rows:[['Cantilever','7'],['Simply supported','20'],['Continuous','26']] } },
  { id:'bs-5', code:'BS8110', clause:'BS8110 §3.8.1.3', topic:'Column slenderness',
    summary:'Short column if lex/h ≤ 15 (braced) or 10 (unbraced). Slender columns require additional moment.',
    equation:'lex = effective length per Table 3.19' },

  // ── ACI 318 ──────────────────────────────────────────────────────────────────
  { id:'aci-1', code:'ACI318', clause:'ACI 318 §22.2', topic:'Equivalent stress block',
    summary:'Depth of equivalent rectangular stress block: a = β1×c. β1 = 0.85 for f\'c ≤ 28 MPa.',
    equation:'a = As×fy / (0.85×f\'c×b); φMn = φ×As×fy×(d − a/2)' },
  { id:'aci-2', code:'ACI318', clause:'ACI 318 §9.6.1', topic:'Minimum steel (beams)',
    summary:'As,min = greater of 0.25√f\'c/fy×bw×d and 1.4/fy×bw×d.',
    equation:'As,min = max(0.25√f\'c/fy, 1.4/fy) × bw × d' },
  { id:'aci-3', code:'ACI318', clause:'ACI 318 §22.5', topic:'Shear strength (beams)',
    summary:'φVn = φ(Vc + Vs); Vc = 0.17λ√f\'c×bw×d (simplified). φ = 0.75.',
    equation:'Vc = 0.17√f\'c × bw × d (MPa units); φ = 0.75' },
  { id:'aci-4', code:'ACI318', clause:'ACI 318 §9.3.1 Table 9.3.1.1', topic:'Minimum slab thickness',
    summary:'Minimum thickness of non-prestressed one-way slabs unless deflections are calculated explicitly.',
    tableData:{ headers:['Support condition','Min h (one-way)'],
      rows:[['Simply supported','L/20'],['One end cont.','L/24'],['Both ends cont.','L/28'],['Cantilever','L/10']] } },
  { id:'aci-5', code:'ACI318', clause:'ACI 318 §10.7.6', topic:'Column ties spacing',
    summary:'Vertical spacing ≤ min(16 long. bar dia, 48 tie dia, least column dimension).',
    equation:'s ≤ min(16φlong, 48φtie, least dimension)' },

  // ── IBC / ASCE 7 ─────────────────────────────────────────────────────────────
  { id:'ibc-1', code:'IBC', clause:'ASCE 7-22 §2.3.1', topic:'Load combinations (strength)',
    summary:'Seven ULS load combinations for structural design. Combo 2 usually governs: 1.2D + 1.6L.',
    tableData:{ headers:['Combo','Equation'],
      rows:[['U1','1.4D'],['U2','1.2D + 1.6L'],['U3','1.2D + 1.6L + 0.5W'],['U4','1.2D + 1.0W + L'],['U5','0.9D + 1.0W'],['U6','1.2D + 1.0E + L'],['U7','0.9D − 1.0E']] } },
  { id:'ibc-2', code:'IBC', clause:'ASCE 7-22 §4.3.1 Table 4.3-1', topic:'Live loads by occupancy',
    summary:'Minimum uniformly distributed live loads by occupancy or use per ASCE 7-22 Table 4.3-1.',
    tableData:{ headers:['Occupancy','kPa (psf)'],
      rows:[['Residential','1.92 (40)'],['Office','2.40 (50)'],['Corridors (above GF)','3.83 (80)'],['Retail / storage','4.79 (100)'],['Assembly (fixed seats)','2.87 (60)'],['Roof (general)','0.96 (20)']] } },
  { id:'ibc-3', code:'IBC', clause:'ACI 318 §21.2', topic:'Strength reduction factors (φ)',
    summary:'Strength reduction factors φ for use in design of reinforced concrete members per ACI 318-19.',
    tableData:{ headers:['Action','φ factor'],
      rows:[['Tension-controlled bending','0.90'],['Shear','0.75'],['Tied columns (compression)','0.65'],['Spiral columns','0.75'],['Bearing','0.65']] } },

  // ── General / all codes ───────────────────────────────────────────────────────
  { id:'gen-1', code:'ALL', clause:'General practice', topic:'Exposure classes — Gambia context',
    summary:'Most Gambia projects fall in XC3–XC4 (humid/cyclic) near coast, XC2 inland. Coastal sites with tidal/salt exposure: XS1–XS2.',
    note:'Recommended minimum cover: 35 mm coastal, 30 mm inland for slabs; 40–50 mm for foundations.' },
  { id:'gen-2', code:'ALL', clause:'General practice', topic:'Design loads — Gambia typical',
    summary:'Typical design loads for Gambia projects based on common construction materials and occupancy types.',
    tableData:{ headers:['Load type','Typical value'],
      rows:[['Concrete self-weight','24 kN/m³'],['Screed (50mm)','1.2 kN/m²'],['Tiling (25mm)','0.6 kN/m²'],['Partition allowance','1.0 kN/m²'],['Residential live load','2.0 kN/m²'],['Office live load','3.0–4.0 kN/m²'],['Roof (inaccessible)','0.6 kN/m²'],['Basic wind speed (Banjul)','28 m/s']] } },
  { id:'gen-3', code:'ALL', clause:'General practice', topic:'Soil bearing — Gambia typical',
    summary:'Indicative allowable bearing capacities for common soil types found in The Gambia.',
    tableData:{ headers:['Soil type','qa (kN/m²)'],
      rows:[['Hard laterite','150–300'],['Dense sand','100–200'],['Medium dense sand','75–150'],['Firm clay','75–150'],['Soft clay / fill','25–50'],['Weak laterite / decomposed','50–100']] } },
];
