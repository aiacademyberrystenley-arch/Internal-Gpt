import { ThumbsDown, ThumbsUp } from 'lucide-react';
import SourceCard from './SourceCard';

export default function MessageBubble({ message, onFeedback }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-md px-4 py-3 ${isUser ? 'bg-campus text-white' : 'border border-slate-200 bg-white text-ink'}`}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        {!isUser && message.sources?.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {message.sources.map((source) => <SourceCard key={`${source.document_id}-${source.chunk_index}`} source={source} />)}
          </div>
        )}
        {!isUser && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => onFeedback('helpful')} className="focus-ring rounded-md border border-slate-300 p-2 text-slate-600" title="Helpful">
              <ThumbsUp size={16} />
            </button>
            <button onClick={() => onFeedback('not_helpful')} className="focus-ring rounded-md border border-slate-300 p-2 text-slate-600" title="Not helpful">
              <ThumbsDown size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
