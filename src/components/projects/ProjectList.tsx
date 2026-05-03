import { useState } from 'react';
import { Plus, FolderOpen, Search, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import ProjectForm from './ProjectForm';
import type { Project } from '../../types/app';

const STATUS_COLORS: Record<Project['status'], string> = {
  active:    'bg-emerald-100 text-emerald-700',
  'on-hold': 'bg-amber-100 text-amber-700',
  complete:  'bg-slate-100 text-slate-600',
};

interface Props {
  onSelect: (id: string) => void;
}

export default function ProjectList({ onSelect }: Props) {
  const { projects, designs, deleteProject } = useProject();
  const { users } = useUser();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Project['status'] | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();

  const filtered = projects.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (p.name + p.client + p.jobNumber + p.location).toLowerCase().includes(search.toLowerCase())
  );

  const designCount = (id: string) => designs.filter(d => d.projectId === id).length;
  const engineerName = (id: string) => users.find(u => u.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
          value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="on-hold">On hold</option>
          <option value="complete">Complete</option>
        </select>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No projects found.</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-blue-600 text-sm hover:underline">Create your first project</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-semibold">Job #</th>
                <th className="text-left px-4 py-3 font-semibold">Project</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Engineer</th>
                <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Designs</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onSelect(p.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.jobNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.location}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.client}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{engineerName(p.engineerId)}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium">{designCount(p.id)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                      {p.status === 'on-hold' ? 'On Hold' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditing(p); setShowForm(true); }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                      <ChevronRight size={14} className="text-slate-300 ml-1" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ProjectForm onClose={() => setShowForm(false)} existing={editing} />}
    </div>
  );
}
