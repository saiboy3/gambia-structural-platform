import type { BeamInputs, BeamResults } from '../../types/structural';

interface Props { inputs: BeamInputs; results: BeamResults }

export default function BeamSection({ inputs, results }: Props) {
  const W = 320, H = 260;
  const scale = Math.min((W - 60) / inputs.width, (H - 60) / inputs.depth);
  const bw = inputs.width * scale;
  const bh = inputs.depth * scale;
  const ox = (W - bw) / 2;
  const oy = (H - bh) / 2;
  const cover = inputs.cover * scale;
  const diaScale = results.mainBars.dia * scale;
  const stirDia = results.stirrups.dia * scale;

  // Rebar positions (bottom tension)
  const n    = results.mainBars.count;
  const barY = oy + bh - cover - diaScale / 2;
  const spacing = (bw - 2 * cover) / (n - 1 || 1);
  const bars  = Array.from({ length: n }, (_, i) => ox + cover + i * spacing);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cross-Section</p>
      <svg width={W} height={H} className="border border-slate-200 rounded-lg bg-slate-50">
        {/* Concrete outline */}
        <rect x={ox} y={oy} width={bw} height={bh} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />

        {/* Stirrup */}
        <rect
          x={ox + cover - stirDia / 2}
          y={oy + cover - stirDia / 2}
          width={bw - 2 * cover + stirDia}
          height={bh - 2 * cover + stirDia}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={Math.max(stirDia, 1.5)}
          rx={3}
        />

        {/* Main tension bars */}
        {bars.map((bx, i) => (
          <circle key={i} cx={bx} cy={barY} r={diaScale / 2} fill="#1e40af" />
        ))}

        {/* 2 compression bars top */}
        {[ox + cover + diaScale / 2, ox + bw - cover - diaScale / 2].map((bx, i) => (
          <circle key={`c${i}`} cx={bx} cy={oy + cover + diaScale / 2} r={diaScale / 2 * 0.8} fill="#6366f1" />
        ))}

        {/* Dimensions */}
        {/* Width arrow */}
        <line x1={ox} y1={oy - 12} x2={ox + bw} y2={oy - 12} stroke="#94a3b8" strokeWidth={1} markerEnd="url(#arr)" markerStart="url(#arr)" />
        <text x={ox + bw / 2} y={oy - 16} textAnchor="middle" fontSize={9} fill="#64748b">{inputs.width} mm</text>

        {/* Depth arrow */}
        <line x1={ox + bw + 12} y1={oy} x2={ox + bw + 12} y2={oy + bh} stroke="#94a3b8" strokeWidth={1} />
        <text x={ox + bw + 22} y={oy + bh / 2} fontSize={9} fill="#64748b" dominantBaseline="middle">{inputs.depth} mm</text>

        {/* Labels */}
        <text x={ox + bw / 2} y={barY + 20} textAnchor="middle" fontSize={8} fill="#1e40af">
          {n}T{results.mainBars.dia} (As={results.mainBars.As.toFixed(0)} mm²)
        </text>
        <text x={ox + bw + 8} y={oy + cover + 4} fontSize={8} fill="#6366f1">2T{Math.round(results.mainBars.dia * 0.6)}</text>

        <defs>
          <marker id="arr" markerWidth={4} markerHeight={4} refX={2} refY={2} orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      {/* Elevation / load diagram */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Elevation</p>
      <svg width={W} height={80} className="border border-slate-200 rounded-lg bg-slate-50">
        <line x1={20} y1={55} x2={W - 20} y2={55} stroke="#475569" strokeWidth={3} />
        {/* UDL arrows */}
        {Array.from({ length: 10 }, (_, i) => {
          const x = 20 + (i / 9) * (W - 40);
          return <line key={i} x1={x} y1={15} x2={x} y2={52} stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#darr)" />;
        })}
        <line x1={20} y1={15} x2={W - 20} y2={15} stroke="#ef4444" strokeWidth={1.5} />
        {/* Supports */}
        <polygon points={`20,55 10,72 30,72`} fill="#475569" />
        <polygon points={`${W - 20},55 ${W - 30},72 ${W - 10},72`} fill={inputs.supportType === 'cantilever' ? '#475569' : 'none'} stroke="#475569" strokeWidth={2} />
        {/* Span label */}
        <text x={W / 2} y={74} textAnchor="middle" fontSize={9} fill="#64748b">L = {inputs.span} m</text>
        <defs>
          <marker id="darr" markerWidth={4} markerHeight={4} refX={2} refY={0} orient="auto">
            <path d="M0,0 L4,0 L2,4 Z" fill="#ef4444" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
