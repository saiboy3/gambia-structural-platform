import { useState } from 'react';
import { Square } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import SlabSection from '../visuals/SlabSection';
import Slab3D from '../visuals/ThreeD/Slab3D';
import CalcSheet from '../ui/CalcSheet';
import ReportButton from '../report/ReportButton';
import { buildSlabReport } from '../../utils/reportBuilders';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { getMaterial } from '../../utils/materials';
import { designSlab } from '../../utils/slabCalculations';
import { slabCalcNotes } from '../../utils/calcNotes';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { SlabInputs, SlabResults, ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: SlabInputs = {
  type: 'two-way', lx: 4.5, ly: 6.0, thickness: 175, cover: 25,
  deadLoad: 5, liveLoad: 3,
  material: getMaterial('C25/30', 'B500B'),
  edgeCondition: 'continuous-all',
};

export default function SlabDesign() {
  const [inp, setInp] = useState<SlabInputs>(defaultInputs);
  const [res, setRes] = useState<SlabResults | null>(null);
  const [show3D, setShow3D] = useState(false);
  const { factors } = useBuildingCode();

  const set = (key: keyof SlabInputs, val: string | number) =>
    setInp(prev => ({ ...prev, [key]: val }));

  const setMat = (concrete: ConcreteGrade, rebar: RebarGrade) =>
    setInp(prev => ({ ...prev, material: getMaterial(concrete, rebar) }));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Square size={22} />
          <h1 className="text-xl font-bold">RC Slab Design</h1>
        </div>
        <p className="text-emerald-200 text-sm">One-way and two-way solid slab design including bending, shear and deflection</p>
      </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">Project:</span>
      <ProjectSelector />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Slab Parameters" className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Slab Type" value={inp.type}
            onChange={v => set('type', v)}
            options={[{ value: 'one-way', label: 'One-Way' }, { value: 'two-way', label: 'Two-Way' }]} />
          <SelectField label="Edge Condition" value={inp.edgeCondition}
            onChange={v => set('edgeCondition', v)}
            options={[
              { value: 'simply-supported', label: 'Simply Supported' },
              { value: 'continuous-all', label: 'Continuous (all)' },
              { value: 'continuous-one', label: 'Continuous (one end)' },
              { value: 'cantilever', label: 'Cantilever' },
            ]} />
          <InputField label={inp.type === 'one-way' ? 'Span (lx)' : 'Short span (lx)'} unit="m" value={inp.lx} onChange={v => set('lx', +v)} min={1} />
          {inp.type === 'two-way' && (
            <InputField label="Long span (ly)" unit="m" value={inp.ly} onChange={v => set('ly', +v)} min={1} />
          )}
          <InputField label="Thickness (h)" unit="mm" value={inp.thickness} onChange={v => set('thickness', +v)} min={100} />
          <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={20} />
          <InputField label="Dead Load (gk)" unit="kN/m²" value={inp.deadLoad} onChange={v => set('deadLoad', +v)} min={0} />
          <InputField label="Live Load (qk)" unit="kN/m²" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} />
          <SelectField label="Concrete" value={inp.material.concrete}
            onChange={v => setMat(v as ConcreteGrade, inp.material.rebar)}
            options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
          <SelectField label="Rebar" value={inp.material.rebar}
            onChange={v => setMat(inp.material.concrete, v as RebarGrade)}
            options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />
        </div>
        <Button onClick={() => setRes(designSlab(inp, factors))} fullWidth className="mt-4">
          Design Slab
        </Button>
      </Card>

      <Card title="Design Results" className="lg:col-span-1">
        {res ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
            <ResultRow label="Effective depth (d)" value={res.d} unit="mm" highlight />
            <ResultRow label="Moment capacity parameter (K)" value={res.K} />
            <ResultRow label="Lever arm (z)" value={res.z} unit="mm" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Short-span (x)</p>
            <ResultRow label="MEd,x" value={res.Med_x} unit="kNm/m" />
            <ResultRow label="As,x req" value={res.As_x} unit="mm²/m" />
            <ResultRow label="Bars x" value={`T${res.barsX.dia}@${res.barsX.spacing}`} />
            <ResultRow label="As,x prov" value={res.barsX.As.toFixed(0)} unit="mm²/m" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Long-span / distribution (y)</p>
            <ResultRow label="MEd,y" value={res.Med_y} unit="kNm/m" />
            <ResultRow label="As,y req" value={res.As_y} unit="mm²/m" />
            <ResultRow label="Bars y" value={`T${res.barsY.dia}@${res.barsY.spacing}`} />
            <ResultRow label="As,y prov" value={res.barsY.As.toFixed(0)} unit="mm²/m" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Reinforcement limits</p>
            <ResultRow label="Minimum steel area" value={res.As_min.toFixed(0)} unit="mm²/m" />
            <ResultRow label="Maximum steel area" value={res.As_max.toFixed(0)} unit="mm²/m" />
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Shear &amp; deflection</p>
            <ResultRow label="Design shear (VEd)" value={res.Ved} unit="kN/m" />
            <ResultRow label="Concrete shear resistance" value={res.VRdc} unit="kN/m" />
            <ResultRow label="Shear check" value={res.shearOK ? '✓ Pass' : '✗ Fail'} />
            <ResultRow label="Span/depth ratio" value={res.spanRatio} />
            <ResultRow label="Deflection OK" value={res.deflectionOK ? '✓ Pass' : '✗ Fail'} />
            <div className="mt-3 p-2 bg-slate-50 rounded-lg">
              {res.messages.map((m, i) => (
                <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
              ))}
            </div>
            <CalcSheet
              title="Slab Calculation Sheet"
              codeLabel={factors.label}
              steps={slabCalcNotes(inp, res, factors)}
            />
            <div className="mt-3 flex justify-end">
              <ReportButton data={buildSlabReport(inp, res, factors)} />
            </div>
            <SaveDesignPanel memberType="slab"
              inputs={inp as unknown as Record<string, unknown>}
              results={res as unknown as Record<string, unknown>} />
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Slab</p>
        )}
      </Card>

      <Card title="Section Visual" className="lg:col-span-1" actions={res ? (
        <Button onClick={() => setShow3D(p => !p)} variant="secondary" size="sm" className="!px-2.5 !py-1">
          {show3D ? '2D View' : '3D View'}
        </Button>
      ) : undefined}>
        {res ? (
          show3D ? <Slab3D inputs={inp} results={res} /> : <SlabSection inputs={inp} results={res} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Design output will appear here</p>
        )}
      </Card>
    </div>
    </div>
  );
}
