interface BadgeProps { status: 'OK' | 'FAIL' | 'WARN' | string; }

const map: Record<string, string> = {
  OK:   'bg-emerald-100 text-emerald-700',
  FAIL: 'bg-red-100 text-red-700',
  WARN: 'bg-amber-100 text-amber-700',
};

export default function Badge({ status }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
