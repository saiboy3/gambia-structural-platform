import { ArrowLeft, Plus, FileText, Layers, Columns3, Square, Hammer, AlertTriangle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import StatusBadge from '../workflow/StatusBadge';
import ApprovalPanel from '../workflow/ApprovalPanel';
import type { SavedDesign } from '../../types/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_ICONS: Record<SavedDesign['memberType'], any> = {
  beam: Layers, column: Columns3, slab: Square, foundation: Hammer,
  'retaining-wall': AlertTriangle, staircase: FileText, steel: FileText,
};

interface Props {
  projectId: string;
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export default function ProjectDetail({ projectId, onBack, onNavigate }: Props) {
  const { projects, getProjectDesigns } = useProject();
  const { users } = useUser();

  const project = projects.find(p => p.id === projectId);
  const designs = getProjectDesigns(projectId);

  if (!project) return <p className="text-slate-400 p-4">Project not found.</p>;

  const engineer = users.find(u => u.id === project.engineerId);

  const stats = [
    { label: 'Total designs', value: designs.length },
    { label: 'Approved', value: designs.filter(d => d.status === 'approved').length },
    { label: 'In progress', value: designs.filter(d => d.status === 'draft' || d.status === 'submitted').length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-slate-800">{project.name}</h2>
          <p className="text-xs text-slate-500">{project.jobNumber} · {project.client} · {project.location}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
            project.status === 'on-hold' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'}`}>
          {project.status}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-sm font-bold text-slate-800">{engineer?.initials ?? '—'}</p>
          <p className="text-xs text-slate-500">{engineer?.name ?? 'Unassigned'}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">Add new design for this project</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Beam', page: 'beam', Icon: Layers },
            { label: 'Column', page: 'column', Icon: Columns3 },
            { label: 'Slab', page: 'slab', Icon: Square },
            { label: 'Foundation', page: 'foundation', Icon: Hammer },
            { label: 'Retaining Wall', page: 'retaining-wall', Icon: AlertTriangle },
            { label: 'Staircase', page: 'staircase', Icon: FileText },
            { label: 'Steel', page: 'steel', Icon: FileText },
          ].map(({ label, page, Icon }) => (
            <button key={page} onClick={() => onNavigate(page)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Designs list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Saved Designs</p>
          <p className="text-xs text-slate-400">{designs.length} item{designs.length !== 1 ? 's' : ''}</p>
        </div>
        {designs.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            <Plus size={24} className="mx-auto mb-2 opacity-40" />
            No designs saved yet. Run a calculation and save it to this project.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {designs.map(d => {
              const Icon = TYPE_ICONS[d.memberType];
              return (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{d.memberTag}</span>
                        <span className="text-xs text-slate-400">{d.memberType} · {d.buildingCode} · Rev {d.currentRevision}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Saved {new Date(d.createdAt).toLocaleDateString()}
                        {d.revisions.length > 1 && ` · ${d.revisions.length} revisions`}
                      </p>
                      {/* Revision history */}
                      {d.revisions.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {d.revisions.map((r, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              Rev {r.revision}
                            </span>
                          ))}
                        </div>
                      )}
                      <ApprovalPanel design={d} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
