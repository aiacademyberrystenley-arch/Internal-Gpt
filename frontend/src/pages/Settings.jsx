import { Award, Mail, Shield, Sparkles, Target, Trophy } from 'lucide-react';
import { BADGES } from '../lib/gamify';
import PlayerCard from '../components/PlayerCard';

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="glass flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-extrabold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function SettingsPage({ profile, game }) {
  const earned = new Set(game.badges);

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-300" size={26} />
          <h2 className="font-display text-2xl font-extrabold text-white">Your Profile</h2>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
          <PlayerCard game={game} profile={profile} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={Sparkles} label="Total XP" value={game.xp} color="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <Stat icon={Target} label="Questions" value={game.totalQuestions} color="bg-gradient-to-br from-cyan-500 to-blue-500" />
            <Stat icon={Award} label="Day streak" value={game.streak} color="bg-gradient-to-br from-amber-500 to-orange-500" />
          </div>
        </div>

        <h3 className="mt-9 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Award size={20} className="text-fuchsia-300" /> Achievements
          <span className="text-sm font-medium text-slate-400">
            ({earned.size}/{BADGES.length})
          </span>
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((badge) => {
            const unlocked = earned.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`relative overflow-hidden rounded-2xl border p-4 text-center transition ${
                  unlocked
                    ? 'border-amber-300/40 bg-gradient-to-b from-amber-400/15 to-transparent shadow-glow'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className={`text-4xl transition ${unlocked ? 'animate-float' : 'opacity-25 grayscale'}`}>{badge.icon}</div>
                <p className={`mt-2 text-sm font-bold ${unlocked ? 'text-white' : 'text-slate-500'}`}>{badge.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {unlocked ? 'Unlocked!' : badge.streak ? `${badge.streak}-day streak` : badge.sourced ? `${badge.sourced} sourced answers` : `${badge.need} questions`}
                </p>
              </div>
            );
          })}
        </div>

        <h3 className="mt-9 font-display text-lg font-bold text-white">Account</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="glass flex items-center gap-3 p-4">
            <Mail size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="font-semibold text-white">{profile.email}</p>
            </div>
          </div>
          <div className="glass flex items-center gap-3 p-4">
            <Shield size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Role</p>
              <p className="font-semibold capitalize text-white">{profile.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
