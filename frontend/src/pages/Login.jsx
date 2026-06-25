import { useState } from 'react';
import { FileText, GraduationCap, LogIn, MessageSquare, ShieldCheck } from 'lucide-react';
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
        <div className="card w-full max-w-lg p-8">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-600">
            <GraduationCap className="text-white" size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">Connect Supabase to start</h1>
          <p className="mt-2 text-sm text-slate-400">Copy the frontend and backend env examples, add Supabase keys, run the SQL schema, then create an admin account here.</p>
          <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">
            Frontend expects <code className="text-blue-400">VITE_SUPABASE_URL</code> and <code className="text-blue-400">VITE_SUPABASE_ANON_KEY</code>.
          </p>
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
            data: { role: form.role, full_name: form.full_name, department: form.department, semester: form.semester }
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

  const features = [
    { icon: MessageSquare, title: 'Ask in plain language', text: 'Get answers about notices, schedules, fees, hostel and placements.' },
    { icon: FileText, title: 'Answers with citations', text: 'Every response is grounded in your college documents.' },
    { icon: ShieldCheck, title: 'Role-based access', text: 'Students and staff only see what they are permitted to.' }
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        {/* Intro */}
        <section className="hidden rounded-2xl border border-slate-800 bg-slate-900 p-10 lg:block">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-600">
            <GraduationCap size={30} className="text-white" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">ABC Institute</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-white">Campus Assistant</h1>
          <p className="mt-4 max-w-md text-slate-400">
            The internal helpdesk for students and faculty. Ask a question and get a clear, sourced answer drawn from official college documents.
          </p>
          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-950 text-blue-400">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Auth form */}
        <form onSubmit={submit} className="card p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <p className="mt-1 text-sm text-slate-400">{mode === 'signin' ? 'Use your institute credentials to continue.' : 'Register to access the campus assistant.'}</p>
          <div className="mt-6 space-y-3">
            {mode === 'signup' && (
              <input className="input" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            )}
            <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {mode === 'signup' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['admin', 'student', 'teacher', 'staff'].map((role) => (
                    <option key={role} value={role} className="bg-slate-900">
                      {role}
                    </option>
                  ))}
                </select>
                <input className="input" type="number" min="1" max="12" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            )}
          </div>
          {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="btn-primary mt-5 w-full py-3 text-base">
            <LogIn size={18} /> {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300">
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
