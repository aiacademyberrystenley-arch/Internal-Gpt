import { useEffect, useState } from 'react';
import { Download, Pencil, RefreshCcw, Trash2, Upload } from 'lucide-react';
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

const statusStyles = {
  indexed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
};

export default function Documents({ profile }) {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const canUpload = ['admin', 'teacher'].includes(profile.role);
  const canManage = profile.role === 'admin';

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
      setMessage('Upload received. Indexing runs in the background — refresh in a few seconds to see the indexed status.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    await load();
  }

  async function rename(doc) {
    const next = window.prompt('Rename document', doc.title);
    if (next === null) return;
    const title = next.trim();
    if (!title || title === doc.title) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
      await load();
      setMessage('Document renamed.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Documents</h2>
          <p className="mt-1 text-sm text-slate-400">Upload college files, assign metadata, and track indexing status.</p>
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {canUpload && (
        <form onSubmit={uploadDocument} className="card mt-6 p-5">
          <h3 className="font-semibold text-white">Upload document</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <input className="input" placeholder="Semester" type="number" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <select className="input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              {['public', 'student', 'teacher', 'staff', 'admin'].map((item) => (
                <option key={item} className="bg-slate-900">{item}</option>
              ))}
            </select>
            <input className="input" placeholder="Academic year" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
            <input className="input md:col-span-2" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <input className="input file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-slate-200" type="file" accept=".pdf,.docx,.txt,.csv" onChange={(e) => setFile(e.target.files?.[0])} />
          </div>
          {file && <p className="mt-3 text-sm text-slate-400">Selected file: <span className="font-medium text-slate-200">{file.name}</span></p>}
          <button disabled={busy || !file} className="btn-primary mt-4">
            <Upload size={17} /> {busy ? 'Uploading…' : 'Upload and index'}
          </button>
        </form>
      )}

      {!canUpload && <p className="card mt-6 p-4 text-sm text-slate-300">Student accounts can view available documents but cannot upload or manage files.</p>}
      {message && <p className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">{message}</p>}

      <div className="card mt-6 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_120px_150px] gap-3 border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Title</span><span>Metadata</span><span>Status</span><span>Actions</span>
        </div>
        {documents.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No documents yet.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[1.4fr_1fr_120px_150px] items-center gap-3 border-b border-slate-800 px-4 py-3 text-sm last:border-0">
            <span className="font-medium text-white">{doc.title}</span>
            <span className="text-slate-400">{doc.category} · {doc.department || 'All'} · {doc.visibility}</span>
            <span className={`w-fit rounded-md border px-2 py-1 text-center text-xs font-semibold ${statusStyles[doc.status] || 'border-slate-700 bg-slate-800 text-slate-300'}`}>{doc.status}</span>
            <span className="flex items-center gap-1">
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" download className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400" aria-label="Download or view" title="Download / view">
                  <Download size={16} />
                </a>
              )}
              {canManage && (
                <button onClick={() => rename(doc)} className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Rename" title="Rename">
                  <Pencil size={16} />
                </button>
              )}
              {canManage && (
                <button onClick={() => remove(doc.id)} className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400" aria-label="Delete" title="Delete">
                  <Trash2 size={16} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
