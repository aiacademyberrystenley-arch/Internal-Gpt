import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Feedback({ profile }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/feedback').then(setItems).catch((err) => setError(err.message));
  }, []);

  if (!['admin', 'teacher'].includes(profile.role)) return <div className="p-6">Only staff can review feedback.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Feedback Review</h2>
      <p className="text-sm text-slate-600">Use low-rated answers to identify missing documents.</p>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="font-semibold">{item.rating}</p>
            <p className="text-sm text-slate-600">{item.comment || 'No comment added'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
