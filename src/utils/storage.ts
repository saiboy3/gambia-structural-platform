import type { AppUser } from '../types/app';

// ── Storage keys ──────────────────────────────────────────────────────────────
export const KEYS = {
  USERS:           'gsp_users',
  CURRENT_USER:    'gsp_current_user',
  PROJECTS:        'gsp_projects',
  DESIGNS:         'gsp_designs',
  CUBE_TESTS:      'gsp_cube_tests',
  SITE_INV:        'gsp_site_investigations',
  CHECKLISTS:      'gsp_checklists',
  DRAWINGS:        'gsp_drawings',
  COST_ITEMS:      'gsp_cost_items',
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────
export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    console.error('localStorage write failed for key:', key);
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Estimate localStorage usage (bytes) ──────────────────────────────────────
export function estimateStorageBytes(): number {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    total += (localStorage.getItem(key) ?? '').length * 2; // UTF-16
  }
  return total;
}

// ── Default seed data ─────────────────────────────────────────────────────────
const DEFAULT_USERS: AppUser[] = [
  { id: 'u1', name: 'Amadou Jallow',   initials: 'AJ', role: 'principal', email: 'amadou@firm.gm' },
  { id: 'u2', name: 'Fatou Ceesay',    initials: 'FC', role: 'senior',    email: 'fatou@firm.gm'   },
  { id: 'u3', name: 'Omar Dibba',      initials: 'OD', role: 'junior',    email: 'omar@firm.gm'    },
  { id: 'u4', name: 'Mariama Sowe',    initials: 'MS', role: 'junior',    email: 'mariama@firm.gm' },
];

export function seedDefaultUsers(): AppUser[] {
  const existing = getItem<AppUser[]>(KEYS.USERS, []);
  if (existing.length === 0) {
    setItem(KEYS.USERS, DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  return existing;
}
