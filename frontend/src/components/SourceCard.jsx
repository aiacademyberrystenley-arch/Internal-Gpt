import { FileText } from 'lucide-react';

export default function SourceCard({ source }) {
  const pct = Math.round((source.score || 0) * 100);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <FileText size={15} className="shrink-0 text-blue-400" />
        <span className="truncate">{source.title}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{source.excerpt}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, pct)}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-slate-400">{pct}% match</span>
      </div>
    </div>
  );
}
