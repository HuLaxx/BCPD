import test from "node:test";
import assert from "node:assert/strict";
import { candidateLedger, completedWeeklyCloses, observedTrace, traceGeometry } from "../lib/observatory-view";
import { ASSETS } from "../lib/universe";
import type { Study } from "../lib/analysis";

const sample: Study = {
  asset: ASSETS[0],
  latest: "2026-10-31",
  source: "Test fixture — not historical market data",
  accessedAt: "2026-11-08T00:00:00Z",
  returns: [
    {date: "2026-10-17", close: 100, returnPct: -1},
    {date: "2026-10-24", close: 102, returnPct: 2},
    {date: "2026-10-31", close: 99, returnPct: -3},
  ],
  analysis: {
    probabilities: [0.04, 0.62, 0.15],
    sampleVariance: 1,
    consensus: [
      {index: 1, support: 7, total: 9, share: 7 / 9},
      {index: 2, support: 2, total: 9, share: 2 / 9},
    ],
  },
};

test("observatory displays actual observed values, never generated time series", () => {
  const points = observedTrace(sample);
  assert.deepEqual(points.map(p => p.close), [100, 102, 99]);
  assert.deepEqual(points.map(p => p.resetProbability), [0.04, 0.62, 0.15]);
  assert.deepEqual(points.map(p => p.week), sample.returns.map(r => r.date));
});

test("only sensitivity-stable model candidates enter the evidence ledger", () => {
  assert.deepEqual(candidateLedger(sample).map(p => [p.week, p.support]), [["2026-10-24", 7]]);
});

test("chart geometry is deterministic and correctly encodes all observations", () => {
  const points = observedTrace(sample);
  const a = traceGeometry(points, "close");
  assert.equal(a.line, traceGeometry(points, "close").line);
  assert.equal((a.line.match(/L/g) ?? []).length, 2);
  const reset = traceGeometry(points, "reset");
  assert.equal(reset.min, 0);
  assert.equal(reset.max, 100);
  const returns = traceGeometry(points, "return");
  assert.ok(returns.zero !== null);
  assert.ok(returns.min < 0 && returns.max > 0);
});

test("invalid or missing observations are rejected, not silently guessed", () => {
  assert.throws(() => observedTrace({
    ...sample, analysis: { ...sample.analysis, probabilities: [0] },
  }), /not aligned/);
  assert.throws(() => observedTrace({
    ...sample, returns: sample.returns.map((r, i) => i === 1 ? {...r, close: -1} : r),
  }), /invalid data/);
  assert.deepEqual(traceGeometry([], "reset").line, "");
});

test("unfinished market weeks never enter the visible analysis", () => {
  const prices = [
    {date: "2026-10-30", close: 100},
    {date: "2026-10-31", close: 101},
    {date: "2026-11-03", close: 102},
    {date: "2026-11-07", close: 103},
  ];
  const onSaturday = completedWeeklyCloses(prices, "2026-11-07T18:00:00Z");
  const onSunday = completedWeeklyCloses(prices, "2026-11-08T00:00:00Z");
  assert.deepEqual(onSaturday.map(x => x.weekEnd), ["2026-10-31"]);
  assert.deepEqual(onSunday.map(x => x.weekEnd), ["2026-10-31", "2026-11-07"]);
  assert.throws(() => completedWeeklyCloses(prices, "2026-11-07T18:00:00"), /timezone-aware/);
});
