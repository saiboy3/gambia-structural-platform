import { useState } from 'react';
import {
  LayoutDashboard, Layers, Columns3, Square, Hammer, FileText, Menu, X,
  ChevronRight, Calculator, ChevronDown, Zap, AlertTriangle, Footprints,
  BookOpen, Ruler, FolderOpen, ClipboardCheck, FlaskConical,
  DollarSign, Users, ImageIcon, LogOut, Milestone, Waves, Lock,
  Triangle, BarChart3, Link2, Building2, Mountain,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import BeamDesign from './components/analysis/BeamDesign';
import ColumnDesign from './components/analysis/ColumnDesign';
import SlabDesign from './components/analysis/SlabDesign';
import FoundationDesign from './components/analysis/FoundationDesign';
import RetainingWallDesign from './components/analysis/RetainingWallDesign';
import StaircaseDesign from './components/analysis/StaircaseDesign';
import SteelDesign from './components/analysis/SteelDesign';
import FlatSlabDesign from './components/analysis/FlatSlabDesign';
import PileDesign from './components/analysis/PileDesign';
import PileCapDesign from './components/analysis/PileCapDesign';
import MasonryWallDesign from './components/analysis/MasonryWallDesign';
import PortalFrame from './components/analysis/PortalFrame';
import CompositeBeam from './components/analysis/CompositeBeam';
import SteelConnection from './components/analysis/SteelConnection';
import PavementDesign from './components/analysis/PavementDesign';
import CulvertDesign from './components/analysis/CulvertDesign';
import BridgeBeam from './components/analysis/BridgeBeam';
import BridgeAbutment from './components/analysis/BridgeAbutment';
import BOQ from './components/reports/BOQ';
import LoadCalculatorPage from './components/analysis/LoadCalculatorPage';
import QuickDesign from './components/analysis/QuickDesign';
import ProjectList from './components/projects/ProjectList';
import ProjectDetail from './components/projects/ProjectDetail';
import CubeTestLog from './components/quality/CubeTestLog';
import InspectionChecklistPage from './components/quality/InspectionChecklist';
import SiteInvestigation from './components/quality/SiteInvestigation';
import CodeReference from './components/reference/CodeReference';
import WorkedExamples from './components/reference/WorkedExamples';
import UnitConverter from './components/tools/UnitConverter';
import CostDatabase from './components/business/CostDatabase';
import StaffDashboard from './components/business/StaffDashboard';
import DrawingRegister from './components/projects/DrawingRegister';
import LoginScreen from './components/auth/LoginScreen';
import DesignWizard from './components/wizard/DesignWizard';
import { BuildingCodeProvider, useBuildingCode } from './context/BuildingCodeContext';
import type { BuildingCode } from './context/BuildingCodeContext';
import { useUser, ROLE_LABELS } from './context/UserContext';
import type { UserRole } from './types/app';
import { useProject } from './context/ProjectContext';

// ─── Page type ────────────────────────────────────────────────────────────────
type Page =
  | 'dashboard' | 'quick' | 'loads' | 'wizard'
  | 'beam' | 'column' | 'slab' | 'flat-slab' | 'foundation' | 'retaining-wall' | 'staircase'
  | 'pile' | 'pile-cap' | 'masonry-wall'
  | 'steel' | 'portal-frame' | 'composite-beam' | 'steel-connection'
  | 'pavement' | 'culvert' | 'bridge-beam' | 'bridge-abutment'
  | 'boq' | 'projects' | 'project-detail' | 'drawing-register'
  | 'cube-tests' | 'checklists' | 'site-investigation'
  | 'code-reference' | 'unit-converter' | 'worked-examples'
  | 'cost-database' | 'staff-dashboard';

const pageTitle: Record<Page, string> = {
  dashboard: 'Dashboard', quick: 'Quick Design', loads: 'Load Calculator',
  wizard: 'Design Wizard',
  beam: 'RC Beam Design', column: 'RC Column Design', slab: 'RC Slab Design',
  'flat-slab': 'Flat Slab Design (EC2 Annex I)',
  foundation: 'Pad Foundation Design', 'retaining-wall': 'Retaining Wall Design',
  staircase: 'RC Staircase Design',
  pile: 'Pile Capacity Design', 'pile-cap': 'Pile Cap Design',
  'masonry-wall': 'Masonry Wall Design (EC6)',
  steel: 'Steel Member Design', 'portal-frame': 'Steel Portal Frame (EC3)',
  'composite-beam': 'Composite Beam (EC4)', 'steel-connection': 'Steel Connections (EC3-1-8)',
  pavement: 'Road Pavement Design', culvert: 'RC Box Culvert Design',
  'bridge-beam': 'Bridge Beam Design', 'bridge-abutment': 'Bridge Abutment Design',
  boq: 'Bill of Quantities', projects: 'Project Register', 'project-detail': 'Project Detail',
  'drawing-register': 'Drawing Register',
  'cube-tests': 'Concrete Cube Test Log', checklists: 'Inspection Checklists',
  'site-investigation': 'Site Investigation Log',
  'code-reference': 'Code Quick Reference', 'unit-converter': 'Unit Converter',
  'worked-examples': 'Worked Examples Library',
  'cost-database': 'Cost Rate Database', 'staff-dashboard': 'Staff & HR Dashboard',
};

// ─── Role-based access control ────────────────────────────────────────────────
// Minimum role required to access each page.
// 'junior' → all engineers; 'senior' → senior+; 'principal' → principal only.
const ROLE_RANK: Record<UserRole, number> = { junior: 1, senior: 2, principal: 3 };

const PAGE_MIN_ROLE: Partial<Record<Page, UserRole>> = {
  // Projects & QA — senior+ (project management features)
  projects: 'senior', 'project-detail': 'senior', 'drawing-register': 'senior',
  // Business — principal only
  'cost-database': 'principal', 'staff-dashboard': 'principal',
};

function canAccess(page: Page, role: UserRole): boolean {
  const minRole = PAGE_MIN_ROLE[page];
  if (!minRole) return true;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// ─── Navigation structure ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavItem = { id: Page; label: string; icon: any };
type NavSubGroup = { subLabel: string; icon: any; items: NavItem[] };
type NavGroupDef =
  | { kind: 'flat'; label: string; minRole?: UserRole; items: NavItem[] }
  | { kind: 'accordion'; label: string; minRole?: UserRole; subGroups: NavSubGroup[] };

const NAV_STRUCTURE: NavGroupDef[] = [
  {
    kind: 'flat', label: 'Overview',
    items: [
      { id: 'dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
      { id: 'wizard',     label: 'Design Wizard',   icon: Zap },
      { id: 'quick',      label: 'Quick Design',    icon: Calculator },
      { id: 'loads',      label: 'Load Calculator', icon: BarChart3 },
    ],
  },
  {
    kind: 'accordion', label: 'Analysis',
    subGroups: [
      {
        subLabel: 'RC Concrete', icon: Building2,
        items: [
          { id: 'beam',           label: 'Beam',            icon: Layers },
          { id: 'column',         label: 'Column',          icon: Columns3 },
          { id: 'slab',           label: 'One-Way Slab',    icon: Square },
          { id: 'flat-slab',      label: 'Flat Slab',       icon: Square },
          { id: 'foundation',     label: 'Pad Foundation',  icon: Hammer },
          { id: 'retaining-wall', label: 'Retaining Wall',  icon: AlertTriangle },
          { id: 'staircase',      label: 'Staircase',       icon: Footprints },
        ],
      },
      {
        subLabel: 'Geotechnical', icon: Mountain,
        items: [
          { id: 'pile',         label: 'Pile Capacity', icon: Hammer },
          { id: 'pile-cap',     label: 'Pile Cap',      icon: Triangle },
          { id: 'masonry-wall', label: 'Masonry Wall',  icon: Layers },
        ],
      },
      {
        subLabel: 'Steel', icon: Link2,
        items: [
          { id: 'steel',            label: 'Steel Member',    icon: Layers },
          { id: 'portal-frame',     label: 'Portal Frame',    icon: Layers },
          { id: 'composite-beam',   label: 'Composite Beam',  icon: Layers },
          { id: 'steel-connection', label: 'Connections',     icon: Link2 },
        ],
      },
      {
        subLabel: 'Transportation', icon: Milestone,
        items: [
          { id: 'pavement',        label: 'Road Pavement',    icon: Milestone },
          { id: 'culvert',         label: 'Box Culvert',      icon: Waves },
          { id: 'bridge-beam',     label: 'Bridge Beam',      icon: Layers },
          { id: 'bridge-abutment', label: 'Bridge Abutment',  icon: Hammer },
        ],
      },
    ],
  },
  {
    kind: 'flat', label: 'Projects & QA', minRole: 'senior',
    items: [
      { id: 'projects',         label: 'Project Register',  icon: FolderOpen },
      { id: 'drawing-register', label: 'Drawing Register',  icon: ImageIcon },
    ],
  },
  {
    kind: 'flat', label: 'Site & Quality',
    items: [
      { id: 'site-investigation', label: 'Site Investigation',      icon: Hammer },
      { id: 'cube-tests',         label: 'Cube Test Log',           icon: FlaskConical },
      { id: 'checklists',         label: 'Inspection Checklists',   icon: ClipboardCheck },
      { id: 'boq',                label: 'Bill of Quantities',       icon: FileText },
    ],
  },
  {
    kind: 'flat', label: 'Business', minRole: 'principal',
    items: [
      { id: 'cost-database',   label: 'Cost Database',   icon: DollarSign },
      { id: 'staff-dashboard', label: 'Staff Dashboard', icon: Users },
    ],
  },
  {
    kind: 'flat', label: 'Reference',
    items: [
      { id: 'code-reference',  label: 'Code Reference',   icon: BookOpen },
      { id: 'worked-examples', label: 'Worked Examples',  icon: FileText },
      { id: 'unit-converter',  label: 'Unit Converter',   icon: Ruler },
    ],
  },
];

// ─── Code selector ────────────────────────────────────────────────────────────
const CODE_LABELS: Record<BuildingCode, { short: string; color: string }> = {
  EC2:    { short: 'EC2',     color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  BS8110: { short: 'BS8110', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ACI318: { short: 'ACI318', color: 'bg-violet-100 text-violet-800 border-violet-300' },
  IBC:    { short: 'IBC',    color: 'bg-orange-100 text-orange-800 border-orange-300' },
};

function CodeSelector() {
  const { code, setCode, allCodes } = useBuildingCode();
  const [open, setOpen] = useState(false);
  const { short, color } = CODE_LABELS[code];
  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${color}`}>
        {short} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-xl w-68 overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100 uppercase tracking-wide">
              Design Standard
            </p>
            {allCodes.map(c => (
              <button key={c.code} onClick={() => { setCode(c.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                  ${code === c.code ? 'bg-blue-50' : ''}`}>
                <p className="text-xs font-semibold text-slate-800">{c.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  junior:    { label: 'Junior',    className: 'bg-slate-700 text-slate-300' },
  senior:    { label: 'Senior',    className: 'bg-blue-900 text-blue-300' },
  principal: { label: 'Principal', className: 'bg-violet-900 text-violet-300' },
};

// ─── Access-denied state ──────────────────────────────────────────────────────
function AccessDenied({ minRole, onBack }: { minRole: UserRole; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Lock size={28} className="text-slate-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700">Access Restricted</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          This section requires <span className="font-semibold text-slate-600">{ROLE_LABELS[minRole]}</span> privileges
          or above. Contact your principal engineer to request access.
        </p>
      </div>
      <button onClick={onBack}
        className="mt-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors">
        ← Back to Dashboard
      </button>
    </div>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItemButton({ item, active, locked, onNavigate }:
  { item: NavItem; active: boolean; locked: boolean; onNavigate: (id: Page) => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.id)}
      title={locked ? `Requires ${locked ? 'elevated' : ''} privileges` : undefined}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md mx-1 transition-all
        ${active
          ? 'bg-blue-600 text-white font-semibold'
          : locked
            ? 'text-slate-600 cursor-pointer hover:bg-slate-800/60'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
    >
      <Icon size={13} className={active ? 'text-white' : locked ? 'text-slate-600' : ''} />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {active && <ChevronRight size={11} />}
      {locked && !active && <Lock size={10} className="text-slate-600 shrink-0" />}
    </button>
  );
}

// ─── Sidebar sub-group (inside accordion) ─────────────────────────────────────
function SubGroupSection({ sg, page, onNavigate }:
  { sg: NavSubGroup; page: Page; onNavigate: (id: Page) => void }) {
  const hasActive = sg.items.some(i => i.id === page);
  const [open, setOpen] = useState(hasActive);
  const SubIcon = sg.icon;

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(p => !p)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md text-xs transition-all
          ${hasActive ? 'text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
      >
        <SubIcon size={12} />
        <span className="flex-1 text-left font-medium">{sg.subLabel}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-2 pl-2 border-l border-slate-700/60 mt-0.5 space-y-0.5 mb-1">
          {sg.items.map(item => (
            <NavItemButton
              key={item.id} item={item}
              active={page === item.id}
              locked={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, onNavigate, onClose, open }:
  { page: Page; onNavigate: (id: Page) => void; onClose: () => void; open: boolean }) {
  const { currentUser, logout } = useUser();
  const { factors } = useBuildingCode();
  const role = currentUser?.role ?? 'junior';
  const badge = ROLE_BADGE[role];

  // Which accordion sub-groups start open
  const analysisContainsActive = ['beam','column','slab','flat-slab','foundation',
    'retaining-wall','staircase','pile','pile-cap','masonry-wall','steel','portal-frame',
    'composite-beam','steel-connection','pavement','culvert','bridge-beam','bridge-abutment',
  ].includes(page);
  const [accordionOpen, setAccordionOpen] = useState(analysisContainsActive);

  return (
    <aside className={`fixed lg:static z-30 top-0 left-0 h-full flex flex-col bg-slate-900 transition-all duration-200
      w-56 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/60 shrink-0">
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-tight">Gambia Structural</p>
          <p className="text-slate-500 text-[10px] mt-0.5 tracking-wide">ENGINEERING PLATFORM</p>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-white p-1">
          <X size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700">
        {NAV_STRUCTURE.map(group => {
          const groupLocked = !!group.minRole && ROLE_RANK[role] < ROLE_RANK[group.minRole];

          if (group.kind === 'accordion') {
            return (
              <div key={group.label}>
                <button
                  onClick={() => setAccordionOpen(p => !p)}
                  className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
                >
                  {group.label}
                  <ChevronDown size={10} className={`ml-auto transition-transform ${accordionOpen ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {group.subGroups.map(sg => (
                      <SubGroupSection key={sg.subLabel} sg={sg} page={page} onNavigate={onNavigate} />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Flat group
          return (
            <div key={group.label}>
              {/* Group label row */}
              <div className="flex items-center gap-1.5 px-4 py-1.5 mt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-1">
                  {group.label}
                </p>
                {groupLocked && group.minRole && (
                  <span className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full
                    ${group.minRole === 'principal' ? 'bg-violet-900/60 text-violet-400' : 'bg-blue-900/60 text-blue-400'}`}>
                    <Lock size={8} />
                    {group.minRole === 'principal' ? 'Principal' : 'Senior'}
                  </span>
                )}
              </div>

              {groupLocked ? (
                /* Show locked items dimmed */
                <div className="opacity-40 pointer-events-none space-y-0.5">
                  {group.items.map(item => (
                    <NavItemButton key={item.id} item={item} active={false} locked={true} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const itemLocked = !canAccess(item.id, role);
                    return (
                      <NavItemButton
                        key={item.id} item={item}
                        active={page === item.id}
                        locked={itemLocked}
                        onNavigate={onNavigate}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      {currentUser && (
        <div className="px-3 py-3 border-t border-slate-700/60 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {currentUser.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 font-semibold truncate leading-tight">{currentUser.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            <button onClick={logout} title="Sign out"
              className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded">
              <LogOut size={13} />
            </button>
          </div>
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[10px] text-slate-600">{factors.label}</p>
            <p className="text-[10px] text-slate-700">v1.2</p>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppInner() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const { factors } = useBuildingCode();
  const { currentUser } = useUser();
  const { setCurrentProject } = useProject();
  const role = currentUser?.role ?? 'junior';

  const navigate = (p: string) => {
    setPage(p as Page);
    setSidebarOpen(false);
  };

  const goToProject = (id: string) => {
    setDetailProjectId(id);
    setCurrentProject(id);
    setPage('project-detail');
    setSidebarOpen(false);
  };

  // Determine if current page is accessible
  const minRoleForPage = PAGE_MIN_ROLE[page];
  const pageAccessDenied = minRoleForPage && !canAccess(page, role);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        page={page}
        onNavigate={navigate}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 p-1">
            <Menu size={18} />
          </button>

          {/* Breadcrumb-style title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Gambia Structural</span>
              <ChevronRight size={11} />
              <span className="text-slate-600 font-medium truncate">{pageTitle[page]}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{factors.description}</p>
          </div>

          {/* Role chip in header */}
          {currentUser && (
            <span className={`hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full
              ${ROLE_BADGE[role].className}`}>
              {currentUser.initials} · {ROLE_BADGE[role].label}
            </span>
          )}

          <CodeSelector />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          {pageAccessDenied ? (
            <AccessDenied minRole={minRoleForPage!} onBack={() => navigate('dashboard')} />
          ) : (
            <>
              {page === 'dashboard'          && <Dashboard onNavigate={navigate} />}
              {page === 'wizard'             && <DesignWizard onNavigate={navigate} />}
              {page === 'quick'              && <QuickDesign />}
              {page === 'loads'              && <LoadCalculatorPage />}
              {page === 'beam'               && <BeamDesign />}
              {page === 'column'             && <ColumnDesign />}
              {page === 'slab'               && <SlabDesign />}
              {page === 'foundation'         && <FoundationDesign />}
              {page === 'retaining-wall'     && <RetainingWallDesign />}
              {page === 'staircase'          && <StaircaseDesign />}
              {page === 'flat-slab'          && <FlatSlabDesign />}
              {page === 'pile'               && <PileDesign />}
              {page === 'pile-cap'           && <PileCapDesign />}
              {page === 'masonry-wall'       && <MasonryWallDesign />}
              {page === 'steel'              && <SteelDesign />}
              {page === 'portal-frame'       && <PortalFrame />}
              {page === 'composite-beam'     && <CompositeBeam />}
              {page === 'steel-connection'   && <SteelConnection />}
              {page === 'pavement'           && <PavementDesign />}
              {page === 'culvert'            && <CulvertDesign />}
              {page === 'bridge-beam'        && <BridgeBeam />}
              {page === 'bridge-abutment'    && <BridgeAbutment />}
              {page === 'boq'                && <BOQ />}
              {page === 'projects'           && <ProjectList onSelect={goToProject} />}
              {page === 'project-detail'     && detailProjectId &&
                <ProjectDetail projectId={detailProjectId} onBack={() => navigate('projects')} onNavigate={navigate} />}
              {page === 'drawing-register'   && <DrawingRegister />}
              {page === 'cube-tests'         && <CubeTestLog />}
              {page === 'checklists'         && <InspectionChecklistPage />}
              {page === 'site-investigation' && <SiteInvestigation />}
              {page === 'code-reference'     && <CodeReference />}
              {page === 'worked-examples'    && <WorkedExamples />}
              {page === 'unit-converter'     && <UnitConverter />}
              {page === 'cost-database'      && <CostDatabase />}
              {page === 'staff-dashboard'    && <StaffDashboard />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { currentUser } = useUser();
  if (!currentUser) return <LoginScreen />;
  return (
    <BuildingCodeProvider>
      <AppInner />
    </BuildingCodeProvider>
  );
}
