/**
 * BeamSection — Engineering-standard RC beam cross-section SVG
 * Layout (left→right):
 *   [dim h] [section + cover callout] [dim d] [strain] [stress] [legend]
 * All labels are placed in guaranteed-clear zones with no overlaps.
 */
import type { BeamInputs, BeamResults } from '../../types/structural';

interface Props { inputs: BeamInputs; results: BeamResults }

export default function BeamSection({ inputs, results }: Props) {
  // ── Canvas ────────────────────────────────────────────────────────────────
  const W = 460, H = 290;

  // ── Section geometry ──────────────────────────────────────────────────────
  // Left margin: 36px for the h-dimension leader
  // Section occupies x: 36 → 36+bw, y: topPad → topPad+bh
  const LEFT = 36, TOP = 32, BOT_PAD = 42;
  const availW = 160;    // max section pixel-width
  const availH = H - TOP - BOT_PAD;
  const scale = Math.min(availW / inputs.width, availH / inputs.depth);
  const bw = inputs.width * scale;
  const bh = inputs.depth * scale;
  const ox = LEFT;
  const oy = TOP + (availH - bh) / 2;  // centre vertically

  const coverS = inputs.cover * scale;
  const barDia  = results.mainBars.dia;
  const diaS    = barDia * scale;
  const stirDia = results.stirrups.dia * scale;

  // Neutral axis and bar positions
  const d    = results.d;
  const x_mm = results.x;
  const x_s  = Math.min(x_mm * scale, bh * 0.45);   // clamp display height

  const n         = results.mainBars.count;
  const barY      = oy + bh - coverS - diaS / 2;
  const barSpacing = n > 1 ? (bw - 2 * coverS) / (n - 1) : 0;
  const bars      = Array.from({ length: n }, (_, i) => ox + coverS + i * barSpacing);

  const stirX = ox + coverS - stirDia / 2;
  const stirY = oy + coverS - stirDia / 2;
  const stirW = bw - 2 * coverS + stirDia;
  const stirH = bh - 2 * coverS + stirDia;

  // ── Side-panel layout (all guaranteed right of section) ───────────────────
  // d-dim line:   x = ox+bw+10  (10px gap from section right edge)
  // strain panel: x = ox+bw+26  (16px gap from d-dim line centre)
  // stress panel: x = ox+bw+70  (strain width=36, 8px gap)
  // legend:       x = ox+bw+118 (stress width=36, 8px gap)

  const DIM_D_X   = ox + bw + 10;
  const STRAIN_X  = ox + bw + 26;
  const STRAIN_W  = 36;
  const STRESS_X  = STRAIN_X + STRAIN_W + 8;
  const STRESS_W  = 36;
  const LEGEND_X  = STRESS_X + STRESS_W + 8;
  const LEGEND_W  = W - LEGEND_X - 4;

  // ── Neutral axis line (stops before side panels) ──────────────────────────
  const NA_LINE_X2 = ox + bw + 5;   // stops 5px past section edge only

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cross-Section</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full border border-slate-200 rounded-lg bg-white shadow-sm">
        <defs>
          <pattern id="bsHatch" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} stroke="#94a3b8" strokeWidth={0.7} strokeOpacity={0.55} />
          </pattern>
          <marker id="bsDimA" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
          </marker>
          <marker id="bsDimB" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto-start-reverse">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
          </marker>
        </defs>

        {/* ── Concrete section (hatch + tint) ── */}
        <rect x={ox} y={oy} width={bw} height={bh} fill="url(#bsHatch)" stroke="#334155" strokeWidth={2} />
        <rect x={ox} y={oy} width={bw} height={bh} fill="#cbd5e1" fillOpacity={0.3} stroke="none" />

        {/* ── Whitney stress block ── */}
        <rect x={ox} y={oy} width={bw} height={x_s}
          fill="#3b82f6" fillOpacity={0.22} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4,2" />
        {/* 0.8x label — centred inside stress block, only if block tall enough */}
        {x_s > 14 && (
          <text x={ox + bw / 2} y={oy + x_s / 2 + 3.5}
            textAnchor="middle" fontSize={7} fill="#1d4ed8" fontWeight="700">0.8x</text>
        )}

        {/* ── Neutral axis — stops at section right edge ── */}
        <line x1={ox - 6} y1={oy + x_s} x2={NA_LINE_X2} y2={oy + x_s}
          stroke="#dc2626" strokeWidth={1} strokeDasharray="5,3" />
        {/* N.A. label: left of section, clear of h-dim */}
        <text x={ox - 8} y={oy + x_s - 3}
          fontSize={7} fill="#dc2626" fontWeight="600" textAnchor="end">N.A.</text>

        {/* ── Stirrup ── */}
        <rect x={stirX} y={stirY} width={stirW} height={stirH}
          fill="none" stroke="#0ea5e9" strokeWidth={Math.max(stirDia, 1.8)} rx={3} />

        {/* ── Tension bars ── */}
        {bars.map((bx, i) => (
          <g key={i}>
            <circle cx={bx} cy={barY} r={Math.max(diaS / 2 + 1, 4)} fill="#1e293b" />
            <circle cx={bx} cy={barY} r={Math.max(diaS / 2, 3)}     fill="#f59e0b" />
          </g>
        ))}

        {/* ── Compression bars (2 top) ── */}
        {[ox + coverS + diaS / 2, ox + bw - coverS - diaS / 2].map((bx, i) => (
          <g key={`c${i}`}>
            <circle cx={bx} cy={oy + coverS + diaS / 2} r={Math.max(diaS * 0.4 + 1, 3.5)} fill="#1e293b" />
            <circle cx={bx} cy={oy + coverS + diaS / 2} r={Math.max(diaS * 0.4, 2.5)}      fill="#a78bfa" />
          </g>
        ))}

        {/* ── Cover callout (leader line from corner to label outside section) ── */}
        {/* Horizontal tick at top of cover zone */}
        <line x1={ox} y1={oy + coverS} x2={ox + coverS} y2={oy + coverS}
          stroke="#f97316" strokeWidth={0.8} strokeDasharray="2,2" />
        {/* Leader going left to a label below the bottom of the section */}
        <line x1={ox + coverS / 2} y1={oy + coverS}
              x2={ox + coverS / 2} y2={oy + bh + 10}
          stroke="#f97316" strokeWidth={0.6} strokeDasharray="2,2" />
        <text x={ox + coverS / 2} y={oy + bh + 20}
          textAnchor="middle" fontSize={7} fill="#ea580c" fontWeight="600">
          c={inputs.cover}mm
        </text>

        {/* ── Dimension: width (b) — above section ── */}
        <line x1={ox} y1={oy - 16} x2={ox + bw} y2={oy - 16}
          stroke="#64748b" strokeWidth={0.8}
          markerEnd="url(#bsDimA)" markerStart="url(#bsDimB)" />
        <line x1={ox}      y1={oy - 20} x2={ox}      y2={oy - 12} stroke="#64748b" strokeWidth={0.8} />
        <line x1={ox + bw} y1={oy - 20} x2={ox + bw} y2={oy - 12} stroke="#64748b" strokeWidth={0.8} />
        {/* White background behind label to prevent hatch bleed */}
        <rect x={ox + bw / 2 - 26} y={oy - 28} width={52} height={12} fill="white" />
        <text x={ox + bw / 2} y={oy - 19} textAnchor="middle" fontSize={8} fill="#475569" fontWeight="700">
          b = {inputs.width} mm
        </text>

        {/* ── Dimension: total depth (h) — left of section ── */}
        <line x1={LEFT - 10} y1={oy} x2={LEFT - 10} y2={oy + bh}
          stroke="#64748b" strokeWidth={0.8}
          markerEnd="url(#bsDimA)" markerStart="url(#bsDimB)" />
        <line x1={LEFT - 14} y1={oy}      x2={LEFT - 6} y2={oy}      stroke="#64748b" strokeWidth={0.8} />
        <line x1={LEFT - 14} y1={oy + bh} x2={LEFT - 6} y2={oy + bh} stroke="#64748b" strokeWidth={0.8} />
        <text x={LEFT - 12} y={oy + bh / 2} fontSize={8} fill="#475569" fontWeight="700"
          transform={`rotate(-90, ${LEFT - 12}, ${oy + bh / 2})`} textAnchor="middle">
          h = {inputs.depth} mm
        </text>

        {/* ── Dimension: effective depth (d) — right of section, before strain panel ── */}
        <line x1={DIM_D_X} y1={oy} x2={DIM_D_X} y2={barY}
          stroke="#0ea5e9" strokeWidth={0.8}
          markerEnd="url(#bsDimA)" markerStart="url(#bsDimB)" />
        <line x1={DIM_D_X - 4} y1={oy}   x2={DIM_D_X + 4} y2={oy}   stroke="#0ea5e9" strokeWidth={0.8} />
        <line x1={DIM_D_X - 4} y1={barY} x2={DIM_D_X + 4} y2={barY} stroke="#0ea5e9" strokeWidth={0.8} />
        {/* d label — midpoint of the leader, on white background */}
        <rect x={DIM_D_X + 2} y={(oy + barY) / 2 - 6} width={22} height={11} fill="white" />
        <text x={DIM_D_X + 13} y={(oy + barY) / 2 + 3} fontSize={7} fill="#0284c7" fontWeight="700">
          d={d.toFixed(0)}
        </text>

        {/* ── Strain diagram ── */}
        <text x={STRAIN_X + STRAIN_W / 2} y={oy - 4}
          textAnchor="middle" fontSize={7.5} fill="#64748b" fontWeight="700">Strain</text>
        {/* Vertical centre axis */}
        <line x1={STRAIN_X + STRAIN_W / 2} y1={oy} x2={STRAIN_X + STRAIN_W / 2} y2={oy + bh}
          stroke="#94a3b8" strokeWidth={0.8} />
        {/* Zero-strain horizontal at NA depth */}
        <line x1={STRAIN_X} y1={oy + x_s} x2={STRAIN_X + STRAIN_W} y2={oy + x_s}
          stroke="#94a3b8" strokeWidth={0.6} />
        {/* Compression triangle */}
        <polygon
          points={`${STRAIN_X + STRAIN_W / 2},${oy} ${STRAIN_X},${oy + x_s} ${STRAIN_X + STRAIN_W},${oy + x_s}`}
          fill="#3b82f6" fillOpacity={0.28} stroke="#3b82f6" strokeWidth={0.8} />
        {/* Tension triangle */}
        <polygon
          points={`${STRAIN_X + STRAIN_W / 2},${oy + bh} ${STRAIN_X},${oy + x_s} ${STRAIN_X + STRAIN_W},${oy + x_s}`}
          fill="#f59e0b" fillOpacity={0.28} stroke="#f59e0b" strokeWidth={0.8} />
        {/* Labels — outside triangle, never inside */}
        <text x={STRAIN_X + STRAIN_W + 3} y={oy + 8}    fontSize={6.5} fill="#2563eb">εcu</text>
        <text x={STRAIN_X + STRAIN_W + 3} y={oy + bh - 3} fontSize={6.5} fill="#b45309">εs</text>

        {/* ── Stress diagram ── */}
        <text x={STRESS_X + STRESS_W / 2} y={oy - 4}
          textAnchor="middle" fontSize={7.5} fill="#64748b" fontWeight="700">Stress</text>
        {/* Rectangular compression block */}
        <rect x={STRESS_X} y={oy} width={STRESS_W} height={x_s}
          fill="#3b82f6" fillOpacity={0.38} stroke="#3b82f6" strokeWidth={0.8} />
        {/* 0.85fcd label: only if block is tall enough, on white bg */}
        {x_s > 18 && (
          <>
            <rect x={STRESS_X + 2} y={oy + x_s / 2 - 5} width={STRESS_W - 4} height={10} fill="white" fillOpacity={0.7} />
            <text x={STRESS_X + STRESS_W / 2} y={oy + x_s / 2 + 3}
              textAnchor="middle" fontSize={6} fill="#1d4ed8">0.85fcd</text>
          </>
        )}
        {/* Tension resultant at bar level */}
        <line x1={STRESS_X} y1={barY} x2={STRESS_X + STRESS_W} y2={barY}
          stroke="#f59e0b" strokeWidth={1.5} />
        <polygon points={`${STRESS_X},${barY} ${STRESS_X + 7},${barY - 4} ${STRESS_X + 7},${barY + 4}`}
          fill="#f59e0b" />
        <text x={STRESS_X + STRESS_W + 3} y={barY + 4} fontSize={6.5} fill="#b45309">fyd</text>

        {/* ── Legend panel ── */}
        {LEGEND_W >= 50 && (
          <g>
            <rect x={LEGEND_X} y={oy} width={LEGEND_W} height={Math.min(100, bh)}
              rx={4} fill="white" stroke="#e2e8f0" strokeWidth={1} />
            {[
              { cy: oy + 14, r: 4,   fill: '#f59e0b', label: `${n}T${barDia}` },
              { cy: oy + 28, r: 3,   fill: '#a78bfa', label: '2 top bars' },
            ].map(({ cy, r, fill, label }, i) => (
              <g key={i}>
                <circle cx={LEGEND_X + 10} cy={cy} r={r} fill={fill} />
                <text x={LEGEND_X + 18} y={cy + 4} fontSize={7} fill="#374151">{label}</text>
              </g>
            ))}
            <rect x={LEGEND_X + 6} y={oy + 38} width={10} height={7}
              fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
            <text x={LEGEND_X + 18} y={oy + 45} fontSize={7} fill="#374151">
              T{results.stirrups.dia}@{results.stirrups.spacing}
            </text>
            <rect x={LEGEND_X + 6} y={oy + 52} width={10} height={7}
              fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={0.8} />
            <text x={LEGEND_X + 18} y={oy + 59} fontSize={7} fill="#374151">Comp. block</text>
            <line x1={LEGEND_X + 6} y1={oy + 70} x2={LEGEND_X + 16} y2={oy + 70}
              stroke="#dc2626" strokeWidth={1} strokeDasharray="3,2" />
            <text x={LEGEND_X + 18} y={oy + 74} fontSize={7} fill="#374151">Neutral axis</text>
          </g>
        )}

        {/* ── Bottom data row — below section, guaranteed clear of cover callout ── */}
        <rect x={ox} y={oy + bh + 26} width={bw} height={13} rx={2} fill="#f8fafc" />
        <text x={ox + bw / 2} y={oy + bh + 36}
          textAnchor="middle" fontSize={7.5} fill="#1e40af" fontWeight="700">
          {n}T{barDia} · As={results.mainBars.As.toFixed(0)} mm²
        </text>
        {/* d / x line further below */}
        <text x={ox + bw / 2} y={oy + bh + 50}
          textAnchor="middle" fontSize={7} fill="#475569">
          d={d.toFixed(0)} mm · x={x_mm.toFixed(0)} mm · x/d={d > 0 ? (x_mm / d).toFixed(2) : '—'}
        </text>
      </svg>

      {/* ── Elevation / loading diagram ── */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Elevation & Loading</p>
      <svg width="100%" viewBox="0 0 460 96" className="w-full border border-slate-200 rounded-lg bg-white shadow-sm">
        <defs>
          <marker id="bsUdl" markerWidth={5} markerHeight={5} refX={2.5} refY={5} orient="auto">
            <path d="M0,0 L2.5,5 L5,0 Z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Span label — top strip, clear of everything ── */}
        <text x={230} y={10} textAnchor="middle" fontSize={8} fill="#64748b" fontWeight="600">
          L = {inputs.span} m
        </text>
        <line x1={32} y1={13} x2={428} y2={13} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="3,3" />

        {/* UDL block (16–26) */}
        <rect x={32} y={16} width={396} height={10} fill="#dbeafe" stroke="#93c5fd" strokeWidth={0.7} />
        <text x={230} y={24} textAnchor="middle" fontSize={7.5} fill="#2563eb" fontWeight="700">
          wEd = {(inputs.deadLoad + inputs.liveLoad).toFixed(1)} kN/m
        </text>

        {/* UDL arrows (26–46) */}
        {Array.from({ length: 13 }, (_, i) => {
          const x = 32 + (i + 0.5) * (396 / 13);
          return <line key={i} x1={x} y1={26} x2={x} y2={44} stroke="#3b82f6" strokeWidth={1.1} markerEnd="url(#bsUdl)" />;
        })}

        {/* Beam (46–60) */}
        <rect x={32} y={46} width={396} height={14} rx={2} fill="#475569" />

        {/* Quarter span ticks ON the beam — labels above beam, below UDL, in the gap (26–46) */}
        {[0.25, 0.5, 0.75].map((t, i) => {
          const x = 32 + t * 396;
          return (
            <g key={i}>
              {/* Tick through beam */}
              <line x1={x} y1={46} x2={x} y2={60} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="2,2" />
              {/* Label above arrows — guaranteed space at y=14 is taken; use space within arrow zone at top */}
            </g>
          );
        })}

        {/* Supports (60–76) */}
        <polygon points="32,60 22,76 42,76" fill="#334155" />
        <line x1={16} y1={76} x2={48} y2={76} stroke="#334155" strokeWidth={2} />
        {inputs.supportType === 'simply-supported' && (
          <>
            <polygon points="428,60 418,76 438,76" fill="#64748b" />
            <circle cx={422} cy={79} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
            <circle cx={434} cy={79} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
            <line x1={412} y1={82} x2={444} y2={82} stroke="#64748b" strokeWidth={2} />
          </>
        )}

        {/* Reactions — pushed to bottom (76–90), labels at y=92 clear of support hatching */}
        <line x1={32} y1={82} x2={32} y2={92} stroke="#16a34a" strokeWidth={1.5} />
        <text x={32} y={96} textAnchor="middle" fontSize={7} fill="#15803d" fontWeight="700">RA</text>
        {inputs.supportType === 'simply-supported' && (
          <>
            <line x1={428} y1={82} x2={428} y2={92} stroke="#16a34a" strokeWidth={1.5} />
            <text x={428} y={96} textAnchor="middle" fontSize={7} fill="#15803d" fontWeight="700">RB</text>
          </>
        )}
      </svg>
    </div>
  );
}
