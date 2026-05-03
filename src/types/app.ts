// ── User & Auth ───────────────────────────────────────────────────────────────
export type UserRole = 'junior' | 'senior' | 'principal';

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
  email: string;
}

// ── Project Register ──────────────────────────────────────────────────────────
export interface Project {
  id: string;
  jobNumber: string;
  name: string;
  client: string;
  location: string;
  description: string;
  engineerId: string;
  status: 'active' | 'on-hold' | 'complete';
  createdAt: string;
  updatedAt: string;
}

// ── Design Save / Revision ────────────────────────────────────────────────────
export type DesignStatus = 'draft' | 'submitted' | 'checked' | 'approved';
export type RevisionLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface DesignRevision {
  revision: RevisionLabel;
  date: string;
  engineerId: string;
  note: string;
}

export interface SavedDesign {
  id: string;
  projectId: string;
  memberTag: string;
  memberType: 'beam' | 'column' | 'slab' | 'foundation' | 'retaining-wall' | 'staircase' | 'steel';
  buildingCode: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown> | null;
  status: DesignStatus;
  revisions: DesignRevision[];
  currentRevision: RevisionLabel;
  checkedBy?: string;
  checkedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Concrete Cube Test Log ────────────────────────────────────────────────────
export interface CubeTestResult {
  id: string;
  projectId: string;
  pourReference: string;
  dateOfPour: string;
  dateOfTest: string;
  targetStrength: number;
  result1: number;
  result2: number;
  result3: number;
  average: number;
  passFail: 'pass' | 'fail';
  notes: string;
  testedBy: string;
}

// ── Site Investigation ────────────────────────────────────────────────────────
export interface SoilLayer {
  depth: number;          // depth to bottom of layer (m)
  soilType: string;
  description: string;
  nValue?: number;        // SPT N-value
}

export interface SiteInvestigationRecord {
  id: string;
  projectId: string;
  boreholeRef: string;
  date: string;
  location: string;
  depth: number;
  groundwaterDepth: number | null;
  testType: string;
  layers: SoilLayer[];
  bearingCapacity: number | null;  // kPa — estimated from test
  notes: string;
  conductedBy: string;
}

// ── Inspection Checklist ──────────────────────────────────────────────────────
export type ChecklistType = 'pre-pour' | 'placement' | 'post-pour';

export interface ChecklistItem {
  id: string;
  description: string;
  checked: boolean;
  note: string;
}

export interface InspectionChecklist {
  id: string;
  projectId: string;
  type: ChecklistType;
  elementRef: string;
  date: string;
  inspectorId: string;
  items: ChecklistItem[];
  signedOff: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
}

// ── Drawing Register ──────────────────────────────────────────────────────────
export interface Drawing {
  id: string;
  projectId: string;
  drawingNumber: string;
  title: string;
  revision: string;
  discipline: 'structural' | 'architectural' | 'geotechnical' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  fileDataUrl: string;
  fileSize: number;
  supersededBy?: string;
  status: 'current' | 'superseded';
}

// ── Cost Database ─────────────────────────────────────────────────────────────
export type CostCategory = 'concrete' | 'steel' | 'formwork' | 'labour' | 'aggregates' | 'other';

export interface CostItem {
  id: string;
  category: CostCategory;
  description: string;
  unit: string;
  rateGMD: number;
  quarter: string;
  source: string;
}

// ── Worked Example ────────────────────────────────────────────────────────────
export interface WorkedExample {
  id: string;
  title: string;
  memberType: string;
  buildingCode: string;
  description: string;
  tags: string[];
  inputs: Record<string, unknown>;
  steps: unknown[];
}
