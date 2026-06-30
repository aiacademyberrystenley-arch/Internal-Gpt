import { useState } from 'react';
import { Globe, LogIn, Mail } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { DEPARTMENTS } from '../lib/departments';

const INSTITUTE_DOMAIN = '@srmist.edu.in';
const isInstituteEmail = (email) => email.trim().toLowerCase().endsWith(INSTITUTE_DOMAIN);

export default function Login({ onLogin, onGuest, notice }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', role: 'student', registration_number: '', degree: '', branch: '', department: '', semester: 6 });
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
      if (mode === 'guest') {
        if (!form.full_name.trim()) throw new Error('Please enter your name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error('Please enter a valid email address.');
        const phone = form.phone.trim();
        if (!/^[+]?[\d\s().-]{7,20}$/.test(phone)) throw new Error('Please enter a valid phone number.');
        await onGuest?.({ full_name: form.full_name.trim(), email: form.email.trim(), phone });
        return;
      }

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

  const titles = {
    signin: { h: 'Sign in', p: 'Use your institute credentials to continue.' },
    signup: { h: 'Create account', p: 'Register with your @srmist.edu.in email.' },
    forgot: { h: 'Reset password', p: 'We’ll email you a link to set a new password.' },
    guest: { h: 'Continue as guest', p: 'Enter your details to explore public SRM info.' }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:py-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:min-h-[80vh] lg:grid-cols-[1.5fr_400px]">
        {/* Intro — fills the screen on mobile; the form sits below it on scroll */}
        <section className="flex min-h-[calc(100svh-3rem)] flex-col justify-center rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 lg:min-h-0 lg:justify-start lg:p-10 lg:max-h-[88vh] lg:overflow-y-auto">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SRM IST" className="h-16 w-16 shrink-0 rounded-full bg-white object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SRM Institute of Science and Technology</p>
              <h1 className="mt-1 text-3xl font-bold leading-tight text-white">
                Welcome to <span className="text-blue-400">SRM-GPT</span>
              </h1>
            </div>
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-200">The Future of Intelligent Higher Education</p>
          <p className="mt-4 text-slate-300">
            SRM-GPT — where Artificial Intelligence meets Academic Excellence. Experience the next generation of University Intelligence.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            SRM-GPT brings together institutional knowledge, advanced AI, research support, and academic excellence into one powerful platform. Designed to empower decision-makers, administrators, professors, researchers, students, staff and community with faster insights, smarter workflows, and informed decisions. From classrooms to administration, admissions to research, SRM-GPT delivers personalized, evidence-based, and multilingual assistance for every stakeholder of the SRM community.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            SRM-GPT is your trusted AI companion for teaching, research, academic planning, student success, and institutional excellence. Access verified university knowledge, generate ideas, analyse information, create content, and solve complex problems — all through one intelligent platform. SRM-GPT transforms institutional knowledge into intelligent decisions, faster workflows, and personalized experiences — all from one secure AI platform.
          </p>
          <div className="mt-6 space-y-2 border-t border-slate-800 pt-5">
            <p className="text-sm font-semibold text-blue-300">Powered by Knowledge. Driven by Intelligence. Built for Excellence.</p>
            <p className="text-base font-bold text-white">One Intelligent Platform. Every Answer. Every Role. Every Possibility.</p>
          </div>
        </section>

        {/* Auth form */}
        <form onSubmit={submit} className="card p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white">{titles[mode].h}</h2>
          <p className="mt-1 text-sm text-slate-400">{titles[mode].p}</p>

          {notice && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{notice}</p>}

          <div className="mt-6 space-y-3">
            {(mode === 'signup' || mode === 'guest') && (
              <input className="input" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required={mode === 'guest'} />
            )}
            <input className="input" placeholder={mode === 'guest' ? 'Email' : 'Email (@srmist.edu.in)'} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            {mode === 'guest' && (
              <input className="input" placeholder="Phone number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            )}
            {mode !== 'forgot' && mode !== 'guest' && (
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
                <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                  <option value="" className="bg-slate-900">Select your department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-900">{dept}</option>
                  ))}
                </select>
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
            <LogIn size={18} /> {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'guest' ? 'Enter as guest' : 'Send reset link'}
          </button>

          {mode === 'forgot' || mode === 'guest' ? (
            <button type="button" onClick={() => switchMode('signin')} className="mt-4 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300">
              ← Back to sign in
            </button>
          ) : (
            <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300">
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-xs uppercase tracking-wider text-slate-500">or</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              <button type="button" onClick={() => switchMode('guest')} className="btn-ghost w-full py-3 text-base">
                <Globe size={18} /> Continue as guest
              </button>
            </>
          )}
        </form>
      </div>
      {/* <p className="mx-auto mt-8 max-w-5xl text-center text-xs text-slate-500">
        Designed &amp; developed by <span className="font-semibold text-slate-300">Suraj Nandan</span>
      </p> */}
    </div>
  );
}
