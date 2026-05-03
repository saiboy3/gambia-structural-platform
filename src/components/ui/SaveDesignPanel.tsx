import { useState } from 'react';
import { Save, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { SavedDesign } from '../../types/app';
import StatusBadge from '../workflow/StatusBadge';
import ApprovalPanel from '../workflow/ApprovalPanel';

interface Props {
  memberType: SavedDesign['memberType'];
  inputs: Record<string, unknown>;
  results: Record<string, unknown> | null;
}

const REVISION_LABELS = ['A','B','C','D','E','F'] as const;

export default function SaveDesignPanel({ memberType, inputs, results }: Props) {
  const { currentProject, designs, saveDesign, getProjectDesigns } = useProject();
  const { currentUser } = useUser();
  const { code } = useBuildingCode();

  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<SavedDesign | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const projectDesigns = currentProject ? getProjectDesigns(currentProject.id) : [];
  const existingDesign = saved
    ? designs.find(d => d.id === saved.id) ?? null   // live-updated from context
    : null;

  const handleSave = () => {
    if (!currentProject || !currentUser || !tag.trim()) return;
    const design = saveDesign({
      projectId: currentProject.id,
      memberTag: tag.trim().toUpperCase(),
      memberType,
      buildingCode: code,
      inputs,
      results,
      status: 'draft',
      revisions: [{
        revision: 'A',
        date: new Date().toISOString(),
        engineerId: currentUser.id,
        note: note || 'Initial save',
      }],
      currentRevision: 'A',
    });
    setSaved(design);
    setNote('');
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl transition-colors">
        <Save size={12} /> Save to project
      </button>
    );
  }

  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(false)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors">
        <div className="flex items-center gap-2">
          <Save size={13} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Save to Project</span>
          {existingDesign && <StatusBadge status={existingDesign.status} />}
        </div>
        {open ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
      </button>

      <div className="p-3 space-y-3">
        {!currentProject && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Select a project using the dropdown in the header first.
          </p>
        )}

        {currentProject && !existingDesign && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 font-medium">Member tag *</label>
                <input className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                  placeholder="B1, C3, S2…" value={tag} onChange={e => setTag(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Revision</label>
                <select className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400">
                  {REVISION_LABELS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Note</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                placeholder="e.g. Initial design" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button onClick={handleSave} disabled={!tag.trim() || !currentUser}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
              Save Design
            </button>
          </>
        )}

        {existingDesign && (
          <>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Project</span>
                <span className="font-medium">{currentProject?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Member tag</span>
                <span className="font-medium">{existingDesign.memberTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Revision</span>
                <span className="font-medium">Rev {existingDesign.currentRevision}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saved</span>
                <span>{new Date(existingDesign.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <ApprovalPanel design={existingDesign} />
          </>
        )}

        {/* History */}
        {projectDesigns.length > 0 && (
          <div>
            <button onClick={() => setShowHistory(p => !p)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <History size={11} /> {showHistory ? 'Hide' : 'Show'} project designs ({projectDesigns.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1">
                {projectDesigns.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700">{d.memberTag}</span>
                    <span className="text-slate-400">{d.memberType} · Rev {d.currentRevision}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
