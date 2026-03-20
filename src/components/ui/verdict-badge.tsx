"use client";

import { Verdict, VERDICT_META } from "@/types";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-1.5 text-sm",
  lg: "px-6 py-2 text-base",
};

export function VerdictBadge({ verdict, size = "md" }: VerdictBadgeProps) {
  const meta = VERDICT_META[verdict];
  if (!meta) return null;

  return (
    <span
      className={`
        inline-flex items-center rounded border font-medium uppercase tracking-widest
        ${sizeClasses[size]} ${meta.bgClass} ${meta.colorClass}
      `}
    >
      {verdict === "STRONG SIGNAL" && (
        <span className="mr-2">&#9670;</span>
      )}
      {meta.label}
    </span>
  );
}
