import { useState } from 'react';
import { Triangle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { getMaterial } from '../../utils/materials';
import { designPileCap } from '../../utils/pileCapCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import OptimiseSuggestion from '../ui/OptimiseSuggestion';
import type { ConcreteGrade, RebarGrade } from '../../types/structural';
import type { PileCapInputs, PileArrangement } from '../../utils/pileCapCalculations';
import CalcSheet from '../ui/CalcSheet';
import { pileCapCalcNotes } from '../../utils/calcNotesPileMasonry';

const defaultInp: PileCapInputs = {
  arrangement: '4-pile',
  pileDia: 450,
  pileSpacing: 1350,
  capThickness: 750,
  capProjection: 150,
  cover: 75,
  colB: 400,
  colH: 400,
  Ned: 2000,
  material: getMaterial('C25/30', 'B500B'),
};

const ARRANGEMENTS: { value: PileArrangement; label: string; svg: string }[] = [
  { value: '2-pile', label: '2-Pile', svg: '● ●' },
  { value: '3-pile', label: '3-Pile', svg: '●\n● ●' },
  { value: '4-pile', label: '4-Pile', svg: '● ●\n● ●' },
];

function CapPlanSVG({ arrangement, pileSpacing, pileDia, capSizeX, capSizeY, colB, colH }:
  { arrangement: PileArrangement; pileSpacing: number; pileDia: number; capSizeX: number; capSizeY: number; colB: number; colH: number }) {
  const W = 260, H = 200, pad = 20;
  const scaleX = (W - 2 * pad) / (capSizeX / 1000);
  const scaleY = (H - 2 * pad) / (capSizeY / 1000);
  const cX = W / 2, cY = H / 2;
  const pR = Math.max(4, (pileDia / 1000) * scaleX / 2);
  const s = pileSpacing / 1000;

  const pilePosMap: Record<PileArrangement, [number, number][]> = {
    '2-pile': [[-s / 2, 0], [s / 2, 0]],
    '3-pile': [[-s / 2, s * 0.289], [s / 2, s * 0.289], [0, -s * 0.577]],
    '4-pile': [[-s / 2, -s / 2], [s / 2, -s / 2], [-s / 2, s / 2], [s / 2, s / 2]],
  };

  const piles = pilePosMap[arrangement];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Cap outline */}
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
      {/* Piles */}
      {piles.map(([px, py], i) => (
        <circle key={i}
          cx={cX + px * scaleX}
          cy={cY + py * scaleY}
          r={pR} fill="#475569" stroke="#1e293b" strokeWidth={0.5} />
      ))}
      {/* Column */}
      <rect x={cX - (colB / 1000) * scaleX / 2} y={cY - (colH / 1000) * scaleY / 2}
        width={(colB / 1000) * scaleX} height={(colH / 1000) * scaleY}
        fill="#3b82f6" fillOpacity={0.7} stroke="#1d4ed8" strokeWidth={1} />
      <text x={cX} y={cY + 3} fontSize={7} textAnchor="middle" fill="white">Col</text>
      {/* Dimensions */}
      <text x={W / 2} y={H - 4} fontSize={8} textAnchor="middle" fill="#64748b">
        {(capSizeX / 1000).toFixed(2)}m × {(capSizeY / 1000).toFixed(2)}m
      </text>
    </svg>
  );
}

export default function PileCapDesign() {
  const [inp, setInp] = useState<PileCapInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designPileCap> | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'utilisation'>('plan');
  const [suggestion, setSuggestion] = useState<{ capThickness: number } | null>(null);
  const { factors } = useBuildingCode();

  const set = (k: keyof PileCapInputs, v: unknown) => { setInp(p => ({ ...p, [k]: v })); setSuggestion(null); };
  const setMat = (c: string, r: string) =>
    setInp(p => ({ ...p, material: getMaterial(c as ConcreteGrade, r as RebarGrade) }));

  const runWith = (patch: Partial<PileCapInputs>) => {
    const next = { ...inp, ...patch };
    setInp(next);
    setRes(designPileCap(next, factors));
    setSuggestion(null);
  };

  const optimise = () => {
    if (!res) return;
    let capThickness = inp.capThickness; // grow from current — only increase if needed
    for (let i = 0; i < 60; i++) {
      const testRes = designPileCap({ ...inp, capThickness }, factors);
      const punchUtil = testRes.vRdc > 0 ? (testRes.vEd_col / testRes.vRdc) * 100 : 200;
      const steelUtil = testRes.bars.As > 0 ? (testRes.As_req / testRes.bars.As) * 100 : 200;
      // steelUtil is As_req/As_prov (inverted check) — only needs to be ≤100 to pass; punch needs 80% headroom
      if (punchUtil <= 80 && steelUtil <= 100) break;
      capThickness = Math.ceil((capThickness + 50) / 50) * 50;
    }
    setSuggestion({ capThickness });
  };

  const checks: UtilCheck[] = res ? [
    { label: 'Punching at column', demand: res.vEd_col, capacity: res.vRdc, unit: 'MPa', note: 'vEd / vRd,c',
      hint: 'Increase cap depth or enlarge the column. A deeper cap significantly raises punching resistance.',
      actions: [
        { label: `+50 mm depth (→ ${inp.capThickness + 50} mm)`, onClick: () => runWith({ capThickness: inp.capThickness + 50 }) },
        { label: `+100 mm depth (→ ${inp.capThickness + 100} mm)`, onClick: () => runWith({ capThickness: inp.capThickness + 100 }) },
      ],
    },
    { label: 'Flexural steel', demand: res.As_req, capacity: res.bars.As, unit: 'mm²/m', note: 'As,req / As,prov', invert: true,
      hint: 'Increase cap thickness — a deeper cap reduces the moment arm and As,req automatically.',
      actions: [
        { label: `+50 mm depth (→ ${inp.capThickness + 50} mm)`, onClick: () => runWith({ capThickness: inp.capThickness + 50 }) },
        { label: `+100 mm depth (→ ${inp.capThickness + 100} mm)`, onClick: () => runWith({ capThickness: inp.capThickness + 100 }) },
      ],
    },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Triangle size={22} />
          <h1 className="text-xl font-bold">Pile Cap Design</h1>
        </div>
        <p className="text-amber-200 text-sm">Bending and punching shear design for 2-, 3- and 4-pile caps</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inputs */}
        <Card title="Pile Cap Parameters" className="lg:col-span-1">
          {/* Arrangement picker */}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-1.5">Pile arrangement</p>
            <div className="grid grid-cols-3 gap-1">
              {ARRANGEMENTS.map(arr => (
                <button key={arr.value} onClick={() => set('arrangement', arr.value)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition-all
                    ${inp.arrangement === arr.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                  {arr.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Column load (NEd)</label>
                <HelpTooltip title="Column axial load" text="ULS design axial force from column above at the pile cap level." typical="500–5000 kN for buildings" />
              </div>
              <InputField label="" unit="kN" value={inp.Ned} onChange={v => set('Ned', +v)} min={100} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Pile diameter</label>
                <HelpTooltip title="Pile diameter" text="Must match the installed pile. Pile cap sized from this." typical="300–600 mm" />
              </div>
              <InputField label="" unit="mm" value={inp.pileDia} onChange={v => set('pileDia', +v)} min={200} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Pile spacing</label>
                <HelpTooltip title="Pile c/c spacing" text="Centre-to-centre distance between piles. EC2 recommends ≥ 3× pile dia." typical={`≥ ${inp.pileDia * 3} mm for ⌀${inp.pileDia}`} />
              </div>
              <InputField label="" unit="mm" value={inp.pileSpacing} onChange={v => set('pileSpacing', +v)} min={inp.pileDia * 2.5} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Cap thickness</label>
                <HelpTooltip title="Pile cap depth" text="Overall depth of the cap. Controls punching shear and bending resistance." typical="700–1200 mm" />
              </div>
              <InputField label="" unit="mm" value={inp.capThickness} onChange={v => set('capThickness', +v)} min={400} />
            </div>
            <InputField label="Projection beyond pile" unit="mm" value={inp.capProjection}
              onChange={v => set('capProjection', +v)} min={100} />
            <InputField label="Cover" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={50} />
            <InputField label="Column B" unit="mm" value={inp.colB} onChange={v => set('colB', +v)} min={200} />
            <InputField label="Column H" unit="mm" value={inp.colH} onChange={v => set('colH', +v)} min={200} />
            <SelectField label="Concrete" value={inp.material.concrete}
              onChange={v => setMat(v, inp.material.rebar)}
              options={['C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
            <SelectField label="Rebar" value={inp.material.rebar}
              onChange={v => setMat(inp.material.concrete, v)}
              options={['B500B','B500C'].map(r => ({ value: r, label: r }))} />
          </div>
          <Button onClick={() => setRes(designPileCap(inp, factors))} fullWidth className="mt-4">
            Design Pile Cap
          </Button>
        </Card>

        {/* Results */}
        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Cap size" value={`${(res.capSizeX / 1000).toFixed(2)} × ${(res.capSizeY / 1000).toFixed(2)}`} unit="m" highlight />
              <ResultRow label="Self-weight (ULS)" value={res.pileCap_weight.toFixed(0)} unit="kN" />
              <ResultRow label="Pile load" value={res.pileLoad.toFixed(0)} unit="kN / pile" highlight />
              <ResultRow label="Design moment (MEd)" value={res.Med.toFixed(1)} unit="kNm" />
              <ResultRow label="Effective depth (d)" value={res.d.toFixed(0)} unit="mm" />
              <ResultRow label="As,req" value={res.As_req.toFixed(0)} unit="mm²/m" />
              <ResultRow label="Bars (EW bottom)" value={`T${res.bars.dia}@${res.bars.spacing}mm`} />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Punching Shear at Column</p>
              <ResultRow label="vEd" value={res.vEd_col.toFixed(3)} unit="MPa" highlight />
              <ResultRow label="vRd,c" value={res.vRdc.toFixed(3)} unit="MPa" />
              <ResultRow label="Punching" value={res.punchOK ? '✓ Pass' : '✗ Fail'} />
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <CalcSheet
                title="Pile Cap Calculation Sheet"
                codeLabel={factors.label}
                steps={pileCapCalcNotes(inp, res, factors)}
              />
              <SaveDesignPanel memberType="foundation"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🏗️</p>
              <p className="text-sm font-semibold text-slate-600">Pile cap design</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">Truss analogy for 2-pile caps, bending method for 4-pile. Punching shear at column checked automatically.</p>
            </div>
          )}
        </Card>

        {/* Visual */}
        <Card title="Cap Plan & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['plan', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'plan' ? 'Plan View' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'plan' && (
            <CapPlanSVG
              arrangement={inp.arrangement}
              pileSpacing={inp.pileSpacing}
              pileDia={inp.pileDia}
              capSizeX={res?.capSizeX ?? (inp.pileSpacing + 2 * inp.capProjection)}
              capSizeY={res?.capSizeY ?? (inp.pileSpacing + 2 * inp.capProjection)}
              colB={inp.colB}
              colH={inp.colH}
            />
          )}
          {activeTab === 'utilisation' && (
            res ? (
              <>
                <UtilisationBars checks={checks} title="Capacity checks" />
                {!suggestion && (
                  <Button onClick={optimise} variant="secondary" size="sm" fullWidth
                    className="mt-3 !bg-blue-50 !border-blue-200 !text-blue-600 hover:!bg-blue-100 rounded-xl">
                    Suggest optimal parameters
                  </Button>
                )}
                {suggestion && (
                  <OptimiseSuggestion
                    rows={[
                      { label: 'Cap thickness', current: inp.capThickness, suggested: suggestion.capThickness, unit: 'mm' },
                    ]}
                    note="Minimum depth to satisfy punching shear and flexure. Consider construction tolerance when setting formwork."
                    onApply={() => { runWith(suggestion); setSuggestion(null); }}
                    onDismiss={() => setSuggestion(null)}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
            )
          )}
          {/* Notes */}
          <div className="mt-3 space-y-1 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-600" /><span className="text-slate-500">Pile (dark grey)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500" /><span className="text-slate-500">Column (blue)</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
