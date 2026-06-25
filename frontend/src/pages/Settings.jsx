import { Building2, Mail, Shield, User } from 'lucide-react';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate font-medium text-white">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function SettingsPage({ profile }) {
  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="mt-1 text-sm text-slate-400">Your account details.</p>

        <div className="card mt-6 flex items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">
            {initials || <User size={24} />}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{profile.full_name || 'Unnamed user'}</p>
            <p className="text-sm capitalize text-slate-400">{profile.role}{profile.department ? ` · ${profile.department}` : ''}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Row icon={Mail} label="Email" value={profile.email} />
          <Row icon={Shield} label="Role" value={profile.role} />
          <Row icon={Building2} label="Department" value={profile.department} />
          <Row icon={User} label="Semester" value={profile.semester} />
        </div>
      </div>
    </div>
  );
}
