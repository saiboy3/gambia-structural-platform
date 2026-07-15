import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import {
  runQuickDesign,
  OCCUPANCY_TYPES,
  LOCATIONS,
  type QuickDesignInputs,
  type QuickDesignResults,
  type ColumnPosition,
} from '../../utils/quickDesign';
import type { ConcreteGrade, RebarGrade } from '../../types/structural';
import { ChevronRight, ChevronLeft, Zap, Building2, MapPin, FlaskConical, SlidersHorizontal, RotateCcw, Wind } from 'lucide-react';

const defaultInputs: QuickDesignInputs = {
  occupancy:   'residential',
  storeys:     4,
  bayX:        5,
  bayY:        6,
  storyHeight: 3,
  location:    'coastal',
  concrete:    'C25/30',
  rebar:       'B500B',
  soilBearing: 100,
  colWidth:    300,
};

const COL_LABELS: Record<ColumnPosition, string> = {
  interior: 'Interior Column',
  edge:     'Edge Column',
  corner:   'Corner Column',
};

const STATUS_COLOR = {
  OK:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  WARN: 'bg-amber-50 border-amber-200 text-amber-700',
  FAIL: 'bg-red-50 border-red-200 text-red-700',
};

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const steps = [
    { label: 'Building', icon: Building2 },
    { label: 'Location & Materials', icon: MapPin },
    { label: 'Results', icon: FlaskConical },
  ];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
              ${active ? 'bg-blue-600 text-white' : done ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-blue-300' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Loads summary panel ───────────────────────────────────────────────────────
function LoadsSummary({ res }: { res: QuickDesignResults }) {
  const L = res.loads;
  return (
    <Card title="Loads Summary">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Live load',  value: L.liveLoad.toFixed(1),   unit: 'kN/m²', color: 'text-blue-600' },
          { label: 'Slab SW',    value: L.slabSW.toFixed(2),     unit: 'kN/m²', color: 'text-slate-600' },
          { label: 'Finishes',   value: L.finishes.toFixed(1),   unit: 'kN/m²', color: 'text-slate-600' },
          { label: 'Partitions', value: L.partitions.toFixed(1), unit: 'kN/m²', color: 'text-slate-600' },
        ].map(it => (
          <div key={it.label} className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">{it.label}</p>
            <p className={`text-xl font-bold ${it.color}`}>
              {it.value}<span className="text-xs font-normal ml-1">{it.unit}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span>Total dead: <strong>{L.deadLoad.toFixed(2)} kN/m²</strong></span>
        <span>Slab: <strong>{L.slabThk} mm</strong></span>
        <span>Beam: <strong>{L.beamWidth}×{L.beamDepth} mm</strong></span>
      </div>
    </Card>
  );
}

// ── Wind summary panel ────────────────────────────────────────────────────────
function WindSummary({ res }: { res: QuickDesignResults }) {
  const w = res.wind;
  return (
    <Card title={
      <span className="flex items-center gap-2">
        <Wind size={14} className="text-slate-500" />
        <span>Wind Load (EN 1991-1-4 estimate)</span>
      </span>
    }>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Peak velocity pressure',   value: w.qp.toFixed(2), unit: 'kN/m²' },
          { label: 'Base shear (this bay)',    value: Math.abs(w.Fw_total).toFixed(0), unit: 'kN' },
          { label: 'Per perimeter column',     value: res.windHedPerCol.toFixed(0), unit: 'kN', color: 'text-blue-600' },
          { label: 'Column/foundation moment', value: res.windMedPerCol.toFixed(1), unit: 'kNm', color: 'text-blue-600' },
        ].map(it => (
          <div key={it.label} className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">{it.label}</p>
            <p className={`text-lg font-bold ${it.color ?? 'text-slate-700'}`}>
              {it.value}<span className="text-xs font-normal ml-1">{it.unit}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Interior columns are treated as wind-sheltered. The estimated base shear is applied to the
        edge and corner columns and their foundations only, using a simplified braced-frame moment
        (H × storey height / 2). For a full lateral analysis use the Portal Frame or Wind Load modules.
      </p>
    </Card>
  );
}

// ── Member result card ────────────────────────────────────────────────────────
function MemberCard({ title, status, messages, children }: {
  title: string; status: 'OK' | 'WARN' | 'FAIL'; messages: string[]; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <Badge status={status} />
      </div>
      <div className="space-y-0.5 text-xs">{children}</div>
      <div className="mt-2 pt-2 border-t border-slate-100">
        {messages.map((m, i) => (
          <p key={i} className={`text-xs ${
            m.startsWith('FAIL') ? 'text-red-600' :
            m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'
          }`}>{m}</p>
        ))}
      </div>
    </div>
  );
}

// ── Section tuner ─────────────────────────────────────────────────────────────
// Inline panel on the Results page that lets the user override section sizes
// and re-run the calculation without going back through the wizard.
function SectionTuner({
  inp, res, onSet, onRun, onReset,
}: {
  inp:    QuickDesignInputs;
  res:    QuickDesignResults;
  onSet:  <K extends keyof QuickDesignInputs>(k: K, v: QuickDesignInputs[K]) => void;
  onRun:  () => void;
  onReset: () => void;
}) {
  const ov = inp.overrides ?? {};
  const L  = res.loads;

  // Derive whether any field is currently overridden
  const slabModified  = ov.slabThk   !== undefined && ov.slabThk   !== L.autoSlabThk;
  const bwModified    = ov.beamWidth  !== undefined && ov.beamWidth  !== L.autoBeamWidth;
  const bdModified    = ov.beamDepth  !== undefined && ov.beamDepth  !== L.autoBeamDepth;
  const anyModified   = slabModified || bwModified || bdModified;

  const setOv = (patch: Partial<NonNullable<QuickDesignInputs['overrides']>>) =>
    onSet('overrides', { ...ov, ...patch });

  return (
    <Card title={
      <span className="flex items-center gap-2">
        <SlidersHorizontal size={14} className="text-slate-500" />
        <span>Adjust Sections &amp; Recalculate</span>
        {anyModified && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-semibold">
            Modified
          </span>
        )}
      </span>
    }>
      <p className="text-xs text-slate-500 mb-3">
        Edit any section parameter below, then click <strong>Recalculate</strong> to update all results instantly.
        Auto values are shown as placeholders.
      </p>

      {/* Section overrides */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <div className="relative">
          <InputField
            label="Slab thickness"
            unit="mm"
            value={ov.slabThk ?? L.slabThk}
            onChange={v => setOv({ slabThk: +v })}
            min={100} max={400} step={5}
            hint={`Auto: ${L.autoSlabThk} mm`}
          />
          {slabModified && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 mt-1 mr-1" />
          )}
        </div>
        <div className="relative">
          <InputField
            label="Beam width"
            unit="mm"
            value={ov.beamWidth ?? L.beamWidth}
            onChange={v => setOv({ beamWidth: +v })}
            min={200} max={600} step={25}
            hint={`Auto: ${L.autoBeamWidth} mm`}
          />
          {bwModified && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 mt-1 mr-1" />
          )}
        </div>
        <div className="relative">
          <InputField
            label="Beam depth"
            unit="mm"
            value={ov.beamDepth ?? L.beamDepth}
            onChange={v => setOv({ beamDepth: +v })}
            min={250} max={1200} step={50}
            hint={`Auto: ${L.autoBeamDepth} mm`}
          />
          {bdModified && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 mt-1 mr-1" />
          )}
        </div>
        <InputField
          label="Column size (square)"
          unit="mm"
          value={inp.colWidth}
          onChange={v => onSet('colWidth', +v)}
          min={200} max={800} step={25}
        />
        <InputField
          label="Soil bearing"
          unit="kN/m²"
          value={inp.soilBearing}
          onChange={v => onSet('soilBearing', +v)}
          min={50} max={500} step={25}
        />
        <div className="grid grid-cols-2 col-span-2 sm:col-span-1 gap-2">
          <SelectField
            label="Concrete"
            value={inp.concrete}
            onChange={v => onSet('concrete', v as ConcreteGrade)}
            options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))}
          />
          <SelectField
            label="Rebar"
            value={inp.rebar}
            onChange={v => onSet('rebar', v as RebarGrade)}
            options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <Button onClick={onReset} variant="ghost" size="sm" icon={<RotateCcw size={12} />}>
          Reset to auto
        </Button>
        <Button onClick={onRun} icon={<Zap size={14} />}>
          Recalculate
        </Button>
      </div>
    </Card>
  );
}

// ── Results page ──────────────────────────────────────────────────────────────
function ResultsPage({
  res, inp, onSet, onRun, onReset,
}: {
  res:     QuickDesignResults;
  inp:     QuickDesignInputs;
  onSet:   <K extends keyof QuickDesignInputs>(k: K, v: QuickDesignInputs[K]) => void;
  onRun:   () => void;
  onReset: () => void;
}) {
  const [colPos, setColPos] = useState<ColumnPosition>('interior');
  const col = res.columns[colPos];
  const fnd = res.foundation[colPos];

  const overallStatus = (['slab', 'beam'] as const).reduce<'OK' | 'WARN' | 'FAIL'>((acc, k) => {
    const s = k === 'slab' ? res.slab.status : res.beam.status;
    if (s === 'FAIL') return 'FAIL';
    if (s === 'WARN' && acc !== 'FAIL') return 'WARN';
    return acc;
  }, col.status === 'FAIL' ? 'FAIL' : col.status === 'WARN' ? 'WARN' : fnd.status);

  return (
    <div className="space-y-4">
      {/* Overall banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${STATUS_COLOR[overallStatus]}`}>
        <Zap size={18} />
        <div>
          <p className="text-sm font-bold">
            {overallStatus === 'OK'
              ? 'All members adequate'
              : overallStatus === 'WARN'
              ? 'Design warnings — adjust sections below and recalculate'
              : 'Design failures — increase section sizes below and recalculate'}
          </p>
          <p className="text-xs opacity-75 mt-0.5">
            {OCCUPANCY_TYPES.find(o => o.id === inp.occupancy)?.label} · {inp.storeys} storey(s) · {inp.bayX}×{inp.bayY} m bay
          </p>
        </div>
      </div>

      {/* ── ADJUST SECTIONS PANEL ─────────────────────────────────────────── */}
      <SectionTuner inp={inp} res={res} onSet={onSet} onRun={onRun} onReset={onReset} />

      {/* Loads */}
      <LoadsSummary res={res} />
      <WindSummary res={res} />

      {/* Slab + Beam */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MemberCard title="RC Slab (Two-way continuous)" status={res.slab.status} messages={res.slab.messages}>
          <ResultRow label="Thickness"       value={res.loads.slabThk} unit="mm" />
          <ResultRow label="MEd short"       value={res.slab.Med_x.toFixed(2)} unit="kNm/m" highlight />
          <ResultRow label="MEd long"        value={res.slab.Med_y.toFixed(2)} unit="kNm/m" />
          <ResultRow label="Short span bars" value={`T${res.slab.barsX.dia}@${res.slab.barsX.spacing} (${res.slab.barsX.As.toFixed(0)} mm²/m)`} />
          <ResultRow label="Long span bars"  value={`T${res.slab.barsY.dia}@${res.slab.barsY.spacing} (${res.slab.barsY.As.toFixed(0)} mm²/m)`} />
          <ResultRow label="Deflection"      value={res.slab.deflectionOK ? '✓ Pass' : '✗ Fail'} />
          <ResultRow label="Span/d"          value={res.slab.spanRatio.toFixed(1)} />
        </MemberCard>

        <MemberCard title={`RC Beam (${inp.bayX} m, continuous)`} status={res.beam.status} messages={res.beam.messages}>
          <ResultRow label="Section"     value={`${res.loads.beamWidth}×${res.loads.beamDepth} mm`} />
          <ResultRow label="MEd"         value={res.beam.Med.toFixed(1)} unit="kNm" highlight />
          <ResultRow label="VEd"         value={res.beam.Ved.toFixed(1)} unit="kN" />
          <ResultRow label="Main bars"   value={`${res.beam.mainBars.count}T${res.beam.mainBars.dia}`} />
          <ResultRow label="As provided" value={res.beam.mainBars.As.toFixed(0)} unit="mm²" />
          <ResultRow label="Stirrups"    value={`T${res.beam.stirrups.dia}@${res.beam.stirrups.spacing} (${res.beam.stirrups.legs} legs)`} />
          <ResultRow label="Shear"       value={res.beam.shearOK ? '✓ Pass' : '✗ Fail'} />
          <ResultRow label="Deflection"  value={res.beam.deflectionOK ? '✓ Pass' : '✗ Fail'} />
        </MemberCard>
      </div>

      {/* Column position selector */}
      <Card title="Column & Foundation Design">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
          {(['interior', 'edge', 'corner'] as ColumnPosition[]).map(p => (
            <button key={p} onClick={() => setColPos(p)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors
                ${colPos === p ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {COL_LABELS[p]}{p !== 'interior' && <span className="ml-1 text-blue-500">+wind</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">
                {COL_LABELS[colPos]} ({inp.colWidth}×{inp.colWidth} mm)
              </p>
              <Badge status={col.status} />
            </div>
            <div className="space-y-0.5">
              <ResultRow label="NEd"        value={res.colNed[colPos].toFixed(0)} unit="kN" highlight />
              {colPos !== 'interior' && (
                <ResultRow label="Wind moment (Medx)" value={res.windMedPerCol.toFixed(1)} unit="kNm" />
              )}
              <ResultRow label="Capacity"   value={col.capacity.toFixed(0)} unit="kN" />
              <ResultRow label="As required" value={col.AsReq.toFixed(0)} unit="mm²" />
              <ResultRow label="Main bars"  value={`${col.mainBars.count}T${col.mainBars.dia}`} />
              <ResultRow label="Links"      value={`T${col.links.dia}@${col.links.spacing} mm`} />
              <ResultRow label="Slender?"   value={col.isSlender ? '⚠ Yes' : '✓ No'} />
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              {col.messages.map((m, i) => (
                <p key={i} className={`text-xs ${
                  m.startsWith('FAIL') ? 'text-red-600' :
                  m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'
                }`}>{m}</p>
              ))}
            </div>
          </div>

          {/* Foundation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Pad Foundation</p>
              <Badge status={fnd.status} />
            </div>
            <div className="space-y-0.5">
              <ResultRow label="Size"         value={`${fnd.L.toFixed(2)}×${fnd.B.toFixed(2)} m`} highlight />
              <ResultRow label="Depth"        value={fnd.h} unit="mm" />
              <ResultRow label="Net pressure" value={fnd.qEd.toFixed(1)} unit="kN/m²" />
              <ResultRow label="Bottom bars"  value={`T${fnd.barsBot.dia}@${fnd.barsBot.spacing} mm`} />
              <ResultRow label="Punching"     value={fnd.punchingOK ? '✓ Pass' : '✗ Fail'} />
              <ResultRow label="Bending"      value={fnd.bendingOK  ? '✓ Pass' : '✗ Fail'} />
              {colPos !== 'interior' && (
                <>
                  <ResultRow label="Wind shear (HEd)" value={res.windHedPerCol.toFixed(0)} unit="kN" />
                  <ResultRow label="Sliding FoS"       value={fnd.FoS_sliding.toFixed(2)} />
                </>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              {fnd.messages.map((m, i) => (
                <p key={i} className={`text-xs ${
                  m.startsWith('FAIL') ? 'text-red-600' :
                  m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'
                }`}>{m}</p>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Column load summary table */}
      <Card title="Column Axial Loads Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-3 py-2 font-semibold">Position</th>
                <th className="text-right px-3 py-2 font-semibold">Trib. Area (m²)</th>
                <th className="text-right px-3 py-2 font-semibold">NEd (kN)</th>
                <th className="text-right px-3 py-2 font-semibold">Column</th>
                <th className="text-right px-3 py-2 font-semibold">Capacity (kN)</th>
                <th className="text-center px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(['interior', 'edge', 'corner'] as ColumnPosition[]).map(p => {
                const c = res.columns[p];
                const tribs = {
                  interior: inp.bayX * inp.bayY,
                  edge:     (inp.bayX / 2) * inp.bayY,
                  corner:   (inp.bayX / 2) * (inp.bayY / 2),
                };
                return (
                  <tr key={p} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700">{COL_LABELS[p]}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{tribs[p].toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{res.colNed[p].toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{inp.colWidth}×{inp.colWidth}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{c.capacity.toFixed(0)}</td>
                    <td className="px-3 py-2 text-center"><Badge status={c.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          * NEd includes {inp.storeys} storey(s) cumulative load + 10% self-weight allowance.
          Use individual modules for full second-order analysis.
        </p>
      </Card>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuickDesign() {
  const [step, setStep] = useState(0);
  const [inp, setInp]   = useState<QuickDesignInputs>(defaultInputs);
  const [res, setRes]   = useState<QuickDesignResults | null>(null);
  const { factors }     = useBuildingCode();

  const set = <K extends keyof QuickDesignInputs>(k: K, v: QuickDesignInputs[K]) =>
    setInp(p => ({ ...p, [k]: v }));

  const run = () => {
    // inp is always up to date (including any overrides from SectionTuner)
    setRes(runQuickDesign(inp, factors));
    setStep(2);
  };

  // Clear section overrides and recalculate with auto-sizing
  const resetOverrides = () => {
    const cleaned = { ...inp };
    delete cleaned.overrides;
    setInp(cleaned);
    setRes(runQuickDesign(cleaned, factors));
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white shadow-md">
        <Zap size={22} className="shrink-0" />
        <div>
          <p className="font-bold text-sm">Quick Design Wizard</p>
          <p className="text-xs text-blue-200">
            Enter a few project parameters and instantly get slab, beam, column &amp; foundation sizing
          </p>
        </div>
      </div>

      <Steps current={step} />

      {/* ── Step 0: Building Info ── */}
      {step === 0 && (
        <Card title="Step 1 — Building Information">
          <p className="text-xs font-semibold text-slate-500 mb-2">Occupancy type</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {OCCUPANCY_TYPES.map(o => (
              <button key={o.id} onClick={() => set('occupancy', o.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all
                  ${inp.occupancy === o.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 hover:border-blue-300 text-slate-600 hover:bg-slate-50'}`}>
                <span className="text-2xl">{o.icon}</span>
                <span>{o.label}</span>
                <span className="text-slate-400 font-normal">{o.qk} kN/m²</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InputField label="No. of storeys" value={inp.storeys}
              onChange={v => set('storeys', +v)} min={1} max={20} step={1} unit="floors" />
            <InputField label="Bay span X (short)" value={inp.bayX}
              onChange={v => set('bayX', +v)} min={3} max={12} step={0.5} unit="m" />
            <InputField label="Bay span Y (long)" value={inp.bayY}
              onChange={v => set('bayY', +v)} min={3} max={15} step={0.5} unit="m" />
            <InputField label="Floor-to-floor height" value={inp.storyHeight}
              onChange={v => set('storyHeight', +v)} min={2.5} max={6} step={0.1} unit="m" />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setStep(1)}>
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 1: Location & Materials ── */}
      {step === 1 && (
        <Card title="Step 2 — Location & Materials">
          <p className="text-xs font-semibold text-slate-500 mb-2">Project location</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {LOCATIONS.map(loc => (
              <button key={loc.id} onClick={() => set('location', loc.id)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all
                  ${inp.location === loc.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                <span className="text-xs font-semibold text-slate-800">{loc.label}</span>
                <span className="text-xs text-slate-500">vb = {loc.vb} m/s · Cat {loc.terrainCat}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SelectField label="Concrete grade" value={inp.concrete}
              onChange={v => set('concrete', v as ConcreteGrade)}
              options={['C20/25','C25/30','C30/37','C35/45','C40/50'].map(c => ({ value: c, label: c }))} />
            <SelectField label="Rebar grade" value={inp.rebar}
              onChange={v => set('rebar', v as RebarGrade)}
              options={['B500B','B500C','B250'].map(r => ({ value: r, label: r }))} />
            <InputField label="Column size (square)" value={inp.colWidth}
              onChange={v => set('colWidth', +v)} min={200} max={800} step={25} unit="mm" />
            <InputField label="Soil bearing capacity" value={inp.soilBearing}
              onChange={v => set('soilBearing', +v)} min={50} max={500} step={25} unit="kN/m²" />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4 text-xs text-blue-700">
            <p className="font-semibold mb-1">What will be designed for you:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>Two-way RC slab spanning {inp.bayX}×{inp.bayY} m</li>
              <li>Interior continuous beam ({inp.bayX} m span)</li>
              <li>Interior, edge &amp; corner columns ({inp.storeys} storeys cumulative)</li>
              <li>Pad foundations for each column position</li>
            </ul>
          </div>

          <div className="flex justify-between mt-4">
            <Button onClick={() => setStep(0)} variant="secondary" icon={<ChevronLeft size={16} />}>
              Back
            </Button>
            <Button onClick={run} icon={<Zap size={15} />}>
              Run Quick Design
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Results ── */}
      {step === 2 && res && (
        <>
          <ResultsPage res={res} inp={inp} onSet={set} onRun={run} onReset={resetOverrides} />
          <div className="flex justify-start">
            <Button onClick={() => setStep(0)} variant="secondary" icon={<ChevronLeft size={16} />}>
              Start Over
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
