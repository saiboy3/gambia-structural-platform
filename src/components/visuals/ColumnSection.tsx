import type { ColumnInputs, ColumnResults } from '../../types/structural';

interface Props { inputs: ColumnInputs; results: ColumnResults }

export default function ColumnSection({ inputs, results }: Props) {
  const W = 280, H = 280;
  const isCirc = inputs.shape === 'circular';
  const scale = Math.min((W - 60) / inputs.b, (H - 60) / inputs.h);
  const bw = inputs.b * scale, bh = inputs.h * scale;
  const ox = (W - bw) / 2, oy = (H - bh) / 2;
  const cover = inputs.cover * scale;
  const diaScale = results.mainBars.dia * scale;
  const linkDia = results.links.dia * scale;

  const n = results.mainBars.count;
  const barPositions: { x: number; y: number }[] = [];

  if (isCirc) {
    const r = bw / 2 - cover - diaScale / 2;
    const cx = ox + bw / 2, cy = oy + bh / 2;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      barPositions.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  } else {
    // Corner + sides
    const corners = [
      { x: ox + cover + diaScale / 2, y: oy + cover + diaScale / 2 },
      { x: ox + bw - cover - diaScale / 2, y: oy + cover + diaScale / 2 },
      { x: ox + bw - cover - diaScale / 2, y: oy + bh - cover - diaScale / 2 },
      { x: ox + cover + diaScale / 2, y: oy + bh - cover - diaScale / 2 },
    ];
    barPositions.push(...corners);
    const extras = n - 4;
    for (let i = 0; i < extras; i++) {
      const side = i % 4;
      const p = Math.floor(i / 4) + 1;
      const total = Math.ceil(extras / 4) + 1;
      if (side === 0) barPositions.push({ x: ox + cover + diaScale / 2, y: oy + cover + (p / total) * (bh - 2 * cover) });
      else if (side === 1) barPositions.push({ x: ox + (p / total) * (bw - 2 * cover) + cover, y: oy + cover + diaScale / 2 });
      else if (side === 2) barPositions.push({ x: ox + bw - cover - diaScale / 2, y: oy + cover + (p / total) * (bh - 2 * cover) });
      else barPositions.push({ x: ox + (p / total) * (bw - 2 * cover) + cover, y: oy + bh - cover - diaScale / 2 });
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cross-Section</p>
      <svg width={W} height={H} className="border border-slate-200 rounded-lg bg-slate-50">
        {/* Concrete */}
        {isCirc
          ? <ellipse cx={ox + bw / 2} cy={oy + bh / 2} rx={bw / 2} ry={bh / 2} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
          : <rect x={ox} y={oy} width={bw} height={bh} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
        }

        {/* Link */}
        {isCirc
          ? <ellipse cx={ox + bw / 2} cy={oy + bh / 2} rx={bw / 2 - cover + linkDia / 2} ry={bh / 2 - cover + linkDia / 2}
              fill="none" stroke="#3b82f6" strokeWidth={Math.max(linkDia, 1.5)} />
          : <rect x={ox + cover - linkDia / 2} y={oy + cover - linkDia / 2}
              width={bw - 2 * cover + linkDia} height={bh - 2 * cover + linkDia}
              fill="none" stroke="#3b82f6" strokeWidth={Math.max(linkDia, 1.5)} rx={3} />
        }

        {/* Main bars */}
        {barPositions.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={diaScale / 2} fill="#1e40af" />
        ))}

        {/* Dimensions */}
        <text x={W / 2} y={oy - 8} textAnchor="middle" fontSize={9} fill="#64748b">{inputs.b} mm</text>
        <text x={ox + bw + 10} y={oy + bh / 2} fontSize={9} fill="#64748b" dominantBaseline="middle">{inputs.h} mm</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={8} fill="#1e40af">
          {n}T{results.mainBars.dia} (As={results.mainBars.As.toFixed(0)} mm²)
        </text>
        <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={8} fill="#3b82f6">
          Links: T{results.links.dia} @ {results.links.spacing} mm c/c
        </text>
      </svg>
    </div>
  );
}
