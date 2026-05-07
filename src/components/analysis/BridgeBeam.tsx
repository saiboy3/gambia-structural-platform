import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import HelpTooltip from '../ui/HelpTooltip';
import Badge from '../ui/Badge';
import ResultRow from '../ui/ResultRow';
import UtilisationBars from '../visuals/UtilisationBars';
import type { UtilCheck } from '../visuals/UtilisationBars';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { designBridgeBeam } from '../../utils/bridgeBeamCalculations';
import { useBuildingCode } from '../../context/BuildingCodeContext';
import type { BridgeBeamInputs } from '../../utils/bridgeBeamCalculations';

const defaultInp: BridgeBeamInputs = {
  beamType: 'T-beam',
  span: 12,
  beamSpacing: 1.8,
  bw: 400,
  h: 900,
  bf: 1500,
  hf: 200,
  cover: 50,
  fck: 30,
  fyk: 500,
  deckDead: 4.5,
  bridgeCode: 'BS5400',
  noLanes: 2,
  laneWidth: 3.65,
};

function BeamCrossSectionSVG({ beamType, bw, h, bf, hf, cover, d }:
  { beamType: string; bw: number; h: number; bf: number; hf: number; cover: number; d: number }) {
  const W = 260, H = 180;
  const scale = Math.min((W * 0.8) / bf, (H * 0.8) / h);
  const cx = W / 2, topY = H * 0.1;
  const bwS = bw * scale, hS = h * scale, bfS = bf * scale, hfS = hf * scale;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Flange (T-beam) */}
      {beamType === 'T-beam' && (
        <rect x={cx - bfS / 2} y={topY} width={bfS} height={hfS} fill="#94a3b8" stroke="#475569" strokeWidth={0.5} />
      )}
      {/* Web */}
      <rect x={cx - bwS / 2} y={topY + (beamType === 'T-beam' ? hfS : 0)} width={bwS}
        height={beamType === 'T-beam' ? hS - hfS : hS} fill="#64748b" stroke="#475569" strokeWidth={0.5} />
      {/* Rebar dots at bottom */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i}
          cx={cx - bwS / 2 + cover * scale + i * (bwS - 2 * cover * scale) / 3}
          cy={topY + hS - cover * scale}
          r={Math.max(3, 16 * scale)}
          fill="#f59e0b" />
      ))}
      {/* Effective depth line */}
      <line x1={cx - bwS / 2 - 10} y1={topY + (h - d) * scale}
        x2={cx + bwS / 2 + 10} y2={topY + (h - d) * scale}
        stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3,2" />
      <text x={cx + bwS / 2 + 14} y={topY + (h - d) * scale + 3} fontSize={6} fill="#3b82f6">d={d}mm</text>
      {/* Labels */}
      {beamType === 'T-beam' && (
        <text x={cx} y={topY - 4} textAnchor="middle" fontSize={7} fill="#64748b">beff ~ {bf}mm</text>
      )}
      <text x={cx} y={topY + hS + 12} textAnchor="middle" fontSize={7} fill="#64748b">
        {beamType === 'T-beam' ? `T-beam: bw=${bw}, h=${h}` : `Rect: ${bw}×${h}mm`}
      </text>
    </svg>
  );
}

export default function BridgeBeam() {
  const [inp, setInp] = useState<BridgeBeamInputs>(defaultInp);
  const [res, setRes] = useState<ReturnType<typeof designBridgeBeam> | null>(null);
  const [activeTab, setActiveTab] = useState<'section' | 'utilisation'>('section');
  const { factors } = useBuildingCode();

  const set = (k: keyof BridgeBeamInputs, v: unknown) => setInp(p => ({ ...p, [k]: v }));

  const checks: UtilCheck[] = res ? [
    { label: 'Bending', demand: res.Med, capacity: res.MRd, unit: 'kNm', note: 'MEd / MRd',
      hint: 'Increase beam depth or add main tension bars. For T-beams, check that the flange is in compression.' },
    { label: 'Shear', demand: res.Ved, capacity: res.VRdc, unit: 'kN', note: 'VEd / VRd,c',
      hint: 'Concrete shear capacity is low — add shear links (stirrups) or increase web width.' },
    { label: 'Deflection (L/400)', demand: res.delta, capacity: res.deltaLimit, unit: 'mm', note: 'δ / (L/400)',
      hint: 'Bridge beams are stiff by deflection. Increase effective depth or reduce beam spacing.' },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card title="Bridge Beam Parameters" className="lg:col-span-1">
          {/* Beam type picker */}
          <p className="text-xs font-medium text-slate-600 mb-1.5">Beam cross-section</p>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {([
              ['rectangular', '▬ Rect.', 'Simple solid beam'],
              ['T-beam', '⊥ T-Beam', 'With deck flange'],
              ['inverted-T', '⊤ Inv-T', 'Precast + in-situ'],
            ] as const).map(([v, l, n]) => (
              <button key={v} onClick={() => set('beamType', v)}
                className={`py-1.5 rounded-lg border text-xs font-semibold transition-all
                  ${inp.beamType === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                <div>{l}</div>
                <div className={`text-[10px] font-normal ${inp.beamType === v ? 'text-blue-100' : 'text-slate-400'}`}>{n}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Span</label>
                <HelpTooltip title="Effective span" text="Simply-supported effective span (CL of bearing to CL of bearing)." typical="8–25 m for RC bridge beams" />
              </div>
              <InputField label="" unit="m" value={inp.span} onChange={v => set('span', +v)} min={4} />
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Beam spacing</label>
                <HelpTooltip title="Girder spacing" text="CL to CL of adjacent beams. Governs tributary load and effective flange width." typical="1.5–2.5 m" />
              </div>
              <InputField label="" unit="m" value={inp.beamSpacing} onChange={v => set('beamSpacing', +v)} min={0.5} step={0.25} />
            </div>
            <InputField label="Web width (bw)" unit="mm" value={inp.bw} onChange={v => set('bw', +v)} min={200} />
            <InputField label="Total depth (h)" unit="mm" value={inp.h} onChange={v => set('h', +v)} min={300} />
            {inp.beamType !== 'rectangular' && (
              <>
                <InputField label="Flange width (bf)" unit="mm" value={inp.bf} onChange={v => set('bf', +v)} min={inp.bw} />
                <InputField label="Flange depth (hf)" unit="mm" value={inp.hf} onChange={v => set('hf', +v)} min={100} />
              </>
            )}
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Cover</label>
                <HelpTooltip title="Nominal cover" text="Bridges require higher cover for durability. Min 40mm for XD2 (marine influence in Gambia)." typical="50–60 mm for bridges" />
              </div>
              <InputField label="" unit="mm" value={inp.cover} onChange={v => set('cover', +v)} min={40} />
            </div>
            <SelectField label="Concrete fck" value={String(inp.fck)}
              onChange={v => set('fck', +v)}
              options={[25, 30, 35, 40].map(f => ({ value: String(f), label: `C${f}/${f + 5}` }))} />
            <div>
              <div className="flex items-center gap-0.5">
                <label className="text-xs font-medium text-slate-600">Deck dead load</label>
                <HelpTooltip title="Superimposed dead" text="Deck slab + surfacing + kerbs + parapets. Per unit plan area." typical="4–7 kN/m² (deck + surfacing)" />
              </div>
              <InputField label="" unit="kN/m²" value={inp.deckDead} onChange={v => set('deckDead', +v)} min={0} step={0.5} />
            </div>
            <SelectField label="Traffic loading code" value={inp.bridgeCode}
              onChange={v => set('bridgeCode', v)}
              options={[
                { value: 'BS5400', label: 'BS5400 HA' },
                { value: 'EC1-LM1', label: 'EC1 LM1' },
              ]} />
            <InputField label="No. of lanes" value={inp.noLanes} onChange={v => set('noLanes', +v)} min={1} max={4} />
          </div>
          <button onClick={() => setRes(designBridgeBeam(inp, factors))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Bridge Beam
          </button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3"><Badge status={res.status} /></div>
              <ResultRow label="Effective flange (beff)" value={res.beff.toFixed(0)} unit="mm" />
              <ResultRow label="Effective depth (d)" value={res.d.toFixed(0)} unit="mm" highlight />
              <ResultRow label="Permanent load (gk)" value={res.gk.toFixed(2)} unit="kN/m" />
              <ResultRow label="Traffic load (qk)" value={res.qk.toFixed(2)} unit="kN/m" />
              <ResultRow label="Design UDL (wEd)" value={res.wEd.toFixed(2)} unit="kN/m" highlight />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Bending (ULS)</p>
              <ResultRow label="MEd" value={res.Med.toFixed(1)} unit="kNm" highlight />
              <ResultRow label="MRd" value={res.MRd.toFixed(1)} unit="kNm" />
              <ResultRow label="As,req" value={res.As_req.toFixed(0)} unit="mm²" />
              <ResultRow label="Main bars" value={`${res.mainBars.count}T${res.mainBars.dia}`} highlight />
              <ResultRow label="As,prov" value={res.As_prov.toFixed(0)} unit="mm²" />
              <ResultRow label="Utilisation" value={`${(res.util_bending * 100).toFixed(0)}%`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Shear (ULS)</p>
              <ResultRow label="VEd" value={res.Ved.toFixed(1)} unit="kN" />
              <ResultRow label="VRd,c" value={res.VRdc.toFixed(1)} unit="kN" />
              <ResultRow label="Shear links" value={`T${res.linkDia}@${res.linkSpacing}mm`} />

              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Deflection (SLS)</p>
              <ResultRow label="Deflection" value={`${res.delta.toFixed(1)}`} unit="mm" />
              <ResultRow label="Limit (L/400)" value={`${res.deltaLimit.toFixed(1)}`} unit="mm" />

              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <SaveDesignPanel memberType="beam"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">🌉</p>
              <p className="text-sm font-semibold text-slate-600">Bridge beam design</p>
              <p className="text-xs text-slate-400 max-w-48 mx-auto">EC2 / BS5400 simply-supported beam. HA/EC1 traffic loading. Checks bending, shear and L/400 deflection.</p>
            </div>
          )}
        </Card>

        <Card title="Section & Checks" className="lg:col-span-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            {(['section', 'utilisation'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {t === 'section' ? 'Cross-Section' : 'Utilisation'}
              </button>
            ))}
          </div>
          {activeTab === 'section' && (
            <>
              <BeamCrossSectionSVG
                beamType={inp.beamType} bw={inp.bw} h={inp.h}
                bf={inp.bf} hf={inp.hf} cover={inp.cover}
                d={res?.d ?? (inp.h - inp.cover - 50)}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-slate-400" /><span className="text-slate-500">Compression flange</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-slate-600" /><span className="text-slate-500">Web</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-slate-500">Main tension bars (T{res?.mainBars.dia ?? 32})</span></div>
                <div className="flex items-center gap-1"><div className="w-4 border-t-2 border-blue-400 border-dashed" /><span className="text-slate-500">Effective depth (d)</span></div>
              </div>
            </>
          )}
          {activeTab === 'utilisation' && (
            res
              ? <UtilisationBars checks={checks} title="Capacity checks" />
              : <p className="text-sm text-slate-400 text-center py-8">Run design first</p>
          )}
        </Card>
      </div>
    </div>
  );
}
