import { useState } from 'react';
import { Footprints } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import CalcSheet from '../ui/CalcSheet';
import ReportButton from '../report/ReportButton';
import { buildStaircaseReport } from '../../utils/reportBuilders';
import { getMaterial } from '../../utils/materials';
import { designStaircase } from '../../utils/staircaseCalculations';
import { staircaseCalcNotes } from '../../utils/calcNotesGeotechSlab';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { StaircaseInputs } from '../../utils/staircaseCalculations';
import type { ConcreteGrade, RebarGrade } from '../../types/structural';

const defaultInputs: StaircaseInputs = {
  riser: 175, going: 270, numRisers: 14,
  flightWidth: 1.2, liveLoad: 3.0, deadLoad: 1.5,
  material: getMaterial('C25/30', 'B500B'),
  cover: 25, supportType: 'simply-supported',
};

function StairSVG({ riser, going, numRisers }: { riser: number; going: number; numRisers: number }) {
  const W = 280, H = 200;
  const steps = Math.min(numRisers, 12);
  const sw = (W - 40) / steps;
  const sh = (H - 40) / steps;
  const x0 = 20, y0 = H - 20;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(`${x0 + i * sw},${y0 - i * sh}`);
    if (i < steps) pts.push(`${x0 + (i + 1) * sw},${y0 - i * sh}`);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline points={`${x0},${y0} ` + pts.join(' ')} fill="none" stroke="#475569" strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x0 + steps * sw} y2={y0 - steps * sh} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#64748b">
        R={riser}mm G={going}mm — {numRisers} risers
      </text>
    </svg>
  );
}

export default function StaircaseDesign() {
  const [inp, setInp] = useState<StaircaseInputs>(defaultInputs);
  const [res, setRes] = useState<ReturnType<typeof designStaircase> | null>(null);
  const { factors } = useBuildingCode();

  const set = (k: keyof StaircaseInputs, v: string | number) => setInp(p => ({ ...p, [k]: v }));
  const setMat = (c: string, r: string) => setInp(p => ({ ...p, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-pink-600 to-pink-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Footprints size={22} />
          <h1 className="text-xl font-bold">RC Staircase Design</h1>
        </div>
        <p className="text-pink-200 text-sm">Flight geometry, waist depth calculation and longitudinal reinforcement design</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Staircase Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Riser (R)"    unit="mm" value={inp.riser}      onChange={v => set('riser', +v)} min={100} max={220} />
            <InputField label="Going (G)"    unit="mm" value={inp.going}      onChange={v => set('going', +v)} min={200} max={350} />
            <InputField label="No. of risers"           value={inp.numRisers}  onChange={v => set('numRisers', +v)} min={2} max={20} />
            <InputField label="Flight width" unit="m"   value={inp.flightWidth} onChange={v => set('flightWidth', +v)} min={0.9} />
            <InputField label="Live load"    unit="kN/m²" value={inp.liveLoad} onChange={v => set('liveLoad', +v)} min={1.5} />
            <InputField label="Dead load (finishes)" unit="kN/m²" value={inp.deadLoad} onChange={v => set('deadLoad', +v)} min={0} />
            <InputField label="Cover"        unit="mm" value={inp.cover}      onChange={v => set('cover', +v)} min={20} />
            <SelectField label="Support" value={inp.supportType} onChange={v => set('supportType', v)}
              options={[{ value: 'simply-supported', label: 'Simply Supported' }, { value: 'continuous', label: 'Continuous' }]} />
            <SelectField label="Concrete" value={inp.material.concrete}
              onChange={(v) => setMat(v, inp.material.rebar)}
              options={['C20/25','C25/30','C30/37'].map(c => ({ value: c, label: c }))} />
            <SelectField label="Rebar" value={inp.material.rebar}
              onChange={(v) => setMat(inp.material.concrete, v)}
              options={['B500B','B500C'].map(r => ({ value: r, label: r }))} />
          </div>
          <Button onClick={() => setRes(designStaircase(inp, factors))} fullWidth className="mt-4">
            Design Staircase
          </Button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Geometry</p>
              <ResultRow label="Slope angle"    value={res.slopeAngle.toFixed(1)} unit="°" />
              <ResultRow label="2R + G check"   value={res.goingCheck} />
              <ResultRow label="Waist depth"    value={res.waistDepth} unit="mm" highlight />
              <ResultRow label="Effective span" value={res.effectiveSpan.toFixed(2)} unit="m" />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Loading</p>
              <ResultRow label="Self-weight"    value={res.selfWeight.toFixed(2)} unit="kN/m²" />
              <ResultRow label="wULS"           value={res.wULS.toFixed(2)} unit="kN/m" />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Reinforcement</p>
              <ResultRow label="MEd"            value={res.Med.toFixed(2)} unit="kNm/m" highlight />
              <ResultRow label="As required"    value={res.As_req.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars"           value={`T${res.bars.dia}@${res.bars.spacing}mm`} />
              <ResultRow label="Span/depth"     value={`${res.spanRatio.toFixed(1)}`} />
              <ResultRow label="Deflection"     value={res.deflectionOK ? '✓ Pass' : '✗ Check'} />
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Staircase Calculation Sheet"
                codeLabel={factors.label}
                steps={staircaseCalcNotes(inp, res, factors)}
              />

              <div className="mt-3 flex justify-end">
                <ReportButton data={buildStaircaseReport(inp, res, factors)} />
              </div>

              <SaveDesignPanel memberType="staircase"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Enter parameters and click Design Staircase</p>
          )}
        </Card>

        <Card title="Stair Profile" className="lg:col-span-1">
          <StairSVG riser={inp.riser} going={inp.going} numRisers={inp.numRisers} />
          {res && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500">Total rise:</span> <b>{((inp.numRisers * inp.riser) / 1000).toFixed(2)} m</b></p>
              <p><span className="text-slate-500">Total going:</span> <b>{((inp.numRisers * inp.going) / 1000).toFixed(2)} m</b></p>
              <p><span className="text-slate-500">Slope:</span> <b>{res.slopeAngle.toFixed(1)}°</b></p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
