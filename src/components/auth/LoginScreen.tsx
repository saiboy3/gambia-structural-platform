import { useState } from 'react';
import { Building2, UserPlus, LogIn } from 'lucide-react';
import { useUser, ROLE_LABELS, ROLE_COLORS } from '../../context/UserContext';
import type { UserRole } from '../../types/app';
import Button from '../ui/Button';

export default function LoginScreen() {
  const { users, login, addUser } = useUser();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', initials: '', role: 'junior' as UserRole, email: '' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.initials.trim()) return;
    const user = addUser(form);
    login(user.id);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient blueprint grid + glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[.25]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
      <div className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 mb-4 shadow-2xl shadow-blue-950/60 ring-1 ring-white/10">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Arch Engineering Platform</h1>
          <p className="text-slate-400 text-sm mt-1">Structural design, QA and project management — sign in to continue</p>

          {/* Decorative structural motif */}
          <svg viewBox="0 0 320 40" className="w-full max-w-xs mx-auto mt-5 opacity-40" fill="none">
            <path d="M0 34 L40 6 L80 34 L120 6 L160 34 L200 6 L240 34 L280 6 L320 34"
              stroke="url(#loginLineGrad)" strokeWidth="1.5" />
            {[0,40,80,120,160,200,240,280,320].map((x,i) => (
              <circle key={x} cx={x} cy={i % 2 === 0 ? 34 : 6} r="2.5" fill="#60a5fa" />
            ))}
            <defs>
              <linearGradient id="loginLineGrad" x1="0" y1="0" x2="320" y2="0">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* User list */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden ring-1 ring-black/5">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Select your profile</p>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <button key={u.id} onClick={() => login(u.id)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0 group-hover:bg-blue-100">
                  {u.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
                <LogIn size={16} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
              </button>
            ))}
          </div>

          {/* Add user */}
          {showAdd ? (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <p className="text-xs font-semibold text-slate-600">New Team Member</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Initials" maxLength={3} value={form.initials}
                  onChange={e => setForm(p => ({ ...p, initials: e.target.value.toUpperCase() }))} />
                <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}>
                  <option value="junior">Junior Engineer</option>
                  <option value="senior">Senior Engineer</option>
                  <option value="principal">Principal</option>
                </select>
                <input className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Email address" type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} fullWidth>Add &amp; Sign In</Button>
                <Button onClick={() => setShowAdd(false)} variant="secondary">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-3 border-t border-slate-100">
              <Button onClick={() => setShowAdd(true)} variant="ghost" size="sm"
                icon={<UserPlus size={14} />} className="!text-blue-600 hover:!bg-blue-50">
                Add team member
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          All data is stored locally in your browser. No account or internet required.
        </p>
      </div>
    </div>
  );
}
