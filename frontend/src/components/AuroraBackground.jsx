// Animated, blurred gradient blobs that drift behind the whole app.
export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl animate-aurora" />
      <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-aurora [animation-delay:-6s]" />
      <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl animate-aurora [animation-delay:-12s]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
