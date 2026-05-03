import { useState } from 'react';
import Card from '../ui/Card';
import InputField, { SelectField } from '../ui/InputField';
import ResultRow from '../ui/ResultRow';
import Badge from '../ui/Badge';
import SaveDesignPanel from '../ui/SaveDesignPanel';
import ProjectSelector from '../projects/ProjectSelector';
import { designSteelMember, STEEL_SECTIONS } from '../../utils/steelCalculations';
import type { SteelMemberInputs } from '../../utils/steelCalculations';

const defaultInputs: SteelMemberInputs = {
  sectionName: 'UB 305×165×40',
  span: 6,
  supportType: 'simply-supported',
  lateralRestraint: 'full',
  udl: 20,
  pointLoad: 0,
  fyk: 275,
  gammaM0: 1.0,
  gammaM1: 1.0,
};

function UtilBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(value * 100, 110);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${color}`}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${value > 1 ? 'bg-red-500' : value > 0.85 ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SteelDesign() {
  const [inp, setInp] = useState<SteelMemberInputs>(defaultInputs);
  const [res, setRes] = useState<ReturnType<typeof designSteelMember> | null>(null);

  const set = (k: keyof SteelMemberInputs, v: string | number) => setInp(p => ({ ...p, [k]: v }));
  const selectedSec = STEEL_SECTIONS.find(s => s.name === inp.sectionName);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Project:</span>
        <ProjectSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Steel Member Parameters" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Section</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-blue-400"
                value={inp.sectionName} onChange={e => set('sectionName', e.target.value)}>
                {STEEL_SECTIONS.map(s => <option key={s.name} value={s.name}>{s.name} ({s.mass} kg/m)</option>)}
              </select>
            </div>
            <InputField label="Span" unit="m" value={inp.span} onChange={v => set('span', +v)} min={1} />
            <SelectField label="Support" value={inp.supportType} onChange={v => set('supportType', v)}
              options={[{ value: 'simply-supported', label: 'Simply Supported' }, { value: 'cantilever', label: 'Cantilever' }, { value: 'continuous', label: 'Continuous' }]} />
            <InputField label="Total UDL" unit="kN/m" value={inp.udl} onChange={v => set('udl', +v)} min={0} />
            <InputField label="Point load (midspan)" unit="kN" value={inp.pointLoad} onChange={v => set('pointLoad', +v)} min={0} />
            <SelectField label="Lateral restraint" value={inp.lateralRestraint} onChange={v => set('lateralRestraint', v)}
              options={[{ value: 'full', label: 'Full (flange restrained)' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'none', label: 'None' }]} />
            <SelectField label="Steel grade" value={String(inp.fyk)} onChange={v => set('fyk', +v)}
              options={[{ value: '275', label: 'S275 (fyk=275 MPa)' }, { value: '355', label: 'S355 (fyk=355 MPa)' }]} />
          </div>
          <button onClick={() => setRes(designSteelMember(inp))}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg">
            Design Member
          </button>
        </Card>

        <Card title="Design Results" className="lg:col-span-1">
          {res ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2"><Badge status={res.status} /></div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Actions</p>
              <ResultRow label="MEd" value={res.Med.toFixed(1)} unit="kNm" highlight />
              <ResultRow label="VEd" value={res.Ved.toFixed(1)} unit="kN" highlight />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Capacity & Utilisation</p>
              <UtilBar label={`Bending Mc,Rd = ${res.McRd.toFixed(1)} kNm`} value={res.bendingUtil}
                color={res.bendingUtil > 1 ? 'text-red-600' : res.bendingUtil > 0.85 ? 'text-amber-600' : 'text-emerald-600'} />
              <UtilBar label={`Shear Vc,Rd = ${res.VcRd.toFixed(1)} kN`} value={res.shearUtil}
                color={res.shearUtil > 1 ? 'text-red-600' : 'text-emerald-600'} />
              <UtilBar label={`LTB Mb,Rd = ${res.MbRd.toFixed(1)} kNm`} value={res.ltbUtil}
                color={res.ltbUtil > 1 ? 'text-red-600' : res.ltbUtil > 0.85 ? 'text-amber-600' : 'text-emerald-600'} />
              <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Deflection</p>
              <ResultRow label="Deflection" value={res.deflection.toFixed(1)} unit="mm" />
              <ResultRow label="Limit (L/250)" value={res.deflLimit.toFixed(1)} unit="mm" />
              <ResultRow label="Check" value={res.deflOK ? '✓ Pass' : '✗ Fail'} />
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                {res.messages.map((m, i) => (
                  <p key={i} className={`text-xs ${m.startsWith('FAIL') ? 'text-red-600' : m.startsWith('WARN') ? 'text-amber-600' : 'text-emerald-600'}`}>{m}</p>
                ))}
              </div>
              <SaveDesignPanel memberType="steel"
                inputs={inp as unknown as Record<string, unknown>}
                results={res as unknown as Record<string, unknown>} />
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Select section and click Design Member</p>
          )}
        </Card>

        <Card title="Section Properties" className="lg:col-span-1">
          {selectedSec ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 mb-3">{selectedSec.name}</p>
              {[
                ['A', `${selectedSec.A.toLocaleString()} mm²`],
                ['h (depth)', `${selectedSec.h} mm`],
                ['b (width)', `${selectedSec.b} mm`],
                ['tf (flange)', `${selectedSec.tf} mm`],
                ['tw (web)', `${selectedSec.tw} mm`],
                ['Iy', `${selectedSec.Iy} ×10⁴ mm⁴`],
                ['Wpl,y', `${selectedSec.Wpl_y} ×10³ mm³`],
                ['Wel,y', `${selectedSec.Wel_y} ×10³ mm³`],
                ['iy', `${selectedSec.iy} mm`],
                ['iz', `${selectedSec.iz} mm`],
                ['Mass', `${selectedSec.mass} kg/m`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono font-medium text-slate-700">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Select a section above</p>
          )}
        </Card>
      </div>
    </div>
  );
}
