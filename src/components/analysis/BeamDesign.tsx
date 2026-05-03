import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import BeamSection from '../visuals/BeamSection';
import Beam3D from '../visuals/ThreeD/Beam3D';
import CalcSheet from '../ui/CalcSheet';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { getMaterial } from '../../utils/materials';
import { designBeam } from '../../utils/beamCalculations';
import { beamCalcNotes } from '../../utils/calcNotes';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { BeamInputs, BeamResults, ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: BeamInputs = {
  span: 6, width: 250, depth: 450, cover: 35,
  deadLoad: 15, liveLoad: 10,
  supportType: 'simply-supported',
  material: getMaterial('C25/30', 'B500B'),
};

export default function BeamDesign() {
  const [inp, setInp] = useState<BeamInputs>(defaultInputs);
  const [res, setRes] = useState<BeamResults | null>(null);
  const [show3D, setShow3D] = useState(false);
  const { factors } = useBuildingCode();

  const set = (key: keyof BeamInputs, val: string | number) =>
    setInp(prev => ({ ...prev, [key]: val }));

  const setMat = (concrete: ConcreteGrade, rebar: RebarGrade) =>
    setInp(prev => ({ ...prev, material: getMaterial(concrete, rebar) }));

  const run = () => setRes(designBeam(inp, factors));

  return (
    <div className="space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">Project:</span>
      <ProjectSelector />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Inputs */}
      <Card title="Beam Parameters" className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Span" unit="m" value={inp.span} onChange={v => set('span', +v)} min={1} />
          <InputField label="Width (bw)" unit="mm" value={inp.width} onChange={v => set('width', +v)} min={150} />
          <InputField label="Depth (h)" unit="mm" value={inp.depth} onChange={v => set('depth', +v)} min={200} />
          <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={25} />
          <InputField label="Dead Load (gk)" unit="kN/m" value={inp.deadLoad} onChange={v => set('deadLoad', +v)} min={0} />
          <InputField label="Live Load (qk)" unit="kN/m" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={0} />
          <SelectField label="Support" value={inp.supportType}
            onChange={v => set('supportType', v as BeamInputs['supportType'])}
            options={[
              { value: 'simply-supported', label: 'Simply Supported' },
              { value: 'continuous', label: 'Continuous' },
              { value: 'cantilever', label: 'Cantilever' },
            ]} />
          <SelectField label="Concrete" value={inp.material.concrete}
            onChange={v => setMat(v as ConcreteGrade, inp.material.rebar)}
            options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
          <SelectField label="Rebar" value={inp.material.rebar}
            onChange={v => setMat(inp.material.concrete, v as RebarGrade)}
            options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />
          <SelectField label="Section type" value={inp.flange ? 'T' : 'rect'}
            onChange={v => setInp(p => ({ ...p, flange: v === 'T' ? { width: 800, thickness: 120 } : undefined }))}
            options={[{ value: 'rect', label: 'Rectangular' }, { value: 'T', label: 'T-beam / Flanged' }]} />
          {inp.flange && <>
            <InputField label="Flange width (bf)" unit="mm" value={inp.flange.width}
              onChange={v => setInp(p => ({ ...p, flange: { ...p.flange!, width: +v } }))} min={inp.width} />
            <InputField label="Flange thickness (hf)" unit="mm" value={inp.flange.thickness}
              onChange={v => setInp(p => ({ ...p, flange: { ...p.flange!, thickness: +v } }))} min={50} />
          </>}
        </div>
        <button onClick={run}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
          Design Beam
        </button>
      </Card>

      {/* Results */}
      <Card title="Design Results" className="lg:col-span-1">
        {res ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge status={res.status} />
              <span className="text-xs text-slate-500">{factors.label} Design</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-1 mt-2">Actions</p>
            <ResultRow label="Design Moment (MEd)" value={res.Med} unit="kNm" highlight />
            <ResultRow label="Design Shear (VEd)" value={res.Ved} unit="kN" highlight />
            <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Bending</p>
            <ResultRow label="Effective depth (d)" value={res.d} unit="mm" />
            <ResultRow label="Neutral axis (x)" value={res.x} unit="mm" />
            <ResultRow label="As required" value={res.AsReq} unit="mm²" />
            <ResultRow label="Main bars" value={`${res.mainBars.count}T${res.mainBars.dia}`} />
            <ResultRow label="As provided" value={res.mainBars.As} unit="mm²" />
            <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Shear</p>
            <ResultRow label="Stirrups" value={`T${res.stirrups.dia}@${res.stirrups.spacing} (${res.stirrups.legs}legs)`} />
            <ResultRow label="Shear OK" value={res.shearOK ? '✓ Pass' : '✗ Fail'} />
            <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Serviceability (SLS)</p>
            <ResultRow label="Deflection OK" value={res.deflectionOK ? '✓ Pass' : '✗ Fail'} />
            <ResultRow label="Crack width (wk)" value={((res as any).crackWidth ?? 0).toFixed(3)} unit="mm" />
            <ResultRow label="Crack limit (wmax)" value="0.300" unit="mm" />
            <ResultRow label="Crack check" value={(res as any).crackOK ? '✓ Pass' : '✗ Fail'} />
            {(res as any).isT && (
              <>
                <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">T-beam</p>
                <ResultRow label="Flange width (bf)" value={(res as any).bEff} unit="mm" />
                <ResultRow label="Flange thk (hf)" value={inp.flange?.thickness ?? 0} unit="mm" />
              </>
            )}
            <div className="mt-3 p-2 bg-slate-50 rounded-lg">
              {res.messages.map((m, i) => (
                <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Materials</p>
            <ResultRow label="fck" value={inp.material.fck} unit="MPa" />
            <ResultRow label="fcd" value={inp.material.fcd.toFixed(1)} unit="MPa" />
            <ResultRow label="fyk" value={inp.material.fyk} unit="MPa" />
            <ResultRow label="fyd" value={inp.material.fyd.toFixed(1)} unit="MPa" />
            <CalcSheet
              title="Beam Calculation Sheet"
              codeLabel={factors.label}
              steps={beamCalcNotes(inp, res, factors)}
            />
            <SaveDesignPanel memberType="beam"
              inputs={inp as unknown as Record<string, unknown>}
              results={res as unknown as Record<string, unknown>} />
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Beam</p>
        )}
      </Card>

      {/* Visual */}
      <Card title="Cross-Section Visual" className="lg:col-span-1" actions={res ? (
        <button onClick={() => setShow3D(p => !p)}
          className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
          {show3D ? '2D View' : '3D View'}
        </button>
      ) : undefined}>
        {res ? (
          show3D ? <Beam3D inputs={inp} results={res} /> : <BeamSection inputs={inp} results={res} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Design output will appear here</p>
        )}
      </Card>
    </div>
    </div>
  );
}
