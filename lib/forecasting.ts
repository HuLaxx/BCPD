import type { ReturnPoint } from "./analysis";

/**
 * Transparent forward lognormal price-distribution BASELINE.
 *
 * This is genuinely forward-looking, but NOT a validated trading model,
 * prediction of a real market change point, or independent investment signal.
 *
 * Data used at an origin: prior completed Saturday-ending weekly log returns.
 * Candidate model:
 *   r_{t+1} iid Normal(mu, sigma^2)
 *   mu_hat = (n/(n+104))*mean(training), a fixed zero-drift shrinkage prior.
 *   ln(P_{t+h}/P_t) ~ Normal(h*mu_hat, h*sigma^2 + h^2*sigma^2/(n+104))
 *
 * Random-walk benchmark: same volatility estimate and mu = 0;
 * variance h*sigma^2. These distributional assumptions, shrinkage choice
 * and nominal quantiles are UNCALIBRATED until walk-forward evidence supports.
 */
export type ForecastMethod = "shrunken-gaussian" | "random-walk";
export type Interval = {lower:number;upper:number};
export type ForecastWeek = {
  weekEnd:string;
  horizon:number;
  median:number;
  p50:Interval;
  p80:Interval;
  p95:Interval;
};
export type ForecastResult = {
  schema:"bcpd-one.forecast-baseline.v1";
  originWeek:string;
  observedClose:number;
  horizonWeeks:number;
  method:ForecastMethod;
  fitWeeks:number;
  weeklyMeanPct:number;
  weeklyVolatilityPct:number;
  future:ForecastWeek[];
  modelValidated:false;
  assumptions:string[];
};
export type BacktestFold = {
  originWeek:string;
  targetWeek:string;
  horizon:number;
  actualClose:number;
  forecastMedian:number;
  forecast80:Interval;
  forecast95:Interval;
  logAbsErrorPct:number;
  hit80:boolean;
  hit95:boolean;
};
export type BacktestAggregate = {
  horizon:number;
  model:ForecastMethod;
  testOrigins:number;
  firstOrigin:string;
  lastTarget:string;
  meanAbsoluteLogErrorPct:number;
  empiricalCoverage80:number;
  empiricalCoverage95:number;
  modelAccuracyValidated:false;
  foldsOverlap:boolean;
};
export type ForecastBacktest = {
  schema:"bcpd-one.forecast-walkforward.v1";
  minFitWeeks:number;
  calibration:"no outcome calibration or model selection has been completed";
  summaries:BacktestAggregate[];
  statisticalSuperiorityValidated:false;
};

const oneWeekMs=7*86400000;
const Z={p50:.6744897501960817,p80:1.2815515655446004,p95:1.959963984540054};
const mean=(xs:number[]):number=>xs.reduce((a,b)=>a+b,0)/xs.length;
const variance=(xs:number[],m:number):number=>xs.reduce((s,x)=>s+(x-m)*(x-m),0)/(xs.length-1);

function checked(rows:readonly ReturnPoint[], minWeeks:number):void {
  if(!Array.isArray(rows)||rows.length<minWeeks||rows.length>1200)
    throw Error("Not enough finalized weekly returns for the requested training window");
  let last=-Infinity;
  for(const r of rows) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw Error("Invalid observation week");
    const stamp=Date.parse(r.date+"T00:00:00Z");
    if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==r.date||
      new Date(stamp).getUTCDay()!==6||stamp<=last||
      !Number.isFinite(r.close)||r.close<=0||
      !Number.isFinite(r.returnPct)||Math.abs(r.returnPct)>200)
      throw Error("Forecast input contains invalid or unordered historical weekly returns");
    last=stamp;
  }
}

function fitted(rows:readonly ReturnPoint[], method:ForecastMethod) {
  const xs=rows.slice(-104).map(x=>x.returnPct/100);
  const sampleMean=mean(xs);
  const sampleVar=variance(xs,sampleMean);
  if(!Number.isFinite(sampleVar)||sampleVar<1e-12)
    throw Error("Forecast cannot estimate volatility from constant historical returns");
  const n=xs.length;
  const drift=method==="random-walk"?0:sampleMean*n/(n+104);
  return {drift,volatility:Math.sqrt(sampleVar),variance:sampleVar,n,mean:sampleMean};
}

function interval(center:number,sd:number,z:number):Interval {
  const lower=center*Math.exp(-sd*z),upper=center*Math.exp(sd*z);
  if(!Number.isFinite(lower)||!Number.isFinite(upper)||lower<=0||upper<=0)
    throw Error("Forecasted price distribution exceeded safe numerical bounds");
  return {lower,upper};
}
export function projectWeeklyPrices(
  returns:readonly ReturnPoint[],
  horizonWeeks:1|4|12|26,
  method:ForecastMethod="shrunken-gaussian",
):ForecastResult {
  if(![1,4,12,26].includes(horizonWeeks))throw Error("Unsupported forecast horizon");
  if(method!=="shrunken-gaussian"&&method!=="random-walk")throw Error("Unknown forecast baseline");
  checked(returns,52);
  const latest=returns[returns.length-1],base=latest.close,stats=fitted(returns,method);
  const last=Date.parse(latest.date+"T00:00:00Z");
  const future:ForecastWeek[]=[];
  for(let horizon=1;horizon<=horizonWeeks;horizon++){
    const center=base*Math.exp(stats.drift*horizon);
    const logV=stats.variance*horizon+
      (method==="shrunken-gaussian"?stats.variance*horizon*horizon/(stats.n+104):0);
    const sd=Math.sqrt(logV);
    if(!Number.isFinite(center)||center<=0)throw Error("Unsafe forecast median");
    future.push({
      weekEnd:new Date(last+horizon*oneWeekMs).toISOString().slice(0,10),
      horizon,median:center,p50:interval(center,sd,Z.p50),
      p80:interval(center,sd,Z.p80),p95:interval(center,sd,Z.p95),
    });
  }
  return {
    schema:"bcpd-one.forecast-baseline.v1",
    originWeek:latest.date,observedClose:base,horizonWeeks,method,
    fitWeeks:stats.n,
    weeklyMeanPct:100*stats.mean,
    weeklyVolatilityPct:100*stats.volatility,
    future,
    modelValidated:false,
    assumptions:[
      "This produces a model-conditional forecast distribution, not an independently validated market prediction.",
      "Weekly percentage log returns are assumed iid Gaussian with a constant future volatility.",
      "The shrunken-drift baseline uses a fixed 104-week zero-drift pseudo-count; the random-walk baseline fixes mean log return at zero.",
      "Prediction intervals are nominal Gaussian intervals, not empirically calibrated coverage guarantees.",
      "A forecast is computed from observations available at its origin only. It does not forecast the next regime-change date.",
    ],
  };
}

export function backtestWeeklyForecast(
  rows:readonly ReturnPoint[],
  horizons:readonly (1|4|12|26)[]=[1,4,12,26],
  minFitWeeks=52,
):ForecastBacktest {
  if(!Number.isInteger(minFitWeeks)||minFitWeeks<52||minFitWeeks>520)
    throw Error("Walk-forward training minimum must be between 52 and 520 weeks");
  checked(rows,minFitWeeks+1);
  if(!horizons.length||horizons.some(h=>![1,4,12,26].includes(h)))
    throw Error("Invalid walk-forward forecast horizon");
  const summaries:BacktestAggregate[]=[];
  for(const horizon of horizons)for(const method of
     ["shrunken-gaussian","random-walk"] as const){
    const folds:BacktestFold[]=[];
    for(let fitEnd=minFitWeeks;fitEnd+horizon<=rows.length;fitEnd++){
      const origin=rows.slice(0,fitEnd);
      const actual=rows[fitEnd+horizon-1];
      const forecast=projectWeeklyPrices(origin,horizon,method);
      const expected=forecast.future.at(-1)!;
      if(expected.weekEnd!==actual.date) {
        // A missing calendar week is a genuine gap, not a future price to fill.
        continue;
      }
      folds.push({
        originWeek:forecast.originWeek,targetWeek:actual.date,horizon,
        actualClose:actual.close,forecastMedian:expected.median,
        forecast80:expected.p80,forecast95:expected.p95,
        logAbsErrorPct:100*Math.abs(Math.log(actual.close/expected.median)),
        hit80:actual.close>=expected.p80.lower&&actual.close<=expected.p80.upper,
        hit95:actual.close>=expected.p95.lower&&actual.close<=expected.p95.upper,
      });
    }
    if(!folds.length)continue;
    summaries.push({
      horizon,model:method,testOrigins:folds.length,
      firstOrigin:folds[0].originWeek,lastTarget:folds[folds.length-1].targetWeek,
      meanAbsoluteLogErrorPct:mean(folds.map(f=>f.logAbsErrorPct)),
      empiricalCoverage80:mean(folds.map(f=>Number(f.hit80))),
      empiricalCoverage95:mean(folds.map(f=>Number(f.hit95))),
      modelAccuracyValidated:false,
      foldsOverlap:horizon>1,
    });
  }
  return {
    schema:"bcpd-one.forecast-walkforward.v1",
    minFitWeeks,
    calibration:"no outcome calibration or model selection has been completed",
    summaries,
    statisticalSuperiorityValidated:false,
  };
}
