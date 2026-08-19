/**
 * Pure business types for the CV-vs-job-description analysis domain.
 * No external dependencies on purpose: these types are shared between the
 * server (route handler, use case) and the client (form pre-validation,
 * results rendering) with zero risk of pulling Node-only code into the
 * browser bundle.
 */

export interface Suggestion {
  section: string;
  suggestion: string;
}

export interface AnalysisResult {
  matchScore: number;
  matchScoreExplanation: string;
  keywordsFound: string[];
  keywordsMissing: string[];
  suggestions: Suggestion[];
}
