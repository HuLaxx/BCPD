import type { Study } from "./analysis";
import { weeklyCloses, type PricePoint, type WeeklyPoint } from "./analysis";


export type TraceMode = "close" | "return" | "reset";
export type ObservatoryPoint = {
  week: string;
  close: number;
  returnPct: number;
  resetProbability: number;
};
export type Candidate = {
  week: string;
  support: number;
  total: number;
  share: number;
  returnPct: number;
  resetProbability: number;
};

/** Expose ONLY genuine, matched model outputs and observed returns. */
export function observedTrace(study: Study): ObservatoryPoint[] {
  if (study.analysis.probabilities.length !== study.returns.length) {
    throw new Error("Model trace and observed returns are not aligned.");
  }
  return study.returns.map((row, index) => {
    const resetProbability = study.analysis.probabilities[index];
    if (
      !Number.isFinite(row.close) || row.close <= 0 ||
      !Number.isFinite(row.returnPct) ||
      !Number.isFinite(resetProbability) ||
      resetProbability < 0 || resetProbability > 1
    ) throw new Error("The observed trace contains an invalid data point.");
    return {
      week: row.date,
      close: row.close,
      returnPct: row.returnPct,
      resetProbability,
    };
  });
}

export function candidateLedger(study: Study): Candidate[] {
  const points = observedTrace(study);
  return study.analysis.consensus
    .filter(candidate =>
      candidate.total > 0 && candidate.share >= 2 / 3 &&
      candidate.support <= candidate.total && candidate.support > 0 &&
      Number.isInteger(candidate.index) && !!points[candidate.index]
    )
    .map(candidate => ({
      week: points[candidate.index].week,
      support: candidate.support,
      total: candidate.total,
      share: candidate.share,
      returnPct: points[candidate.index].returnPct,
      resetProbability: points[candidate.index].resetProbability,
    }))
    .sort((a, b) => b.week.localeCompare(a.week));
}

export function traceValue(point: ObservatoryPoint, mode: TraceMode): number {
  if (mode === "close") return point.close;
  if (mode === "return") return point.returnPct;
  return point.resetProbability * 100;
}

/** Deterministic display geometry — no interpolated or fabricated observations. */
export function traceGeometry(
  points: ObservatoryPoint[],
  mode: TraceMode,
  width = 960,
  height = 280,
): { line: string; area: string; zero: number | null; min: number; max: number } {
  if (!points.length) return { line: "", area: "", zero: null, min: 0, max: 0 };
  if (width <= 0 || height <= 0) throw new Error("Invalid plotting dimensions.");
  const values = points.map(point => traceValue(point, mode));
  if (values.some(value => !Number.isFinite(value))) throw new Error("Invalid chart value.");
  let min = mode === "reset" ? 0 : Math.min(...values);
  let max = mode === "reset" ? 100 : Math.max(...values);
  if (mode === "return") {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  const spread = max - min || 1;
  const pad = mode === "reset" ? 0 : spread * 0.1;
  min -= pad;
  max += pad;
  const x = (index: number) => points.length === 1 ? width / 2 : index * width / (points.length - 1);
  const y = (value: number) => height - (value - min) / (max - min) * height;
  const line = values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(2)},${height} L${x(0).toFixed(2)},${height} Z`;
  const zero = min <= 0 && max >= 0 ? y(0) : null;
  return { line, area, zero, min, max };
}

export function displayNumber(value: number, digits = 2): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })
    : "—";
}

/** Exclude in-progress Saturday-ending UTC weeks from a dated provider snapshot. */
export function completedWeeklyCloses(points: PricePoint[], accessedAt: string): WeeklyPoint[] {
  const stamp = new Date(accessedAt);
  if (!Number.isFinite(stamp.getTime()) || !/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(accessedAt)) {
    throw new Error("A timezone-aware source retrieval timestamp is required.");
  }
  const asof = stamp.toISOString().slice(0, 10);
  const asofDay = stamp.getUTCDay();
  const daysSinceSaturday = (asofDay - 6 + 7) % 7 || 7;
  const lastSaturday = new Date(Date.UTC(
    stamp.getUTCFullYear(), stamp.getUTCMonth(), stamp.getUTCDate() - daysSinceSaturday,
  )).toISOString().slice(0, 10);
  return weeklyCloses(points.filter(point => point.date <= asof))
    .filter(point => point.weekEnd <= lastSaturday);
}
