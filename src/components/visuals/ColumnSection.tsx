/**
 * ColumnSection — Engineering-standard RC column cross-section SVG
 * Features: concrete cross-hatching, P-M interaction indicator,
 *           eccentricity arrow, link detail, bar circles with labels
 */
import type { ColumnInputs, ColumnResults } from '../../types/structural';

interface Props { inputs: ColumnInputs; results: ColumnResults }

function ConcreteHatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={8} stroke="#94a3b8" strokeWidth={0.7} strokeOpacity={0.55} />
      </pattern>
    </defs>
  );
}

export default function ColumnSection({ inputs, results }: Props) {
  const W = 360, H = 300;
  const isCirc = inputs.shape === 'circular';

  const scale = Math.min((W * 0.45 - 30) / inputs.b, (H - 80) / inputs.h);
  const bw = inputs.b * scale, bh = inputs.h * scale;
  const cx0 = W * 0.28, cy0 = H / 2;
  const ox = cx0 - bw / 2, oy = cy0 - bh / 2;

  const coverS = inputs.cover * scale;
  const diaS = results.mainBars.dia * scale;
  const linkDia = results.links.dia * scale;

  const n = results.mainBars.count;
  const barPositions: { x: number; y: number }[] = [];

  if (isCirc) {
    const r = bw / 2 - coverS - diaS / 2;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      barPositions.push({ x: cx0 + r * Math.cos(angle), y: cy0 + r * Math.sin(angle) });
    }
  } else {
    const corners = [
      { x: ox + coverS + diaS / 2, y: oy + coverS + diaS / 2 },
      { x: ox + bw - coverS - diaS / 2, y: oy + coverS + diaS / 2 },
      { x: ox + bw - coverS - diaS / 2, y: oy + bh - coverS - diaS / 2 },
      { x: ox + coverS + diaS / 2, y: oy + bh - coverS - diaS / 2 },
    ];
    if (n >= 4) {
      barPositions.push(...corners);
      const extras = n - 4;
      for (let i = 0; i < extras; i++) {
        const side = i % 4;
        const p = Math.floor(i / 4) + 1;
        const total = Math.ceil(extras / 4) + 1;
        if (side === 0) barPositions.push({ x: ox + coverS + diaS / 2, y: oy + coverS + (p / total) * (bh - 2 * coverS) });
        else if (side === 1) barPositions.push({ x: ox + coverS + (p / total) * (bw - 2 * coverS), y: oy + coverS + diaS / 2 });
        else if (side === 2) barPositions.push({ x: ox + bw - coverS - diaS / 2, y: oy + coverS + (p / total) * (bh - 2 * coverS) });
        else barPositions.push({ x: ox + coverS + (p / total) * (bw - 2 * coverS), y: oy + bh - coverS - diaS / 2 });
      }
    } else {
      // Fewer than 4 bars (chooseBars() can return as few as 2) — use only
      // the actual count instead of always drawing all 4 corners.
      barPositions.push(...corners.slice(0, n));
    }
  }

  // Utilisation colour (use capacity vs NEd)
  const util = Math.min(inputs.Ned / (results.capacity || 1), 1);
  const utilColor = util > 0.9 ? '#dc2626' : util > 0.7 ? '#f59e0b' : '#16a34a';

  // Right panel: axial force + moment indicator
  const panelX = W * 0.57;
  const panelW = W * 0.38;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Column Cross-Section</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full border border-slate-200 rounded-lg bg-white shadow-sm">
        <ConcreteHatch id="colHatch" />
        <defs>
          <marker id="eccArrow" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
          </marker>
          <marker id="loadArrow" markerWidth={6} markerHeight={6} refX={3} refY={0} orient="auto">
            <path d="M0,0 L3,6 L6,0 Z" fill="#374151" />
          </marker>
        </defs>

        {/* ── Section outline ── */}
        {isCirc ? (
          <>
            <ellipse cx={cx0} cy={cy0} rx={bw / 2} ry={bh / 2}
              fill="url(#colHatch)" stroke="#334155" strokeWidth={2} />
            <ellipse cx={cx0} cy={cy0} rx={bw / 2} ry={bh / 2}
              fill="#cbd5e1" fillOpacity={0.3} stroke="none" />
          </>
        ) : (
          <>
            <rect x={ox} y={oy} width={bw} height={bh}
              fill="url(#colHatch)" stroke="#334155" strokeWidth={2} />
            <rect x={ox} y={oy} width={bw} height={bh}
              fill="#cbd5e1" fillOpacity={0.3} stroke="none" />
          </>
        )}

        {/* ── Links / spiral ── */}
        {isCirc ? (
          <ellipse cx={cx0} cy={cy0}
            rx={bw / 2 - coverS + linkDia / 2}
            ry={bh / 2 - coverS + linkDia / 2}
            fill="none" stroke="#0ea5e9" strokeWidth={Math.max(linkDia, 1.8)} />
        ) : (
          <rect
            x={ox + coverS - linkDia / 2} y={oy + coverS - linkDia / 2}
            width={bw - 2 * coverS + linkDia} height={bh - 2 * coverS + linkDia}
            fill="none" stroke="#0ea5e9" strokeWidth={Math.max(linkDia, 1.8)} rx={3} />
        )}

        {/* ── Main bars ── */}
        {barPositions.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={diaS / 2 + 1} fill="#1e293b" />
            <circle cx={p.x} cy={p.y} r={diaS / 2} fill="#f59e0b" />
          </g>
        ))}

        {/* ── Dimension leaders ── */}
        {/* Width */}
        <line x1={ox} y1={oy - 14} x2={ox + bw} y2={oy - 14}
          stroke="#64748b" strokeWidth={0.8} markerEnd="url(#eccArrow)" markerStart="url(#eccArrow)" />
        <line x1={ox} y1={oy - 18} x2={ox} y2={oy - 10} stroke="#64748b" strokeWidth={0.8} />
        <line x1={ox + bw} y1={oy - 18} x2={ox + bw} y2={oy - 10} stroke="#64748b" strokeWidth={0.8} />
        <text x={cx0} y={oy - 18} textAnchor="middle" fontSize={8.5} fill="#475569" fontWeight="700">b = {inputs.b} mm</text>

        {/* Height */}
        <line x1={ox - 14} y1={oy} x2={ox - 14} y2={oy + bh}
          stroke="#64748b" strokeWidth={0.8} markerEnd="url(#eccArrow)" markerStart="url(#eccArrow)" />
        <line x1={ox - 18} y1={oy} x2={ox - 10} y2={oy} stroke="#64748b" strokeWidth={0.8} />
        <line x1={ox - 18} y1={oy + bh} x2={ox - 10} y2={oy + bh} stroke="#64748b" strokeWidth={0.8} />
        <text x={ox - 16} y={cy0 + 4} fontSize={8.5} fill="#475569" fontWeight="700"
          transform={`rotate(-90, ${ox - 16}, ${cy0})`} textAnchor="middle">h = {inputs.h} mm</text>

        {/* Cover callout */}
        <line x1={ox} y1={oy + coverS} x2={ox + coverS} y2={oy + coverS}
          stroke="#f97316" strokeWidth={0.8} strokeDasharray="2,2" />
        <text x={ox + 2} y={oy + coverS - 2} fontSize={6.5} fill="#ea580c">c={inputs.cover}</text>

        {/* ── Axial load arrow — offset right of centre so it clears the b= dimension text ── */}
        <line x1={cx0 + bw * 0.2} y1={oy - 30} x2={cx0 + bw * 0.2} y2={oy - 2}
          stroke="#374151" strokeWidth={2} markerEnd="url(#loadArrow)" />
        {/* White bg prevents arrow line showing through text */}
        <rect x={cx0 + bw * 0.2 - 38} y={oy - 44} width={76} height={13} rx={2} fill="white" fillOpacity={0.9} />
        <text x={cx0 + bw * 0.2} y={oy - 34} textAnchor="middle" fontSize={8} fill="#374151" fontWeight="700">
          NEd = {inputs.Ned.toFixed(0)} kN
        </text>

        {/* Eccentricity arrow (moment indicator) */}
        {inputs.Medy > 0 && (
          <>
            <line x1={cx0} y1={cy0} x2={cx0 + 22} y2={cy0}
              stroke="#dc2626" strokeWidth={1.5} markerEnd="url(#eccArrow)" />
            <text x={cx0 + 28} y={cy0 + 3} fontSize={7} fill="#dc2626" fontWeight="700">
              e = {((inputs.Medy / inputs.Ned) * 1000).toFixed(0)} mm
            </text>
          </>
        )}

        {/* ── Right panel: capacity summary ── */}
        <rect x={panelX} y={oy} width={panelW} height={bh}
          rx={6} fill="white" stroke="#e2e8f0" strokeWidth={1} />
        <text x={panelX + panelW / 2} y={oy + 16} textAnchor="middle" fontSize={8.5} fill="#374151" fontWeight="700">
          Capacity Check
        </text>

        {/* Utilisation bar */}
        <rect x={panelX + 8} y={oy + 24} width={panelW - 16} height={10} rx={4} fill="#f1f5f9" stroke="#e2e8f0" />
        <rect x={panelX + 8} y={oy + 24} width={(panelW - 16) * Math.min(util, 1)} height={10} rx={4} fill={utilColor} />
        <text x={panelX + panelW / 2} y={oy + 32} textAnchor="middle" fontSize={7.5} fill="white" fontWeight="700">
          {(util * 100).toFixed(0)}%
        </text>

        {/* Properties */}
        {[
          [`${n}T${results.mainBars.dia}`, 'Main bars'],
          [`As = ${results.mainBars.As.toFixed(0)} mm²`, 'Steel area'],
          [`ρ = ${((results.mainBars.As / (inputs.b * inputs.h)) * 100).toFixed(2)}%`, 'Steel ratio'],
          [`T${results.links.dia}@${results.links.spacing}mm`, 'Links'],
          [`NRd = ${results.capacity.toFixed(0)} kN`, 'Axial cap.'],
        ].map(([val, lbl], i) => (
          <g key={i}>
            {/* clip at panel right edge with a rect behind */}
            <rect x={panelX + 6} y={oy + 46 + i * 18} width={panelW - 10} height={9} fill="white" fillOpacity={0.7} />
            <text x={panelX + 8} y={oy + 54 + i * 18} fontSize={8} fill="#374151" fontWeight="700">{val}</text>
            <text x={panelX + 8} y={oy + 63 + i * 18} fontSize={6.5} fill="#64748b">{lbl}</text>
          </g>
        ))}

        {/* ── Legend — clamped so it never overlaps the property rows ── */}
        <g transform={`translate(${panelX}, ${Math.max(oy + 46 + 5 * 18 + 6, oy + bh - 46)})`}>
          <circle cx={10} cy={8} r={5} fill="#f59e0b" />
          <text x={20} y={11} fontSize={7.5} fill="#374151">Main bar</text>
          <rect x={5} y={18} width={10} height={7} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={20} y={25} fontSize={7.5} fill="#374151">Link/stirrup</text>
          <rect x={5} y={30} width={10} height={7} fill="#cbd5e1" stroke="#334155" strokeWidth={1} />
          <text x={20} y={37} fontSize={7.5} fill="#374151">Concrete</text>
        </g>
      </svg>
    </div>
  );
}
