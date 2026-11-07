import test from "node:test";
import assert from "node:assert/strict";
import {
 projectWeeklyPrices,backtestWeeklyForecast,
 type ForecastMethod,
} from "../lib/forecasting";
import type {ReturnPoint} from "../lib/analysis";

function history(count=125):ReturnPoint[]{
  const first=Date.UTC(2024,0,6);
  let close=100;
  return Array.from({length:count},(_,i)=>{
    const week=new Date(first+i*7*86400000).toISOString().slice(0,10);
    close*=Math.exp((.1+3*Math.sin(i/2)+.4*Math.cos(i/6))/100);
    return {date:week,close,returnPct:(.1+3*Math.sin(i/2)+.4*Math.cos(i/6))};
  });
}
test("produces strictly future-dated forecast observations, with monotonically nested intervals",()=>{
  const h=history(100),f=projectWeeklyPrices(h,12);
  assert.equal(f.future.length,12);
  assert.equal(f.originWeek,h.at(-1)!.date);
  assert.equal(f.future[0].horizon,1);
  assert.equal(f.future[0].weekEnd,"2025-12-06");
  assert.equal(f.future.at(-1)!.weekEnd,"2026-02-21");
  assert.equal(f.modelValidated,false);
  for(const p of f.future){
    assert.ok(p.p95.lower<=p.p80.lower);
    assert.ok(p.p80.lower<=p.p50.lower);
    assert.ok(p.p50.lower<=p.median);
    assert.ok(p.median<=p.p50.upper);
    assert.ok(p.p50.upper<=p.p80.upper);
    assert.ok(p.p80.upper<=p.p95.upper);
    assert.ok(p.p95.lower>0);
  }
});
test("random-walk benchmark has flat median; distribution still widens",()=>{
  const h=history(),f=projectWeeklyPrices(h,26,"random-walk");
  assert.equal(f.future[0].median,h.at(-1)!.close);
  assert.equal(f.future.at(-1)!.median,h.at(-1)!.close);
  assert.ok(f.future.at(-1)!.p95.upper>f.future[0].p95.upper);
  assert.equal(f.future.length,26);
});
test("no future leakage: modifying any held-out observation cannot change earlier forecast",()=>{
  const h=history(120);
  const a=projectWeeklyPrices(h.slice(0,80),12);
  const b=projectWeeklyPrices([...h.slice(0,80),...h.slice(80).map(x=>({...x,close:x.close*50,returnPct:190}))].slice(0,80),12);
  assert.deepEqual(a,b);
});
test("walk-forward backtest measures only outcomes unseen at each origin",()=>{
  const h=history(125);
  const b=backtestWeeklyForecast(h,[1,4,12,26]);
  assert.equal(b.statisticalSuperiorityValidated,false);
  assert.equal(b.summaries.length,8);
  const one=b.summaries.find(s=>s.model==="shrunken-gaussian"&&s.horizon===1)!;
  const twelve=b.summaries.find(s=>s.model==="shrunken-gaussian"&&s.horizon===12)!;
  assert.equal(one.testOrigins,73);
  assert.equal(twelve.testOrigins,62);
  assert.ok(one.empiricalCoverage95>=0&&one.empiricalCoverage95<=1);
  assert.ok(one.meanAbsoluteLogErrorPct>=0);
  assert.equal(twelve.foldsOverlap,true);
  assert.equal(one.foldsOverlap,false);
});
test("zero volatility, malformed calendars and insufficient data fail safely",()=>{
  const h=history(90);
  assert.throws(()=>projectWeeklyPrices(h.slice(0,20),4),/Not enough/);
  assert.throws(()=>projectWeeklyPrices(h.map(x=>({...x,returnPct:0})),4),/volatility/);
  assert.throws(()=>projectWeeklyPrices(h.map((x,i)=>i===10?{...x,date:"2024-03-10"}:x),4),/invalid or unordered/);
  assert.throws(()=>backtestWeeklyForecast(h,[12],1),/minimum/);
  assert.throws(()=>backtestWeeklyForecast(h,[26],90),/Not enough/);
});
