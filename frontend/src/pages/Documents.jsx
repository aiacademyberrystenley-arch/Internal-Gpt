import { useEffect, useState } from 'react';
import { RefreshCcw, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';

const initialForm = {
  title: '',
  category: 'Notice',
  department: 'Computer Science and Engineering',
  semester: '',
  visibility: 'student',
  academic_year: '2025-2026',
  tags: ''
};

export default function Documents({ profile }) {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const canUpload = ['admin', 'teacher'].includes(profile.role);
  const canDelete = profile.role === 'admin';

  async function load() {
    setDocuments(await api('/api/documents'));
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  async function uploadDocument(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      await api('/api/documents/upload', { method: 'POST', body });
      setForm(initialForm);
      setFile(null);
      await load();
      setMessage('Upload received. Indexing is running in the background; refresh in a few seconds to see indexed status.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Documents</h2>
          <p className="text-sm text-slate-600">Upload college files, assign metadata, and track indexing status.</p>
        </div>
        <button onClick={load} className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {canUpload && (
        <form onSubmit={uploadDocument} className="mt-6 rounded-md border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">Upload document</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" placeholder="Semester" type="number" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <select className="focus-ring rounded-md border border-slate-300 px-3 py-2" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              {['public', 'student', 'teacher', 'staff', 'admin'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" placeholder="Academic year" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Tags comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <input className="focus-ring rounded-md border border-slate-300 px-3 py-2" type="file" accept=".pdf,.docx,.txt,.csv" onChange={(e) => setFile(e.target.files?.[0])} />
          </div>
          <button disabled={busy} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md bg-campus px-4 py-2 font-semibold text-white disabled:opacity-60">
            <Upload size={17} /> {busy ? 'Uploading...' : 'Upload and index'}
          </button>
        </form>
      )}

      {!canUpload && <p className="mt-6 rounded-md border border-slate-200 bg-white p-4 text-sm">Student accounts can view available documents but cannot upload or delete files.</p>}
      {message && <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm">{message}</p>}

      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_120px_90px] gap-3 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
          <span>Title</span><span>Metadata</span><span>Status</span><span>Action</span>
        </div>
        {documents.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[1.4fr_1fr_120px_90px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
            <span className="font-medium">{doc.title}</span>
            <span className="text-slate-600">{doc.category} · {doc.department || 'All'} · {doc.visibility}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-center text-xs font-semibold">{doc.status}</span>
            <span>{canDelete && <button onClick={() => remove(doc.id)} className="focus-ring rounded-md p-2 text-red-600" aria-label="Delete"><Trash2 size={16} /></button>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
