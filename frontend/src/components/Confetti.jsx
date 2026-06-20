import { useEffect, useState } from 'react';

const COLORS = ['#8b5cf6', '#d946ef', '#22d3ee', '#a3e635', '#fbbf24', '#f472b6'];

// Fires a burst of falling confetti whenever `trigger` changes to a truthy value.
export default function Confetti({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const batch = Array.from({ length: 90 }, (_, i) => ({
      id: `${trigger}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360
    }));
    setPieces(batch);
    const timer = setTimeout(() => setPieces([]), 3600);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`
          }}
        />
      ))}
    </>
  );
}
