import { useState } from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'student', department: 'Computer Science and Engineering', semester: 6 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!supabaseConfigured) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <GraduationCap className="mb-4 text-campus" size={34} />
          <h1 className="text-2xl font-bold">Connect Supabase to start</h1>
          <p className="mt-2 text-slate-600">Copy the frontend and backend env examples, add Supabase keys, run the SQL schema, then create an admin account here.</p>
          <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">Frontend expects <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
        </div>
      </div>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              role: form.role,
              full_name: form.full_name,
              department: form.department,
              semester: form.semester
            }
          }
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setError('Account created. Please confirm the email if Supabase asks for it, then switch to Sign in.');
          return;
        }
        await api('/api/auth/profile', { method: 'POST', body: JSON.stringify(form) });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (signInError) throw signInError;
      }
      await onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex min-h-[520px] flex-col justify-center rounded-md bg-campus p-8 text-white">
          <GraduationCap size={42} />
          <h1 className="mt-5 max-w-xl text-4xl font-bold">Internal GPT for College</h1>
          <p className="mt-4 max-w-2xl text-lg text-sky-50">A secure college helpdesk that answers from uploaded notices, syllabi, timetables, fee rules, hostel policies, and placement documents with citations.</p>
          <div className="mt-8 grid gap-3 text-sm md:grid-cols-3">
            {['Role-based access', 'Document citations', 'Admin upload workflow'].map((item) => (
              <div key={item} className="rounded-md bg-white/12 p-3">{item}</div>
            ))}
          </div>
        </section>
        <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <div className="mt-5 space-y-4">
            {mode === 'signup' && (
              <input className="focus-ring w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            )}
            <input className="focus-ring w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="focus-ring w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {mode === 'signup' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="focus-ring rounded-md border border-slate-300 px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['admin', 'student', 'teacher', 'staff'].map((role) => <option key={role}>{role}</option>)}
                </select>
                <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            )}
          </div>
          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-campus px-4 py-2 font-semibold text-white disabled:opacity-60">
            <LogIn size={18} /> {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 text-sm font-medium text-campus">
            {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
