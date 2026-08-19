interface ScoreRingProps {
  score: number;
}

const SIZE = 148;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColorClass(score: number): string {
  if (score >= 75) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

/**
 * Deliberately a simple ring, not a precise-looking gauge with tick marks or
 * decimals: the score is an LLM-derived estimate, and the visual should not
 * imply more precision than that (spec.md section 9).
 */
export function ScoreRing({ score }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`Estimación de compatibilidad: ${clamped} de 100`}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          className="fill-none stroke-muted"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`fill-none transition-[stroke-dashoffset] duration-700 ease-out ${getScoreColorClass(clamped)}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tabular-nums">{clamped}</span>
        <span className="text-xs text-muted-foreground">de 100 (estimado)</span>
      </div>
    </div>
  );
}
