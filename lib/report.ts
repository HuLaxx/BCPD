import type { Study } from "./analysis";
import type { StudyConfig } from "./presets";

export const RESEARCH_REPORT_SCHEMA = "bcpd-one.research-report.v1";

/** Downloadable evidence package. This is not a claim of out-of-sample validation. */
export function createResearchReport(studies: Study[], config: StudyConfig, generatedAt: string) {
  if (!studies.length) throw new Error("Run a study before exporting a research report.");
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("Invalid report generation date");
  for (const market of studies) {
    if (market.returns.length !== market.analysis.probabilities.length)
      throw new Error("Each return must have a corresponding model probability.");
    if (!market.returns.every((r, index) =>
      Number.isFinite(r.close) && r.close > 0 && Number.isFinite(r.returnPct) &&
      Number.isFinite(market.analysis.probabilities[index]) &&
      market.analysis.probabilities[index] >= 0 && market.analysis.probabilities[index] <= 1))
      throw new Error("Research report contains an invalid observation.");
  }
  return {
    schema: RESEARCH_REPORT_SCHEMA,
    generatedAt,
    methodology: {
      name: "Gaussian mean-shift Bayesian online change-point detection",
      hazardWeeks: config.hazard,
      resetThreshold: config.threshold / 100,
      sensitivity: {hazardScales: [.6,1,1.6],varianceScales:[.65,1,1.5],totalSettings:9},
      alignment: "UTC Sunday–Saturday; last actual observed closing price",
      observations: "weekly percentage log returns",
      caveat: "Retrospective: fixed sample variance and initial prior estimated from observations.",
    },
    requested: {...config, selected:[...config.selected]},
    markets: studies.map(market=>({
      id:market.asset.id,
      label:market.asset.label,
      country:market.asset.country,
      kind:market.asset.kind,
      source:market.source,
      retrievedAt:market.accessedAt,
      latestObservedClose:market.latest,
      sampleVariance:market.analysis.sampleVariance,
      candidatePeaks:market.analysis.consensus.map(p=>({
        date:market.returns[p.index]?.date??null,
        index:p.index,support:p.support,total:p.total,share:p.share
      })),
      weeklyObservations:market.returns.map((r,i)=>({
        weekEnd:r.date,close:r.close,logReturnPct:r.returnPct,
        posteriorResetProbability:market.analysis.probabilities[i]
      }))
    })),
    disclosure: [
      "This export contains historical descriptive evidence, not a licensed data redistribution agreement.",
      "Model sensitivity is not calibrated event probability or out-of-sample predictive accuracy.",
      "Provider histories, splits, adjustment conventions and licensing require independent verification."
    ]
  };
}
