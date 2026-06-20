import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen, FileText, LayoutDashboard, LogOut, MessageSquare, Settings, Upload } from 'lucide-react';
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
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: true },
    { to: '/documents', label: 'Documents', icon: FileText, admin: true },
    { to: '/feedback', label: 'Feedback', icon: BookOpen, admin: true },
    { to: '/settings', label: 'Settings', icon: Settings }
  ].filter((link) => !link.admin || profile?.role === 'admin' || profile?.role === 'teacher');

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-campus">ABC Institute</p>
            <h1 className="text-xl font-bold text-ink">Internal GPT</h1>
          </div>
          <button onClick={onLogout} className="focus-ring rounded-md p-2 text-slate-600 lg:hidden" aria-label="Logout">
            <LogOut size={19} />
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-campus text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 p-4 lg:block">
          <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{profile?.role || 'student'}</p>
          <button onClick={onLogout} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0">{profile ? <Routes>
        <Route path="/chat" element={<Chat profile={profile} />} />
        <Route path="/dashboard" element={<AdminDashboard profile={profile} />} />
        <Route path="/documents" element={<Documents profile={profile} />} />
        <Route path="/feedback" element={<Feedback profile={profile} />} />
        <Route path="/settings" element={<SettingsPage profile={profile} />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes> : null}</main>
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

    // Absolute fallback: force loading=false after 6s no matter what
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

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Loading workspace...</div>;
  if (!profile) return <Login onLogin={loadProfile} />;
  return <Shell profile={profile} onLogout={logout} />;
}
