/**
 * Mock Evaluator (Legacy)
 *
 * Kept as a stub so old imports don't break the build.
 * The real pipeline now runs through FastAPI server/main.py.
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
  throw new Error("Mock evaluator is deprecated. Use FastAPI /api/evaluate.");
}
