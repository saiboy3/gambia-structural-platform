import {
  Layers, Columns3, Square, Hammer, FileText, TrendingUp,
  Calculator, Zap, AlertTriangle, Footprints, BookOpen, Ruler,
  FolderOpen, FlaskConical, ClipboardCheck, ImageIcon,
  DollarSign, Users, Clock, CheckCircle, Receipt, BarChart3,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useUser } from '../context/UserContext';

interface Props { onNavigate: (page: string) => void }

const modules = [
  { id: 'quick',          icon: Zap,            label: 'Quick Design',           desc: 'Whole bay in one go, or jump to a single element', color: 'bg-blue-600',    highlight: true },
  { id: 'loads',          icon: Calculator,     label: 'Load Calculator',        desc: 'Multi-code load combos by occupancy',             color: 'bg-teal-500' },
  { id: 'beam',           icon: Layers,         label: 'RC Beam Design',         desc: 'Simply-supported, continuous & cantilever',       color: 'bg-blue-500' },
  { id: 'column',         icon: Columns3,       label: 'RC Column Design',       desc: 'Rectangular, square & circular columns',          color: 'bg-violet-500' },
  { id: 'slab',           icon: Square,         label: 'RC Slab Design',         desc: 'One-way & two-way solid slabs',                   color: 'bg-emerald-500' },
  { id: 'foundation',     icon: Hammer,         label: 'Foundation Design',      desc: 'Pad & strip foundations',                         color: 'bg-amber-500' },
  { id: 'retaining-wall', icon: AlertTriangle,  label: 'Retaining Wall',         desc: 'Cantilever wall stability & reinforcement',        color: 'bg-orange-500' },
  { id: 'staircase',      icon: Footprints,     label: 'RC Staircase',           desc: 'Flight geometry, waist depth & rebar',            color: 'bg-pink-500' },
  { id: 'steel',          icon: Layers,         label: 'Steel Member Design',    desc: 'UC/UB/SHS bending, shear & LTB checks',           color: 'bg-slate-600' },
  { id: 'boq',            icon: FileText,       label: 'Bill of Quantities',     desc: 'Automated BOQ in Gambian Dalasi (GMD)',            color: 'bg-rose-500' },
  { id: 'code-reference', icon: BookOpen,       label: 'Code Reference',         desc: 'EC2 / BS8110 / ACI quick clause lookup',          color: 'bg-indigo-500' },
  { id: 'worked-examples',icon: FileText,       label: 'Worked Examples',        desc: 'Step-by-step design calculations to study',       color: 'bg-cyan-600' },
  { id: 'unit-converter', icon: Ruler,          label: 'Unit Converter',         desc: 'Forces, pressures, bar areas, section props',     color: 'bg-emerald-600' },
  { id: 'projects',       icon: FolderOpen,     label: 'Project Register',       desc: 'Manage projects and saved designs',                color: 'bg-blue-700' },
  { id: 'cube-tests',     icon: FlaskConical,   label: 'Cube Test Log',          desc: 'Record & track concrete compressive strength',    color: 'bg-amber-600' },
  { id: 'checklists',     icon: ClipboardCheck, label: 'Inspection Checklists',  desc: 'Pre-pour, placement & post-pour sign-offs',       color: 'bg-teal-600' },
  { id: 'drawing-register',icon: ImageIcon,     label: 'Drawing Register',       desc: 'Upload & manage project drawings',                color: 'bg-slate-500' },
  { id: 'cost-database',  icon: DollarSign,     label: 'Cost Database',          desc: 'Current GMD unit rates by category',              color: 'bg-lime-600' },
  { id: 'staff-dashboard',icon: Users,          label: 'Staff Dashboard',        desc: 'Firm workload, overdue items & approvals',        color: 'bg-violet-600' },
  { id: 'invoices',       icon: Receipt,        label: 'Invoice Manager',        desc: 'Create, send and track client invoices in GMD',   color: 'bg-emerald-700' },
  { id: 'expenses',       icon: DollarSign,     label: 'Expense Log',            desc: 'Log and categorise firm expenditure',             color: 'bg-rose-600' },
  { id: 'financial-summary', icon: BarChart3,   label: 'Financial Summary',      desc: 'Revenue, profit, ageing and spend breakdown',     color: 'bg-indigo-600' },
];

const platformStats = [
  { label: 'Building Standard', value: 'EC2 · BS8110 · ACI' },
  { label: 'Currency', value: 'Gambian Dalasi (GMD)' },
  { label: 'Concrete Grades', value: 'C20/25 – C40/50' },
  { label: 'Rebar Grades', value: 'B250, B500B/C' },
];

export default function Dashboard({ onNavigate }: Props) {
  const { projects, designs } = useProject();
  const { currentUser, users } = useUser();

  const activeProjects = projects.filter(p => p.status === 'active');
  const myDesigns = designs.filter(d => {
    const proj = projects.find(p => p.id === d.projectId);
    return proj?.engineerId === currentUser?.id;
  });
  const awaitingCheck = designs.filter(d => d.status === 'submitted').length;
  const awaitingApproval = designs.filter(d => d.status === 'checked').length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 lg:p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Arch Engineering Platform</h1>
        </div>
        <p className="text-blue-200 text-sm max-w-xl">
          Multi-code structural design and QA management platform for engineering firms in The Gambia.
          Design RC and steel members, manage projects, log site QA, and generate BOQs — all in one place.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          {platformStats.map(s => (
            <div key={s.label} className="bg-white/10 ring-1 ring-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
              <p className="text-xs text-blue-300">{s.label}</p>
              <p className="text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live firm stats */}
      {(activeProjects.length > 0 || designs.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active projects', value: activeProjects.length, icon: FolderOpen, color: 'text-blue-600', page: 'projects' },
            { label: 'My designs', value: myDesigns.length, icon: Layers, color: 'text-slate-600', page: 'projects' },
            { label: 'Awaiting check', value: awaitingCheck, icon: Clock, color: 'text-amber-600', page: 'staff-dashboard' },
            { label: 'Awaiting approval', value: awaitingApproval, icon: CheckCircle, color: 'text-emerald-600', page: 'staff-dashboard' },
          ].map(s => (
            <button key={s.label} onClick={() => onNavigate(s.page)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:border-blue-300 hover:shadow-sm hover:-translate-y-0.5 transition-all text-left">
              <div className={`w-8 h-8 rounded-lg bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon size={15} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Design featured */}
      {modules.filter(m => m.highlight).map(m => {
        const Icon = m.icon;
        return (
          <button key={m.id} onClick={() => onNavigate(m.id)}
            className="w-full text-left bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl border border-blue-500 shadow-md p-5 hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all group">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2.5 rounded-lg bg-white/20 ring-1 ring-white/25 shrink-0">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-blue-100 transition-colors">{m.label}</h3>
                <p className="text-xs text-blue-200 mt-0.5">{m.desc}</p>
              </div>
              <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold shrink-0">Start here</span>
            </div>
          </button>
        );
      })}

      {/* All module cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">All Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.filter(m => !m.highlight).map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => onNavigate(m.id)}
                className="relative text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all group overflow-hidden">
                <div className={`inline-flex p-2 rounded-lg ${m.color} mb-2.5 shadow-sm ring-1 ring-black/5`}>
                  <Icon size={16} className="text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{m.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                <div className={`absolute left-0 bottom-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 ${m.color}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Team summary if staff present */}
      {users.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">Team</h3>
            <button onClick={() => onNavigate('staff-dashboard')} className="text-xs text-blue-600 hover:underline">
              View dashboard →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {u.initials}
                </div>
                <span className="text-xs text-slate-700 font-medium">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to use */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Getting Started</h3>
        <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
          <li>Create a <button onClick={() => onNavigate('projects')} className="text-blue-600 hover:underline">project</button> and set yourself as engineer</li>
          <li>Use Quick Design for a whole bay, or the individual design modules</li>
          <li>Save designs to your project — they follow the Draft → Submitted → Approved workflow</li>
          <li>Log <button onClick={() => onNavigate('cube-tests')} className="text-blue-600 hover:underline">cube tests</button> and <button onClick={() => onNavigate('checklists')} className="text-blue-600 hover:underline">inspection checklists</button> on site</li>
          <li>Generate a <button onClick={() => onNavigate('boq')} className="text-blue-600 hover:underline">Bill of Quantities</button> in GMD from the cost database</li>
        </ol>
      </div>
    </div>
  );
}
