import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle, Trash2, FlaskConical } from 'lucide-react';
import Card from '../ui/Card';
import { useProject } from '../../context/ProjectContext';
import { useUser } from '../../context/UserContext';
import { getItem, setItem, generateId, KEYS } from '../../utils/storage';
import Button, { IconButton } from '../ui/Button';
import type { CubeTestResult } from '../../types/app';

export default function CubeTestLog() {
  const { projects, currentProject } = useProject();
  const { currentUser } = useUser();
  const [tests, setTests] = useState<CubeTestResult[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterProject, setFilterProject] = useState(currentProject?.id ?? 'all');

  const [form, setForm] = useState({
    pourReference: '', dateOfPour: '', dateOfTest: '',
    targetStrength: 25, result1: 0, result2: 0, result3: 0, notes: '',
  });

  useEffect(() => {
    setTests(getItem<CubeTestResult[]>(KEYS.CUBE_TESTS, []));
  }, []);

  const save = (updated: CubeTestResult[]) => {
    setTests(updated);
    setItem(KEYS.CUBE_TESTS, updated);
  };

  const handleAdd = () => {
    if (!form.pourReference || !currentUser) return;
    const avg = (form.result1 + form.result2 + form.result3) / 3;
    const pass = avg >= 0.85 * form.targetStrength &&
      Math.min(form.result1, form.result2, form.result3) >= 0.75 * form.targetStrength;
    const test: CubeTestResult = {
      id: generateId(),
      projectId: filterProject === 'all' ? (currentProject?.id ?? '') : filterProject,
      ...form,
      average: +avg.toFixed(1),
      passFail: pass ? 'pass' : 'fail',
      testedBy: currentUser.id,
    };
    save([...tests, test]);
    setShowAdd(false);
    setForm({ pourReference: '', dateOfPour: '', dateOfTest: '', targetStrength: 25, result1: 0, result2: 0, result3: 0, notes: '' });
  };

  const filtered = tests.filter(t =>
    filterProject === 'all' || t.projectId === filterProject
  );

  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <FlaskConical size={22} />
          <h1 className="text-xl font-bold">Concrete Cube Test Log</h1>
        </div>
        <p className="text-amber-200 text-sm">Record and track concrete compressive strength results by mix and pour date</p>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="flex gap-2">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
            value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={() => setShowAdd(true)} icon={<Plus size={14} />}>Add Test Result</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total tests', value: filtered.length },
          { label: 'Passed', value: filtered.filter(t => t.passFail === 'pass').length, color: 'text-emerald-600' },
          { label: 'Failed', value: filtered.filter(t => t.passFail === 'fail').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className={`text-2xl font-bold ${s.color ?? 'text-slate-800'}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <Card title="New Cube Test Result">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Pour Reference *</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. GF-Slab-Pour-1" value={form.pourReference}
                onChange={e => setForm(p => ({ ...p, pourReference: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Date of Pour</label>
              <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.dateOfPour} onChange={e => setForm(p => ({ ...p, dateOfPour: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Date of Test (28-day)</label>
              <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.dateOfTest} onChange={e => setForm(p => ({ ...p, dateOfTest: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Target Strength (MPa)</label>
              <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={form.targetStrength} onChange={e => setForm(p => ({ ...p, targetStrength: +e.target.value }))} />
            </div>
            <div></div>
            {(['result1', 'result2', 'result3'] as const).map((k, i) => (
              <div key={k}>
                <label className="text-xs font-medium text-slate-600">Cube {i + 1} (MPa)</label>
                <input type="number" step="0.1" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: +e.target.value }))} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Notes</label>
              <textarea rows={2} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAdd} fullWidth>Save Result</Button>
            <Button onClick={() => setShowAdd(false)} variant="secondary">Cancel</Button>
          </div>
        </Card>
      )}

      {/* Results table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <th className="text-left px-3 py-2 font-semibold">Pour Ref</th>
              <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Project</th>
              <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Test Date</th>
              <th className="text-center px-3 py-2 font-semibold">Target</th>
              <th className="text-center px-3 py-2 font-semibold">C1</th>
              <th className="text-center px-3 py-2 font-semibold">C2</th>
              <th className="text-center px-3 py-2 font-semibold">C3</th>
              <th className="text-center px-3 py-2 font-semibold">Avg</th>
              <th className="text-center px-3 py-2 font-semibold">Result</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">No test results recorded.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className={t.passFail === 'fail' ? 'bg-red-50' : 'hover:bg-slate-50'}>
                <td className="px-3 py-2 font-medium text-slate-800">{t.pourReference}</td>
                <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{projectName(t.projectId)}</td>
                <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{t.dateOfTest}</td>
                <td className="px-3 py-2 text-center">{t.targetStrength}</td>
                <td className="px-3 py-2 text-center">{t.result1}</td>
                <td className="px-3 py-2 text-center">{t.result2}</td>
                <td className="px-3 py-2 text-center">{t.result3}</td>
                <td className="px-3 py-2 text-center font-bold">{t.average}</td>
                <td className="px-3 py-2 text-center">
                  {t.passFail === 'pass'
                    ? <CheckCircle size={14} className="text-emerald-600 mx-auto" />
                    : <AlertTriangle size={14} className="text-red-600 mx-auto" />}
                </td>
                <td className="px-3 py-2">
                  <IconButton onClick={() => save(tests.filter(x => x.id !== t.id))} tone="danger"><Trash2 size={12} /></IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Pass criteria: average ≥ 85% of target AND no single cube &lt; 75% of target (BS 8110 / IS 456 approach)</p>
    </div>
  );
}
