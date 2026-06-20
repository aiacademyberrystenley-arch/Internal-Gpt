import { FileSearch } from 'lucide-react';

export default function SourceCard({ source }) {
  const pct = Math.round((source.score || 0) * 100);
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-cyan-glow/40 hover:bg-white/10">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <FileSearch size={15} className="text-cyan-300" />
        <span className="truncate">{source.title}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{source.excerpt}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${Math.max(8, pct)}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-cyan-300">{pct}% match</span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">Chunk {source.chunk_index + 1}</p>
    </div>
  );
}
