import type { SlabInputs, SlabResults } from '../../types/structural';

interface Props { inputs: SlabInputs; results: SlabResults }

export default function SlabSection({ inputs, results }: Props) {
  const W = 320, H = 200;
  const thickness = inputs.thickness;
  const scale = Math.min((W - 80) / (inputs.lx * 1000), (H - 80) / thickness);
  const sw = inputs.lx * 1000 * scale;
  const sh = thickness * scale;
  const ox = (W - sw) / 2, oy = (H - sh) / 2;
  const cover = inputs.cover * scale;
  const diaX = results.barsX.dia * scale;
  const diaY = results.barsY.dia * scale;
  const spacingX = results.barsX.spacing * scale;

  const bars: number[] = [];
  let bx = ox + cover;
  while (bx < ox + sw - cover) { bars.push(bx); bx += spacingX; }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Section Through Slab</p>
      <svg width={W} height={H} className="border border-slate-200 rounded-lg bg-slate-50">
        {/* Slab body */}
        <rect x={ox} y={oy} width={sw} height={sh} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />

        {/* Bottom X bars */}
        {bars.map((x, i) => (
          <circle key={`x${i}`} cx={x} cy={oy + sh - cover - diaX / 2} r={Math.max(diaX / 2, 2)} fill="#1e40af" />
        ))}

        {/* Top Y bars (distribution) — slightly smaller */}
        {bars.filter((_, i) => i % 2 === 0).map((x, i) => (
          <circle key={`y${i}`} cx={x} cy={oy + cover + diaY / 2} r={Math.max(diaY / 2, 1.5)} fill="#6366f1" />
        ))}

        {/* Thickness dimension */}
        <line x1={ox - 15} y1={oy} x2={ox - 15} y2={oy + sh} stroke="#94a3b8" strokeWidth={1} />
        <text x={ox - 18} y={oy + sh / 2} fontSize={9} fill="#64748b" textAnchor="end" dominantBaseline="middle">{thickness} mm</text>

        {/* Span dimension */}
        <line x1={ox} y1={oy + sh + 15} x2={ox + sw} y2={oy + sh + 15} stroke="#94a3b8" strokeWidth={1} />
        <text x={ox + sw / 2} y={oy + sh + 26} textAnchor="middle" fontSize={9} fill="#64748b">lx = {inputs.lx} m</text>

        {/* Legend */}
        <circle cx={W - 70} cy={H - 36} r={4} fill="#1e40af" />
        <text x={W - 62} y={H - 33} fontSize={8} fill="#1e40af">T{results.barsX.dia}@{results.barsX.spacing} (bot)</text>
        <circle cx={W - 70} cy={H - 22} r={3} fill="#6366f1" />
        <text x={W - 62} y={H - 19} fontSize={8} fill="#6366f1">T{results.barsY.dia}@{results.barsY.spacing} (top)</text>
      </svg>

      {/* Plan view hint for two-way */}
      {inputs.type === 'two-way' && (
        <svg width={W} height={140} className="border border-slate-200 rounded-lg bg-slate-50">
          <text x={W / 2} y={14} textAnchor="middle" fontSize={9} fill="#64748b" fontWeight="600">Plan — Two-Way Slab</text>
          {/* Slab plan */}
          {(() => {
            const ps = Math.min((W - 60) / (inputs.ly * 1000), (H - 40) / (inputs.lx * 1000));
            const pw = inputs.ly * 1000 * ps, ph = inputs.lx * 1000 * ps;
            const px = (W - pw) / 2, py = 22;
            const sxLines = Array.from({ length: 5 }, (_, i) => py + (ph / 6) * (i + 1));
            const syLines = Array.from({ length: 5 }, (_, i) => px + (pw / 6) * (i + 1));
            return (
              <>
                <rect x={px} y={py} width={pw} height={ph} fill="#f1f5f9" stroke="#475569" strokeWidth={2} />
                {sxLines.map((y, i) => <line key={`sx${i}`} x1={px + 4} y1={y} x2={px + pw - 4} y2={y} stroke="#1e40af" strokeWidth={1.5} strokeDasharray="4,3" />)}
                {syLines.map((x, i) => <line key={`sy${i}`} x1={x} y1={py + 4} x2={x} y2={py + ph - 4} stroke="#6366f1" strokeWidth={1} strokeDasharray="2,3" />)}
                <text x={px - 4} y={py + ph / 2} fontSize={8} fill="#64748b" textAnchor="end" dominantBaseline="middle">lx={inputs.lx}m</text>
                <text x={px + pw / 2} y={py + ph + 12} fontSize={8} fill="#64748b" textAnchor="middle">ly={inputs.ly}m</text>
              </>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
