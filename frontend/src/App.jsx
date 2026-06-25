import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen, FileText, LayoutDashboard, Loader2, LogOut, MessageSquare, Settings, User } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { api } from './lib/api';
import Login from './pages/Login';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import Documents from './pages/Documents';
import Feedback from './pages/Feedback';
import SettingsPage from './pages/Settings';

function Shell({ profile, onLogout }) {
  const links = [
    { to: '/chat', label: 'Assistant', icon: MessageSquare },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, staff: true },
    { to: '/documents', label: 'Documents', icon: FileText, staff: true },
    { to: '/feedback', label: 'Feedback', icon: BookOpen, staff: true },
    { to: '/settings', label: 'Profile', icon: Settings }
  ].filter((link) => !link.staff || profile?.role === 'admin' || profile?.role === 'teacher');

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="z-10 flex flex-col border-b border-slate-800 bg-slate-900 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SRM IST" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain" />
            <div>
              <p className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-slate-400">SRM Institute of<br />Science &amp; Technology</p>
              <h1 className="mt-0.5 text-base font-bold leading-none text-white">Campus Assistant</h1>
            </div>
          </div>
          <button onClick={onLogout} className="focus-ring rounded-lg p-2 text-slate-400 hover:text-white lg:hidden" aria-label="Sign out">
            <LogOut size={19} />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-1 lg:flex-col lg:space-y-1 lg:overflow-visible lg:px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-slate-800 p-3 lg:block">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
              {initials || <User size={16} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{profile?.full_name || profile?.email}</p>
              <p className="truncate text-xs capitalize text-slate-400">{profile?.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="btn-ghost mt-2 w-full">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        {profile ? (
          <Routes>
            <Route path="/chat" element={<Chat profile={profile} />} />
            <Route path="/dashboard" element={<AdminDashboard profile={profile} />} />
            <Route path="/documents" element={<Documents profile={profile} />} />
            <Route path="/feedback" element={<Feedback profile={profile} />} />
            <Route path="/settings" element={<SettingsPage profile={profile} />} />
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
  const navigate = useNavigate();

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
      <div className="grid min-h-screen place-items-center">
        <div className="card flex items-center gap-3 px-6 py-4 text-slate-300">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          Loading…
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Login onLogin={loadProfile} />;
  }

  return <Shell profile={profile} onLogout={logout} />;
}
