import { Clock, CheckCircle, AlertTriangle, Layers, FolderOpen } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser, ROLE_COLORS, ROLE_LABELS } from '../../context/UserContext';
import StatusBadge from '../workflow/StatusBadge';

function daysSince(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }

export default function StaffDashboard() {
  const { projects, designs } = useProject();
  const { users } = useUser();

  const activeProjects = projects.filter(p => p.status === 'active');

  // Per-user stats
  const userStats = users.map(user => {
    const myDesigns = designs.filter(d => {
      const project = projects.find(p => p.id === d.projectId);
      return project?.engineerId === user.id;
    });
    const inProgress = myDesigns.filter(d => d.status === 'draft' || d.status === 'submitted');
    const overdue = inProgress.filter(d => daysSince(d.updatedAt) > 7);
    const approved = myDesigns.filter(d => d.status === 'approved');
    return { user, myDesigns, inProgress, overdue, approved };
  });

  // All designs needing attention
  const needsCheck = designs.filter(d => d.status === 'submitted');
  const pendingApproval = designs.filter(d => d.status === 'checked');
  const overdueAll = designs.filter(d => (d.status === 'draft') && daysSince(d.updatedAt) > 7);

  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? '—';
  const engineerOf = (projectId: string) => {
    const p = projects.find(pr => pr.id === projectId);
    return users.find(u => u.id === p?.engineerId)?.name ?? '—';
  };

  return (
    <div className="space-y-6">
      {/* Firm overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active projects', value: activeProjects.length, icon: FolderOpen, color: 'text-blue-600' },
          { label: 'Total designs', value: designs.length, icon: Layers, color: 'text-slate-600' },
          { label: 'Awaiting check', value: needsCheck.length, icon: Clock, color: 'text-amber-600' },
          { label: 'Overdue (>7 days)', value: overdueAll.length, icon: AlertTriangle, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <s.icon size={20} className={`${s.color} mt-0.5 shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Team Workload</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {userStats.map(({ user, myDesigns, inProgress, overdue, approved }) => (
            <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                  {user.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{user.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-bold text-slate-800">{inProgress.length}</p>
                  <p className="text-xs text-slate-400">in progress</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="flex-1 text-center bg-slate-50 rounded-lg py-2">
                  <p className="font-bold text-slate-700">{myDesigns.length}</p>
                  <p className="text-slate-400">total</p>
                </div>
                <div className="flex-1 text-center bg-emerald-50 rounded-lg py-2">
                  <p className="font-bold text-emerald-700">{approved.length}</p>
                  <p className="text-slate-400">approved</p>
                </div>
                <div className={`flex-1 text-center rounded-lg py-2 ${overdue.length > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`font-bold ${overdue.length > 0 ? 'text-red-600' : 'text-slate-700'}`}>{overdue.length}</p>
                  <p className="text-slate-400">overdue</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs action tables */}
      {needsCheck.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Clock size={14} className="text-amber-500" /> Awaiting Check ({needsCheck.length})
          </h3>
          <ActionTable designs={needsCheck} projectName={projectName} engineerOf={engineerOf} />
        </div>
      )}

      {pendingApproval.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-blue-500" /> Awaiting Approval ({pendingApproval.length})
          </h3>
          <ActionTable designs={pendingApproval} projectName={projectName} engineerOf={engineerOf} />
        </div>
      )}

      {overdueAll.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" /> Stale Drafts &gt;7 days ({overdueAll.length})
          </h3>
          <ActionTable designs={overdueAll} projectName={projectName} engineerOf={engineerOf} />
        </div>
      )}
    </div>
  );
}

function ActionTable({ designs, projectName, engineerOf }: {
  designs: { id: string; memberTag: string; memberType: string; buildingCode: string; currentRevision: string; status: string; updatedAt: string; projectId: string }[];
  projectName: (id: string) => string;
  engineerOf: (id: string) => string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <th className="text-left px-4 py-2 font-semibold">Member</th>
            <th className="text-left px-4 py-2 font-semibold">Project</th>
            <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">Engineer</th>
            <th className="text-center px-3 py-2 font-semibold">Rev</th>
            <th className="text-center px-3 py-2 font-semibold">Status</th>
            <th className="text-right px-4 py-2 font-semibold hidden md:table-cell">Last updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {designs.map(d => (
            <tr key={d.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold text-slate-700">{d.memberTag} <span className="font-normal text-slate-400">({d.memberType})</span></td>
              <td className="px-4 py-2 text-slate-600">{projectName(d.projectId)}</td>
              <td className="px-4 py-2 text-slate-500 hidden sm:table-cell">{engineerOf(d.projectId)}</td>
              <td className="px-3 py-2 text-center font-mono">Rev {d.currentRevision}</td>
              <td className="px-3 py-2 text-center"><StatusBadge status={d.status as import('../../types/app').DesignStatus} /></td>
              <td className="px-4 py-2 text-right text-slate-400 hidden md:table-cell">
                {daysSince(d.updatedAt)}d ago
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
