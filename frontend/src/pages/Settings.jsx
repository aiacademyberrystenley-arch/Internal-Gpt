import { useState } from 'react';
import { Building2, GitBranch, GraduationCap, Hash, Mail, Pencil, Save, Shield, User, X } from 'lucide-react';
import { api } from '../lib/api';

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

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function SettingsPage({ profile, onUpdated }) {
  const isStudent = profile.role === 'student';
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function startEdit() {
    setForm({
      full_name: profile.full_name || '',
      registration_number: profile.registration_number || '',
      degree: profile.degree || '',
      branch: profile.branch || '',
      department: profile.department || ''
    });
    setError('');
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/profile', { method: 'POST', body: JSON.stringify(form) });
      await onUpdated?.();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            <p className="mt-1 text-sm text-slate-400">Your account details.</p>
          </div>
          {!editing && (
            <button onClick={startEdit} className="btn-ghost">
              <Pencil size={15} /> Edit profile
            </button>
          )}
        </div>

        <div className="card mt-6 flex items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">
            {initials || <User size={24} />}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{profile.full_name || 'Unnamed user'}</p>
            <p className="text-sm capitalize text-slate-400">{profile.role}{profile.department ? ` · ${profile.department}` : ''}</p>
          </div>
        </div>

        {editing ? (
          <form onSubmit={save} className="card mt-4 space-y-4 p-5">
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Your full name" />
            {isStudent && (
              <>
                <Field label="Registration number" value={form.registration_number} onChange={(v) => setForm({ ...form, registration_number: v })} placeholder="e.g. RA2211003010000" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Degree" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="e.g. B.Tech" />
                  <Field label="Branch" value={form.branch} onChange={(v) => setForm({ ...form, branch: v })} placeholder="e.g. CSE" />
                </div>
              </>
            )}
            <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="Department" />

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-500">
              Email and role can’t be changed here. Contact an administrator if these need updating.
            </div>

            {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

            <div className="flex gap-2">
              <button disabled={busy} className="btn-primary">
                <Save size={16} /> {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Row icon={Mail} label="Email" value={profile.email} />
            <Row icon={Shield} label="Role" value={profile.role} />
            {isStudent && <Row icon={Hash} label="Registration number" value={profile.registration_number} />}
            {isStudent && <Row icon={GraduationCap} label="Degree" value={profile.degree} />}
            {isStudent && <Row icon={GitBranch} label="Branch" value={profile.branch} />}
            <Row icon={Building2} label="Department" value={profile.department} />
          </div>
        )}
      </div>
    </div>
  );
}
