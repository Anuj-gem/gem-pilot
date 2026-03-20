/**
 * Evaluator Interface (Legacy)
 *
 * The real evaluation pipeline now runs through the FastAPI server
 * at /api/evaluate. This file is kept as a stub so old imports
 * don't break the build.
 */

export interface EvaluatorResult {
  overall_score: number;
  verdict: string;
  facet_scores: any[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export async function evaluateScript(_scriptText: string): Promise<EvaluatorResult> {
  throw new Error(
    "Direct evaluator calls are deprecated. Use the FastAPI server at /api/evaluate instead."
  );
}
