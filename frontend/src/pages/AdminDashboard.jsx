import { useEffect, useState } from 'react';
import { BarChart3, FileCheck, FileText, MessageCircle, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';

export default function AdminDashboard({ profile }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/dashboard/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (profile.role !== 'admin') return <div className="p-6">Only admins can view dashboard metrics.</div>;

  const cards = [
    ['Documents', stats?.documents ?? 0, FileText],
    ['Indexed', stats?.indexed_documents ?? 0, FileCheck],
    ['Questions', stats?.questions ?? 0, MessageCircle],
    ['Feedback', stats?.feedback ?? 0, ThumbsUp]
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="text-campus" />
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-sm text-slate-600">Usage and indexing metrics for the college knowledge base.</p>
        </div>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-5">
            <Icon className="text-campus" />
            <p className="mt-4 text-sm text-slate-600">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
