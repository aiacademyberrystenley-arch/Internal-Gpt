import { useState } from 'react';
import { GraduationCap, LogIn, Sparkles, Trophy, Zap } from 'lucide-react';
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
        <div className="glass-strong w-full max-w-lg p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-glow">
            <GraduationCap className="text-white" size={30} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-white">Connect Supabase to start</h1>
          <p className="mt-2 text-slate-300">Copy the frontend and backend env examples, add Supabase keys, run the SQL schema, then create an admin account here.</p>
          <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
            Frontend expects <code className="text-cyan-300">VITE_SUPABASE_URL</code> and <code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code>.
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

  const perks = [
    { icon: Zap, title: 'Earn XP', text: 'Level up every time you ask a question.' },
    { icon: Trophy, title: 'Unlock badges', text: 'Streaks and achievements as you learn.' },
    { icon: Sparkles, title: 'Cited answers', text: 'Real answers from your college documents.' }
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-cyan-500/20 p-8 backdrop-blur-xl sm:p-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-3xl animate-float" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              <Sparkles size={13} /> Your College Quest awaits
            </div>
            <div className="mt-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-glow animate-float">
              <GraduationCap size={34} className="text-white" />
            </div>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Campus <span className="text-gradient">GPT</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-200">
              The fun way to get answers from your college’s notices, syllabi, fees, hostel and placement docs — with citations and XP.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {perks.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Icon size={20} className="text-cyan-300" />
                  <p className="mt-2 text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Auth form */}
        <form onSubmit={submit} className="glass-strong p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-white">{mode === 'signin' ? 'Welcome back 👋' : 'Join the quest 🚀'}</h2>
          <p className="mt-1 text-sm text-slate-400">{mode === 'signin' ? 'Sign in to continue leveling up.' : 'Create your account to start earning XP.'}</p>
          <div className="mt-6 space-y-3">
            {mode === 'signup' && (
              <input className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            )}
            <input className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {mode === 'signup' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="focus-ring rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['admin', 'student', 'teacher', 'staff'].map((role) => (
                    <option key={role} value={role} className="bg-[#15122b]">
                      {role}
                    </option>
                  ))}
                </select>
                <input className="focus-ring rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500" type="number" min="1" max="12" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            )}
          </div>
          {error && <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          <button disabled={busy} className="btn-glow focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-base disabled:opacity-60">
            <LogIn size={18} /> {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 w-full text-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
