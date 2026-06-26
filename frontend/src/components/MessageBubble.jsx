import { Bot, ThumbsDown, ThumbsUp } from 'lucide-react';

export default function MessageBubble({ message, onFeedback }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex animate-fadeIn justify-end">
        <div className="max-w-xl rounded-xl rounded-br-sm bg-blue-600 px-4 py-3 text-white">
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fadeIn justify-start gap-3">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-blue-400">
        <Bot size={17} />
      </div>
      <div className="max-w-3xl">
        <div className="card px-4 py-3 text-slate-100">
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        </div>
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-xs text-slate-500">Was this helpful?</span>
          <button
            onClick={() => onFeedback('helpful')}
            className="focus-ring rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
            title="Helpful"
          >
            <ThumbsUp size={15} />
          </button>
          <button
            onClick={() => onFeedback('not_helpful')}
            className="focus-ring rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-rose-500/50 hover:text-rose-400"
            title="Not helpful"
          >
            <ThumbsDown size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
