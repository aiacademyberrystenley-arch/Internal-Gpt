import { FileSearch } from 'lucide-react';

export default function SourceCard({ source }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FileSearch size={16} className="text-campus" />
        {source.title}
      </div>
      <p className="mt-2 line-clamp-4 text-sm text-slate-600">{source.excerpt}</p>
      <p className="mt-2 text-xs text-slate-500">Chunk {source.chunk_index + 1} · score {source.score}</p>
    </div>
  );
}
