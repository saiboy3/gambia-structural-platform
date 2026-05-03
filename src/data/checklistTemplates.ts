import type { ChecklistItem, ChecklistType } from '../types/app';
import { generateId } from '../utils/storage';

function item(description: string): ChecklistItem {
  return { id: generateId(), description, checked: false, note: '' };
}

export const CHECKLIST_TEMPLATES: Record<ChecklistType, ChecklistItem[]> = {
  'pre-pour': [
    item('Formwork dimensions verified against approved drawings'),
    item('Formwork adequately propped and braced'),
    item('Formwork clean and free of debris, water, and ice'),
    item('Kicker / construction joint prepared and clean'),
    item('All penetrations and box-outs in correct position'),
    item('Rebar sizes and grades match design specification'),
    item('Bar spacing verified in both directions'),
    item('Bar laps and anchorage lengths meet minimum requirements'),
    item('Cover spacers installed at correct spacing (≤ 1m c/c)'),
    item('Cover to bottom bars: ≥ design cover confirmed'),
    item('Cover to side bars: ≥ design cover confirmed'),
    item('Top bars tied and propped to maintain position during pour'),
    item('Shear links / stirrups at correct spacing'),
    item('Column / wall starter bars in correct position'),
    item('Reinforcement sign-off obtained from design engineer'),
    item('Cube moulds and slump cone available on site'),
    item('Vibrator in working order and on-site'),
    item('Delivery chute / pump reach confirmed for pour sequence'),
  ],
  'placement': [
    item('Mix design / grade confirmed against specification'),
    item('Slump / workability tested on first load and recorded'),
    item('Cube samples taken (min. 3 per 50m³ or as specified)'),
    item('Concrete placed within 90 minutes of batching'),
    item('Concrete not dropped from excessive height (≤ 1.5m free fall)'),
    item('Concrete compacted by immersion vibrator immediately after placing'),
    item('Vibrator not dragged horizontally through concrete'),
    item('Vibrator not used to move concrete laterally'),
    item('No segregation observed in concrete mix'),
    item('Pour sequence followed as planned'),
    item('Construction joints formed and located as per drawings'),
    item('Top surface finished to specified level / falls'),
    item('Cube samples labelled with date, pour ref, mix grade, and location'),
  ],
  'post-pour': [
    item('Curing commenced immediately after final finishing'),
    item('Curing method: wet hessian / curing compound / polythene applied'),
    item('Curing maintained for minimum 7 days (or per specification)'),
    item('No traffic or loading on slab until minimum striking strength achieved'),
    item('Striking times observed (props: min 28 days or per calc)'),
    item('Surface inspected for cracks, honeycombing, and cold joints'),
    item('Any defects reported to engineer and remediation agreed'),
    item('7-day cube test results recorded and reviewed'),
    item('28-day cube test results recorded — pass/fail confirmed'),
    item('As-built dimensions checked against design'),
  ],
};
