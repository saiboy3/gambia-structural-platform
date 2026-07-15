// ─── Project ───────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  location: string;
  client: string;
  engineer: string;
  date: string;
  description: string;
  members: StructuralMember[];
}

// ─── Materials ─────────────────────────────────────────────────────────────
export type ConcreteGrade = 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45' | 'C40/50';
export type RebarGrade = 'B500B' | 'B500C' | 'B250';

export interface Material {
  concrete: ConcreteGrade;
  rebar: RebarGrade;
  fck: number;   // MPa - char. compressive strength
  fyk: number;   // MPa - char. yield strength
  fcd: number;   // MPa - design compressive strength
  fyd: number;   // MPa - design yield strength
  Ec: number;    // MPa - elastic modulus concrete
  Es: number;    // MPa - elastic modulus steel (200000)
}

// ─── Member types ──────────────────────────────────────────────────────────
export type MemberType = 'beam' | 'column' | 'slab' | 'foundation';

export interface StructuralMember {
  id: string;
  type: MemberType;
  tag: string;
  inputs: BeamInputs | ColumnInputs | SlabInputs | FoundationInputs;
  results?: BeamResults | ColumnResults | SlabResults | FoundationResults;
}

// ─── Beam ──────────────────────────────────────────────────────────────────
export interface BeamInputs {
  span: number;         // m
  width: number;        // mm
  depth: number;        // mm
  cover: number;        // mm
  deadLoad: number;     // kN/m
  liveLoad: number;     // kN/m
  material: Material;
  supportType: 'simply-supported' | 'continuous' | 'cantilever';
  flange?: { width: number; thickness: number };  // T-beam
}

export interface BeamResults {
  Med: number;          // kNm design moment
  Ved: number;          // kN design shear
  AsReq: number;        // mm² required tension steel
  AsProvMin: number;    // mm² minimum steel
  AsProvMax: number;    // mm² maximum steel
  d: number;            // mm effective depth
  x: number;            // mm neutral axis depth
  mainBars: { dia: number; count: number; As: number };
  stirrups: { dia: number; spacing: number; legs: number };
  deflectionOK: boolean;
  shearOK: boolean;
  status: 'OK' | 'FAIL' | 'WARN';
  messages: string[];
}

// ─── Column ────────────────────────────────────────────────────────────────
export type ColumnShape = 'rectangular' | 'circular' | 'square';

export interface ColumnInputs {
  shape: ColumnShape;
  b: number;            // mm width (or diameter)
  h: number;            // mm depth
  cover: number;        // mm
  height: number;       // m effective length
  Ned: number;          // kN axial load
  Medy: number;         // kNm moment about y
  Medx: number;         // kNm moment about x
  material: Material;
  braced: boolean;
}

export interface ColumnResults {
  slendernessY: number;
  slendernessX: number;
  isSlender: boolean;
  AsReq: number;        // mm²
  minAs: number;
  maxAs: number;
  mainBars: { dia: number; count: number; As: number };
  links: { dia: number; spacing: number };
  capacity: number;     // kN
  status: 'OK' | 'FAIL' | 'WARN';
  messages: string[];
}

// ─── Slab ──────────────────────────────────────────────────────────────────
export type SlabType = 'one-way' | 'two-way';

export interface SlabInputs {
  type: SlabType;
  lx: number;           // m short span
  ly: number;           // m long span
  thickness: number;    // mm
  cover: number;        // mm
  deadLoad: number;     // kN/m²
  liveLoad: number;     // kN/m²
  material: Material;
  edgeCondition: 'simply-supported' | 'continuous-all' | 'continuous-one' | 'cantilever';
}

export interface SlabResults {
  Med_x: number;        // kNm/m
  Med_y: number;        // kNm/m
  As_x: number;         // mm²/m
  As_y: number;         // mm²/m
  d: number;            // mm
  barsX: { dia: number; spacing: number; As: number };
  barsY: { dia: number; spacing: number; As: number };
  deflectionOK: boolean;
  spanRatio: number;
  status: 'OK' | 'FAIL' | 'WARN';
  messages: string[];
}

// ─── Foundation ────────────────────────────────────────────────────────────
export type FoundationType = 'pad' | 'strip';

export interface FoundationInputs {
  type: FoundationType;
  columnB: number;      // mm column width
  columnH: number;      // mm column depth
  Ned: number;          // kN column axial load
  Med: number;          // kNm column moment
  Hed: number;          // kN horizontal force
  selfWeight: number;   // % of column load (typically 10%)
  soilBearing: number;  // kN/m² allowable bearing capacity
  cover: number;        // mm
  depth: number;        // mm foundation depth below GL
  material: Material;
  stripLength?: number; // m for strip
}

export interface FoundationResults {
  L: number;            // m length
  B: number;            // m width
  h: number;            // mm thickness
  d: number;            // mm effective depth
  qEd: number;          // kN/m² net soil pressure
  As_bot: number;       // mm²/m bottom steel
  barsBot: { dia: number; spacing: number; As: number };
  punchingOK: boolean;
  bendingOK: boolean;
  FoS_sliding: number;   // base friction resistance / HEd
  slidingOK: boolean;
  status: 'OK' | 'FAIL' | 'WARN';
  messages: string[];
}

// ─── BOQ Item ──────────────────────────────────────────────────────────────
export interface BOQItem {
  description: string;
  unit: string;
  quantity: number;
  rate: number;         // GMD
  amount: number;       // GMD
}
