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
        ? "bg-emerald-700"
        : score >= 4
          ? "bg-amber-500"
          : "bg-zinc-400";

  const weightLabel =
    weight >= 2.0 ? "HIGH" : weight >= 0.5 ? "MED" : "LOW";
  const weightColor =
    weight >= 2.0
      ? "text-emerald-700"
      : weight >= 0.5
        ? "text-zinc-500"
        : "text-zinc-400";

  return (
    <div
      className={`p-4 transition-colors duration-200 ${
        expandable ? "cursor-pointer hover:bg-zinc-50 rounded-xl" : ""
      }`}
      onClick={() => expandable && setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-950">
            {meta?.label || dimensionId}
          </span>
          <span className={`text-[10px] font-mono uppercase ${weightColor}`}>
            {weightLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-zinc-500">
            {score.toFixed(1)}/10
          </span>
          {vsWinnerAvg !== undefined && vsWinnerAvg !== 0 && (
            <span
              className={`text-xs font-mono ${
                vsWinnerAvg > 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {vsWinnerAvg > 0 ? "+" : ""}
              {vsWinnerAvg.toFixed(1)}
            </span>
          )}
          {expandable && (
            <span className="text-zinc-400">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <p className="text-sm text-zinc-600 leading-relaxed">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
