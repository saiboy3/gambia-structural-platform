import type { FoundationInputs, FoundationResults } from '../types/structural';
import type { CodeFactors } from '../context/BuildingCodeContext';
import { chooseSpacing } from './materials';

export function designFoundation(inp: FoundationInputs, _code: Partial<CodeFactors> = {}): FoundationResults {
  const msgs: string[] = [];
  const { fck, fyd } = inp.material;

  const Ntotal = inp.Ned * (1 + inp.selfWeight / 100); // kN
  const qa     = inp.soilBearing; // kN/m²

  // Sizing
  let L = 0, B = 0;
  if (inp.type === 'pad') {
    // Assume square then adjust for eccentricity
    B = Math.sqrt(Ntotal / qa);
    L = B;
    // Eccentric load — increase size
    if (inp.Med > 0) {
      // Iterate: q = N/BL ± 6M/BL²  ≤ qa
      let iter = 0;
      while (iter < 20) {
        const qmax = Ntotal / (B * L) + 6 * inp.Med / (B * L * L);
        if (qmax <= qa) break;
        L += 0.1;
        iter++;
      }
    }
    L = Math.ceil(L * 10) / 10;
    B = Math.ceil(B * 10) / 10;
  } else {
    // Strip: 1m run
    const stripLen = inp.stripLength ?? 1;
    B = Ntotal / (qa * stripLen);
    B = Math.ceil(B * 10) / 10;
    L = stripLen;
  }

  // Foundation depth & effective depth
  const h = Math.max(inp.depth, Math.ceil((inp.columnB + 100) / 50) * 50);  // mm practical min
  const d = h - inp.cover - 12;

  // Net upward soil pressure (ULS) — NEd is already the design (factored) axial
  // load per EC2 notation, matching how Ntotal was used for sizing above, so no
  // additional γG factor is applied here.
  const qEd  = inp.Ned / (L * B);  // kN/m²

  // Bending: critical section at face of column
  const cx   = inp.columnB / 1000; // m
  const a    = (B - cx) / 2;       // m projection
  const Med  = qEd * a * a / 2;    // kNm/m

  // Bottom steel
  const AsReq = Math.max((Med * 1e6) / (fyd * 0.9 * d), 0.0013 * 1000 * h);
  const barsBot = chooseSpacing(AsReq);

  // Punching shear check (EC2 6.4) — basic control perimeter u1 at 2d from column face
  const u1 = 2 * (inp.columnB + inp.columnH) + 2 * Math.PI * 2 * d;  // mm
  const βVed = inp.Ned * 1000 * 1.15;                                   // N (NEd already factored; eccentricity factor 1.15)
  const vEd  = βVed / (u1 * d);                                         // N/mm²
  const ρl   = Math.min(barsBot.As / (1000 * d), 0.02);
  const k    = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const vRdc = (0.18 / 1.5) * k * (100 * ρl * fck) ** (1/3);          // N/mm²
  const punchingOK = vEd <= vRdc;
  if (!punchingOK) msgs.push('WARN: Punching shear exceeded — increase depth or add punching links');

  const bendingOK = AsReq <= barsBot.As;
  if (!bendingOK) msgs.push('FAIL: Bending steel inadequate');
  if (qEd > qa) msgs.push(`WARN: Net soil pressure ${qEd.toFixed(1)} kN/m² exceeds allowable ${qa} kN/m²`);

  // ── Sliding check (base friction resistance vs. horizontal load) ────────
  // Conservative concrete-on-soil friction coefficient (typical range 0.3–0.5)
  const muFriction = 0.4;
  const slidingResistance = muFriction * Ntotal;  // kN
  const minFoS_sliding = 1.5;
  const FoS_sliding = inp.Hed > 0 ? slidingResistance / inp.Hed : Infinity;
  const slidingOK = FoS_sliding >= minFoS_sliding;
  if (inp.Hed > 0) {
    if (!slidingOK) msgs.push(`FAIL: Sliding FoS = ${FoS_sliding.toFixed(2)} < ${minFoS_sliding} — increase foundation size/depth or add a shear key`);
    else msgs.push(`PASS: Sliding FoS = ${FoS_sliding.toFixed(2)}`);
  }

  if (msgs.length === 0) msgs.push('OK: Foundation adequate');

  const status = msgs.some(m => m.startsWith('FAIL')) ? 'FAIL'
               : msgs.some(m => m.startsWith('WARN')) ? 'WARN' : 'OK';

  return { L, B, h, d, qEd, As_bot: AsReq, barsBot, punchingOK, bendingOK, FoS_sliding, slidingOK, status, messages: msgs };
}
