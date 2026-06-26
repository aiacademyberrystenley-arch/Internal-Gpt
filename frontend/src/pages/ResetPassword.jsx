import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Shown after a user clicks the password-reset link from their email.
// Supabase puts the app into a temporary recovery session; here we set the
// new password and then sign out so they log in fresh.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Password updated</h1>
          <p className="mt-2 text-sm text-slate-400">Your password has been changed. Please sign in with your new password.</p>
          <button onClick={onDone} className="btn-primary mt-5 w-full">Go to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-md p-8">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600">
          <KeyRound className="text-white" size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-400">Enter and confirm your new password below.</p>
        <div className="mt-6 space-y-3">
          <input className="input" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className="input" type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="btn-primary mt-5 w-full">{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
