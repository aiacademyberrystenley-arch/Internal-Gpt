import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import SourceCard from './SourceCard';

export default function MessageBubble({ message, onFeedback }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex animate-pop justify-end">
        <div className="max-w-xl rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 text-white shadow-glow">
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-pop justify-start gap-3">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-glow">
        <Sparkles size={17} className="text-white" />
      </div>
      <div className="max-w-3xl">
        <div className="glass px-4 py-3 text-slate-100">
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          {message.sources?.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {message.sources.map((source) => (
                <SourceCard key={`${source.document_id}-${source.chunk_index}`} source={source} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-xs text-slate-500">Was this helpful?</span>
          <button
            onClick={() => onFeedback('helpful')}
            className="focus-ring rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300"
            title="Helpful"
          >
            <ThumbsUp size={15} />
          </button>
          <button
            onClick={() => onFeedback('not_helpful')}
            className="focus-ring rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-rose-400/50 hover:text-rose-300"
            title="Not helpful"
          >
            <ThumbsDown size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
