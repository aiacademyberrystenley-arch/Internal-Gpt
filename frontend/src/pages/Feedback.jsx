import { useEffect, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';

export default function Feedback({ profile }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/feedback').then(setItems).catch((err) => setError(err.message));
  }, []);

  if (!['admin', 'teacher'].includes(profile.role)) return <div className="p-6 text-slate-300">Only staff can review feedback.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white">Feedback</h2>
      <p className="mt-1 text-sm text-slate-400">Use low-rated answers to identify missing or unclear documents.</p>
      {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">No feedback submitted yet.</p>}
        {items.map((item) => {
          const helpful = item.rating === 'helpful';
          return (
            <div key={item.id} className="card flex items-start gap-3 p-4">
              <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${helpful ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
                {helpful ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
              </div>
              <div>
                <p className="font-medium capitalize text-white">{item.rating.replace('_', ' ')}</p>
                <p className="text-sm text-slate-400">{item.comment || 'No comment added'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
