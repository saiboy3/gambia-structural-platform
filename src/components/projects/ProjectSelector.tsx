import { FolderOpen, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../context/ProjectContext';

interface Props {
  compact?: boolean;
}

export default function ProjectSelector({ compact }: Props) {
  const { projects, currentProject, setCurrentProject } = useProject();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm transition-colors">
        <FolderOpen size={13} className="text-slate-400 shrink-0" />
        <span className="text-slate-700 font-medium truncate max-w-xs">
          {currentProject ? currentProject.name : <span className="text-slate-400">No project selected</span>}
        </span>
        {currentProject && !compact && (
          <span className="text-xs text-slate-400 font-mono">{currentProject.jobNumber}</span>
        )}
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-72 overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100">Assign to project</p>
            <button onClick={() => { setCurrentProject(null); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 border-b border-slate-50">
              — None —
            </button>
            <div className="max-h-60 overflow-y-auto">
              {projects.filter(p => p.status === 'active').map(p => (
                <button key={p.id} onClick={() => { setCurrentProject(p.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                    ${currentProject?.id === p.id ? 'bg-blue-50' : ''}`}>
                  <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.jobNumber} · {p.client}</p>
                </button>
              ))}
              {projects.filter(p => p.status === 'active').length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-400">No active projects. Create one in Projects.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
