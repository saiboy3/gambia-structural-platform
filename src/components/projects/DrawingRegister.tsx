import { useState, useEffect, useRef } from 'react';
import { Upload, ExternalLink, AlertTriangle, FileText, ArchiveX } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import { getItem, setItem, generateId, estimateStorageBytes, KEYS } from '../../utils/storage';
import type { Drawing } from '../../types/app';

const STORAGE_WARN_BYTES = 3 * 1024 * 1024; // 3 MB

export default function DrawingRegister() {
  const { projects, currentProject } = useProject();
  const { currentUser } = useUser();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [filterProject, setFilterProject] = useState(currentProject?.id ?? 'all');
  const [showAdd, setShowAdd] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ drawingNumber: '', title: '', revision: 'P1', discipline: 'structural' as Drawing['discipline'] });
  const [pendingFile, setPendingFile] = useState<{ dataUrl: string; size: number; name: string } | null>(null);

  useEffect(() => {
    setDrawings(getItem<Drawing[]>(KEYS.DRAWINGS, []));
    setStorageUsed(estimateStorageBytes());
  }, []);

  const save = (updated: Drawing[]) => {
    setDrawings(updated);
    setItem(KEYS.DRAWINGS, updated);
    setStorageUsed(estimateStorageBytes());
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert('File too large. Please keep drawings under 1.5 MB for browser storage.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingFile({ dataUrl: ev.target!.result as string, size: file.size, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!pendingFile || !form.drawingNumber || !currentUser) return;
    const drawing: Drawing = {
      id: generateId(),
      projectId: filterProject === 'all' ? (currentProject?.id ?? '') : filterProject,
      drawingNumber: form.drawingNumber,
      title: form.title,
      revision: form.revision,
      discipline: form.discipline,
      uploadedBy: currentUser.id,
      uploadedAt: new Date().toISOString(),
      fileDataUrl: pendingFile.dataUrl,
      fileSize: pendingFile.size,
      status: 'current',
    };
    save([...drawings, drawing]);
    setShowAdd(false);
    setPendingFile(null);
    setForm({ drawingNumber: '', title: '', revision: 'P1', discipline: 'structural' });
  };

  const supersede = (id: string, newId: string) => {
    save(drawings.map(d => d.id === id ? { ...d, status: 'superseded', supersededBy: newId } : d));
  };

  const remove = (id: string) => {
    if (!confirm('Delete this drawing from the register?')) return;
    save(drawings.filter(d => d.id !== id));
  };

  const filtered = drawings.filter(d => filterProject === 'all' || d.projectId === filterProject);
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? '—';
  const storagePct = Math.min((storageUsed / (5 * 1024 * 1024)) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Storage warning */}
      {storageUsed > STORAGE_WARN_BYTES && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Browser storage is {(storageUsed / 1024 / 1024).toFixed(1)} MB used.
            Consider removing old drawings — browser localStorage limit is ~5 MB.
          </p>
        </div>
      )}

      {/* Storage bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${storagePct > 80 ? 'bg-red-400' : storagePct > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${storagePct}%` }} />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{(storageUsed / 1024 / 1024).toFixed(1)} / 5 MB</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 justify-between">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Upload size={14} /> Upload Drawing
        </button>
      </div>

      {/* Upload form */}
      {showAdd && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Upload Drawing</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Drawing Number *</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="S-001" value={form.drawingNumber}
                onChange={e => setForm(p => ({ ...p, drawingNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Revision</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="P1, A, B…" value={form.revision}
                onChange={e => setForm(p => ({ ...p, revision: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Title</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. Ground Floor Slab Layout" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Discipline</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.discipline} onChange={e => setForm(p => ({ ...p, discipline: e.target.value as Drawing['discipline'] }))}>
                <option value="structural">Structural</option>
                <option value="architectural">Architectural</option>
                <option value="geotechnical">Geotechnical</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">File (PDF / image, max 1.5 MB)</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()}
                className="mt-1 w-full border border-dashed border-slate-300 hover:border-blue-400 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-blue-600 text-left transition-colors">
                {pendingFile ? `✓ ${pendingFile.name}` : 'Choose file…'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!pendingFile || !form.drawingNumber}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg">
              Upload to Register
            </button>
            <button onClick={() => { setShowAdd(false); setPendingFile(null); }}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Drawings list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="text-left px-4 py-2 font-semibold">Drg No.</th>
              <th className="text-left px-4 py-2 font-semibold">Title</th>
              <th className="text-center px-3 py-2 font-semibold">Rev</th>
              <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Project</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                <FileText size={24} className="mx-auto mb-2 opacity-40" />
                No drawings uploaded yet.
              </td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} className={`hover:bg-slate-50 ${d.status === 'superseded' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2 font-mono font-semibold text-slate-700">{d.drawingNumber}</td>
                <td className="px-4 py-2 text-slate-700">{d.title}</td>
                <td className="px-3 py-2 text-center font-mono">{d.revision}</td>
                <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{projectName(d.projectId)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${d.status === 'current' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => window.open(d.fileDataUrl)} title="View"
                      className="text-slate-400 hover:text-blue-600"><ExternalLink size={12} /></button>
                    {d.status === 'current' && (
                      <button onClick={() => supersede(d.id, '')} title="Supersede"
                        className="text-slate-400 hover:text-amber-600"><ArchiveX size={12} /></button>
                    )}
                    <button onClick={() => remove(d.id)} title="Delete"
                      className="text-slate-400 hover:text-red-500">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
