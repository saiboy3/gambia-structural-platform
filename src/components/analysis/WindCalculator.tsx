import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import ResultRow from '../ui/ResultRow';
import { calcWind, GAMBIA_WIND, TERRAIN } from '../../utils/windCalculations';
import type { WindInputs, WindResults, TerrainCategory, WindZone } from '../../utils/windCalculations';
import { Wind } from 'lucide-react';
import CalcSheet from '../ui/CalcSheet';
import { windCalcNotes } from '../../utils/calcNotesLoads';

const defaultInputs: WindInputs = {
  vb0: 37, zone: 'Coastal', terrain: 'II',
  height: 9, breadth: 10, depth: 12,
  cdir: 1.0, cseason: 1.0, csCd: 1.0,
  internalPressure: 'closed',
  rho: 1.25,
};

export default function WindCalculator() {
  const [inp, setInp] = useState<WindInputs>(defaultInputs);
  const [res, setRes] = useState<WindResults | null>(null);

  const set = <K extends keyof WindInputs>(k: K, v: WindInputs[K]) =>
    setInp(p => ({ ...p, [k]: v }));

  const setZone = (z: WindZone) => {
    setInp(p => ({ ...p, zone: z, vb0: GAMBIA_WIND[z].vb0 }));
  };

  return (
    <div className="space-y-4">
      {/* Gambia wind map */}
      <Card title="Gambia Wind Speed Reference">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(GAMBIA_WIND) as [WindZone, typeof GAMBIA_WIND[WindZone]][]).map(([zone, data]) => (
            <button key={zone} onClick={() => setZone(zone)}
              className={`text-left p-3 rounded-lg border-2 transition-colors
                ${inp.zone === zone ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Wind size={14} className={inp.zone === zone ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-sm font-semibold text-slate-800">{zone}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{data.vb0} <span className="text-sm font-normal text-slate-500">m/s</span></p>
              <p className="text-xs text-slate-500 mt-1">{data.note}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Basic wind speed vb,0 — 10-min mean, 50-year return period (EN 1991-1-4). Verify with local meteorological data.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <Card title="Wind Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Basic wind speed (vb,0)" unit="m/s" value={inp.vb0}
              onChange={v => set('vb0', +v)} min={10} max={60} />
            <SelectField label="Terrain Category" value={inp.terrain}
              onChange={v => set('terrain', v as TerrainCategory)}
              options={Object.entries(TERRAIN).map(([k, t]) => ({ value: k, label: `Cat ${k} — ${t.label}` }))} />
            <InputField label="Building height (z)" unit="m" value={inp.height}
              onChange={v => set('height', +v)} min={2} />
            <InputField label="Breadth (crosswind b)" unit="m" value={inp.breadth}
              onChange={v => set('breadth', +v)} min={1} />
            <InputField label="Depth (along-wind d)" unit="m" value={inp.depth}
              onChange={v => set('depth', +v)} min={1} />
            <SelectField label="Internal pressure" value={inp.internalPressure}
              onChange={v => set('internalPressure', v as WindInputs['internalPressure'])}
              options={[
                { value: 'closed', label: 'Closed building' },
                { value: 'open',   label: 'Open/dominant opening' },
                { value: 'dominant', label: 'Dominant face open' },
              ]} />
            <InputField label="Directional factor (cdir)" unit="" value={inp.cdir}
              onChange={v => set('cdir', +v)} min={0.7} max={1.0} step={0.05} />
            <InputField label="Struct. factor (csCd)" unit="" value={inp.csCd}
              onChange={v => set('csCd', +v)} min={0.8} max={1.1} step={0.05} />
          </div>
          <Button onClick={() => setRes(calcWind(inp))} fullWidth className="mt-4">
            Calculate Wind Load
          </Button>
        </Card>

        {/* Results */}
        <Card title="Wind Calculation Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 mb-1">Velocities</p>
              <ResultRow label="Basic wind velocity (vb)"     value={res.vb.toFixed(1)}   unit="m/s" />
              <ResultRow label="Mean wind velocity (vm)"      value={res.vm.toFixed(1)}   unit="m/s" />
              <ResultRow label="Peak gust velocity (vp)"      value={res.vp.toFixed(1)}   unit="m/s" />
              <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Pressures</p>
              <ResultRow label="Basic velocity pressure (qb)" value={res.qb.toFixed(3)}   unit="kN/m²" />
              <ResultRow label="Roughness factor (cr)"        value={res.cr.toFixed(3)}   unit="" />
              <ResultRow label="Exposure factor (ce)"         value={res.ce.toFixed(3)}   unit="" />
              <ResultRow label="Peak velocity pressure (qp)"  value={res.qp.toFixed(3)}   unit="kN/m²" highlight />
              <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Pressure Coefficients</p>
              <ResultRow label="cpe — windward wall"          value={res.cpe_wall.toFixed(2)} />
              <ResultRow label="cpe — leeward wall"           value={res.cpe_lee.toFixed(2)} />
              <ResultRow label="cpe — roof (suction)"         value={res.cpe_roof.toFixed(2)} />
              <ResultRow label="cpi — internal"               value={res.cpi.toFixed(2)} />
              <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Net Design Pressures</p>
              <ResultRow label="Windward wall (we)"           value={res.we_wind.toFixed(3)} unit="kN/m²" highlight />
              <ResultRow label="Leeward wall (we)"            value={res.we_lee.toFixed(3)}  unit="kN/m²" />
              <ResultRow label="Roof (we)"                    value={res.we_roof.toFixed(3)} unit="kN/m²" />
              <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">Total Force</p>
              <ResultRow label="Total wind force (Fw)"        value={res.Fw_total.toFixed(1)} unit="kN" highlight />
              <ResultRow label="Wind force per m height"      value={res.Fw_perM.toFixed(2)}  unit="kN/m" />
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Set parameters and click Calculate</p>
          )}
        </Card>

        {/* Diagram */}
        <Card title="Pressure Diagram" className="lg:col-span-1">
          {res ? (
            <div className="flex flex-col items-center gap-3">
              <svg width={260} height={300} className="border border-slate-200 rounded-lg bg-slate-50">
                {/* Building outline */}
                <rect x={70} y={50} width={120} height={160} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
                {/* Roof */}
                <polygon points="70,50 130,20 190,50" fill="#cbd5e1" stroke="#475569" strokeWidth={2} />

                {/* Wind direction arrow */}
                <defs>
                  <marker id="warr" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
                  </marker>
                </defs>
                <line x1={10} y1={130} x2={65} y2={130} stroke="#3b82f6" strokeWidth={2} markerEnd="url(#warr)" />
                <text x={12} y={120} fontSize={9} fill="#3b82f6" fontWeight="bold">WIND</text>
                <text x={12} y={143} fontSize={8} fill="#3b82f6">{res.vb.toFixed(0)} m/s</text>

                {/* Windward pressure arrows (→) */}
                {[70, 95, 120, 145, 170, 195].map((y, i) => (
                  <line key={`wp${i}`} x1={35} y1={y} x2={68} y2={y} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#garr)" />
                ))}
                <defs>
                  <marker id="garr" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto">
                    <path d="M0,0 L5,2.5 L0,5 Z" fill="#22c55e" />
                  </marker>
                </defs>
                <text x={15} y={65} fontSize={8} fill="#22c55e" fontWeight="bold">+{res.we_wind.toFixed(2)}</text>
                <text x={15} y={75} fontSize={7} fill="#22c55e">kN/m²</text>

                {/* Leeward suction arrows (←) */}
                {[70, 95, 120, 145, 170, 195].map((y, i) => (
                  <line key={`lp${i}`} x1={225} y1={y} x2={192} y2={y} stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#rarr)" />
                ))}
                <defs>
                  <marker id="rarr" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto-start-reverse">
                    <path d="M5,0 L0,2.5 L5,5 Z" fill="#ef4444" />
                  </marker>
                </defs>
                <text x={198} y={65} fontSize={8} fill="#ef4444" fontWeight="bold">{res.we_lee.toFixed(2)}</text>
                <text x={198} y={75} fontSize={7} fill="#ef4444">kN/m²</text>

                {/* Roof suction (↑) */}
                {[90, 115, 140, 160].map((x, i) => (
                  <line key={`rp${i}`} x1={x} y1={15} x2={x} y2={48} stroke="#f97316" strokeWidth={1.5} markerEnd="url(#oarr)" />
                ))}
                <defs>
                  <marker id="oarr" markerWidth={5} markerHeight={5} refX={2.5} refY={0} orient="auto-start-reverse">
                    <path d="M0,5 L2.5,0 L5,5 Z" fill="#f97316" />
                  </marker>
                </defs>
                <text x={95} y={12} fontSize={8} fill="#f97316">↑ {Math.abs(res.we_roof).toFixed(2)} kN/m²</text>

                {/* Ground line */}
                <line x1={50} y1={210} x2={220} y2={210} stroke="#92400e" strokeWidth={2} />
                {[60, 80, 100, 120, 140, 160, 180, 200].map((x, i) => (
                  <line key={`g${i}`} x1={x} y1={210} x2={x - 8} y2={222} stroke="#92400e" strokeWidth={1} opacity={0.6} />
                ))}

                {/* Height dimension */}
                <line x1={200} y1={50} x2={200} y2={210} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,2" />
                <text x={205} y={135} fontSize={8} fill="#64748b">{inp.height}m</text>

                {/* qp label */}
                <text x={70} y={240} fontSize={8} fill="#475569">qp = {res.qp.toFixed(3)} kN/m²</text>
                <text x={70} y={252} fontSize={8} fill="#475569">Fw = {res.Fw_total.toFixed(1)} kN total</text>
              </svg>
              <p className="text-xs text-slate-400 text-center">EN 1991-1-4 simplified pressure diagram</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Run calculation to see diagram</p>
          )}
        </Card>
      </div>

      {res && (
        <CalcSheet
          title="Wind Load Calculation Sheet"
          codeLabel="EC1-1-4"
          steps={windCalcNotes(inp, res)}
        />
      )}
    </div>
  );
}
