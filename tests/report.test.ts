import test from "node:test";
import assert from "node:assert/strict";
import { createResearchReport, RESEARCH_REPORT_SCHEMA } from "../lib/report";
import { ASSETS } from "../lib/universe";
import type { Study } from "../lib/analysis";

const config={selected:["us"],range:"2y" as const,hazard:32,threshold:20};
const study:Study={
  asset:ASSETS[0],latest:"2026-09-12",
  source:"Research fixture",accessedAt:"2026-11-06T00:00:00Z",
  returns:Array.from({length:21},(_,i)=>({date:"2026-09-12",close:100+i,returnPct:i*.2})),
  analysis:{sampleVariance:1,probabilities:Array(21).fill(.2),consensus:[{index:2,support:7,total:9,share:7/9}]}
};
test("downloadable report includes provenance, settings and observed values",()=>{
 const report=createResearchReport([study],config,"2026-11-06T12:00:00Z");
 assert.equal(report.schema,RESEARCH_REPORT_SCHEMA);
 assert.equal(report.markets[0].source,"Research fixture");
 assert.equal(report.markets[0].weeklyObservations.length,21);
 assert.equal(report.markets[0].candidatePeaks[0].support,7);
 assert.equal(report.methodology.resetThreshold,.2);
 assert.equal(report.requested.selected[0],"us");
});
test("report refuses missing observations or mismatched model probabilities",()=>{
 assert.throws(()=>createResearchReport([],config,"2026-11-06T12:00:00Z"),/Run a study/);
 assert.throws(()=>createResearchReport([{...study,analysis:{...study.analysis,probabilities:[0]}}],config,"2026-11-06T12:00:00Z"),/corresponding/);
});
