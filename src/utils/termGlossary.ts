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
