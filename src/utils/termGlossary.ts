/**
 * termGlossary — plain-English explanations for technical grade/class codes.
 * Consulted automatically by SelectField: whenever the selected option matches
 * a known term, a one-line explanation appears under the dropdown.
 * Keys are matched against the option's value, its label, and the label's
 * first word — so both value-keyed ('B500B') and label-keyed ('S275 (fyk=…)')
 * selects resolve without any per-page wiring.
 */
export interface TermInfo {
  meaning: string;   // what the code literally means
  use?: string;      // when you'd typically choose it
}

const GLOSSARY: Record<string, TermInfo> = {
  // ── Concrete grades (EC2: cylinder/cube characteristic strength) ──────────
  'C20/25': {
    meaning: 'Concrete with 20 MPa cylinder / 25 MPa cube characteristic strength at 28 days.',
    use: 'Light-duty: blinding, footpaths, unreinforced or lightly loaded members.',
  },
  'C25/30': {
    meaning: 'Concrete with 25 MPa cylinder / 30 MPa cube characteristic strength at 28 days.',
    use: 'The everyday structural grade in The Gambia — slabs, beams, columns of low/mid-rise buildings.',
  },
  'C30/37': {
    meaning: 'Concrete with 30 MPa cylinder / 37 MPa cube characteristic strength at 28 days.',
    use: 'Heavier structures, coastal exposure, or where smaller sections are wanted.',
  },
  'C35/45': {
    meaning: 'Concrete with 35 MPa cylinder / 45 MPa cube characteristic strength at 28 days.',
    use: 'Bridges, marine/splash-zone work, heavily loaded columns.',
  },
  'C40/50': {
    meaning: 'Concrete with 40 MPa cylinder / 50 MPa cube characteristic strength at 28 days.',
    use: 'High-rise columns, prestressed and precast elements.',
  },

  // ── Rebar grades (EN 10080 / BS 4449) ─────────────────────────────────────
  'B500B': {
    meaning: 'High-yield ribbed bar, 500 MPa characteristic yield, ductility class B (≥5% elongation).',
    use: 'The standard main reinforcement for beams, slabs, columns and footings.',
  },
  'B500C': {
    meaning: 'High-yield ribbed bar, 500 MPa yield, ductility class C (≥7.5% — the most ductile).',
    use: 'Preferred where extra ductility matters, e.g. seismic detailing.',
  },
  'B250': {
    meaning: 'Plain mild-steel bar, 250 MPa characteristic yield, smooth surface.',
    use: 'Links/stirrups and older construction; needs hooks for anchorage since it is unribbed.',
  },

  // ── Structural steel grades (EN 10025) ────────────────────────────────────
  'S275': {
    meaning: 'Structural steel with 275 MPa yield strength (thickness ≤ 16 mm).',
    use: 'General-purpose sections where deflection, not strength, often governs.',
  },
  'S355': {
    meaning: 'Structural steel with 355 MPa yield strength (thickness ≤ 16 mm).',
    use: 'Heavier or longer-span steelwork — ~29% stronger than S275 for similar cost.',
  },

  // ── Bolt classes (ISO 898-1: tensile/yield code) ───────────────────────────
  '4.6': {
    meaning: 'Ordinary bolt: 400 MPa ultimate, yield = 0.6 × 400 = 240 MPa.',
    use: 'Light, non-preloaded connections.',
  },
  '8.8': {
    meaning: 'High-strength bolt: 800 MPa ultimate, yield = 0.8 × 800 = 640 MPa.',
    use: 'The default class for structural connections.',
  },
  '10.9': {
    meaning: 'Very high-strength bolt: 1000 MPa ultimate, yield = 900 MPa.',
    use: 'Preloaded / slip-critical joints and heavy moment connections.',
  },
};

/** Look up a term by option value, full label, or the label's first word. */
export function lookupTerm(value: string, label?: string): TermInfo | undefined {
  if (GLOSSARY[value]) return GLOSSARY[value];
  if (label) {
    if (GLOSSARY[label]) return GLOSSARY[label];
    const firstWord = label.split(/[\s(]/)[0];
    if (GLOSSARY[firstWord]) return GLOSSARY[firstWord];
  }
  return undefined;
}

// ── Engineering symbols ───────────────────────────────────────────────────────
// Explanations for the symbols shown in result rows and calculation sheets.
// Keys are matched case-insensitively, ignoring spaces/commas/subscripts, so
// "vRd,c", "VRdc" and "vrd c" all resolve to the same entry.
const SYMBOLS: Record<string, string> = {
  // Actions
  med:   'Design bending moment — the factored moment the member must resist (ULS).',
  ved:   'Design shear force — the factored shear the member must resist (ULS).',
  ned:   'Design axial force — the factored axial load on the member (ULS).',
  hed:   'Design horizontal force — factored lateral load, e.g. from wind.',
  wed:   'Design load — factored load per unit length or area (γG·Gk + γQ·Qk).',
  gk:    'Characteristic permanent (dead) load — self-weight, finishes, partitions.',
  qk:    'Characteristic variable (imposed/live) load — occupancy, from EC1 Table 6.1.',
  wk_load: 'Characteristic wind load.',

  // Resistances
  mrd:   'Design moment resistance — the moment capacity the section can provide.',
  vrdc:  'Design shear resistance of concrete without shear reinforcement (EC2 Eq. 6.2).',
  vrdmax:'Maximum shear resistance — set by crushing of the concrete compression strut.',
  nrd:   'Design axial resistance — the squash/buckling capacity of the section.',
  mbrd:  'Design buckling resistance moment — moment capacity after the LTB reduction χLT.',
  mcrd:  'Design cross-section moment resistance, before any buckling reduction.',

  // Geometry
  d:     'Effective depth — from the compression face to the centroid of the tension steel.',
  x:     'Neutral axis depth — the boundary between compression and tension in the section.',
  z:     'Lever arm — the distance between the compression and tension resultants.',
  beff:  'Effective flange width — the width of slab acting with the beam in compression.',
  u1:    'Basic control perimeter — the punching-shear check perimeter, at 2d from the column face.',
  ac:    'Gross cross-sectional area of concrete.',

  // Materials
  fck:   'Characteristic cylinder compressive strength of concrete at 28 days.',
  fcd:   'Design compressive strength of concrete = αcc·fck/γC.',
  fyk:   'Characteristic yield strength of reinforcement or structural steel.',
  fyd:   'Design yield strength of steel = fyk/γS.',
  fctm:  'Mean axial tensile strength of concrete — governs cracking.',
  es:    'Modulus of elasticity of steel (200 GPa for reinforcement).',
  ec:    'Modulus of elasticity of concrete.',

  // Reinforcement
  as:      'Area of tension reinforcement.',
  asreq:   'Area of reinforcement required by calculation.',
  asprov:  'Area of reinforcement actually provided by the chosen bars.',
  asmin:   'Minimum reinforcement area — prevents brittle failure on first cracking (EC2 9.2.1.1).',
  asmax:   'Maximum reinforcement area — 4% of the concrete area, for placing/compaction.',
  aswn:    'Area of shear reinforcement (links) per unit length.',

  // Design coefficients & checks
  k:       "Moment ratio K = MEd/(fck·b·d²) — if K exceeds Klim (~0.167), compression steel is needed.",
  klim:    'Limiting K value for a singly-reinforced section without compression steel.',
  lambda:  'Slenderness ratio λ = effective length / radius of gyration — governs buckling.',
  lambdalim: 'Limiting slenderness — above this, second-order effects must be considered.',
  chilt:   'Lateral-torsional buckling reduction factor χLT — reduces moment capacity (≤1.0).',
  rho:     'Reinforcement ratio — steel area as a proportion of the concrete area.',
  rhol:    'Longitudinal tension reinforcement ratio, used in the concrete shear resistance.',
  ka:      'Rankine active earth pressure coefficient — for soil pushing on a wall.',
  ko:      'At-rest earth pressure coefficient — soil against a wall that cannot move.',
  wk:      'Crack width — the calculated surface crack width, limited for durability (typ. 0.3 mm).',
  e0:      'Eccentricity — the effective offset of the axial load, e = M/N.',
  qed:     'Net design bearing pressure applied to the soil beneath a foundation.',
  qa:      'Allowable bearing capacity of the soil, from the site investigation.',
  qu:      'Ultimate pile capacity = shaft friction + end bearing.',
  qs:      'Pile shaft friction capacity.',
  qb:      'Pile end-bearing capacity.',
  fos:     'Factor of safety — the ratio of resisting to disturbing effects.',
  qp:      'Peak velocity pressure — the wind pressure at the building height (EN 1991-1-4).',
  cpe:     'External pressure coefficient — converts wind pressure to a face load.',
  cpi:     'Internal pressure coefficient — depends on the building openings.',

  // Partial factors
  gammag: 'Partial factor on permanent loads (1.35 in EC2 for unfavourable actions).',
  gammaq: 'Partial factor on variable loads (1.5 in EC2 for unfavourable actions).',
  gammac: 'Partial factor on concrete strength (1.5 in EC2).',
  gammas: 'Partial factor on steel strength (1.15 in EC2).',
};

// Descriptive labels used by the calculation sheets, mapped onto the symbol
// entries above. Keys must be written pre-normalised (lowercase, no spaces).
const LABEL_ALIASES: Record<string, keyof typeof SYMBOLS> = {
  effectivedepth:                'd',
  neutralaxis:                   'x',
  neutralaxisdepth:              'x',
  leverarm:                      'z',
  effectiveflangewidth:          'beff',
  grossarea:                     'ac',
  characteristicconcretestrength:'fck',
  designconcretestrength:        'fcd',
  concreteelasticmodulus:        'ec',
  characteristicrebarstrength:   'fyk',
  designsteelstrength:           'fyd',
  concretemeantensilestrength:   'fctm',
  designloadcombination:         'wed',
  designload:                    'wed',
  momentcapacityparameter:       'k',
  balancedmomentlimit:           'klim',
  requiredtensionsteel:          'asreq',
  asrequired:                    'asreq',
  asprovided:                    'asprov',
  steelprovided:                 'asprov',
  minimumsteelarea:              'asmin',
  maximumsteelarea:              'asmax',
  minimumsteel:                  'asmin',
  maximumsteel:                  'asmax',
  steelratio:                    'rho',
  longitudinalsteelratio:        'rhol',
  concretesharesistance:         'vrdc',
  concreteshearresistance:       'vrdc',
  slendernessratio:              'lambda',
  netsoilpressure:               'qed',
  allowablebearing:              'qa',
  bearingpressure:               'qed',
  ultimatecapacity:              'qu',
  shaftfriction:                 'qs',
  endbearing:                    'qb',
  peakvelocitypressure:          'qp',
  axialcapacity:                 'nrd',
  momentresistance:              'mrd',
  eccentricity:                  'e0',
};

/** Normalise a symbol for lookup: lowercase, strip spaces/commas/dots/subscripts. */
function normaliseSymbol(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s,.\-_/]/g, '')
    .replace(/[₀-₉]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 0x30))
    .replace(/λ/g, 'lambda')
    .replace(/ρ/g, 'rho')
    .replace(/χ/g, 'chi')
    .replace(/γ/g, 'gamma')
    .replace(/σ/g, 'sigma');
}

/** Resolve a normalised key via the symbol table or the descriptive aliases. */
function resolve(key: string): string | undefined {
  if (SYMBOLS[key]) return SYMBOLS[key];
  const alias = LABEL_ALIASES[key];
  return alias ? SYMBOLS[alias] : undefined;
}

/**
 * Explain the symbol in a result-row or calc-sheet label. Tries, in order:
 * the parenthesised symbol ("Design Moment (MEd)" → MEd), the label with the
 * parenthetical stripped ("Design Moment"), then the label as-is ("fck").
 */
export function lookupSymbol(label: string): string | undefined {
  const paren = label.match(/\(([^)]+)\)/)?.[1];
  if (paren) {
    const hit = resolve(normaliseSymbol(paren));
    if (hit) return hit;
  }
  const withoutParen = label.replace(/\([^)]*\)/g, '');
  return resolve(normaliseSymbol(withoutParen)) ?? resolve(normaliseSymbol(label));
}
