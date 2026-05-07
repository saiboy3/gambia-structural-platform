/**
 * BeamSection — Engineering-standard RC beam cross-section SVG
 * Features: concrete cross-hatching, Whitney stress block, neutral axis,
 *           strain/stress distribution, dimension leaders, cover callout
 */
import type { BeamInputs, BeamResults } from '../../types/structural';

interface Props { inputs: BeamInputs; results: BeamResults }

// Diagonal hatch pattern for concrete
function ConcreteHatch({ id, angle = 45 }: { id: string; angle?: number }) {
  return (
    <defs>
      <pattern id={id} patternUnits="userSpaceOnUse" width={8} height={8}
        patternTransform={`rotate(${angle})`}>
        <line x1={0} y1={0} x2={0} y2={8} stroke="#94a3b8" strokeWidth={0.7} strokeOpacity={0.6} />
      </pattern>
    </defs>
  );
}

// Dimension leader with double-headed arrow
function DimLeader({ x1, y1, x2, y2, label, textX, textY, horizontal = false }:
  { x1: number; y1: number; x2: number; y2: number; label: string; textX: number; textY: number; horizontal?: boolean }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth={0.8} markerEnd="url(#dimArrow)" markerStart="url(#dimArrow)" />
      {/* Extension lines */}
      {horizontal ? (
        <>
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke="#64748b" strokeWidth={0.8} />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke="#64748b" strokeWidth={0.8} />
        </>
      ) : (
        <>
          <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke="#64748b" strokeWidth={0.8} />
          <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke="#64748b" strokeWidth={0.8} />
        </>
      )}
      <text x={textX} y={textY} textAnchor="middle" fontSize={8} fill="#475569" fontWeight="600">{label}</text>
    </g>
  );
}

export default function BeamSection({ inputs, results }: Props) {
  // Canvas dims — wider to accommodate side diagrams
  const W = 420, H = 280;

  // Section occupies left ~55% of canvas
  const secW = 210, secH = 210;
  const scale = Math.min((secW - 50) / inputs.width, (secH - 50) / inputs.depth);
  const bw = inputs.width * scale;
  const bh = inputs.depth * scale;
  const ox = 40 + (secW - 40 - bw) / 2;
  const oy = (secH - bh) / 2 + 20;

  const coverS = inputs.cover * scale;
  const barDia = results.mainBars.dia;
  const diaS = barDia * scale;

  // Use pre-computed values from results
  const d = results.d;
  const x_mm = results.x;
  const x_s = Math.min(x_mm * scale, bh * 0.5);  // clamp for display

  // Bar positions (bottom tension)
  const n = results.mainBars.count;
  const barY = oy + bh - coverS - diaS / 2;
  const barSpacing = n > 1 ? (bw - 2 * coverS) / (n - 1) : 0;
  const bars = Array.from({ length: n }, (_, i) => ox + coverS + i * barSpacing);

  // Stirrup
  const stirDia = results.stirrups.dia * scale;
  const stirX = ox + coverS - stirDia / 2;
  const stirY = oy + coverS - stirDia / 2;
  const stirW = bw - 2 * coverS + stirDia;
  const stirH = bh - 2 * coverS + stirDia;

  // Side diagram positions
  const sideX = ox + bw + 28;
  const sideW = 36;

  // Strain diagram (right side)
  const strainX = sideX;
  const stressX = sideX + sideW + 16;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cross-Section</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full border border-slate-200 rounded-lg bg-white">
        <defs>
          <ConcreteHatch id="concreteHatch" />
          <marker id="dimArrow" markerWidth={5} markerHeight={5} refX={2.5} refY={2.5} orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
          </marker>
          <marker id="dimArrowRev" markerWidth={5} markerHeight={5} refX={2.5} refY={2.5} orient="auto-start-reverse">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
          </marker>
        </defs>

        {/* ── Section outline ── */}
        <rect x={ox} y={oy} width={bw} height={bh}
          fill="url(#concreteHatch)" stroke="#334155" strokeWidth={2} />
        {/* Solid grey base for contrast */}
        <rect x={ox} y={oy} width={bw} height={bh}
          fill="#cbd5e1" fillOpacity={0.35} stroke="none" />

        {/* ── Whitney stress block (compression zone, top) ── */}
        <rect x={ox} y={oy} width={bw} height={x_s}
          fill="#3b82f6" fillOpacity={0.25} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4,2" />
        <text x={ox + bw + 4} y={oy + x_s / 2 + 3} fontSize={7.5} fill="#2563eb" fontWeight="700">
          0.8x
        </text>

        {/* ── Neutral axis ── */}
        <line x1={ox - 8} y1={oy + x_s} x2={ox + bw + 50} y2={oy + x_s}
          stroke="#dc2626" strokeWidth={1} strokeDasharray="6,3" />
        <text x={ox - 10} y={oy + x_s + 10} fontSize={7} fill="#dc2626" fontWeight="600" textAnchor="end">N.A.</text>

        {/* ── Stirrup ── */}
        <rect x={stirX} y={stirY} width={stirW} height={stirH}
          fill="none" stroke="#0ea5e9" strokeWidth={Math.max(stirDia, 1.8)} rx={3} />

        {/* ── Main tension bars ── */}
        {bars.map((bx, i) => (
          <g key={i}>
            <circle cx={bx} cy={barY} r={diaS / 2 + 1} fill="#1e293b" />
            <circle cx={bx} cy={barY} r={diaS / 2} fill="#f59e0b" />
          </g>
        ))}

        {/* ── Compression bars (2 top) ── */}
        {[ox + coverS + diaS / 2, ox + bw - coverS - diaS / 2].map((bx, i) => (
          <g key={`c${i}`}>
            <circle cx={bx} cy={oy + coverS + diaS / 2} r={diaS * 0.4 + 1} fill="#1e293b" />
            <circle cx={bx} cy={oy + coverS + diaS / 2} r={diaS * 0.4} fill="#a78bfa" />
          </g>
        ))}

        {/* ── Cover callout ── */}
        <line x1={ox} y1={barY} x2={ox + coverS} y2={barY}
          stroke="#f97316" strokeWidth={1} strokeDasharray="2,2" />
        <line x1={ox + coverS / 2} y1={oy} x2={ox + coverS / 2} y2={barY}
          stroke="#f97316" strokeWidth={0.8} strokeDasharray="2,2" />
        <text x={ox + coverS / 2 + 2} y={oy + coverS * 1.8} fontSize={7} fill="#ea580c">c={inputs.cover}</text>

        {/* ── Dimension leaders ── */}
        {/* Width */}
        <DimLeader x1={ox} y1={oy - 14} x2={ox + bw} y2={oy - 14}
          label={`b = ${inputs.width} mm`} textX={ox + bw / 2} textY={oy - 20} horizontal />
        {/* Depth */}
        <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy + bh}
          stroke="#64748b" strokeWidth={0.8} markerEnd="url(#dimArrow)" markerStart="url(#dimArrow)" />
        <line x1={ox - 24} y1={oy} x2={ox - 14} y2={oy} stroke="#64748b" strokeWidth={0.8} />
        <line x1={ox - 24} y1={oy + bh} x2={ox - 14} y2={oy + bh} stroke="#64748b" strokeWidth={0.8} />
        <text x={ox - 22} y={oy + bh / 2} fontSize={8} fill="#475569" fontWeight="600"
          transform={`rotate(-90, ${ox - 22}, ${oy + bh / 2})`} textAnchor="middle">
          h = {inputs.depth} mm
        </text>

        {/* Effective depth d */}
        <line x1={ox + bw + 10} y1={oy} x2={ox + bw + 10} y2={barY}
          stroke="#0ea5e9" strokeWidth={0.8} markerEnd="url(#dimArrow)" markerStart="url(#dimArrow)" />
        <line x1={ox + bw + 6} y1={oy} x2={ox + bw + 14} y2={oy} stroke="#0ea5e9" strokeWidth={0.8} />
        <line x1={ox + bw + 6} y1={barY} x2={ox + bw + 14} y2={barY} stroke="#0ea5e9" strokeWidth={0.8} />

        {/* ── Strain diagram ── */}
        <text x={strainX + sideW / 2} y={oy - 6} fontSize={7.5} fill="#64748b" textAnchor="middle" fontWeight="700">Strain</text>
        {/* Zero strain line at N.A. */}
        <line x1={strainX} y1={oy + x_s} x2={strainX + sideW} y2={oy + x_s}
          stroke="#94a3b8" strokeWidth={0.6} />
        {/* Compression (top) → εcu = 0.0035 */}
        <polygon
          points={`${strainX + sideW / 2},${oy} ${strainX},${oy + x_s} ${strainX + sideW},${oy + x_s}`}
          fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={0.8} />
        <text x={strainX + sideW + 2} y={oy + 6} fontSize={6.5} fill="#2563eb">εcu</text>
        {/* Tension (bottom) → εs */}
        <polygon
          points={`${strainX + sideW / 2},${oy + bh} ${strainX},${oy + x_s} ${strainX + sideW},${oy + x_s}`}
          fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={0.8} />
        <text x={strainX + sideW + 2} y={oy + bh - 2} fontSize={6.5} fill="#b45309">εs</text>
        {/* Vertical axis */}
        <line x1={strainX + sideW / 2} y1={oy} x2={strainX + sideW / 2} y2={oy + bh}
          stroke="#94a3b8" strokeWidth={0.8} />

        {/* ── Stress block diagram ── */}
        <text x={stressX + sideW / 2} y={oy - 6} fontSize={7.5} fill="#64748b" textAnchor="middle" fontWeight="700">Stress</text>
        {/* Rectangular compression block */}
        <rect x={stressX} y={oy} width={sideW} height={x_s}
          fill="#3b82f6" fillOpacity={0.4} stroke="#3b82f6" strokeWidth={0.8} />
        <text x={stressX + sideW / 2} y={oy + x_s / 2 + 3} fontSize={6} fill="#1d4ed8" textAnchor="middle">0.85fcd</text>
        {/* Tension point load at bar level */}
        <line x1={stressX} y1={barY} x2={stressX + sideW} y2={barY}
          stroke="#f59e0b" strokeWidth={1.5} />
        <polygon points={`${stressX},${barY} ${stressX + 8},${barY - 4} ${stressX + 8},${barY + 4}`}
          fill="#f59e0b" />
        <text x={stressX + sideW + 2} y={barY + 3} fontSize={6.5} fill="#b45309">fyd</text>

        {/* ── Legend ── */}
        <g transform={`translate(${W - 105}, ${oy})`}>
          <rect x={0} y={0} width={100} height={90} rx={4} fill="white" fillOpacity={0.9} stroke="#e2e8f0" strokeWidth={1} />
          <text x={5} y={13} fontSize={8} fill="#475569" fontWeight="700">Section Properties</text>
          <circle cx={10} cy={26} r={4} fill="#f59e0b" />
          <text x={18} y={29} fontSize={7.5} fill="#374151">{n}T{barDia} (As={results.mainBars.As.toFixed(0)})</text>
          <circle cx={10} cy={40} r={3} fill="#a78bfa" />
          <text x={18} y={43} fontSize={7.5} fill="#374151">2T{Math.round(barDia * 0.6)} top</text>
          <rect x={5} y={50} width={10} height={6} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={18} y={57} fontSize={7.5} fill="#374151">T{results.stirrups.dia}@{results.stirrups.spacing}</text>
          <rect x={5} y={63} width={10} height={6} fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={0.8} />
          <text x={18} y={70} fontSize={7.5} fill="#374151">Stress block</text>
          <line x1={5} y1={79} x2={15} y2={79} stroke="#dc2626" strokeWidth={1} strokeDasharray="3,2" />
          <text x={18} y={82} fontSize={7.5} fill="#374151">Neutral axis</text>
        </g>

        {/* ── Bar label below ── */}
        <text x={ox + bw / 2} y={oy + bh + 18} textAnchor="middle" fontSize={8.5} fill="#1e40af" fontWeight="700">
          {n}T{barDia}  As,prov = {results.mainBars.As.toFixed(0)} mm²
        </text>
        <text x={ox + bw / 2} y={oy + bh + 30} textAnchor="middle" fontSize={7.5} fill="#0ea5e9">
          d = {d.toFixed(0)} mm   x = {x_mm.toFixed(0)} mm   x/d = {d > 0 ? (x_mm / d).toFixed(2) : '—'}
        </text>
      </svg>

      {/* Elevation / load diagram */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Elevation & Loading</p>
      <svg width="100%" viewBox="0 0 420 90" className="w-full border border-slate-200 rounded-lg bg-white">
        <defs>
          <marker id="udlArrow" markerWidth={5} markerHeight={5} refX={2.5} refY={5} orient="auto">
            <path d="M0,0 L2.5,5 L5,0 Z" fill="#3b82f6" />
          </marker>
          <marker id="reactArrow" markerWidth={6} markerHeight={6} refX={3} refY={0} orient="auto">
            <path d="M0,0 L3,6 L6,0 Z" fill="#16a34a" />
          </marker>
        </defs>

        {/* UDL block */}
        <rect x={28} y={10} width={364} height={14} fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={0.8} />
        <text x={210} y={20} textAnchor="middle" fontSize={8.5} fill="#2563eb" fontWeight="700">
          wEd = {inputs.deadLoad !== undefined ? (inputs.deadLoad + inputs.liveLoad).toFixed(1) : '—'} kN/m
        </text>

        {/* UDL arrows */}
        {Array.from({ length: 12 }, (_, i) => {
          const x = 28 + (i + 0.5) * (364 / 12);
          return <line key={i} x1={x} y1={24} x2={x} y2={45} stroke="#3b82f6" strokeWidth={1.2} markerEnd="url(#udlArrow)" />;
        })}

        {/* Beam */}
        <rect x={28} y={46} width={364} height={16} rx={2} fill="#475569" />

        {/* Supports */}
        <polygon points="28,62 18,78 38,78" fill="#334155" />
        <line x1={12} y1={78} x2={44} y2={78} stroke="#334155" strokeWidth={2} />
        {inputs.supportType === 'simply-supported' && (
          <>
            <polygon points="392,62 382,78 402,78" fill="#64748b" />
            <circle cx={386} cy={81} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
            <circle cx={398} cy={81} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
            <line x1={376} y1={84} x2={408} y2={84} stroke="#64748b" strokeWidth={2} />
          </>
        )}

        {/* Reactions */}
        <line x1={28} y1={78} x2={28} y2={90} stroke="#16a34a" strokeWidth={2} />
        <polygon points="28,62 24,74 32,74" fill="#16a34a" />
        <text x={28} y={90} textAnchor="middle" fontSize={7} fill="#15803d" fontWeight="700">RA</text>
        {inputs.supportType === 'simply-supported' && (
          <>
            <line x1={392} y1={78} x2={392} y2={90} stroke="#16a34a" strokeWidth={2} />
            <polygon points="392,62 388,74 396,74" fill="#16a34a" />
            <text x={392} y={90} textAnchor="middle" fontSize={7} fill="#15803d" fontWeight="700">RB</text>
          </>
        )}

        {/* Span annotation */}
        <line x1={28} y1={55} x2={392} y2={55} stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="4,2" />
        <text x={210} y={53} textAnchor="middle" fontSize={8} fill="#64748b">L = {inputs.span} m</text>

        {/* Quarter span ticks */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <g key={i}>
            <line x1={28 + t * 364} y1={46} x2={28 + t * 364} y2={62} stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="2,2" />
            <text x={28 + t * 364} y={44} textAnchor="middle" fontSize={6.5} fill="#94a3b8">{(t * inputs.span).toFixed(1)}m</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
