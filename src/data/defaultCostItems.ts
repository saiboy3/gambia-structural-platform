import type { CostItem } from '../types/app';

export const DEFAULT_COST_ITEMS: Omit<CostItem, 'id'>[] = [
  // Concrete
  { category: 'concrete', description: 'Ready-mix concrete C20/25',  unit: 'm³', rateGMD: 12500, quarter: 'Q1-2026', source: 'Market rate Banjul' },
  { category: 'concrete', description: 'Ready-mix concrete C25/30',  unit: 'm³', rateGMD: 14000, quarter: 'Q1-2026', source: 'Market rate Banjul' },
  { category: 'concrete', description: 'Ready-mix concrete C30/37',  unit: 'm³', rateGMD: 15500, quarter: 'Q1-2026', source: 'Market rate Banjul' },
  { category: 'concrete', description: 'Site-mixed concrete C20/25', unit: 'm³', rateGMD: 9500,  quarter: 'Q1-2026', source: 'Estimated labour + materials' },
  // Steel / Rebar
  { category: 'steel', description: 'High-yield rebar T10',  unit: 'tonne', rateGMD: 65000, quarter: 'Q1-2026', source: 'Import price + clearance' },
  { category: 'steel', description: 'High-yield rebar T12',  unit: 'tonne', rateGMD: 64000, quarter: 'Q1-2026', source: 'Import price + clearance' },
  { category: 'steel', description: 'High-yield rebar T16',  unit: 'tonne', rateGMD: 63000, quarter: 'Q1-2026', source: 'Import price + clearance' },
  { category: 'steel', description: 'High-yield rebar T20',  unit: 'tonne', rateGMD: 62000, quarter: 'Q1-2026', source: 'Import price + clearance' },
  { category: 'steel', description: 'High-yield rebar T25',  unit: 'tonne', rateGMD: 61500, quarter: 'Q1-2026', source: 'Import price + clearance' },
  { category: 'steel', description: 'Binding wire',          unit: 'kg',    rateGMD: 120,   quarter: 'Q1-2026', source: 'Local market' },
  { category: 'steel', description: 'UC section (S275)',     unit: 'tonne', rateGMD: 85000, quarter: 'Q1-2026', source: 'Import estimate' },
  { category: 'steel', description: 'UB section (S275)',     unit: 'tonne', rateGMD: 82000, quarter: 'Q1-2026', source: 'Import estimate' },
  // Formwork
  { category: 'formwork', description: 'Plywood formwork (supply + fix)', unit: 'm²', rateGMD: 850,  quarter: 'Q1-2026', source: 'Subcontractor rate' },
  { category: 'formwork', description: 'Plywood formwork (hire 3 uses)',   unit: 'm²', rateGMD: 400,  quarter: 'Q1-2026', source: 'Hire rate per use' },
  { category: 'formwork', description: 'Steel pan formwork (hire)',        unit: 'm²', rateGMD: 600,  quarter: 'Q1-2026', source: 'Hire rate' },
  { category: 'formwork', description: 'Proprietary column forms (hire)', unit: 'm',  rateGMD: 1200, quarter: 'Q1-2026', source: 'Hire rate per m height' },
  // Labour
  { category: 'labour', description: 'Rebar fixing (supply + fix)',      unit: 'tonne', rateGMD: 18000, quarter: 'Q1-2026', source: 'Subcontractor rate' },
  { category: 'labour', description: 'Concreting gang (pour + compact)', unit: 'm³',   rateGMD: 2500,  quarter: 'Q1-2026', source: 'Labour rate' },
  { category: 'labour', description: 'Formwork carpenter (skilled)',     unit: 'day',  rateGMD: 1800,  quarter: 'Q1-2026', source: 'Daily rate Banjul' },
  { category: 'labour', description: 'Unskilled labourer',              unit: 'day',  rateGMD: 900,   quarter: 'Q1-2026', source: 'Daily rate Banjul' },
  // Aggregates
  { category: 'aggregates', description: 'Coarse aggregate (20mm)',   unit: 'm³', rateGMD: 2800, quarter: 'Q1-2026', source: 'Quarry price delivered' },
  { category: 'aggregates', description: 'Fine aggregate / sharp sand', unit: 'm³', rateGMD: 2200, quarter: 'Q1-2026', source: 'River sand price' },
  { category: 'aggregates', description: 'OPC cement 50kg bag',       unit: 'bag', rateGMD: 650,  quarter: 'Q1-2026', source: 'Local supplier' },
  { category: 'aggregates', description: 'Fill material (laterite)',   unit: 'm³', rateGMD: 1200, quarter: 'Q1-2026', source: 'Local borrow pit' },
  // Other
  { category: 'other', description: 'Concrete cube testing (per set of 3)', unit: 'set', rateGMD: 1500, quarter: 'Q1-2026', source: 'Local lab rate' },
  { category: 'other', description: 'Plastic cover spacers (25mm)',        unit: '100 no.', rateGMD: 250, quarter: 'Q1-2026', source: 'Local supplier' },
];
