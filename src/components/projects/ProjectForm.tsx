import { useState } from 'react';
import { X } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import type { Project } from '../../types/app';

interface Props {
  onClose: () => void;
  existing?: Project;
}

export default function ProjectForm({ onClose, existing }: Props) {
  const { createProject, updateProject } = useProject();
  const { users, currentUser } = useUser();

  const [form, setForm] = useState({
    jobNumber:   existing?.jobNumber   ?? '',
    name:        existing?.name        ?? '',
    client:      existing?.client      ?? '',
    location:    existing?.location    ?? '',
    description: existing?.description ?? '',
    engineerId:  existing?.engineerId  ?? currentUser?.id ?? '',
    status:      existing?.status      ?? 'active' as Project['status'],
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.jobNumber.trim() || !form.name.trim()) return;
    if (existing) {
      updateProject(existing.id, form);
    } else {
      createProject(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{existing ? 'Edit Project' : 'New Project'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Job Number *</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="GSP-2026-001" value={form.jobNumber} onChange={e => set('jobNumber', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600">Project Name *</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="e.g. Latrikunda 3-Storey Residential" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Client</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.client} onChange={e => set('client', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Location</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="e.g. Latrikunda, Banjul" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea rows={2} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600">Project Engineer</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.engineerId} onChange={e => set('engineerId', e.target.value)}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
            {existing ? 'Save Changes' : 'Create Project'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
