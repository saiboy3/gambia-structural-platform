import { computePMDiagram } from '../../utils/pmInteraction';
import type { ColumnInputs } from '../../types/structural';
import type { CodeFactors } from '../../context/BuildingCodeContext';

interface Props {
  inputs: ColumnInputs;
  factors: CodeFactors;
}

export default function PMDiagram({ inputs, factors }: Props) {
  const { envelope, designPoint, insideCurve } = computePMDiagram(inputs, factors);

  const SVG_W = 300, SVG_H = 260;
  const PAD = { top: 20, right: 20, bottom: 40, left: 55 };
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top - PAD.bottom;

  const maxP = Math.max(...envelope.map(p => p.P)) * 1.1;
  const maxM = Math.max(...envelope.map(p => p.M)) * 1.2;

  const sx = (m: number) => PAD.left + (m / maxM) * plotW;
  const sy = (p: number) => PAD.top + plotH - (p / maxP) * plotH;

  const polyline = envelope.map(pt => `${sx(pt.M).toFixed(1)},${sy(pt.P).toFixed(1)}`).join(' ');

  const dpX = sx(designPoint.M);
  const dpY = sy(designPoint.P);

  // Axis ticks
  const mTicks = [0, 0.25, 0.5, 0.75, 1.0].map(f => ({ val: f * maxM, x: sx(f * maxM) }));
  const pTicks = [0, 0.25, 0.5, 0.75, 1.0].map(f => ({ val: f * maxP, y: sy(f * maxP) }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-600">P-M Interaction Diagram</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insideCurve ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {insideCurve ? '✓ Inside envelope' : '✗ Outside envelope'}
        </span>
      </div>
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
        {/* Grid */}
        {mTicks.map(t => (
          <line key={t.val} x1={t.x} y1={PAD.top} x2={t.x} y2={PAD.top + plotH} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {pTicks.map(t => (
          <line key={t.val} x1={PAD.left} y1={t.y} x2={PAD.left + plotW} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#94a3b8" strokeWidth={1.5} />

        {/* Axis ticks + labels */}
        {mTicks.filter(t => t.val > 0).map(t => (
          <g key={t.val}>
            <line x1={t.x} y1={PAD.top + plotH} x2={t.x} y2={PAD.top + plotH + 4} stroke="#94a3b8" strokeWidth={1} />
            <text x={t.x} y={PAD.top + plotH + 14} textAnchor="middle" fontSize={8} fill="#64748b">{t.val.toFixed(0)}</text>
          </g>
        ))}
        {pTicks.filter(t => t.val > 0).map(t => (
          <g key={t.val}>
            <line x1={PAD.left - 4} y1={t.y} x2={PAD.left} y2={t.y} stroke="#94a3b8" strokeWidth={1} />
            <text x={PAD.left - 7} y={t.y + 3} textAnchor="end" fontSize={8} fill="#64748b">{t.val.toFixed(0)}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={SVG_H - 4} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="600">M (kNm)</text>
        <text x={10} y={PAD.top + plotH / 2} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="600"
          transform={`rotate(-90, 10, ${PAD.top + plotH / 2})`}>P (kN)</text>

        {/* Envelope */}
        <polyline points={polyline} fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={2} />

        {/* Design point */}
        <circle cx={dpX} cy={dpY} r={6} fill={insideCurve ? '#059669' : '#dc2626'} stroke="white" strokeWidth={1.5} />
        <text x={dpX + 8} y={dpY - 4} fontSize={8} fill={insideCurve ? '#059669' : '#dc2626'} fontWeight="bold">
          ({designPoint.M.toFixed(0)}, {designPoint.P.toFixed(0)})
        </text>
      </svg>
      <p className="text-xs text-slate-400 mt-1 text-center">
        Design point: N = {designPoint.P.toFixed(0)} kN · M = {designPoint.M.toFixed(0)} kNm
      </p>
    </div>
  );
}
