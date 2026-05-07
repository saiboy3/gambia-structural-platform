import { useState } from 'react';
import {
  LayoutDashboard, Layers, Columns3, Square, Hammer, FileText, Menu, X,
  ChevronRight, Calculator, ChevronDown, Zap, AlertTriangle, Footprints,
  BookOpen, Ruler, FolderOpen, ClipboardCheck, FlaskConical,
  DollarSign, Users, ImageIcon, LogOut, Milestone, Waves,
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
import { useProject } from './context/ProjectContext';

type Page =
  | 'dashboard' | 'quick' | 'loads' | 'wizard'
  | 'beam' | 'column' | 'slab' | 'flat-slab' | 'foundation' | 'retaining-wall' | 'staircase' | 'steel'
  | 'pile' | 'pile-cap' | 'masonry-wall'
  | 'portal-frame' | 'composite-beam' | 'steel-connection'
  | 'pavement' | 'culvert' | 'bridge-beam' | 'bridge-abutment'
  | 'boq' | 'projects' | 'project-detail'
  | 'cube-tests' | 'checklists' | 'site-investigation'
  | 'code-reference' | 'unit-converter' | 'worked-examples'
  | 'cost-database' | 'staff-dashboard' | 'drawing-register';

const pageTitle: Record<Page, string> = {
  dashboard: 'Dashboard', quick: 'Quick Design Wizard', loads: 'Load Calculator',
  wizard: 'Design Wizard — What do I need to design?',
  beam: 'RC Beam Design', column: 'RC Column Design', slab: 'RC Slab Design',
  'flat-slab': 'Flat Slab Design (EC2 Annex I)',
  foundation: 'Foundation Design', 'retaining-wall': 'Retaining Wall Design',
  staircase: 'RC Staircase Design', steel: 'Steel Member Design',
  pile: 'Pile Capacity Design', 'pile-cap': 'Pile Cap Design',
  'masonry-wall': 'Masonry Wall Design (EC6)',
  'portal-frame': 'Steel Portal Frame (EC3)',
  'composite-beam': 'Composite Beam Design (EC4)',
  'steel-connection': 'Steel Connection Design (EC3-1-8)',
  'pavement': 'Road Pavement Design (TRL RN31 / CBR Method)',
  'culvert': 'RC Box Culvert Design',
  'bridge-beam': 'Bridge Beam Design (EC2 / BS5400)',
  'bridge-abutment': 'Bridge Abutment Design (Rankine)',
  boq: 'Bill of Quantities', projects: 'Project Register', 'project-detail': 'Project Detail',
  'cube-tests': 'Concrete Cube Test Log', checklists: 'Inspection Checklists',
  'site-investigation': 'Site Investigation Log',
  'code-reference': 'Code Quick Reference', 'unit-converter': 'Unit Converter & Calculator',
  'worked-examples': 'Worked Examples Library',
  'cost-database': 'Cost Rate Database', 'staff-dashboard': 'Staff Dashboard',
  'drawing-register': 'Drawing Register',
};

const CODE_LABELS: Record<BuildingCode, { short: string; color: string }> = {
  EC2:    { short: 'EC2',        color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  BS8110: { short: 'BS8110',    color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ACI318: { short: 'ACI318',    color: 'bg-violet-100 text-violet-800 border-violet-300' },
  IBC:    { short: 'IBC/ASCE7', color: 'bg-orange-100 text-orange-800 border-orange-300' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavGroup = { label: string; items: { id: Page; label: string; icon: any }[] };

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wizard', label: 'Design Wizard', icon: Zap },
    { id: 'quick', label: 'Quick Design Wizard', icon: Zap },
    { id: 'loads', label: 'Load Calculator', icon: Calculator },
  ]},
  { label: 'RC Concrete Design', items: [
    { id: 'beam', label: 'Beam', icon: Layers },
    { id: 'column', label: 'Column', icon: Columns3 },
    { id: 'slab', label: 'One-Way Slab', icon: Square },
    { id: 'flat-slab', label: 'Flat Slab', icon: Square },
    { id: 'foundation', label: 'Pad Foundation', icon: Hammer },
    { id: 'retaining-wall', label: 'Retaining Wall', icon: AlertTriangle },
    { id: 'staircase', label: 'Staircase', icon: Footprints },
  ]},
  { label: 'Geotechnical', items: [
    { id: 'pile', label: 'Pile Capacity', icon: Hammer },
    { id: 'pile-cap', label: 'Pile Cap', icon: Square },
  ]},
  { label: 'Masonry', items: [
    { id: 'masonry-wall', label: 'Masonry Wall', icon: Layers },
  ]},
  { label: 'Steel Design', items: [
    { id: 'steel', label: 'Steel Member', icon: Layers },
    { id: 'portal-frame', label: 'Portal Frame', icon: Layers },
    { id: 'composite-beam', label: 'Composite Beam', icon: Layers },
    { id: 'steel-connection', label: 'Steel Connections', icon: Layers },
  ]},
  { label: 'Transportation', items: [
    { id: 'pavement', label: 'Road Pavement', icon: Milestone },
    { id: 'culvert', label: 'Box Culvert', icon: Waves },
    { id: 'bridge-beam', label: 'Bridge Beam', icon: Layers },
    { id: 'bridge-abutment', label: 'Bridge Abutment', icon: Hammer },
  ]},
  { label: 'Projects & QA', items: [
    { id: 'projects', label: 'Project Register', icon: FolderOpen },
    { id: 'cube-tests', label: 'Cube Test Log', icon: FlaskConical },
    { id: 'checklists', label: 'Inspection Checklists', icon: ClipboardCheck },
    { id: 'site-investigation', label: 'Site Investigation', icon: Hammer },
    { id: 'drawing-register', label: 'Drawing Register', icon: ImageIcon },
  ]},
  { label: 'Reference', items: [
    { id: 'code-reference', label: 'Code Reference', icon: BookOpen },
    { id: 'worked-examples', label: 'Worked Examples', icon: FileText },
    { id: 'unit-converter', label: 'Unit Converter', icon: Ruler },
  ]},
  { label: 'Business', items: [
    { id: 'boq', label: 'Bill of Quantities', icon: FileText },
    { id: 'cost-database', label: 'Cost Database', icon: DollarSign },
    { id: 'staff-dashboard', label: 'Staff Dashboard', icon: Users },
  ]},
];

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
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-64 overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100">Building Code / Standard</p>
            {allCodes.map(c => (
              <button key={c.code} onClick={() => { setCode(c.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${code === c.code ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">{c.label}</p>
                  {c.code === 'IBC' && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">ACI 318 + ASCE 7</span>}
                </div>
                <p className="text-xs text-slate-500">{c.description}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const { factors } = useBuildingCode();
  const { currentUser, logout } = useUser();
  const { setCurrentProject } = useProject();

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-30 top-0 left-0 h-full w-60 bg-slate-900 flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div>
            <p className="text-white font-bold text-sm leading-tight">Gambia Structural</p>
            <p className="text-slate-400 text-xs">Engineering Platform</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                      ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    <Icon size={14} />
                    <span className="flex-1 text-left text-xs">{item.label}</span>
                    {active && <ChevronRight size={12} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info */}
        {currentUser && (
          <div className="px-4 py-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {currentUser.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</p>
              </div>
              <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-slate-300">
                <LogOut size={13} />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2">{factors.label} · v1.1</p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 text-sm">{pageTitle[page]}</h2>
            <p className="text-xs text-slate-400">{factors.description}</p>
          </div>
          <CodeSelector />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {page === 'dashboard'        && <Dashboard onNavigate={navigate} />}
          {page === 'wizard'           && <DesignWizard onNavigate={navigate} />}
          {page === 'quick'            && <QuickDesign />}
          {page === 'loads'            && <LoadCalculatorPage />}
          {page === 'beam'             && <BeamDesign />}
          {page === 'column'           && <ColumnDesign />}
          {page === 'slab'             && <SlabDesign />}
          {page === 'foundation'       && <FoundationDesign />}
          {page === 'retaining-wall'   && <RetainingWallDesign />}
          {page === 'staircase'        && <StaircaseDesign />}
          {page === 'flat-slab'        && <FlatSlabDesign />}
          {page === 'pile'             && <PileDesign />}
          {page === 'pile-cap'         && <PileCapDesign />}
          {page === 'masonry-wall'     && <MasonryWallDesign />}
          {page === 'steel'            && <SteelDesign />}
          {page === 'portal-frame'     && <PortalFrame />}
          {page === 'composite-beam'   && <CompositeBeam />}
          {page === 'steel-connection' && <SteelConnection />}
          {page === 'pavement'         && <PavementDesign />}
          {page === 'culvert'          && <CulvertDesign />}
          {page === 'bridge-beam'      && <BridgeBeam />}
          {page === 'bridge-abutment'  && <BridgeAbutment />}
          {page === 'boq'              && <BOQ />}
          {page === 'projects'         && <ProjectList onSelect={goToProject} />}
          {page === 'project-detail'   && detailProjectId &&
            <ProjectDetail projectId={detailProjectId} onBack={() => navigate('projects')} onNavigate={navigate} />}
          {page === 'cube-tests'       && <CubeTestLog />}
          {page === 'checklists'       && <InspectionChecklistPage />}
          {page === 'site-investigation' && <SiteInvestigation />}
          {page === 'code-reference'   && <CodeReference />}
          {page === 'worked-examples'  && <WorkedExamples />}
          {page === 'unit-converter'   && <UnitConverter />}
          {page === 'cost-database'    && <CostDatabase />}
          {page === 'staff-dashboard'  && <StaffDashboard />}
          {page === 'drawing-register' && <DrawingRegister />}
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
