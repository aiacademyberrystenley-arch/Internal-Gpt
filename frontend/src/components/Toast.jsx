import { useEffect } from 'react';

// Floating celebration toast (level-up, new badge, XP gain).
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDone, toast.duration || 3200);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center px-4">
      <div className="glass-strong animate-pop flex items-center gap-3 px-5 py-3 shadow-glow-fuchsia">
        <span className="text-3xl">{toast.icon}</span>
        <div>
          <p className="font-display text-base font-bold text-gradient">{toast.title}</p>
          {toast.subtitle && <p className="text-xs text-slate-300">{toast.subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
