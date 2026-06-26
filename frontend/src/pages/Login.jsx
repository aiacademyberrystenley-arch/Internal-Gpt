import { useState } from 'react';
import { FileText, LogIn, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { api } from '../lib/api';

const INSTITUTE_DOMAIN = '@srmist.edu.in';
const isInstituteEmail = (email) => email.trim().toLowerCase().endsWith(INSTITUTE_DOMAIN);

export default function Login({ onLogin, notice }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'student', registration_number: '', degree: '', branch: '', department: '', semester: 6 });
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
    setConfirmSent(false);
    setResetSent(false);
  }

  if (!supabaseConfigured) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card w-full max-w-lg p-8">
          <img src="/logo.png" alt="SRM IST" className="h-16 w-16 rounded-full bg-white object-contain" />
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
    setConfirmSent(false);
    setResetSent(false);
    try {
      if (mode === 'forgot') {
        // Reset is for institute members only; admins use external email and are excluded.
        if (!isInstituteEmail(form.email)) {
          setError('Password reset is only available for institute (@srmist.edu.in) accounts. Administrators should contact the system administrator.');
          return;
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: window.location.origin });
        if (resetError) throw resetError;
        setResetSent(true);
        return;
      }

      if (mode === 'signup') {
        if (!isInstituteEmail(form.email)) {
          setError('Please register with your institute email (@srmist.edu.in).');
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              role: form.role,
              full_name: form.full_name,
              registration_number: form.registration_number,
              degree: form.degree,
              branch: form.branch,
              department: form.department,
              semester: form.semester
            }
          }
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setConfirmSent(true);
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

  const titles = {
    signin: { h: 'Sign in', p: 'Use your institute credentials to continue.' },
    signup: { h: 'Create account', p: 'Register with your @srmist.edu.in email.' },
    forgot: { h: 'Reset password', p: 'We’ll email you a link to set a new password.' }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        {/* Intro */}
        <section className="hidden rounded-2xl border border-slate-800 bg-slate-900 p-10 lg:block">
          <img src="/logo.png" alt="SRM IST" className="h-20 w-20 rounded-full bg-white object-contain" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">SRM Institute of Science and Technology</p>
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
          <h2 className="text-2xl font-bold text-white">{titles[mode].h}</h2>
          <p className="mt-1 text-sm text-slate-400">{titles[mode].p}</p>

          {notice && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{notice}</p>}

          <div className="mt-6 space-y-3">
            {mode === 'signup' && (
              <input className="input" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            )}
            <input className="input" placeholder="Email (@srmist.edu.in)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            {mode !== 'forgot' && (
              <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            )}
            {mode === 'signup' && (
              <>
                <div>
                  <p className="label mb-2">I am a</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['student', 'teacher', 'staff'].map((role) => (
                      <label
                        key={role}
                        className={`focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                          form.role === role
                            ? 'border-blue-500 bg-blue-600/15 text-white'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={form.role === role}
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                          className="sr-only"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                {form.role === 'student' && (
                  <>
                    <input className="input" placeholder="Registration number" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Degree (e.g. B.Tech)" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
                      <input className="input" placeholder="Branch (e.g. CSE)" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
                    </div>
                  </>
                )}
                <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </>
            )}
          </div>

          {mode === 'signin' && (
            <button type="button" onClick={() => switchMode('forgot')} className="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300">
              Forgot password?
            </button>
          )}

          {confirmSent && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Mail size={16} /> Account created — verify your email
              </p>
              <p className="mt-1 text-sm text-emerald-200/80">
                We sent a confirmation link to <span className="font-medium">{form.email}</span>. Open it, then come back and sign in.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://mail.google.com/" target="_blank" rel="noreferrer" className="btn-primary">
                  <Mail size={16} /> Open Gmail
                </a>
                <button type="button" onClick={() => switchMode('signin')} className="btn-ghost">I've verified — sign in</button>
              </div>
            </div>
          )}

          {resetSent && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Mail size={16} /> Reset link sent
              </p>
              <p className="mt-1 text-sm text-emerald-200/80">
                Check <span className="font-medium">{form.email}</span> for a password-reset link, then set your new password.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://mail.google.com/" target="_blank" rel="noreferrer" className="btn-primary">
                  <Mail size={16} /> Open Gmail
                </a>
                <button type="button" onClick={() => switchMode('signin')} className="btn-ghost">Back to sign in</button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

          <button disabled={busy} className="btn-primary mt-5 w-full py-3 text-base">
            <LogIn size={18} /> {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>

          {mode === 'forgot' ? (
            <button type="button" onClick={() => switchMode('signin')} className="mt-4 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300">
              Back to sign in
            </button>
          ) : (
            <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300">
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
