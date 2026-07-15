/**
 * Composite beam design — EC4 (EN 1994-1-1)
 * Steel UB + concrete slab (solid or profiled deck)
 * Checks: bending (plastic stress block), shear connectors (headed studs),
 *         deflection (unpropped construction), shear at steel section
 */
import { PORTAL_SECTIONS } from './portalFrameCalculations';

export interface CompositeBeamInputs {
  span: number;          // m
  beamSpacing: number;   // m — CL to CL of beams (effective slab width = min(span/8 each side, half clear spacing))
  steelSection: string;  // UB section name
  fyk: number;           // MPa — steel yield (275 or 355)
  slabDepth: number;     // mm — overall slab thickness (above deck or solid)
  deckDepth: number;     // mm — deck profile depth (0 for solid slab)
  fck: number;           // MPa — concrete cylinder strength
  // Loading
  deadLoadConst: number; // kN/m² — construction dead (formwork, wet concrete) — during erection
  deadLoadFinal: number; // kN/m² — superimposed dead (finishes, services)
  liveLoad: number;      // kN/m²
  // Degree of interaction
  interaction: number;   // 0.4–1.0 (0.4 min EC4 clause 6.6.1.2)
  // Stud details
  studDia: number;       // mm — typically 19mm
  studHeight: number;    // mm — typically 95–125mm
  studFu: number;        // MPa — ultimate tensile strength (450 for standard)
  studsPerRow: number;   // 1 or 2
}

export interface CompositeBeamResults {
  status: 'pass' | 'warn' | 'fail';
  // Effective width
  beff: number;          // m
  // Steel section properties
  Aa: number;            // cm²
  ha: number;            // mm — steel depth
  // Plastic neutral axis
  hc: number;            // mm — concrete slab depth above deck
  Mpl_Rd: number;        // kNm — full composite plastic resistance
  Mpl_partial: number;   // kNm — partial composite
  // Design moment
  Med: number;           // kNm
  util_bending: number;
  // Shear connectors
  PRd_stud: number;      // kN — design resistance per stud
  nStudsRequired: number;
  nStudsProvided: number;
  studSpacing: number;   // mm
  // Vertical shear
  Ved: number;           // kN
  VplRd: number;         // kN — shear resistance of steel web
  util_shear: number;
  // Deflection
  delta_const: number;   // mm — construction stage (steel alone)
  delta_comp: number;    // mm — composite stage (additional)
  delta_total: number;   // mm
  deltaLimit: number;    // mm — span/360
  deflectionOK: boolean;
  messages: string[];
}

export function designCompositeBeam(inp: CompositeBeamInputs): CompositeBeamResults {
  const msgs: string[] = [];

  const sec = PORTAL_SECTIONS.find(s => s.name === inp.steelSection) ?? PORTAL_SECTIONS[4];
  const { span, fyk, fck } = inp;
  const gammaM0 = 1.0, gammaV = 1.25;
  const Ecm = 22000 * (fck / 10) ** 0.3;  // MPa — mean elastic modulus EC2

  // ── Effective slab width ──────────────────────────────────────────────────
  const beff_each = Math.min(span / 8, inp.beamSpacing / 2);
  const beff = 2 * beff_each;  // m (symmetric)

  // ── Slab geometry ─────────────────────────────────────────────────────────
  const hc = inp.slabDepth - inp.deckDepth;  // mm — concrete above deck

  // ── Design loads ──────────────────────────────────────────────────────────
  const wTotal = 1.35 * (inp.deadLoadConst + inp.deadLoadFinal) * inp.beamSpacing + 1.5 * inp.liveLoad * inp.beamSpacing;

  const Med = wTotal * span * span / 8;  // kNm
  const Ved = wTotal * span / 2;         // kN

  // ── Full composite moment resistance (EC4 6.2.1.2) ──────────────────────
  const Nc_full = (0.85 * fck / 1.5) * (beff * 1000) * hc / 1000;  // kN — max concrete force
  const Na_full = (fyk / gammaM0) * sec.A * 100 / 1000;              // kN — steel yield force (A cm²)
  const Nc_eff = Math.min(Nc_full, Na_full);  // governing compression force

  // Plastic NA: assuming NA in concrete (concrete governs)
  const x_pl = (Na_full * 1000) / ((0.85 * fck / 1.5) * beff * 1000);  // mm — PNA in slab
  const zc = sec.h / 2 + inp.deckDepth + hc - x_pl / 2;  // mm — lever arm steel centroid to concrete block centroid
  const Mpl_Rd = (Na_full * zc) / 1000;  // kNm

  // ── Partial composite ─────────────────────────────────────────────────────
  const eta = Math.max(inp.interaction, 0.4);  // degree of interaction
  const Nc_partial = eta * Nc_eff;  // kN
  // Interpolate: Mpl_partial ≈ Ma_Rd + eta×(Mpl_Rd - Ma_Rd)
  const Ma_Rd = (sec.Sx * fyk) / (gammaM0 * 1000);  // kNm — steel alone
  const Mpl_partial = Ma_Rd + eta * (Mpl_Rd - Ma_Rd);

  const util_bending = Med / Mpl_partial;
  if (util_bending > 1) msgs.push(`FAIL: Bending utilisation ${(util_bending * 100).toFixed(0)}% — increase section or composite ratio`);
  else msgs.push(`PASS: Bending ${(util_bending * 100).toFixed(0)}% utilised (MEd=${Med.toFixed(0)} kNm / Mpl=${Mpl_partial.toFixed(0)} kNm)`);

  // ── Shear connector resistance (EC4 6.6.3.1 headed studs) ──────────────
  const d = inp.studDia;  // mm
  const hsc = inp.studHeight;  // mm
  const fu = inp.studFu;
  const PRd1 = (0.8 * fu * Math.PI * d * d / 4) / (gammaV * 1000);  // kN — shear failure
  const PRd2 = (0.29 * d * d * Math.sqrt(fck * Ecm)) / (gammaV * 1000);  // kN — concrete failure
  // Deck reduction factor k (EC4 6.6.4.2) — simplified
  const kt = inp.deckDepth > 0 ? Math.min(1.0, (0.7 / Math.sqrt(inp.studsPerRow)) * (hsc / inp.deckDepth - 1)) : 1.0;
  const PRd_stud = Math.min(PRd1, PRd2) * kt;

  // Number of studs (half span)
  const nStudsRequired = Math.ceil(Nc_partial / PRd_stud);
  // Stud spacing (mm) — min 5d, max 800mm or 6×(slab+deck)
  const studSpacingCalc = (span * 1000 / 2) / nStudsRequired;
  const studSpacing_min = Math.max(5 * d, 100);
  const studSpacing_max = Math.min(800, 6 * inp.slabDepth);
  const studSpacing = Math.min(studSpacing_max, Math.max(studSpacingCalc, studSpacing_min));
  const nStudsProvided = Math.ceil((span * 1000 / 2) / studSpacing);

  if (nStudsProvided < nStudsRequired)
    msgs.push(`WARN: ${nStudsRequired} studs required per half span, ${nStudsProvided} provided — reduce stud spacing`);
  else
    msgs.push(`PASS: Studs — ${nStudsProvided} × T${d} studs @ ${studSpacing.toFixed(0)}mm per half span`);

  // ── Vertical shear ────────────────────────────────────────────────────────
  const hw = sec.h - 2 * sec.tf;  // web depth mm
  const VplRd = (fyk / (Math.sqrt(3) * gammaM0)) * (hw * sec.tw) / 1000;  // kN
  const util_shear = Ved / VplRd;
  if (util_shear > 1) msgs.push(`FAIL: Shear utilisation ${(util_shear * 100).toFixed(0)}%`);
  else msgs.push(`PASS: Shear ${(util_shear * 100).toFixed(0)}%`);

  // ── Deflection ────────────────────────────────────────────────────────────
  // Construction stage — steel beam alone (unpropped)
  const wSLS_const = inp.deadLoadConst * inp.beamSpacing;  // kN/m
  const Ia = sec.Ix * 1e4;  // mm⁴
  const E_steel = 210000;   // MPa
  const delta_const = (5 * wSLS_const * (span * 1000) ** 4) / (384 * E_steel * Ia);  // mm (wSLS_const kN/m ≡ N/mm)

  // Composite stage (additional imposed load)
  // Use transformed section modulus (simplified: n = Ea/Ecm ~ 6-10)
  const n_ratio = E_steel / Ecm;
  const Icomp = Ia + (beff * 1000 / n_ratio) * hc ** 3 / 12 + (beff * 1000 / n_ratio) * hc * (sec.h / 2 + inp.deckDepth + hc / 2) ** 2;
  const wSLS_imposed = inp.liveLoad * inp.beamSpacing;  // kN/m
  const delta_comp = (5 * wSLS_imposed * (span * 1000) ** 4) / (384 * E_steel * Icomp);  // mm (wSLS_imposed kN/m ≡ N/mm)

  const delta_total = delta_const + delta_comp;
  const deltaLimit = (span * 1000) / 360;
  const deflectionOK = delta_total <= deltaLimit;

  if (!deflectionOK) msgs.push(`FAIL: Deflection ${delta_total.toFixed(1)}mm > L/360=${deltaLimit.toFixed(1)}mm — increase section or add props`);
  else msgs.push(`PASS: Deflection ${delta_total.toFixed(1)}mm ≤ L/360=${deltaLimit.toFixed(1)}mm`);

  const status: CompositeBeamResults['status'] =
    msgs.some(m => m.startsWith('FAIL')) ? 'fail' :
    msgs.some(m => m.startsWith('WARN')) ? 'warn' : 'pass';

  return {
    status, beff: +beff.toFixed(2),
    Aa: sec.A, ha: sec.h, hc,
    Mpl_Rd: +Mpl_Rd.toFixed(1), Mpl_partial: +Mpl_partial.toFixed(1),
    Med: +Med.toFixed(1), util_bending: +util_bending.toFixed(3),
    PRd_stud: +PRd_stud.toFixed(1), nStudsRequired, nStudsProvided, studSpacing: +studSpacing.toFixed(0),
    Ved: +Ved.toFixed(1), VplRd: +VplRd.toFixed(1), util_shear: +util_shear.toFixed(3),
    delta_const: +delta_const.toFixed(1), delta_comp: +delta_comp.toFixed(1),
    delta_total: +delta_total.toFixed(1), deltaLimit: +deltaLimit.toFixed(1),
    deflectionOK, messages: msgs,
  };
}
