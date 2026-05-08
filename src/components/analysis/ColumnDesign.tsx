import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import ColumnSection from '../visuals/ColumnSection';
import Column3D from '../visuals/ThreeD/Column3D';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import OptimiseSuggestion from '../ui/OptimiseSuggestion';
import CalcSheet from '../ui/CalcSheet';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import PMDiagram from '../visuals/PMDiagram';
import { getMaterial } from '../../utils/materials';
import { designColumn } from '../../utils/columnCalculations';
import { columnCalcNotes } from '../../utils/calcNotes';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { ColumnInputs, ColumnResults, ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: ColumnInputs = {
  shape: 'rectangular', b: 300, h: 400, cover: 35, height: 3.5,
  Ned: 800, Medy: 50, Medx: 30,
  material: getMaterial('C25/30', 'B500B'),
  braced: true,
};

const CONCRETE_GRADES: ConcreteGrade[] = ['C20/25', 'C25/30', 'C30/37', 'C35/45', 'C40/50'];
function nextConcreteGrade(g: ConcreteGrade): ConcreteGrade | null {
  const i = CONCRETE_GRADES.indexOf(g);
  return i >= 0 && i < CONCRETE_GRADES.length - 1 ? CONCRETE_GRADES[i + 1] : null;
}

function buildColChecks(
  inp: ColumnInputs,
  res: ColumnResults,
  runWith: (patch: Partial<ColumnInputs>) => void,
): UtilCheck[] {
  const currentGrade = inp.material.concrete as ConcreteGrade;
  const upGrade = nextConcreteGrade(currentGrade);
  return [
    { label: 'Axial capacity', demand: inp.Ned, capacity: res.capacity, unit: 'kN', note: 'NEd / NRd',
      hint: 'Column cannot carry the axial load. Increase section size or use higher-grade concrete.',
      actions: [
        { label: `+50 mm b (→ ${inp.b + 50} mm)`, onClick: () => runWith({ b: inp.b + 50 }) },
        { label: `+50 mm h (→ ${inp.h + 50} mm)`, onClick: () => runWith({ h: inp.h + 50 }) },
        { label: `+50 mm b & h`, onClick: () => runWith({ b: inp.b + 50, h: inp.h + 50 }) },
        ...(upGrade ? [{ label: `Upgrade concrete → ${upGrade}`, onClick: () => runWith({ material: getMaterial(upGrade, inp.material.rebar as RebarGrade) }) }] : []),
      ],
    },
    { label: 'As provided', demand: res.mainBars.As, capacity: res.AsReq, unit: 'mm²', note: 'As,prov / As,req', invert: true,
      hint: 'Required area not met. Increase section size to reduce As,req, or the calculation will upsize bars automatically.',
      actions: [
        { label: `+50 mm b (→ ${inp.b + 50} mm)`, onClick: () => runWith({ b: inp.b + 50 }) },
        { label: `+50 mm h (→ ${inp.h + 50} mm)`, onClick: () => runWith({ h: inp.h + 50 }) },
      ],
    },
    { label: 'Min steel (0.2% Ac)', demand: res.mainBars.As, capacity: res.minAs, unit: 'mm²', note: 'As,prov / As,min', invert: true,
      hint: 'Code minimum ensures ductility. Provide at least 4 bars regardless of load.' },
    { label: 'Max steel (4% Ac)', demand: res.mainBars.As, capacity: res.maxAs, unit: 'mm²', note: 'As,prov / As,max',
      hint: 'Over-reinforcing causes congestion. Increase section size to keep steel ratio below 4%.',
      actions: [
        { label: `+50 mm b & h`, onClick: () => runWith({ b: inp.b + 50, h: inp.h + 50 }) },
        { label: `+100 mm b & h`, onClick: () => runWith({ b: inp.b + 100, h: inp.h + 100 }) },
      ],
    },
  ];
}

export default function ColumnDesign() {
  const [inp, setInp] = useState<ColumnInputs>(defaultInputs);
  const [res, setRes] = useState<ColumnResults | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [activeTab, setActiveTab] = useState<'section' | 'pm' | 'utilisation'>('pm');
  const [suggestion, setSuggestion] = useState<{ b: number; h: number; concrete: ConcreteGrade } | null>(null);
  const { factors } = useBuildingCode();

  const set = (key: keyof ColumnInputs, val: string | number | boolean) => {
    setInp(prev => ({ ...prev, [key]: val }));
    setSuggestion(null);
  };
  const setMat = (concrete: ConcreteGrade, rebar: RebarGrade) =>
    setInp(prev => ({ ...prev, material: getMaterial(concrete, rebar) }));

  const runWith = (patch: Partial<ColumnInputs>) => {
    const next = { ...inp, ...patch };
    setInp(next);
    setRes(designColumn(next, factors));
    setSuggestion(null);
  };

  const optimise = () => {
    if (!res) return;
    const MAX_DIM = 700; // mm — sensible ceiling for most building columns
    const calcPct = (c: UtilCheck) =>
      c.capacity === 0 ? 0 : c.invert
        ? (c.capacity / c.demand) * 100
        : (c.demand / c.capacity) * 100;
    let b = inp.b, h = inp.h;
    let concrete = inp.material.concrete as ConcreteGrade;
    let gradeIdx = CONCRETE_GRADES.indexOf(concrete);
    for (let i = 0; i < 30; i++) {
      const testMat = getMaterial(concrete, inp.material.rebar as RebarGrade);
      const testInp = { ...inp, b, h, material: testMat };
      const testRes = designColumn(testInp, factors);
      const checks = buildColChecks(testInp, testRes, () => {});
      const failing = checks.filter(c => c.label !== 'Max steel (4% Ac)' && !c.skipOptimise && calcPct(c) > 80);
      if (failing.length === 0) break;
      if (b >= MAX_DIM && h >= MAX_DIM) {
        // Section at ceiling — escalate concrete grade instead
        if (gradeIdx < CONCRETE_GRADES.length - 1) concrete = CONCRETE_GRADES[++gradeIdx];
        else break;
      } else {
        b = Math.min(Math.ceil((b + 25) / 25) * 25, MAX_DIM);
        h = Math.min(Math.ceil((h + 25) / 25) * 25, MAX_DIM);
      }
    }
    setSuggestion({ b, h, concrete });
  };

  return (
    <div className="space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">Project:</span>
      <ProjectSelector />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Column Parameters" className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Shape" value={inp.shape}
            onChange={v => set('shape', v)}
            options={[
              { value: 'rectangular', label: 'Rectangular' },
              { value: 'square', label: 'Square' },
              { value: 'circular', label: 'Circular' },
            ]} />
          <div>
            <div className="flex items-center gap-0.5">
              <label className="text-xs font-medium text-slate-600">Width / Dia (b)</label>
              <HelpTooltip title="Column width" text="The smaller cross-section dimension. For circular columns this is the diameter." typical="250–500 mm for most building columns" />
            </div>
            <InputField label="" unit="mm" value={inp.b} onChange={v => set('b', +v)} min={200} />
          </div>
          <InputField label="Depth (h)" unit="mm" value={inp.h} onChange={v => set('h', +v)} min={200} />
          <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={25} />
          <div>
            <div className="flex items-center gap-0.5">
              <label className="text-xs font-medium text-slate-600">Clear height</label>
              <HelpTooltip title="Clear height" text="Floor-to-floor height less the depth of the beam or slab above." typical="2.8–4.0 m for residential/commercial" effect="Taller column → more slender → may need additional moment" />
            </div>
            <InputField label="" unit="m" value={inp.height} onChange={v => set('height', +v)} min={1} />
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              <label className="text-xs font-medium text-slate-600">NEd (axial)</label>
              <HelpTooltip title="Design axial force" text="The total factored compressive load on the column at ULS. Sum loads from all floors above." typical="Accumulate: slab area × floor load × no. of floors" />
            </div>
            <InputField label="" unit="kN" value={inp.Ned} onChange={v => set('Ned', +v)} min={0} />
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              <label className="text-xs font-medium text-slate-600">MEdy (major)</label>
              <HelpTooltip title="Design moment (major axis)" text="Bending moment about the major axis (y-y). Can arise from eccentricity of load, lateral load, or frame action." typical="10–50% of NEd × column depth as a rough guide" />
            </div>
            <InputField label="" unit="kNm" value={inp.Medy} onChange={v => set('Medy', +v)} min={0} />
          </div>
          <InputField label="MEdx (minor)" unit="kNm" value={inp.Medx} onChange={v => set('Medx', +v)} min={0} />
          <SelectField label="Concrete" value={inp.material.concrete}
            onChange={v => setMat(v as ConcreteGrade, inp.material.rebar)}
            options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
          <SelectField label="Rebar" value={inp.material.rebar}
            onChange={v => setMat(inp.material.concrete, v as RebarGrade)}
            options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />
          <SelectField label="Frame Type" value={inp.braced ? 'braced' : 'unbraced'}
            onChange={v => set('braced', v === 'braced')}
            options={[{ value: 'braced', label: 'Braced' }, { value: 'unbraced', label: 'Unbraced' }]} />
        </div>
        <button onClick={() => setRes(designColumn(inp, factors))}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
          Design Column
        </button>
      </Card>

      <Card title="Design Results" className="lg:col-span-1">
        {res ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge status={res.status} />
            </div>
            <ResultRow label="Slenderness λy" value={res.slendernessY} highlight />
            <ResultRow label="Slenderness λx" value={res.slendernessX} highlight />
            <ResultRow label="Slender?" value={res.isSlender ? 'Yes' : 'No'} />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Reinforcement</p>
            <ResultRow label="As required" value={res.AsReq} unit="mm²" />
            <ResultRow label="As min" value={res.minAs.toFixed(0)} unit="mm²" />
            <ResultRow label="As max" value={res.maxAs.toFixed(0)} unit="mm²" />
            <ResultRow label="Main bars" value={`${res.mainBars.count}T${res.mainBars.dia}`} />
            <ResultRow label="As provided" value={res.mainBars.As.toFixed(0)} unit="mm²" />
            <ResultRow label="Links" value={`T${res.links.dia}@${res.links.spacing}`} />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Capacity</p>
            <ResultRow label="Axial Capacity" value={res.capacity} unit="kN" highlight />
            <ResultRow label="Utilisation" value={`${((inp.Ned / res.capacity) * 100).toFixed(1)}%`} />
            <div className="mt-3 p-2 bg-slate-50 rounded-lg">
              {res.messages.map((m, i) => (
                <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
              ))}
            </div>
            <CalcSheet
              title="Column Calculation Sheet"
              codeLabel={factors.label}
              steps={columnCalcNotes(inp, res, factors)}
            />
            <SaveDesignPanel memberType="column"
              inputs={inp as unknown as Record<string, unknown>}
              results={res as unknown as Record<string, unknown>} />
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Column</p>
        )}
      </Card>

      <Card title="Diagrams & Visuals" className="lg:col-span-1">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
          {([
            { id: 'pm' as const, label: 'P-M Diagram' },
            { id: 'section' as const, label: 'Section' },
            { id: 'utilisation' as const, label: 'Utilisation' },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${activeTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'pm' && <PMDiagram inputs={inp} factors={factors} />}

        {activeTab === 'section' && (
          <>
            <div className="flex justify-end mb-2">
              {res && (
                <button onClick={() => setShow3D(p => !p)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
                  {show3D ? '2D' : '3D'} View
                </button>
              )}
            </div>
            {res
              ? (show3D ? <Column3D inputs={inp} results={res} /> : <ColumnSection inputs={inp} results={res} />)
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>}
          </>
        )}

        {activeTab === 'utilisation' && (
          res ? (
            <>
              <UtilisationBars checks={buildColChecks(inp, res, runWith)} title="Capacity checks" />
              {!suggestion && (
                <button onClick={optimise}
                  className="mt-3 w-full text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition-colors">
                  Suggest optimal parameters
                </button>
              )}
              {suggestion && (
                <OptimiseSuggestion
                  rows={[
                    { label: 'Column width (b)', current: inp.b, suggested: suggestion.b, unit: 'mm' },
                    { label: 'Column depth (h)', current: inp.h, suggested: suggestion.h, unit: 'mm' },
                    { label: 'Concrete grade', current: 0, suggested: suggestion.concrete === inp.material.concrete ? 0 : 1,
                      unit: '', currentLabel: inp.material.concrete, suggestedLabel: suggestion.concrete },
                  ]}
                  note="Minimum values — round dimensions to nearest 50 mm. Bars and links are auto-selected from As,req."
                  onApply={() => {
                    runWith({ b: suggestion.b, h: suggestion.h, material: getMaterial(suggestion.concrete, inp.material.rebar as RebarGrade) });
                    setSuggestion(null);
                  }}
                  onDismiss={() => setSuggestion(null)}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )
        )}
      </Card>
    </div>
    </div>
  );
}
