import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bot, BookOpen, Building2, CalendarDays, FileText, GraduationCap, LayoutDashboard, LifeBuoy, Lock, LogOut, MessageSquare, MoreVertical, Paperclip, Plus, Search, Send, Settings, Sparkles, Wallet, X } from 'lucide-react';
import { api } from '../lib/api';
import MessageBubble from '../components/MessageBubble';

// Role-aware content so students, teachers and staff each see what's relevant to them.
const ROLE_CONTENT = {
  student: {
    tagline: 'Need help with your academics today?',
    topics: [
      { icon: GraduationCap, label: 'Academics', text: 'Syllabus, subjects & faculty', prompt: 'What does my syllabus and course structure include?' },
      { icon: FileText, label: 'Exams & Results', text: 'Schedules, evaluation & grades', prompt: 'What is the exam schedule and evaluation pattern?' },
      { icon: Wallet, label: 'Fees & Scholarships', text: 'Payments, deadlines & aid', prompt: 'What are the fee details and scholarship deadlines?' },
      { icon: Building2, label: 'Hostel & Campus', text: 'Accommodation & facilities', prompt: 'What are the hostel rules and fee structure?' },
      { icon: BookOpen, label: 'Library', text: 'Timings, resources & borrowing', prompt: 'What are the library timings and borrowing rules?' },
      { icon: Award, label: 'Placements', text: 'Process, eligibility & drives', prompt: 'What is the placement eligibility criteria?' }
    ],
    quick: ['What is my syllabus?', 'What is the attendance policy?', 'Placement eligibility criteria', 'Library timings', 'Hostel rules and fees', 'Scholarship deadlines']
  },
  teacher: {
    tagline: 'What do you need for your classes today?',
    topics: [
      { icon: CalendarDays, label: 'Academic Calendar', text: 'Term dates & schedules', prompt: 'What does the academic calendar look like this term?' },
      { icon: FileText, label: 'Exam Duties', text: 'Invigilation & evaluation', prompt: 'What are the exam invigilation and evaluation guidelines?' },
      { icon: GraduationCap, label: 'Curriculum', text: 'Syllabus & course outcomes', prompt: 'What is the prescribed syllabus and course outcomes?' },
      { icon: Building2, label: 'Leave & HR', text: 'Leave policy & forms', prompt: 'What is the faculty leave policy and process?' },
      { icon: Award, label: 'Research', text: 'Grants & publications', prompt: 'What are the research grant and publication guidelines?' },
      { icon: BookOpen, label: 'Library', text: 'Faculty resources', prompt: 'What library facilities are available for faculty?' }
    ],
    quick: ['Faculty leave policy', 'Academic calendar this term', 'Exam evaluation guidelines', 'Research grant process', 'Course outcomes format']
  },
  staff: {
    tagline: 'How can I help with administration today?',
    topics: [
      { icon: Wallet, label: 'HR & Payroll', text: 'Salary, leave & benefits', prompt: 'What is the staff leave and payroll policy?' },
      { icon: FileText, label: 'Circulars', text: 'Official notices', prompt: 'What are the latest official circulars and notices?' },
      { icon: Building2, label: 'Facilities', text: 'Campus & maintenance', prompt: 'What campus facilities and maintenance procedures are available?' },
      { icon: CalendarDays, label: 'Holidays', text: 'Holiday calendar', prompt: 'What is the holiday calendar for this year?' },
      { icon: LifeBuoy, label: 'IT & Support', text: 'Helpdesk & access', prompt: 'How do I raise an IT support request?' },
      { icon: BookOpen, label: 'Library', text: 'Timings & access', prompt: 'What are the library timings and access rules?' }
    ],
    quick: ['Staff leave policy', 'Holiday calendar', 'Latest circulars', 'How to raise an IT request', 'Payroll details']
  }
};
ROLE_CONTENT.admin = ROLE_CONTENT.student;

// Group sessions into Today / Yesterday / Earlier buckets.
function groupSessions(sessions) {
  const today = new Date();
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (isSameDay(d, today)) groups.Today.push(s);
    else if (isSameDay(d, yesterday)) groups.Yesterday.push(s);
    else groups.Earlier.push(s);
  }
  return groups;
}

function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <Bot size={16} className="text-blue-400" />
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounceDot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      <span className="text-xs text-slate-500">Searching college documents…</span>
    </div>
  );
}

export default function Chat({ profile, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, staff: true },
    { to: '/documents', label: 'Documents', icon: FileText, staff: true },
    { to: '/feedback', label: 'Feedback', icon: BookOpen, staff: true },
    { to: '/settings', label: 'Profile', icon: Settings }
  ].filter((item) => !item.staff || profile.role === 'admin' || profile.role === 'teacher');

  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userSubtitle = profile.role === 'student' && (profile.degree || profile.branch)
    ? [profile.degree, profile.branch].filter(Boolean).join(' · ')
    : profile.role;

  async function loadSessions() {
    try {
      setSessions(await api('/api/chat/sessions'));
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const firstName = (profile.full_name || profile.email || 'there').split(' ')[0];
  const content = ROLE_CONTENT[profile.role] || ROLE_CONTENT.student;
  const partOfDay = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const filteredSessions = sessions.filter((s) => (s.title || '').toLowerCase().includes(search.toLowerCase()));
  const grouped = groupSessions(filteredSessions);

  async function ask(text = question) {
    const trimmed = text.trim();
    const file = attachment;
    if ((!trimmed && !file) || loading) return;
    const displayContent = [trimmed, file ? `📎 ${file.name}` : ''].filter(Boolean).join('\n\n');
    setQuestion('');
    setAttachment(null);
    setNotice('');
    setMessages((current) => [...current, { role: 'user', content: displayContent }]);
    setLoading(true);
    try {
      let result;
      if (file) {
        const body = new FormData();
        body.append('question', trimmed || 'Please read the attached file and help me with it.');
        if (sessionId) body.append('session_id', sessionId);
        body.append('file', file);
        result = await api('/api/chat', { method: 'POST', body, timeoutMs: 60000 });
      } else {
        result = await api('/api/chat', { method: 'POST', body: JSON.stringify({ question: trimmed, session_id: sessionId }) });
      }
      setSessionId(result.session_id);
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, sources: result.sources }]);
      loadSessions();
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.message, sources: [] }]);
    } finally {
      setLoading(false);
    }
  }

  function prefill(text) {
    setQuestion(text);
    inputRef.current?.focus();
  }

  const fileChip = attachment && (
    <div className="mb-2 flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
      <Paperclip size={13} className="text-blue-400" />
      <span className="max-w-[220px] truncate">{attachment.name}</span>
      <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-white" aria-label="Remove attachment">
        <X size={13} />
      </button>
    </div>
  );

  const attachButton = (
    <label className="focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" title="Attach image, PDF, Excel, Word or text">
      <Paperclip size={18} />
      <input
        type="file"
        className="hidden"
        accept="image/*,.pdf,.xlsx,.xls,.csv,.docx,.txt"
        onChange={(e) => {
          setAttachment(e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />
    </label>
  );

  async function selectSession(id) {
    setSessionId(id);
    setMessages(await api(`/api/chat/sessions/${id}`));
  }

  async function sendFeedback(rating) {
    try {
      await api('/api/feedback', { method: 'POST', body: JSON.stringify({ rating }) });
      setNotice(rating === 'helpful' ? 'Thanks for the feedback.' : 'Got it — we’ll use this to improve.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="grid h-screen min-h-[640px] lg:grid-cols-[280px_1fr]">
      {/* Unified sidebar */}
      <aside className="hidden flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-slate-800/70 px-4 py-4">
          <img src="/logo.png" alt="SRM IST" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">SRM Institute of Science &amp; Technology</p>
            <h1 className="text-base font-bold leading-tight text-white">Campus Assistant</h1>
          </div>
        </div>

        {/* New chat + search + recents */}
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <button
            onClick={() => {
              setSessionId(null);
              setMessages([]);
            }}
            className="btn-primary w-full"
          >
            <Plus size={16} /> New chat
          </button>

          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="focus-ring w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            {filteredSessions.length === 0 && <p className="px-1 text-xs text-slate-500">No conversations yet.</p>}
            {Object.entries(grouped).map(([label, list]) =>
              list.length ? (
                <div key={label}>
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {list.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => selectSession(session.id)}
                        className={`focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          session.id === sessionId ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <MessageSquare size={14} className="shrink-0 text-slate-500" />
                        <span className="truncate">{session.title || 'College question'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* User card + menu */}
        <div className="relative border-t border-slate-800 p-3">
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full left-3 right-3 z-20 mb-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    onClick={() => { setMenuOpen(false); navigate(to); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700"
                  >
                    <Icon size={16} className="text-slate-400" /> {label}
                  </button>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); onLogout?.(); }}
                  className="flex w-full items-center gap-2.5 border-t border-slate-700 px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-slate-700"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </>
          )}
          <button onClick={() => setMenuOpen((v) => !v)} className="focus-ring flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-800">
            <div className="relative shrink-0">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">{initials || <MessageSquare size={16} />}</div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{profile.full_name || profile.email}</p>
              <p className="truncate text-xs capitalize text-slate-400">{userSubtitle}</p>
            </div>
            <MoreVertical size={16} className="shrink-0 text-slate-500" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <section className="relative flex min-w-0 flex-col bg-slate-950">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10">
              {/* Subtle background glow */}
              <div className="pointer-events-none absolute left-1/2 top-16 -z-0 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

              <div className="relative animate-fadeIn">
                {/* Centered hero */}
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
                    <Sparkles size={13} /> Learn · Leap · Lead
                  </span>
                  <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                    {partOfDay}, {firstName} <span className="inline-block">👋</span>
                  </h1>
                  <p className="mt-2 text-base text-slate-400">How can I help you today?</p>
                </div>

                {/* Large composer */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask();
                  }}
                  className="mt-6"
                >
                  {fileChip}
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-black/30 transition-colors focus-within:border-blue-500">
                    <textarea
                      ref={inputRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          ask();
                        }
                      }}
                      rows={2}
                      className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
                      placeholder="Ask anything about academics, hostel, placements…"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {attachButton}
                      <button disabled={loading} className="btn-primary grid h-10 w-10 shrink-0 place-items-center p-0" aria-label="Send">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Category cards — single row */}
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {content.topics.map(({ icon: Icon, label, prompt }, i) => (
                    <button
                      key={label}
                      onClick={() => prefill(prompt)}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className="group flex animate-fadeIn items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-900/20"
                    >
                      <Icon size={18} className="text-blue-400 transition-transform group-hover:scale-110" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="my-8 border-t border-slate-800/70" />

                {/* Quick prompts */}
                <p className="text-sm font-semibold text-slate-300">Try asking</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {content.quick.map((text) => (
                    <button
                      key={text}
                      onClick={() => ask(text)}
                      className="focus-ring rounded-full border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-sm text-slate-300 transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <Lock size={12} /> Secure · Private · Trusted
                </p>
                <p className="mt-2 text-center text-xs text-slate-600">
                  Designed &amp; developed by <span className="font-semibold text-slate-400">Suraj Nandan</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} onFeedback={sendFeedback} />
              ))}
              {loading && <TypingDots />}
              {notice && <p className="text-sm font-medium text-emerald-400">{notice}</p>}
            </div>
          )}
        </div>

        {/* Bottom input (shown once a conversation is active) */}
        {messages.length > 0 && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask();
            }}
            className="border-t border-slate-800 bg-slate-900 px-4 py-3"
          >
            <div className="mx-auto max-w-3xl">
              {fileChip}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-lg shadow-black/20 focus-within:border-blue-500">
                {attachButton}
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="Ask a follow-up…"
                />
                <button disabled={loading} className="btn-primary grid h-11 w-11 shrink-0 place-items-center p-0" aria-label="Send">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
