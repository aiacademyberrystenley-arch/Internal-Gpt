import { useEffect, useState } from 'react';
import { FileCheck, FileText, MessageCircle, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';

export default function AdminDashboard({ profile }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/dashboard/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (profile.role !== 'admin') return <div className="p-6 text-slate-300">Only admins can view dashboard metrics.</div>;

  const cards = [
    ['Documents', stats?.documents ?? 0, FileText],
    ['Indexed', stats?.indexed_documents ?? 0, FileCheck],
    ['Questions', stats?.questions ?? 0, MessageCircle],
    ['Feedback', stats?.feedback ?? 0, ThumbsUp]
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      <p className="mt-1 text-sm text-slate-400">Usage and indexing metrics for the college knowledge base.</p>
      {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-950 text-blue-400">
              <Icon size={20} />
            </div>
            <p className="mt-4 text-sm text-slate-400">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
