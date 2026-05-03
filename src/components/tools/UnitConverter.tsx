import { useState } from 'react';
import Card from '../ui/Card';
import { convert, getUnits, BAR_DIAMETERS, SINGLE_BAR_AREA, rectangleProps, circleProps } from '../../utils/unitConverter';

type Cat = 'force' | 'pressure' | 'length' | 'mass';
const CATEGORIES: { id: Cat; label: string }[] = [
  { id: 'force', label: 'Force' }, { id: 'pressure', label: 'Stress / Pressure' },
  { id: 'length', label: 'Length' }, { id: 'mass', label: 'Mass' },
];

export default function UnitConverter() {
  const [tab, setTab] = useState<'convert' | 'bars' | 'section'>('convert');
  const [cat, setCat] = useState<Cat>('force');
  const [fromUnit, setFromUnit] = useState('kN');
  const [toUnit, setToUnit] = useState('kgf');
  const [val, setVal] = useState(1);

  // Section props tab
  const [secShape, setSecShape] = useState<'rect' | 'circle'>('rect');
  const [secB, setSecB] = useState(300);
  const [secH, setSecH] = useState(500);
  const [secD, setSecD] = useState(400);

  const units = getUnits(cat);
  const result = convert(val, fromUnit, toUnit, cat);
  const secProps = secShape === 'rect' ? rectangleProps(secB, secH) : circleProps(secD);

  const tabBtn = (id: typeof tab, label: string) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${tab === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabBtn('convert', 'Unit Converter')}
        {tabBtn('bars', 'Bar Area Table')}
        {tabBtn('section', 'Section Properties')}
      </div>

      {tab === 'convert' && (
        <Card title="Unit Converter">
          <div className="space-y-4 max-w-md">
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => { setCat(c.id); setFromUnit(getUnits(c.id)[0]); setToUnit(getUnits(c.id)[1]); }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors
                    ${cat === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Value</label>
                <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={val} onChange={e => setVal(+e.target.value)} />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-slate-500">From</label>
                <select className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-blue-400"
                  value={fromUnit} onChange={e => setFromUnit(e.target.value)}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs text-slate-500">To</label>
                <select className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-blue-400"
                  value={toUnit} onChange={e => setToUnit(e.target.value)}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs text-slate-500">Result</label>
                <div className="mt-1 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 text-right">
                  {isNaN(result) ? '—' : result.toPrecision(6)}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">
              {val} {fromUnit} = <span className="text-blue-600">{result.toPrecision(6)}</span> {toUnit}
            </p>
          </div>
        </Card>
      )}

      {tab === 'bars' && (
        <Card title="Reinforcing Bar Area Table">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-3 py-2 text-left font-semibold border border-slate-200">Dia (mm)</th>
                  <th className="px-3 py-2 text-right font-semibold border border-slate-200">Single bar (mm²)</th>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <th key={n} className="px-3 py-2 text-right font-semibold border border-slate-200">{n} bar{n > 1 ? 's' : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BAR_DIAMETERS.map(d => (
                  <tr key={d} className="hover:bg-blue-50">
                    <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-200">T{d}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600 border border-slate-200">{SINGLE_BAR_AREA[d]}</td>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <td key={n} className="px-3 py-1.5 text-right border border-slate-200">
                        {(SINGLE_BAR_AREA[d] * n).toFixed(0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Areas in mm². Calculated as π/4 × d².</p>
        </Card>
      )}

      {tab === 'section' && (
        <Card title="Section Properties Calculator">
          <div className="max-w-md space-y-4">
            <div className="flex gap-2">
              {(['rect', 'circle'] as const).map(s => (
                <button key={s} onClick={() => setSecShape(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                    ${secShape === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'rect' ? 'Rectangle' : 'Circle'}
                </button>
              ))}
            </div>

            {secShape === 'rect' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Width b (mm)</label>
                  <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={secB} onChange={e => setSecB(+e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Height h (mm)</label>
                  <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={secH} onChange={e => setSecH(+e.target.value)} />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-500">Diameter d (mm)</label>
                <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={secD} onChange={e => setSecD(+e.target.value)} />
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              {([
                ['Area A', secProps.A.toFixed(0), 'mm²'],
                ['Second moment Ix', (secProps.Ix / 1e6).toFixed(2), '×10⁶ mm⁴'],
                ['Second moment Iy', (secProps.Iy / 1e6).toFixed(2), '×10⁶ mm⁴'],
                ['Elastic modulus Zx', (secProps.Zx / 1e3).toFixed(2), '×10³ mm³'],
                ['Elastic modulus Zy', (secProps.Zy / 1e3).toFixed(2), '×10³ mm³'],
                ['Radius of gyration rx', secProps.rx.toFixed(1), 'mm'],
                ['Radius of gyration ry', secProps.ry.toFixed(1), 'mm'],
              ] as [string, string, string][]).map(([k, v, u]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono font-medium text-slate-700">{v} <span className="text-slate-400">{u}</span></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
