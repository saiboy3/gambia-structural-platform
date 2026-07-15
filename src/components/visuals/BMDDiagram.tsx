/**
 * BMDDiagram — Engineering-grade Bending Moment & Shear Force diagram
 * Features: reaction arrows, quarter-span grid lines with values,
 *           improved contrast, axis labels, peak callout boxes
 */

interface Props {
  span: number;            // m
  supportType: 'simply-supported' | 'cantilever' | 'continuous';
  wEd: number;             // kN/m (design UDL)
  Med: number;             // kNm (max design moment)
  Ved: number;             // kN  (max design shear)
}

const W = 360, PAD = 38;
const LEN = W - 2 * PAD;

const LOAD_Y = 22;
const BEAM_Y = 68, BEAM_H = 16;
const BMD_Y = 130, BMD_H = 68;
const SFD_Y = 228, SFD_H = 52;
const TOTAL_H = SFD_Y + SFD_H + 28;

function fmt(n: number) { return n < 10 ? n.toFixed(2) : n.toFixed(1); }

// ── Arrow markers ─────────────────────────────────────────────────────────────
function Defs() {
  return (
    <defs>
      <marker id="udlArr" markerWidth={5} markerHeight={5} refX={2.5} refY={5} orient="auto">
        <path d="M0,0 L2.5,5 L5,0 Z" fill="#2563eb" />
      </marker>
      <marker id="reactArr" markerWidth={6} markerHeight={6} refX={3} refY={0} orient="auto-start-reverse">
        <path d="M0,0 L3,6 L6,0 Z" fill="#16a34a" />
      </marker>
      <marker id="dimArr" markerWidth={5} markerHeight={5} refX={0} refY={2.5} orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#94a3b8" />
      </marker>
      <marker id="dimArrR" markerWidth={5} markerHeight={5} refX={5} refY={2.5} orient="auto-start-reverse">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#94a3b8" />
      </marker>
    </defs>
  );
}

// ── Supports ──────────────────────────────────────────────────────────────────
function PinSupport({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x - 11},${y + 15} ${x + 11},${y + 15}`} fill="#334155" />
      <line x1={x - 14} y1={y + 17} x2={x + 14} y2={y + 17} stroke="#334155" strokeWidth={2.5} />
      {[0, 5, 10].map(d => (
        <line key={d} x1={x - 14 + d * 2.8} y1={y + 17} x2={x - 18 + d * 2.8} y2={y + 22} stroke="#334155" strokeWidth={1} />
      ))}
    </g>
  );
}
function RollerSupport({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x - 10},${y + 13} ${x + 10},${y + 13}`} fill="#64748b" />
      <circle cx={x - 6} cy={y + 16} r={3.5} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <circle cx={x + 6} cy={y + 16} r={3.5} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <line x1={x - 14} y1={y + 20} x2={x + 14} y2={y + 20} stroke="#64748b" strokeWidth={2} />
    </g>
  );
}
function FixedSupport({ y }: { y: number }) {
  return (
    <g>
      <rect x={PAD - 16} y={y - 2} width={16} height={BEAM_H + 4} fill="#334155" />
      {[0, 6, 12, 18, 22].map(dy => (
        <line key={dy} x1={PAD - 16} y1={y + dy} x2={PAD - 24} y2={y + dy + 7} stroke="#334155" strokeWidth={1.5} />
      ))}
    </g>
  );
}

// ── Reaction arrows ──────────────────────────────────────────────────────────
function ReactionArrow({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y + 26} x2={x} y2={y + 2} stroke="#16a34a" strokeWidth={2} markerEnd="url(#reactArr)" />
      <text x={x} y={y + 36} textAnchor="middle" fontSize={8} fill="#15803d" fontWeight="700">{label}</text>
    </g>
  );
}

// ── Curve generators ──────────────────────────────────────────────────────────
function parabola(n: number, scale: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, y: 4 * t * (1 - t) * scale };
  });
}
function cantileverCurve(n: number, scale: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, y: t * t * scale };
  });
}
function continuousCurve(n: number, scale: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const y = -Math.cos(2 * Math.PI * t) * 0.5 + Math.sin(Math.PI * t) * 0.5;
    return { t, y: y * scale };
  });
}
function sfdLinear(scale: number) {
  return [{ t: 0, y: scale }, { t: 1, y: -scale }];
}
function sfdCantilever(n: number, scale: number) {
  return Array.from({ length: n }, (_, i) => ({ t: i / (n - 1), y: (i / (n - 1)) * scale }));
}
function sfdContinuous(n: number, scale: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, y: t < 0.5 ? (0.5 - t * 2) * scale : (t * 2 - 1.5) * scale };
  });
}

function toPoly(pts: { t: number; y: number }[], baseY: number, flip = false) {
  return pts.map(p => `${PAD + p.t * LEN},${baseY + (flip ? p.y : -p.y)}`).join(' ');
}

// ── Grid lines with quarter-span labels ──────────────────────────────────────
function GridLines({ baseY, height, span }: { baseY: number; height: number; span: number }) {
  return (
    <g>
      {[0.25, 0.5, 0.75].map(t => (
        <g key={t}>
          <line x1={PAD + t * LEN} y1={baseY - height / 2 - 2} x2={PAD + t * LEN} y2={baseY + height / 2 + 2}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,2" />
          <text x={PAD + t * LEN} y={baseY + height / 2 + 12} textAnchor="middle" fontSize={6.5} fill="#94a3b8">
            {(t * span).toFixed(1)}m
          </text>
        </g>
      ))}
    </g>
  );
}

// ── Callout box for peak value ────────────────────────────────────────────────
function CalloutBox({ x, y, value, unit, color }: { x: number; y: number; value: string; unit: string; color: string }) {
  const w = 68, h = 18;
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={3}
        fill="white" stroke={color} strokeWidth={1} fillOpacity={0.95} />
      <text x={x} y={y - 5} textAnchor="middle" fontSize={8.5} fill={color} fontWeight="700">
        {value} {unit}
      </text>
    </g>
  );
}

export default function BMDDiagram({ span, supportType, wEd, Med, Ved }: Props) {
  const N = 50;
  const bmdScale = BMD_H * 0.82;
  const sfdScale = SFD_H * 0.78;

  let bmdPts: { t: number; y: number }[], sfdPts: { t: number; y: number }[];
  let bmdFlip = false;

  if (supportType === 'cantilever') {
    bmdPts = cantileverCurve(N, bmdScale);
    sfdPts = sfdCantilever(N, sfdScale);
  } else if (supportType === 'continuous') {
    bmdPts = continuousCurve(N, bmdScale * 0.75);
    sfdPts = sfdContinuous(N, sfdScale);
  } else {
    bmdPts = parabola(N, bmdScale);
    sfdPts = sfdLinear(sfdScale);
  }

  const bmdBase = BMD_Y + BMD_H / 2;
  const sfdBase = SFD_Y + SFD_H / 2;

  const bmdCurve = toPoly(bmdPts, bmdBase, bmdFlip);
  const sfdCurve = toPoly(sfdPts, sfdBase);
  const bmdFill = `${PAD},${bmdBase} ${bmdCurve} ${PAD + LEN},${bmdBase}`;
  const sfdFill = `${PAD},${sfdBase} ${sfdCurve} ${PAD + LEN},${sfdBase}`;

  // Reactions
  const R = (wEd * span) / 2;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full select-none bg-white border border-slate-200 rounded-lg shadow-sm">
      <Defs />

      {/* ── Section headers with background bars ── */}
      {[
        { y: 8, label: 'LOADING DIAGRAM', col: '#64748b' },
        { y: BMD_Y - 16, label: 'BENDING MOMENT DIAGRAM (kNm)', col: '#1d4ed8' },
        { y: SFD_Y - 16, label: 'SHEAR FORCE DIAGRAM (kN)', col: '#9d174d' },
      ].map(({ y, label, col }) => (
        <g key={y}>
          <rect x={PAD - 4} y={y - 1} width={LEN + 8} height={11} rx={2} fill={col} fillOpacity={0.08} />
          <text x={PAD} y={y + 8} fontSize={8.5} fill={col} fontWeight="700" letterSpacing="0.5">{label}</text>
        </g>
      ))}

      {/* ── UDL block + arrows ── */}
      <rect x={PAD} y={LOAD_Y + 11} width={LEN} height={12} fill="#dbeafe" stroke="#93c5fd" strokeWidth={0.8} />
      <text x={W / 2} y={LOAD_Y + 20} textAnchor="middle" fontSize={8} fill="#2563eb" fontWeight="700">
        wEd = {fmt(wEd)} kN/m
      </text>
      {Array.from({ length: 11 }, (_, i) => {
        const x = PAD + (i / 10) * LEN;
        return (
          <line key={i} x1={x} y1={LOAD_Y + 23} x2={x} y2={BEAM_Y - 1}
            stroke="#3b82f6" strokeWidth={1.2} markerEnd="url(#udlArr)" />
        );
      })}

      {/* ── Beam ── */}
      <rect x={PAD} y={BEAM_Y} width={LEN} height={BEAM_H} rx={2} fill="#475569" />
      {/* Centroidal axis */}
      <line x1={PAD} y1={BEAM_Y + BEAM_H / 2} x2={PAD + LEN} y2={BEAM_Y + BEAM_H / 2}
        stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="4,3" />

      {/* ── Supports ── */}
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

      {/* ── Reaction arrows ── */}
      {supportType === 'simply-supported' && (
        <>
          <ReactionArrow x={PAD} y={BEAM_Y + BEAM_H + 18} label={`RA=${fmt(R)} kN`} />
          <ReactionArrow x={PAD + LEN} y={BEAM_Y + BEAM_H + 18} label={`RB=${fmt(R)} kN`} />
        </>
      )}
      {supportType === 'cantilever' && (
        <ReactionArrow x={PAD} y={BEAM_Y + BEAM_H + 18} label={`R=${fmt(wEd * span)} kN`} />
      )}

      {/* Span label — white text centred on beam body, avoids UDL arrow zone */}
      <text x={W / 2} y={BEAM_Y + BEAM_H / 2 + 3} textAnchor="middle" fontSize={8}
        fill="white" fontWeight="700">L = {span} m</text>

      {/* ── BMD ── */}
      {/* Zero line */}
      <line x1={PAD} y1={bmdBase} x2={PAD + LEN} y2={bmdBase} stroke="#334155" strokeWidth={1} />
      {/* Y-axis */}
      <line x1={PAD - 1} y1={bmdBase - bmdScale - 4} x2={PAD - 1} y2={bmdBase + 4}
        stroke="#1d4ed8" strokeWidth={0.8} markerEnd="url(#dimArr)" />
      <text x={PAD - 4} y={bmdBase - bmdScale - 6} fontSize={7} fill="#1d4ed8" textAnchor="middle">M</text>

      <GridLines baseY={bmdBase} height={BMD_H} span={span} />
      <polygon points={bmdFill} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.8} fillOpacity={0.65} />

      {/* Mid-span quarter annotations */}
      {supportType === 'simply-supported' && (
        <>
          <line x1={PAD + 0.25 * LEN} y1={bmdBase} x2={PAD + 0.25 * LEN} y2={bmdBase - 0.5 * bmdScale}
            stroke="#93c5fd" strokeWidth={0.6} strokeDasharray="2,2" />
          {/* white background prevents overlap with BMD fill */}
          <rect x={PAD + 0.25 * LEN + 2} y={bmdBase - 0.5 * bmdScale - 8} width={46} height={10} rx={1} fill="white" fillOpacity={0.85} />
          <text x={PAD + 0.25 * LEN + 3} y={bmdBase - 0.5 * bmdScale} fontSize={6.5} fill="#1d4ed8">
            {fmt(Med * 0.75)} kNm
          </text>
          <CalloutBox x={W / 2} y={bmdBase - bmdScale + 2}
            value={fmt(Med)} unit="kNm" color="#1d4ed8" />
        </>
      )}
      {supportType === 'cantilever' && (
        <CalloutBox x={PAD + 12} y={bmdBase - bmdScale + 2}
          value={fmt(Med)} unit="kNm" color="#1d4ed8" />
      )}
      {supportType === 'continuous' && (
        <text x={W / 2} y={bmdBase + bmdScale * 0.5 - 2} textAnchor="middle" fontSize={8} fill="#1d4ed8" fontWeight="700">
          {fmt(Med)} kNm
        </text>
      )}

      {/* ── SFD ── */}
      <line x1={PAD} y1={sfdBase} x2={PAD + LEN} y2={sfdBase} stroke="#334155" strokeWidth={1} />
      <line x1={PAD - 1} y1={sfdBase - sfdScale - 4} x2={PAD - 1} y2={sfdBase + sfdScale + 4}
        stroke="#9d174d" strokeWidth={0.8} markerEnd="url(#dimArr)" />
      <text x={PAD - 4} y={sfdBase - sfdScale - 6} fontSize={7} fill="#9d174d" textAnchor="middle">V</text>

      <GridLines baseY={sfdBase} height={SFD_H} span={span} />
      <polygon points={sfdFill} fill="#fce7f3" stroke="#db2777" strokeWidth={1.8} fillOpacity={0.65} />

      {supportType === 'simply-supported' && (
        <>
          <CalloutBox x={PAD + 20} y={sfdBase - sfdScale + 2} value={`+${fmt(Ved)}`} unit="kN" color="#9d174d" />
          {/* Negative callout placed inside SFD zone, above the bottom boundary */}
          <CalloutBox x={PAD + LEN - 20} y={sfdBase + sfdScale - 4} value={`−${fmt(Ved)}`} unit="kN" color="#9d174d" />
          {/* Zero crossing tick + label below the baseline */}
          <line x1={PAD + LEN / 2} y1={sfdBase - 6} x2={PAD + LEN / 2} y2={sfdBase + 6}
            stroke="#9d174d" strokeWidth={1.2} />
          <text x={PAD + LEN / 2 + 3} y={sfdBase + 14} fontSize={6.5} fill="#9d174d">V=0 @ L/2</text>
        </>
      )}
      {supportType === 'cantilever' && (
        <CalloutBox x={PAD + 16} y={sfdBase - sfdScale + 2} value={fmt(Ved)} unit="kN" color="#9d174d" />
      )}
      {supportType === 'continuous' && (
        <text x={PAD + 8} y={sfdBase - sfdScale + 2} fontSize={8} fill="#9d174d" fontWeight="700">±{fmt(Ved)} kN</text>
      )}

      {/* ── Bottom span axis ── */}
      <line x1={PAD} y1={TOTAL_H - 14} x2={PAD + LEN} y2={TOTAL_H - 14}
        stroke="#e2e8f0" strokeWidth={0.8} />
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={PAD + t * LEN} y1={TOTAL_H - 17} x2={PAD + t * LEN} y2={TOTAL_H - 11}
            stroke="#94a3b8" strokeWidth={0.8} />
          <text x={PAD + t * LEN} y={TOTAL_H - 4} textAnchor="middle" fontSize={7} fill="#94a3b8">
            {(t * span).toFixed(t === 0 || t === 1 ? 0 : 1)}m
          </text>
        </g>
      ))}
    </svg>
  );
}
