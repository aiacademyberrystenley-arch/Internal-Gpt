import { Flame, Sparkles, Star } from 'lucide-react';

// Compact "player stats" card: avatar, rank, level, animated XP bar, streak.
export default function PlayerCard({ game, profile, compact = false }) {
  const initial = (profile?.full_name || profile?.email || '?').charAt(0).toUpperCase();

  return (
    <div className={`glass-strong p-4 ${compact ? '' : 'sm:p-5'}`}>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white shadow-glow">
            {initial}
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[#0b0b1f] bg-cyan-400 text-[11px] font-extrabold text-[#0b0b1f]">
            {game.level}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {profile?.full_name || profile?.email}
          </p>
          <p className="flex items-center gap-1 text-xs font-medium text-cyan-300">
            <Star size={12} className="fill-cyan-300" /> {game.rank}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-300">
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-violet-300" /> {game.xp} XP
          </span>
          <span>
            {game.intoLevel}/{game.levelNeed} to Lv {game.level + 1}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(6, game.progress)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
          <Flame size={13} className={game.streak > 0 ? 'animate-wiggle' : ''} /> {game.streak} day streak
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          {game.totalQuestions} asked
        </span>
      </div>
    </div>
  );
}
