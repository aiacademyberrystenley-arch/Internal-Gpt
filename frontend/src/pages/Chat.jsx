import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Send, Sparkles, Zap } from 'lucide-react';
import { api } from '../lib/api';
import MessageBubble from '../components/MessageBubble';

const suggestions = [
  { icon: '📝', text: 'When is the DBMS exam?' },
  { icon: '📅', text: 'What is the minimum attendance requirement?' },
  { icon: '🏠', text: 'Who is the hostel warden?' },
  { icon: '📚', text: 'What are the library timings?' }
];

function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <Sparkles size={15} className="text-violet-300" />
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-fuchsia-glow animate-bounceDot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-xs text-slate-400">Searching the campus archives…</span>
    </div>
  );
}

export default function Chat({ profile, game, onCelebrate }) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [xpFlash, setXpFlash] = useState(null);
  const scrollRef = useRef(null);

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

  const greeting = useMemo(
    () => `Ask anything about notices, schedules, fees, hostel, library, or placements visible to ${profile.role}s — and earn XP for every question!`,
    [profile.role]
  );

  async function ask(text = question) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setQuestion('');
    setNotice('');
    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setLoading(true);
    try {
      const result = await api('/api/chat', { method: 'POST', body: JSON.stringify({ question: trimmed, session_id: sessionId }) });
      setSessionId(result.session_id);
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, sources: result.sources }]);
      loadSessions();

      // Award XP and trigger any level-up / badge celebration.
      const reward = game.recordQuestion({ hasSources: result.sources?.length > 0 });
      setXpFlash(reward.xpGained);
      setTimeout(() => setXpFlash(null), 1500);
      onCelebrate?.(reward);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.message, sources: [] }]);
    } finally {
      setLoading(false);
    }
  }

  async function selectSession(id) {
    setSessionId(id);
    setMessages(await api(`/api/chat/sessions/${id}`));
  }

  async function sendFeedback(rating) {
    try {
      await api('/api/feedback', { method: 'POST', body: JSON.stringify({ rating }) });
      setNotice(rating === 'helpful' ? '⭐ Thanks for the feedback!' : 'Got it — we’ll improve.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="grid h-screen min-h-[720px] lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl lg:block">
        <button
          onClick={() => {
            setSessionId(null);
            setMessages([]);
          }}
          className="btn-glow focus-ring flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm"
        >
          <Plus size={16} /> New quest
        </button>
        <p className="mt-5 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Recent quests</p>
        <div className="mt-2 space-y-1.5">
          {sessions.length === 0 && <p className="px-1 text-xs text-slate-500">No quests yet — ask your first question!</p>}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={`focus-ring block w-full truncate rounded-xl px-3 py-2 text-left text-sm transition ${
                session.id === sessionId ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {session.title || 'College question'}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 className="font-display text-xl font-extrabold text-white">College Helpdesk Quest 🎓</h2>
            <p className="text-sm text-slate-400">{greeting}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
            <Zap size={15} className="text-amber-300" />
            <span className="text-sm font-bold text-white">{game.xp} XP</span>
            <span className="text-xs text-slate-400">· Lv {game.level}</span>
          </div>
        </header>

        <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl">
              <div className="glass p-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-glow animate-float">
                  <Sparkles className="text-white" size={26} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">Start your first quest!</h3>
                <p className="mt-1 text-sm text-slate-400">Pick a question below or type your own. Every answer earns you XP. ⚡</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((item) => (
                    <button
                      key={item.text}
                      onClick={() => ask(item.text)}
                      className="focus-ring group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-violet-glow/50 hover:bg-white/10 hover:shadow-glow"
                    >
                      <span className="text-xl transition-transform group-hover:scale-125">{item.icon}</span>
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} onFeedback={sendFeedback} />
          ))}
          {loading && <TypingDots />}
          {notice && <p className="text-sm font-medium text-emerald-300">{notice}</p>}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
          className="relative border-t border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
        >
          {xpFlash != null && (
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 animate-pop rounded-full bg-amber-400/20 px-3 py-1 text-sm font-bold text-amber-300">
              +{xpFlash} XP ⚡
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 focus-within:border-violet-glow/60 focus-within:shadow-glow">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="Ask a question to earn XP…"
            />
            <button
              disabled={loading}
              className="btn-glow focus-ring grid h-11 w-11 shrink-0 place-items-center disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
