import test from "node:test";
import assert from "node:assert/strict";
import {
  weeklyCloses, logReturns, detect, analyzeReturns, parseCSV,
  correlations, sharedEvents, annualizedVolatility,
  type Study
} from "../lib/analysis";
import { ASSETS } from "../lib/universe";

const week=(n:number)=>new Date(Date.UTC(2026,0,3+7*n)).toISOString().slice(0,10);
const returns=(values:number[])=>values.map((returnPct,i)=>({date:week(i),close:100,returnPct}));
const study=(id:string,values:number[],events:number[]=[]):Study=>({
  asset:ASSETS.find(a=>a.id===id)!,
  returns:returns(values),
  source:"Verified test fixture",
  accessedAt:"2026-11-06T00:00:00Z",
  latest:week(values.length-1),
  analysis:{sampleVariance:1,probabilities:values.map(()=>0),consensus:events.map(index=>({index,support:8,total:9,share:8/9}))}
});

test("canonical weekly calendar does not invent weekend equity closes",()=>{
  const rows=weeklyCloses([
    {date:"2026-09-10",close:100},{date:"2026-09-11",close:110},
    {date:"2026-09-12",close:120},{date:"2026-09-14",close:130}
  ]);
  assert.deepEqual(rows.map(r=>r.weekEnd),["2026-09-12","2026-09-19"]);
  assert.equal(rows[0].close,120);
  assert.equal(logReturns(rows).length,1);
});

test("Bayesian posterior probabilities are finite and show a strong level shift",()=>{
  const values=[...Array(40).fill(0),...Array(40).fill(5)] as number[];
  const probs=detect(values,55,.15,12);
  assert.equal(probs.length,80);
  for(const p of probs)assert.ok(Number.isFinite(p)&&p>=0&&p<=1);
  assert.ok(probs[40]>probs[35]);
  assert.ok(probs[40]>.5);
  assert.throws(()=>detect([1,2],55,.2,1),/5 to 1,200/);
});

test("nine-model sensitivity is constrained and reports candidate share",()=>{
  const values=Array.from({length:75},(_,i)=>i<30?Math.sin(i*.1):3+Math.sin(i*.1));
  const result=analyzeReturns(returns(values),32,.2);
  assert.equal(result.probabilities.length,75);
  assert.ok(result.consensus.every(x=>x.total===9&&x.support<=9&&x.share>=4/9));
});

test("CSV imports validate dates, prices and reconstruct observed weekly prices",()=>{
  const csv="date,close\n"+Array.from({length:180},(_,i)=>{
    const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
    return date+","+(100+i);
  }).join("\n");
  const parsed=parseCSV(csv);
  assert.equal(parsed.length,180);
  assert.ok(logReturns(weeklyCloses(parsed)).length>=20);
  assert.throws(()=>parseCSV(csv.replace("2026-01-15","2026-02-30")),/Invalid date/);
  assert.throws(()=>parseCSV(csv.replace("date,close","date,volume")),/date and close/);
});

test("correlation uses overlap and refuses constant series",()=>{
  const a=study("us",Array.from({length:18},(_,i)=>i+1));
  const b=study("btc",Array.from({length:18},(_,i)=>-2*(i+1)));
  const r=correlations([a,b])[0];
  assert.equal(r.overlap,18);
  assert.ok(r.r!==null&&Math.abs(r.r+1)<1e-10);
  assert.equal(correlations([study("uk",Array(18).fill(1)),b])[0].r,null);
});

test("shared peaks deduplicate markets and estimate eligible observed cohort",()=>{
  const a=study("us",Array(40).fill(1),[20,21]);
  const b=study("btc",Array(40).fill(2),[21]);
  const events=sharedEvents([a,b]);
  assert.equal(events.length,1);
  assert.equal(events[0].marketIds.length,2);
  assert.equal(events[0].eligible,2);
  assert.equal(events[0].share,1);
  assert.equal(sharedEvents([a]).length,0);
});

test("volatility is unavailable with too few observations, never fabricated",()=>{
  const a=annualizedVolatility(study("us",[1,2,3]),12);
  assert.equal(a.annualizedPct,null);
  const b=annualizedVolatility(study("us",Array.from({length:30},(_,i)=>i%2?2:-2)),12);
  assert.ok(b.annualizedPct!==null&&b.annualizedPct>0);
  assert.ok(b.changePp!==null);
});
