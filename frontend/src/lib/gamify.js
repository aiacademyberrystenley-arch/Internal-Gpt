import { useCallback, useEffect, useRef, useState } from 'react';

// XP needed to reach the NEXT level grows gently so early levels feel fast.
const XP_PER_LEVEL = (level) => 60 + (level - 1) * 40;

export const RANKS = [
  'Freshman',
  'Explorer',
  'Scholar',
  'Achiever',
  'Whiz',
  'Mastermind',
  'Sage',
  'Campus Legend'
];

export const BADGES = [
  { id: 'first', icon: '🚀', label: 'First Question', need: 1 },
  { id: 'curious', icon: '🔍', label: 'Curious Mind', need: 5 },
  { id: 'streak3', icon: '🔥', label: '3-Day Streak', need: 0, streak: 3 },
  { id: 'scholar', icon: '📚', label: 'Bookworm', need: 25 },
  { id: 'sourcer', icon: '🎯', label: 'Source Hunter', need: 0, sourced: 10 },
  { id: 'genius', icon: '🧠', label: 'Genius', need: 75 },
  { id: 'legend', icon: '👑', label: 'Campus Legend', need: 150 }
];

const DEFAULT = { xp: 0, totalQuestions: 0, sourcedAnswers: 0, streak: 0, lastDay: null };

function keyFor(userId) {
  return `igpt_game_${userId || 'guest'}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function load(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

function save(userId, state) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    /* ignore quota / private mode errors */
  }
}

// Convert a flat XP total into a level + progress toward the next level.
export function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= XP_PER_LEVEL(level)) {
    remaining -= XP_PER_LEVEL(level);
    level += 1;
  }
  const need = XP_PER_LEVEL(level);
  return {
    level,
    rank: RANKS[Math.min(level - 1, RANKS.length - 1)],
    intoLevel: remaining,
    levelNeed: need,
    progress: Math.round((remaining / need) * 100)
  };
}

export function earnedBadges(state) {
  return BADGES.filter((b) => {
    if (b.streak) return state.streak >= b.streak;
    if (b.sourced) return state.sourcedAnswers >= b.sourced;
    return state.totalQuestions >= b.need;
  }).map((b) => b.id);
}

export function useGamification(userId) {
  const [state, setState] = useState(() => load(userId));
  // Mirror of latest state so recordQuestion can compute its result
  // synchronously without depending on React's batching timing.
  const ref = useRef(state);
  ref.current = state;

  // Reload when the signed-in user changes, and refresh the daily streak.
  useEffect(() => {
    const fresh = load(userId);
    const today = todayStr();
    if (fresh.lastDay && fresh.lastDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (fresh.lastDay !== yesterday) fresh.streak = 0; // streak broken
    }
    ref.current = fresh;
    setState(fresh);
    save(userId, fresh);
  }, [userId]);

  // Record an asked question; returns the celebration payload.
  const recordQuestion = useCallback(
    ({ hasSources } = {}) => {
      const prev = ref.current;
      const before = levelFromXp(prev.xp);
      const beforeBadges = earnedBadges(prev);
      const today = todayStr();

      const gained = 10 + (hasSources ? 8 : 0);
      const next = {
        ...prev,
        xp: prev.xp + gained,
        totalQuestions: prev.totalQuestions + 1,
        sourcedAnswers: prev.sourcedAnswers + (hasSources ? 1 : 0),
        streak: prev.lastDay === today ? prev.streak : prev.streak + 1,
        lastDay: today
      };

      const after = levelFromXp(next.xp);
      const afterBadges = earnedBadges(next);

      ref.current = next;
      save(userId, next);
      setState(next);

      return {
        xpGained: gained,
        leveledUp: after.level > before.level,
        newLevel: after.level > before.level ? after : null,
        newBadges: afterBadges.filter((id) => !beforeBadges.includes(id))
      };
    },
    [userId]
  );

  const lvl = levelFromXp(state.xp);
  return {
    ...state,
    ...lvl,
    badges: earnedBadges(state),
    recordQuestion
  };
}
