import { Bot, ExternalLink, ThumbsDown, ThumbsUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

// Split assistant text into ordered markdown / SVG segments. SVG arrives either
// inside a ```svg fenced block or as a bare <svg>…</svg> element.
function splitContent(text) {
  const segments = [];
  const regex = /```svg\s*([\s\S]*?)```|(<svg[\s\S]*?<\/svg>)/gi;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'md', value: text.slice(lastIndex, match.index) });
    segments.push({ type: 'svg', value: (match[1] || match[2] || '').trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: 'md', value: text.slice(lastIndex) });
  return segments.length ? segments : [{ type: 'md', value: text }];
}

// Strip scripts/handlers but keep the drawing — charts render on a white panel.
function cleanSvg(svg) {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}

function AssistantContent({ content }) {
  const segments = splitContent(content || '');
  return (
    <div className="md">
      {segments.map((segment, index) =>
        segment.type === 'svg' && segment.value ? (
          <div
            key={index}
            className="my-2 overflow-x-auto rounded-lg border border-slate-700 bg-white p-3"
            dangerouslySetInnerHTML={{ __html: cleanSvg(segment.value) }}
          />
        ) : (
          <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
            {segment.value}
          </ReactMarkdown>
        )
      )}
    </div>
  );
}

export default function MessageBubble({ message, onFeedback }) {
  const isUser = message.role === 'user';
  const links = (message.sources || []).filter((source) => source?.url);

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
      <div className="max-w-3xl min-w-0">
        <div className="card px-4 py-3 text-slate-100">
          <AssistantContent content={message.content} />
        </div>
        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
            <span className="text-xs text-slate-500">Sources:</span>
            {links.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex max-w-[260px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-blue-500/50 hover:text-blue-300"
                title={source.url}
              >
                <ExternalLink size={12} className="shrink-0 text-blue-400" />
                <span className="truncate">{source.title || source.url}</span>
              </a>
            ))}
          </div>
        )}
        {onFeedback && (
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
        )}
      </div>
    </div>
  );
}
