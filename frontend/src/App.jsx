import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, FileText, LayoutDashboard, LogOut, MessageSquare, Settings, Sparkles } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { api } from './lib/api';
import { useGamification, BADGES } from './lib/gamify';
import AuroraBackground from './components/AuroraBackground';
import Confetti from './components/Confetti';
import Toast from './components/Toast';
import PlayerCard from './components/PlayerCard';
import Login from './pages/Login';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import Documents from './pages/Documents';
import Feedback from './pages/Feedback';
import SettingsPage from './pages/Settings';

function Shell({ profile, game, onCelebrate, onLogout }) {
  const links = [
    { to: '/chat', label: 'Quest Chat', icon: MessageSquare },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: true },
    { to: '/documents', label: 'Documents', icon: FileText, admin: true },
    { to: '/feedback', label: 'Feedback', icon: BookOpen, admin: true },
    { to: '/settings', label: 'Profile', icon: Settings }
  ].filter((link) => !link.admin || profile?.role === 'admin' || profile?.role === 'teacher');

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_1fr]">
      <aside className="z-10 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-glow animate-float">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">ABC Institute</p>
              <h1 className="font-display text-xl font-extrabold leading-none text-gradient">Campus GPT</h1>
            </div>
          </div>
          <button onClick={onLogout} className="focus-ring rounded-lg p-2 text-slate-300 hover:text-white lg:hidden" aria-label="Logout">
            <LogOut size={19} />
          </button>
        </div>

        <div className="px-4 lg:px-5">
          <PlayerCard game={game} profile={profile} compact />
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:mt-2 lg:block lg:space-y-1.5 lg:px-5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/80 text-white shadow-glow'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="transition-transform group-hover:scale-110" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden px-5 pb-5 lg:block">
          <button
            onClick={onLogout}
            className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        {profile ? (
          <Routes>
            <Route path="/chat" element={<Chat profile={profile} game={game} onCelebrate={onCelebrate} />} />
            <Route path="/dashboard" element={<AdminDashboard profile={profile} />} />
            <Route path="/documents" element={<Documents profile={profile} />} />
            <Route path="/feedback" element={<Feedback profile={profile} />} />
            <Route path="/settings" element={<SettingsPage profile={profile} game={game} />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        ) : null}
      </main>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const game = useGamification(profile?.id);

  // Triggered by Chat after a question is recorded.
  const celebrate = useCallback((result) => {
    if (!result) return;
    if (result.leveledUp) {
      setConfettiKey((k) => k + 1);
      setToast({
        icon: '🎉',
        title: `Level ${result.newLevel.level} · ${result.newLevel.rank}!`,
        subtitle: 'You leveled up. Keep the questions coming!',
        duration: 3600
      });
    } else if (result.newBadges?.length) {
      const badge = BADGES.find((b) => b.id === result.newBadges[0]);
      setConfettiKey((k) => k + 1);
      setToast({ icon: badge?.icon || '🏅', title: 'Badge unlocked!', subtitle: badge?.label });
    }
  }, []);

  async function loadProfile() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const data = await api('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeoutId);
      setProfile(data.profile);
    } catch (error) {
      if (error.name === 'AbortError') console.warn('Profile load timeout — backend may not be running');
      else console.warn('Profile load error:', error.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    let settled = false;
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn('Loading fallback triggered — profile fetch took too long');
        setLoading(false);
      }
    }, 6000);

    const doLoad = async () => {
      await loadProfile();
      settled = true;
      clearTimeout(fallbackTimer);
    };

    doLoad();
    const { data } = supabase.auth.onAuthStateChange(() => loadProfile());

    return () => {
      clearTimeout(fallbackTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
    navigate('/login');
  }

  if (loading) {
    return (
      <>
        <AuroraBackground />
        <div className="grid min-h-screen place-items-center">
          <div className="glass flex items-center gap-3 px-6 py-4 text-slate-200">
            <Sparkles className="animate-spin text-violet-300" size={20} />
            Loading your campus quest...
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <AuroraBackground />
        <Login onLogin={loadProfile} />
      </>
    );
  }

  return (
    <>
      <AuroraBackground />
      <Confetti trigger={confettiKey} />
      <Toast toast={toast} onDone={() => setToast(null)} />
      <Shell profile={profile} game={game} onCelebrate={celebrate} onLogout={logout} />
    </>
  );
}
