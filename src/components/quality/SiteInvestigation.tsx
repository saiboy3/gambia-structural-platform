import { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, TrendingDown, Hammer } from 'lucide-react';
import Card from '../ui/Card';
import { getItem, setItem, generateId, KEYS } from '../../utils/storage';
import Button, { IconButton } from '../ui/Button';
import { useProject } from '../../context/ProjectContext';
import type { SiteInvestigationRecord } from '../../types/app';

const SOIL_TYPES = ['Topsoil / fill', 'Laterite — hard', 'Laterite — soft/decomposed', 'Dense sand', 'Medium dense sand', 'Loose sand', 'Firm clay', 'Soft clay', 'Gravel', 'Weathered rock', 'Rock'];
const TEST_TYPES = ['Hand auger', 'Trial pit', 'Dynamic cone penetrometer (DCP)', 'Standard penetration test (SPT)', 'CBR test', 'Plate load test', 'Resistivity survey'];

function defaultRecord(projectId: string, userId: string): Omit<SiteInvestigationRecord, 'id'> {
  return {
    projectId,
    boreholeRef: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    depth: 0,
    groundwaterDepth: null,
    testType: 'Trial pit',
    layers: [],
    bearingCapacity: null,
    notes: '',
    conductedBy: userId,
  };
}

export default function SiteInvestigation() {
  const { projects, currentProject } = useProject();
  const [records, setRecords] = useState<SiteInvestigationRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<SiteInvestigationRecord>>({});
  const [filterProject, setFilterProject] = useState(currentProject?.id ?? 'all');
  const [layerForm, setLayerForm] = useState({ depth: 0, description: '', soilType: SOIL_TYPES[0], nValue: '' });

  useEffect(() => {
    setRecords(getItem<SiteInvestigationRecord[]>(KEYS.SITE_INV, []));
  }, []);

  const save = (updated: SiteInvestigationRecord[]) => {
    setRecords(updated);
    setItem(KEYS.SITE_INV, updated);
  };

  const openAdd = () => {
    setForm(defaultRecord(currentProject?.id ?? projects[0]?.id ?? '', ''));
    setShowAdd(true);
  };

  const addRecord = () => {
    if (!form.boreholeRef || !form.projectId) return;
    const rec: SiteInvestigationRecord = {
      ...(form as SiteInvestigationRecord),
      id: generateId(),
      layers: form.layers ?? [],
    };
    save([...records, rec]);
    setShowAdd(false);
    setForm({});
  };

  const deleteRecord = (id: string) => save(records.filter(r => r.id !== id));

  const addLayer = () => {
    const layers = [...(form.layers ?? []), { ...layerForm, nValue: layerForm.nValue ? +layerForm.nValue : undefined }];
    setForm(p => ({ ...p, layers }));
    setLayerForm({ depth: 0, description: '', soilType: SOIL_TYPES[0], nValue: '' });
  };
  const removeLayer = (i: number) => setForm(p => ({ ...p, layers: (p.layers ?? []).filter((_, idx) => idx !== i) }));

  const filtered = records.filter(r => filterProject === 'all' || r.projectId === filterProject);
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Hammer size={22} />
          <h1 className="text-xl font-bold">Site Investigation Log</h1>
        </div>
        <p className="text-amber-200 text-sm">Log borehole, trial pit and CPT data for site ground condition records</p>
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button onClick={openAdd} icon={<Plus size={14} />}>New Investigation</Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card title="New Site Investigation Record">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500">Project</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.projectId ?? ''} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                <option value="">— Select —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Borehole / Pit Ref</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="BH-1, TP-1…" value={form.boreholeRef ?? ''}
                onChange={e => setForm(p => ({ ...p, boreholeRef: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Date</label>
              <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.date ?? ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Location / chainage</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="Grid ref / description" value={form.location ?? ''}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Investigation depth (m)</label>
              <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.depth ?? 0} onChange={e => setForm(p => ({ ...p, depth: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Groundwater depth (m, blank if none)</label>
              <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.groundwaterDepth ?? ''} onChange={e => setForm(p => ({ ...p, groundwaterDepth: e.target.value ? +e.target.value : null }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Test type</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.testType ?? ''} onChange={e => setForm(p => ({ ...p, testType: e.target.value }))}>
                {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Estimated bearing capacity (kPa)</label>
              <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. 100" value={form.bearingCapacity ?? ''}
                onChange={e => setForm(p => ({ ...p, bearingCapacity: e.target.value ? +e.target.value : null }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500">Notes</label>
              <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                rows={2} value={form.notes ?? ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {/* Soil layers */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Soil Profile Layers</p>
            {(form.layers ?? []).length > 0 && (
              <div className="mb-3 space-y-1">
                {(form.layers ?? []).map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                    <TrendingDown size={12} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-600 w-14">0–{l.depth}m</span>
                    <span className="text-slate-700 flex-1">{l.soilType} — {l.description}</span>
                    {l.nValue != null && <span className="text-slate-400">N={l.nValue}</span>}
                    <IconButton onClick={() => removeLayer(i)} tone="danger" className="ml-1 !p-0.5"><Trash2 size={11} /></IconButton>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-xs text-slate-500">Depth to (m)</label>
                <input type="number" className="mt-1 w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                  value={layerForm.depth} onChange={e => setLayerForm(p => ({ ...p, depth: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Soil type</label>
                <select className="mt-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                  value={layerForm.soilType} onChange={e => setLayerForm(p => ({ ...p, soilType: e.target.value }))}>
                  {SOIL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-32">
                <label className="text-xs text-slate-500">Description</label>
                <input className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                  placeholder="Colour, consistency…"
                  value={layerForm.description} onChange={e => setLayerForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">N-value</label>
                <input type="number" className="mt-1 w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                  placeholder="SPT" value={layerForm.nValue}
                  onChange={e => setLayerForm(p => ({ ...p, nValue: e.target.value }))} />
              </div>
              <Button onClick={addLayer} size="sm" className="!bg-slate-700 hover:!bg-slate-800 !border-slate-700">
                + Layer
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={addRecord}>Save Record</Button>
            <Button onClick={() => { setShowAdd(false); setForm({}); }} variant="secondary">Cancel</Button>
          </div>
        </Card>
      )}

      {/* Records */}
      {filtered.length === 0
        ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <MapPin size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No site investigation records yet.</p>
            <p className="text-xs text-slate-300 mt-1">Click "New Investigation" to log borehole or trial pit data.</p>
          </div>
        : filtered.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-amber-100 rounded-lg p-2 shrink-0">
                <MapPin size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{r.boreholeRef}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.testType}</span>
                  {r.bearingCapacity && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                      qa = {r.bearingCapacity} kPa
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{projectName(r.projectId)} · {r.date} · {r.location}</p>
              </div>
              <IconButton onClick={() => deleteRecord(r.id)} tone="danger" className="shrink-0">
                <Trash2 size={14} />
              </IconButton>
            </div>

            <div className="flex gap-4 text-xs text-slate-600 mb-3">
              <span><b>{r.depth} m</b> depth investigated</span>
              {r.groundwaterDepth != null && <span><b>{r.groundwaterDepth} m</b> to groundwater</span>}
            </div>

            {r.layers.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left px-3 py-1.5 font-semibold">Depth to</th>
                      <th className="text-left px-3 py-1.5 font-semibold">Soil type</th>
                      <th className="text-left px-3 py-1.5 font-semibold hidden sm:table-cell">Description</th>
                      <th className="text-center px-3 py-1.5 font-semibold">N-val</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {r.layers.map((l, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono text-slate-600">{l.depth} m</td>
                        <td className="px-3 py-1.5 text-slate-700">{l.soilType}</td>
                        <td className="px-3 py-1.5 text-slate-500 hidden sm:table-cell">{l.description}</td>
                        <td className="px-3 py-1.5 text-center text-slate-500">{l.nValue ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {r.notes && <p className="text-xs text-slate-500 italic">{r.notes}</p>}
          </div>
        ))
      }
    </div>
  );
}
