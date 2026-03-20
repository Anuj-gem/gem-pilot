"use client";

import { useState } from "react";
import { DIMENSION_META, type DimensionId } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DimensionBarProps {
  dimensionId: DimensionId;
  score: number;
  weight: number;
  reasoning: string;
  winnerAvg?: number;
  vsWinnerAvg?: number;
  expandable?: boolean;
}

export function DimensionBar({
  dimensionId,
  score,
  weight,
  reasoning,
  winnerAvg,
  vsWinnerAvg,
  expandable = true,
}: DimensionBarProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = DIMENSION_META[dimensionId];
  const pct = (score / 10) * 100;

  const barColor =
    score >= 8
      ? "bg-emerald-500"
      : score >= 6
        ? "bg-gem-gold"
        : score >= 4
          ? "bg-amber-600"
          : "bg-gem-text-muted";

  const weightLabel =
    weight >= 2.0 ? "HIGH" : weight >= 0.5 ? "MED" : "LOW";
  const weightColor =
    weight >= 2.0
      ? "text-gem-gold"
      : weight >= 0.5
        ? "text-gem-text-secondary"
        : "text-gem-text-muted";

  return (
    <div
      className={`gem-card p-4 transition-colors duration-200 ${
        expandable ? "cursor-pointer hover:border-gem-border-light" : ""
      }`}
      onClick={() => expandable && setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gem-text-primary">
            {meta?.label || dimensionId}
          </span>
          <span className={`text-[10px] font-mono uppercase ${weightColor}`}>
            {weightLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-gem-text-secondary">
            {score.toFixed(1)}/10
          </span>
          {vsWinnerAvg !== undefined && vsWinnerAvg !== 0 && (
            <span
              className={`text-xs font-mono ${
                vsWinnerAvg > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {vsWinnerAvg > 0 ? "+" : ""}
              {vsWinnerAvg.toFixed(1)}
            </span>
          )}
          {expandable && (
            <span className="text-gem-text-muted">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-gem-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gem-border">
          <p className="text-sm text-gem-text-secondary leading-relaxed">
            {reasoning}
          </p>
          {winnerAvg !== undefined && (
            <p className="mt-2 text-xs text-gem-text-muted">
              Winner average: {winnerAvg.toFixed(1)}/10 &middot; Weight:{" "}
              {weight.toFixed(1)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
