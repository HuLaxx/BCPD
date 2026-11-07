import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceMatrix, latestEvidence, verifiedPeaks } from "../lib/observatory";
import { ASSETS } from "../lib/universe";
import type { Study } from "../lib/analysis";
const dates=["2026-09-05","2026-09-12","2026-09-19","2026-09-26","2026-10-03","2026-10-10"];
const make=(id:string,offset=0):Study=>({
  asset:ASSETS.find(a=>a.id===id)!,source:"Test data",accessedAt:"2026-11-07T00:00:00Z",latest:"2026-10-10",
  returns:dates.slice(offset).map((date,i)=>({date,close:100+i,returnPct:(i-2)*1.5})),
  analysis:{probabilities:dates.slice(offset).map((_,i)=>i===2?0.82:0.04),sampleVariance:1,
    consensus:[{index:2,support:7,total:9,share:7/9},{index:3,support:2,total:9,share:2/9}]}
});
test("Evidence matrix aligns observed dates and preserves missing observations",()=>{
 const m=buildEvidenceMatrix([make("us"),make("btc",2)],6);
 assert.equal(m.weeks.length,6);
 assert.equal(m.rows[1].cells[0],null);
 assert.equal(m.rows[0].cells[2]?.stableCandidate,true);
 assert.equal(m.rows[0].cells[0]?.stableCandidate,false);
 assert.equal(m.rows[0].cells[2]?.resetProbability,.82);
 assert.throws(()=>buildEvidenceMatrix([],0),/4–104/);
});
test("Latest readout derives numbers from observations, not example data",()=>{
 const latest=latestEvidence(make("us"));
 assert.equal(latest?.week,"2026-10-10");
 assert.equal(latest?.close,105);
 assert.equal(latest?.resetProbability,.04);
});
test("Only sensitivity-stable candidate peaks are included",()=>{
 const peaks=verifiedPeaks(make("us"));
 assert.equal(peaks.length,1);
 assert.equal(peaks[0].week,"2026-09-19");
 assert.equal(peaks[0].support,7);
});
