import { useState } from 'react';
import { Hammer } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import FoundationSection from '../visuals/FoundationSection';
import Foundation3D from '../visuals/ThreeD/Foundation3D';
import CalcSheet from '../ui/CalcSheet';
import ReportButton from '../report/ReportButton';
import { buildFoundationReport } from '../../utils/reportBuilders';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { getMaterial } from '../../utils/materials';
import { designFoundation } from '../../utils/foundationCalculations';
import { foundationCalcNotes } from '../../utils/calcNotes';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { FoundationInputs, FoundationResults, ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: FoundationInputs = {
  type: 'pad', columnB: 300, columnH: 400,
  Ned: 900, Med: 30, Hed: 0,
  selfWeight: 10, soilBearing: 150,
  cover: 50, depth: 500,
  material: getMaterial('C25/30', 'B500B'),
};

export default function FoundationDesign() {
  const [inp, setInp] = useState<FoundationInputs>(defaultInputs);
  const [res, setRes] = useState<FoundationResults | null>(null);
  const [show3D, setShow3D] = useState(false);
  const { factors } = useBuildingCode();

  const set = (key: keyof FoundationInputs, val: string | number) =>
    setInp(prev => ({ ...prev, [key]: val }));

  const setMat = (concrete: ConcreteGrade, rebar: RebarGrade) =>
    setInp(prev => ({ ...prev, material: getMaterial(concrete, rebar) }));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Hammer size={22} />
          <h1 className="text-xl font-bold">Pad Foundation Design</h1>
        </div>
        <p className="text-amber-200 text-sm">Bearing pressure, bending and shear design for pad and strip foundations</p>
      </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">Project:</span>
      <ProjectSelector />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Foundation Parameters" className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Type" value={inp.type}
            onChange={v => set('type', v)}
            options={[{ value: 'pad', label: 'Pad Foundation' }, { value: 'strip', label: 'Strip Foundation' }]} />
          <InputField label="Column b" unit="mm" value={inp.columnB} onChange={v => set('columnB', +v)} min={200} />
          <InputField label="Column h" unit="mm" value={inp.columnH} onChange={v => set('columnH', +v)} min={200} />
          <InputField label="NEd (axial)" unit="kN" value={inp.Ned} onChange={v => set('Ned', +v)} min={0} />
          <InputField label="MEd (moment)" unit="kNm" value={inp.Med} onChange={v => set('Med', +v)} min={0} />
          <InputField label="HEd (horiz.)" unit="kN" value={inp.Hed} onChange={v => set('Hed', +v)} min={0} />
          <InputField label="Self-wt allowance" unit="%" value={inp.selfWeight} onChange={v => set('selfWeight', +v)} min={5} max={20} />
          <InputField label="Soil Bearing Capacity" unit="kN/m²" value={inp.soilBearing} onChange={v => set('soilBearing', +v)} min={50} />
          <InputField label="Foundation Depth" unit="mm" value={inp.depth} onChange={v => set('depth', +v)} min={300} />
          <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={40} />
          <SelectField label="Concrete" value={inp.material.concrete}
            onChange={v => setMat(v as ConcreteGrade, inp.material.rebar)}
            options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
          <SelectField label="Rebar" value={inp.material.rebar}
            onChange={v => setMat(inp.material.concrete, v as RebarGrade)}
            options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />
          {inp.type === 'strip' && (
            <InputField label="Strip Length" unit="m" value={inp.stripLength ?? 10} onChange={v => set('stripLength', +v)} min={1} />
          )}
        </div>
        <Button onClick={() => setRes(designFoundation(inp, factors))} fullWidth className="mt-4">
          Design Foundation
        </Button>
      </Card>

      <Card title="Design Results" className="lg:col-span-1">
        {res ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Sizing</p>
            <ResultRow label="Length (L)" value={res.L} unit="m" highlight />
            <ResultRow label="Width (B)" value={res.B} unit="m" highlight />
            <ResultRow label="Depth (h)" value={res.h} unit="mm" />
            <ResultRow label="Effective depth (d)" value={res.d} unit="mm" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Soil Pressure</p>
            <ResultRow label="Net soil pressure (qEd)" value={res.qEd} unit="kN/m²" />
            <ResultRow label="Allowable" value={inp.soilBearing} unit="kN/m²" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Reinforcement</p>
            <ResultRow label="As bottom req" value={res.As_bot} unit="mm²/m" />
            <ResultRow label="Bars (EW bot)" value={`T${res.barsBot.dia}@${res.barsBot.spacing}`} />
            <ResultRow label="As prov" value={res.barsBot.As.toFixed(0)} unit="mm²/m" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Checks</p>
            <ResultRow label="Punching shear" value={res.punchingOK ? '✓ Pass' : '✗ Fail'} />
            <ResultRow label="Bending" value={res.bendingOK ? '✓ Pass' : '✗ Fail'} />
            {inp.Hed > 0 && (
              <ResultRow label="Sliding FoS" value={res.FoS_sliding.toFixed(2)} />
            )}
            <div className="mt-3 p-2 bg-slate-50 rounded-lg">
              {res.messages.map((m, i) => (
                <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
              ))}
            </div>
            <CalcSheet
              title="Foundation Calculation Sheet"
              codeLabel={factors.label}
              steps={foundationCalcNotes(inp, res, factors)}
            />
            <div className="mt-3 flex justify-end">
              <ReportButton data={buildFoundationReport(inp, res, factors)} threeD={<Foundation3D inputs={inp} results={res} still />} />
            </div>
            <SaveDesignPanel memberType="foundation"
              inputs={inp as unknown as Record<string, unknown>}
              results={res as unknown as Record<string, unknown>} />
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Foundation</p>
        )}
      </Card>

      <Card title="Section Visual" className="lg:col-span-1" actions={res ? (
        <Button onClick={() => setShow3D(p => !p)} variant="secondary" size="sm">
          {show3D ? '2D View' : '3D View'}
        </Button>
      ) : undefined}>
        {res ? (
          show3D ? <Foundation3D inputs={inp} results={res} /> : <FoundationSection inputs={inp} results={res} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Design output will appear here</p>
        )}
      </Card>
    </div>
    </div>
  );
}
