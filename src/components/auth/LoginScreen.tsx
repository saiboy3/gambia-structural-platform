import { useState } from 'react';
import { Building2, UserPlus, LogIn } from 'lucide-react';
import { useUser, ROLE_LABELS, ROLE_COLORS } from '../../context/UserContext';
import type { UserRole } from '../../types/app';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gambia Structural Platform</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>

        {/* User list */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
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
                <button onClick={handleAdd}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                  Add & Sign In
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-3 border-t border-slate-100">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <UserPlus size={14} /> Add team member
              </button>
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
