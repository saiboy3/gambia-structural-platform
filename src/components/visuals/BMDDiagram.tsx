/**
 * BMDDiagram — Reactive Bending Moment & Shear Force diagram
 * Renders a schematic: beam elevation → load arrows → BMD → SFD
 * Supports: simply-supported | cantilever | continuous (2-span approx)
 */

interface Props {
  span: number;            // m
  supportType: 'simply-supported' | 'cantilever' | 'continuous';
  wEd: number;             // kN/m (design UDL)
  Med: number;             // kNm (max design moment)
  Ved: number;             // kN  (max design shear)
}

const W = 340, PAD = 32;
const BEAM_Y = 56, BEAM_H = 18;
const BMD_Y = 110, BMD_H = 60;
const SFD_Y = 196, SFD_H = 44;
const LEN = W - 2 * PAD;

function fmt(n: number) { return n < 10 ? n.toFixed(2) : n.toFixed(1); }

// ── Load arrows ───────────────────────────────────────────────────────────────
function LoadArrows({ count = 9, wEdVal }: { count?: number; wEdVal: number }) {
  const arrows = Array.from({ length: count }, (_, i) => PAD + (i + 0.5) * (LEN / count));
  return (
    <g>
      {arrows.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={BEAM_Y - 22} x2={x} y2={BEAM_Y - 2} stroke="#3b82f6" strokeWidth={1.5} />
          <polygon points={`${x},${BEAM_Y - 2} ${x - 4},${BEAM_Y - 10} ${x + 4},${BEAM_Y - 10}`} fill="#3b82f6" />
        </g>
      ))}
      <text x={W / 2} y={BEAM_Y - 26} textAnchor="middle" fontSize={9} fill="#3b82f6" fontWeight="600">
        wEd = {fmt(wEdVal)} kN/m
      </text>
    </g>
  );
}

// ── Supports ─────────────────────────────────────────────────────────────────
function PinSupport({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x - 10},${y + 14} ${x + 10},${y + 14}`} fill="#475569" />
      <line x1={x - 13} y1={y + 16} x2={x + 13} y2={y + 16} stroke="#475569" strokeWidth={2} />
    </g>
  );
}
function RollerSupport({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x - 10},${y + 12} ${x + 10},${y + 12}`} fill="#64748b" />
      <circle cx={x - 6} cy={y + 15} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <circle cx={x + 6} cy={y + 15} r={3} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <line x1={x - 13} y1={y + 18} x2={x + 13} y2={y + 18} stroke="#64748b" strokeWidth={2} />
    </g>
  );
}
function FixedSupport({ y }: { y: number }) {
  const x = PAD;
  return (
    <g>
      <rect x={x - 14} y={y - 2} width={14} height={BEAM_H + 4} fill="#475569" />
      {[0, 6, 12, 18, 24].map(dy => (
        <line key={dy} x1={x - 14} y1={y + dy} x2={x - 22} y2={y + dy + 7} stroke="#475569" strokeWidth={1.5} />
      ))}
    </g>
  );
}

// ── Curve generators ──────────────────────────────────────────────────────────
function parabola(n: number, scale: number, flip = false) {
  // midspan peak — simply supported UDL parabola
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);        // 0→1
    const y = 4 * t * (1 - t);    // 0 at ends, 1 at midspan
    return { t, y: flip ? -y * scale : y * scale };
  });
}

function cantileverCurve(n: number, scale: number) {
  // Fixed at left, free at right — parabola opening toward fixed end
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const y = t * t;               // 0 at free end, 1 at fixed end
    return { t, y: y * scale };
  });
}

function continuousCurve(n: number, scale: number) {
  // Approximate hogging at centre, sagging at quarter spans
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);        // 0→1
    // Approximate: positive at 1/4 and 3/4 spans, negative at centre and ends
    const y = -Math.cos(2 * Math.PI * t) * 0.5 + Math.sin(Math.PI * t) * 0.5;
    return { t, y: y * scale };
  });
}

function sfdLinear(scale: number, flip = false) {
  // Simply supported: linear from +V to -V
  return [
    { t: 0, y: flip ? -scale : scale },
    { t: 1, y: flip ? scale : -scale },
  ];
}
function sfdCantilever(n: number, scale: number) {
  // Linear from 0 at free end to V at fixed end
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, y: t * scale };
  });
}
function sfdContinuous(n: number, scale: number) {
  // Approximate stepped SFD for continuous beam (2-span)
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    if (t < 0.5) return { t, y: (0.5 - t * 2) * scale };
    return { t, y: (t * 2 - 1.5) * scale };
  });
}

function pointsFromCurve(pts: { t: number; y: number }[], baseY: number, flip = false) {
  return pts.map(p => `${PAD + p.t * LEN},${baseY + (flip ? p.y : -p.y)}`).join(' ');
}

export default function BMDDiagram({ span, supportType, wEd, Med, Ved }: Props) {
  const N = 40;
  const bmdScale = Math.min(BMD_H - 8, 52);
  const sfdScale = Math.min(SFD_H - 6, 38);

  // BMD curve points
  let bmdPts: { t: number; y: number }[];
  let sfdPts: { t: number; y: number }[];
  let bmdFlip = false;
  let sfdFlip = false;

  if (supportType === 'cantilever') {
    bmdPts = cantileverCurve(N, bmdScale);
    sfdPts = sfdCantilever(N, sfdScale);
    bmdFlip = false;
    sfdFlip = false;
  } else if (supportType === 'continuous') {
    bmdPts = continuousCurve(N, bmdScale * 0.75);
    sfdPts = sfdContinuous(N, sfdScale);
  } else {
    bmdPts = parabola(N, bmdScale);
    sfdPts = sfdLinear(sfdScale);
  }

  // Build SVG polygon paths
  const bmdBase = BMD_Y + BMD_H / 2;
  const sfdBase = SFD_Y + SFD_H / 2;

  const bmdCurveStr = pointsFromCurve(bmdPts, bmdBase, bmdFlip);
  const sfdCurveStr = pointsFromCurve(sfdPts, sfdBase, sfdFlip);

  // Filled polygons: close back along baseline
  const bmdFill = `${PAD},${bmdBase} ` + bmdCurveStr + ` ${PAD + LEN},${bmdBase}`;
  const sfdFill = `${PAD},${sfdBase} ` + sfdCurveStr + ` ${PAD + LEN},${sfdBase}`;

  const totalH = SFD_Y + SFD_H + 24;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} className="w-full select-none">

      {/* ── Beam elevation ─────────────────────────────────────── */}
      <text x={PAD} y={16} fontSize={9} fill="#94a3b8" fontWeight="600" textAnchor="start">LOADING DIAGRAM</text>
      <LoadArrows wEdVal={wEd} />
      <rect x={PAD} y={BEAM_Y} width={LEN} height={BEAM_H} rx={2} fill="#475569" />

      {/* Span label */}
      <line x1={PAD} y1={BEAM_Y + BEAM_H + 20} x2={PAD + LEN} y2={BEAM_Y + BEAM_H + 20} stroke="#94a3b8" strokeWidth={1} markerEnd="url(#arr)" />
      <text x={W / 2} y={BEAM_Y + BEAM_H + 32} textAnchor="middle" fontSize={9} fill="#64748b">L = {span} m</text>

      {/* Supports */}
      {supportType === 'cantilever' ? (
        <FixedSupport y={BEAM_Y} />
      ) : (
        <PinSupport x={PAD} y={BEAM_Y + BEAM_H} />
      )}
      {supportType === 'simply-supported' && <RollerSupport x={PAD + LEN} y={BEAM_Y + BEAM_H} />}
      {supportType === 'continuous' && (
        <>
          <PinSupport x={PAD + LEN / 2} y={BEAM_Y + BEAM_H} />
          <RollerSupport x={PAD + LEN} y={BEAM_Y + BEAM_H} />
        </>
      )}

      {/* ── BMD ─────────────────────────────────────────────────── */}
      <text x={PAD} y={BMD_Y - 4} fontSize={9} fill="#94a3b8" fontWeight="600">BENDING MOMENT DIAGRAM</text>
      <line x1={PAD} y1={bmdBase} x2={PAD + LEN} y2={bmdBase} stroke="#e2e8f0" strokeWidth={1} />
      <polygon points={bmdFill} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={0.6} />

      {/* Peak moment label */}
      {supportType !== 'cantilever' && (
        <text x={W / 2} y={bmdBase - bmdScale + 2} textAnchor="middle" fontSize={9} fill="#1d4ed8" fontWeight="700">
          {fmt(Med)} kNm
        </text>
      )}
      {supportType === 'cantilever' && (
        <text x={PAD + 8} y={bmdBase - bmdScale + 2} fontSize={9} fill="#1d4ed8" fontWeight="700">
          {fmt(Med)} kNm
        </text>
      )}

      {/* ── SFD ─────────────────────────────────────────────────── */}
      <text x={PAD} y={SFD_Y - 4} fontSize={9} fill="#94a3b8" fontWeight="600">SHEAR FORCE DIAGRAM</text>
      <line x1={PAD} y1={sfdBase} x2={PAD + LEN} y2={sfdBase} stroke="#e2e8f0" strokeWidth={1} />
      <polygon points={sfdFill} fill="#fce7f3" stroke="#db2777" strokeWidth={1.5} fillOpacity={0.6} />

      {/* SFD labels */}
      {supportType === 'simply-supported' && (
        <>
          <text x={PAD + 4} y={sfdBase - sfdScale + 2} fontSize={9} fill="#be185d" fontWeight="700">+{fmt(Ved)} kN</text>
          <text x={PAD + LEN - 4} y={sfdBase + sfdScale - 2} fontSize={9} fill="#be185d" fontWeight="700" textAnchor="end">−{fmt(Ved)} kN</text>
        </>
      )}
      {supportType === 'cantilever' && (
        <text x={PAD + 4} y={sfdBase - sfdScale + 2} fontSize={9} fill="#be185d" fontWeight="700">{fmt(Ved)} kN</text>
      )}
      {supportType === 'continuous' && (
        <text x={PAD + 4} y={sfdBase - sfdScale + 2} fontSize={9} fill="#be185d" fontWeight="700">±{fmt(Ved)} kN</text>
      )}

      {/* Bottom axis labels */}
      <text x={PAD} y={totalH - 4} fontSize={8} fill="#94a3b8">0</text>
      <text x={PAD + LEN} y={totalH - 4} fontSize={8} fill="#94a3b8" textAnchor="end">L={span}m</text>
    </svg>
  );
}
