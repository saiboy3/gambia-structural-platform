import type { FoundationInputs, FoundationResults } from '../../types/structural';

interface Props { inputs: FoundationInputs; results: FoundationResults }

export default function FoundationSection({ inputs, results }: Props) {
  const W = 320, H = 260;
  const maxDim = Math.max(results.B * 1000, results.L * 1000, results.h);
  const scale = (W - 80) / maxDim;
  const fw = results.B * 1000 * scale;
  const fh = results.h * scale;
  const ox = (W - fw) / 2, oy = 40;
  const cover = inputs.cover * scale;
  const diaScale = results.barsBot.dia * scale;
  const spacingScale = results.barsBot.spacing * scale;
  const colW = inputs.columnB * scale, colH = inputs.columnH * scale;

  const bars: number[] = [];
  let bx = ox + cover;
  while (bx < ox + fw - cover) { bars.push(bx); bx += spacingScale; }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Section</p>
      <svg width={W} height={H} className="border border-slate-200 rounded-lg bg-slate-50">
        {/* Column stub */}
        <rect
          x={(W - colW) / 2} y={oy - colH * 0.7}
          width={colW} height={colH * 0.7}
          fill="#cbd5e1" stroke="#475569" strokeWidth={1.5}
        />
        <text x={W / 2} y={oy - colH * 0.35} textAnchor="middle" fontSize={8} fill="#475569" dominantBaseline="middle">Column</text>

        {/* Foundation body */}
        <rect x={ox} y={oy} width={fw} height={fh} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />

        {/* Bottom bars */}
        {bars.map((bx2, i) => (
          <circle key={i} cx={bx2} cy={oy + fh - cover - diaScale / 2} r={Math.max(diaScale / 2, 2)} fill="#1e40af" />
        ))}

        {/* Soil hatch */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1={ox + i * (fw / 7)} y1={oy + fh} x2={ox + i * (fw / 7) - 12} y2={oy + fh + 14} stroke="#92400e" strokeWidth={1} opacity={0.5} />
        ))}
        <line x1={ox} y1={oy + fh} x2={ox + fw} y2={oy + fh} stroke="#92400e" strokeWidth={1.5} />

        {/* Soil pressure arrows (upward) */}
        {Array.from({ length: 5 }, (_, i) => {
          const x = ox + (i + 0.5) * (fw / 5);
          return <line key={`p${i}`} x1={x} y1={oy + fh + 28} x2={x} y2={oy + fh + 2} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#uarr)" />;
        })}

        {/* Dimension lines */}
        <line x1={ox} y1={oy - 14} x2={ox + fw} y2={oy - 14} stroke="#94a3b8" strokeWidth={1} />
        <text x={W / 2} y={oy - 18} textAnchor="middle" fontSize={9} fill="#64748b">B = {results.B.toFixed(2)} m</text>
        <line x1={ox + fw + 10} y1={oy} x2={ox + fw + 10} y2={oy + fh} stroke="#94a3b8" strokeWidth={1} />
        <text x={ox + fw + 20} y={oy + fh / 2} fontSize={9} fill="#64748b" dominantBaseline="middle">h = {results.h} mm</text>

        {/* Steel label */}
        <text x={W / 2} y={oy + fh - 4} textAnchor="middle" fontSize={8} fill="#1e40af">
          T{results.barsBot.dia}@{results.barsBot.spacing} EW bot
        </text>

        {/* Pressure label */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#22c55e">
          q = {results.qEd.toFixed(1)} kN/m²
        </text>

        <defs>
          <marker id="uarr" markerWidth={4} markerHeight={4} refX={2} refY={4} orient="auto">
            <path d="M0,4 L2,0 L4,4 Z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
