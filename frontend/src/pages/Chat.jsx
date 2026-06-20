import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import MessageBubble from '../components/MessageBubble';

const suggestions = [
  'When is the DBMS exam?',
  'What is the minimum attendance requirement?',
  'Who is the hostel warden?',
  'What are the library timings?'
];

export default function Chat({ profile }) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

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

  const greeting = useMemo(() => `Ask about notices, schedules, policies, faculty, fees, hostel, library, or placement documents visible to ${profile.role}.`, [profile.role]);

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
      setNotice('Feedback saved.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="grid h-screen min-h-[720px] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <button onClick={() => { setSessionId(null); setMessages([]); }} className="focus-ring w-full rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white">New chat</button>
        <div className="mt-4 space-y-2">
          {sessions.map((session) => (
            <button key={session.id} onClick={() => selectSession(session.id)} className={`focus-ring block w-full truncate rounded-md px-3 py-2 text-left text-sm ${session.id === sessionId ? 'bg-slate-200' : 'hover:bg-slate-100'}`}>
              {session.title || 'College question'}
            </button>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-xl font-bold">College Helpdesk Chat</h2>
          <p className="text-sm text-slate-600">{greeting}</p>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <p className="font-semibold">Suggested questions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button key={item} onClick={() => ask(item)} className="focus-ring rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{item}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} onFeedback={sendFeedback} />
          ))}
          {loading && <div className="text-sm text-slate-500">Searching college documents...</div>}
          {notice && <p className="text-sm text-leaf">{notice}</p>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="border-t border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} className="focus-ring min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-3" placeholder="Ask a question from uploaded college data..." />
            <button disabled={loading} className="focus-ring rounded-md bg-campus px-4 py-3 text-white disabled:opacity-60" aria-label="Send">
              <Send size={19} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
