import type { Study, ReturnPoint } from "./analysis";

export type RegimeEvidence = {
  date: string;
  support: number;
  total: number;
  beforeWeeks: number;
  afterWeeks: number;
  beforeMeanPct: number;
  afterMeanPct: number;
  meanShiftPp: number;
  beforeVolatilityPct: number;
  afterVolatilityPct: number;
};
const average = (values: number[]) => values.reduce((s, x) => s + x, 0) / values.length;
const stdDev = (rows: ReturnPoint[]) => {
  const x = rows.map(r => r.returnPct);
  if (x.length < 2) return 0;
  const mean = average(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - mean) ** 2, 0) / (x.length - 1));
};
/** Descriptive eight-week evidence around stable posterior peaks, not hypothesis tests. */
export function regimeEvidence(study: Study, window = 8): RegimeEvidence[] {
  if (!Number.isInteger(window) || window < 6 || window > 52) throw new Error("Window must be 6–52 weeks.");
  return study.analysis.consensus
    .filter(p => p.share >= 2 / 3)
    .flatMap(peak => {
      const before = study.returns.slice(Math.max(0, peak.index - window), peak.index);
      const after = study.returns.slice(peak.index, peak.index + window);
      if (before.length < 6 || after.length < 6) return [];
      const beforeMeanPct = average(before.map(r => r.returnPct));
      const afterMeanPct = average(after.map(r => r.returnPct));
      const date = study.returns[peak.index]?.date;
      if (!date) return [];
      return [{
        date, support: peak.support, total: peak.total,
        beforeWeeks: before.length, afterWeeks: after.length,
        beforeMeanPct, afterMeanPct, meanShiftPp: afterMeanPct - beforeMeanPct,
        beforeVolatilityPct: stdDev(before) * Math.sqrt(52),
        afterVolatilityPct: stdDev(after) * Math.sqrt(52),
      }];
    })
    .sort((a, b) => b.support - a.support || a.date.localeCompare(b.date)).slice(0, 8);
}
