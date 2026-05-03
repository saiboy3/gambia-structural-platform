import { Clock, CheckCircle, Lock, Send } from 'lucide-react';
import type { DesignStatus } from '../../types/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CONFIG: Record<DesignStatus, { label: string; color: string; Icon: any }> = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600',   Icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700',   Icon: Send },
  checked:   { label: 'Checked',   color: 'bg-blue-100 text-blue-700',     Icon: CheckCircle },
  approved:  { label: 'Approved',  color: 'bg-emerald-100 text-emerald-700', Icon: Lock },
};

export default function StatusBadge({ status }: { status: DesignStatus }) {
  const { label, color, Icon } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon size={11} /> {label}
    </span>
  );
}
