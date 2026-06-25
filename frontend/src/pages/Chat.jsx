import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Plus, Send } from 'lucide-react';
import { api } from '../lib/api';
import MessageBubble from '../components/MessageBubble';

const suggestions = [
  'When is the DBMS exam?',
  'What is the minimum attendance requirement?',
  'Who is the hostel warden?',
  'What are the library timings?'
];

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

export default function Chat({ profile }) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
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
    () => `Ask anything about notices, schedules, fees, hostel, library, or placements visible to ${profile.role}s.`,
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
      setNotice(rating === 'helpful' ? 'Thanks for the feedback.' : 'Got it — we’ll use this to improve.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="grid h-screen min-h-[640px] lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-slate-800 bg-slate-900 p-4 lg:block">
        <button
          onClick={() => {
            setSessionId(null);
            setMessages([]);
          }}
          className="btn-primary w-full"
        >
          <Plus size={16} /> New chat
        </button>
        <p className="mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent</p>
        <div className="mt-2 space-y-1">
          {sessions.length === 0 && <p className="px-1 text-xs text-slate-500">No conversations yet.</p>}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={`focus-ring block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                session.id === sessionId ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {session.title || 'College question'}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="border-b border-slate-800 bg-slate-900 px-5 py-4">
          <h2 className="text-lg font-bold text-white">College Helpdesk</h2>
          <p className="text-sm text-slate-400">{greeting}</p>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-950 p-5">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl">
              <div className="card p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-600">
                  <Bot className="text-white" size={24} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">How can I help?</h3>
                <p className="mt-1 text-sm text-slate-400">Pick a question below or type your own.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      onClick={() => ask(text)}
                      className="focus-ring rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                    >
                      {text}
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
          {notice && <p className="text-sm font-medium text-emerald-400">{notice}</p>}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
          className="border-t border-slate-800 bg-slate-900 p-4"
        >
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-1.5 focus-within:border-blue-500">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="Ask a question…"
            />
            <button disabled={loading} className="btn-primary grid h-10 w-10 shrink-0 place-items-center p-0" aria-label="Send">
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
