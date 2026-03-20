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
    if (s >= 90) return "#34D399"; // emerald — STRONG SIGNAL
    if (s >= 72) return "#C9A84C"; // gold — WORTH THE READ
    if (s >= 50) return "#9A9A9E"; // muted — MIXED
    return "#6A6A70"; // dim — PASS
  };

  return (
    <div
      className={`score-ring ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A30"
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
        <span className="text-3xl font-display font-bold text-gem-text-primary">
          {Math.round(score)}
        </span>
        <span className="text-xs text-gem-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}
