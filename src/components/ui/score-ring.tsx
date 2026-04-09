"use client";

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 6,
  className = "",
  label = "score",
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "#34d399"; // emerald-400 — Exceptional
    if (s >= 70) return "#fbbf24"; // amber-400 — Strong
    if (s >= 60) return "#60a5fa"; // blue-400 — Promising
    if (s >= 50) return "#a1a1aa"; // zinc-400 — Early Stage
    return "#71717a"; // zinc-500 — Needs Rework
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-[var(--gem-white)] ${size <= 80 ? 'text-2xl' : 'text-3xl'}`}>
          {Math.round(score)}
        </span>
        <span className={`text-zinc-400 uppercase tracking-wider whitespace-nowrap ${size <= 80 ? 'text-[9px]' : 'text-xs'}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
