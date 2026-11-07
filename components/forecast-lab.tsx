"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, CircleAlert,
  Crosshair, FlaskConical, Info, RotateCw, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { BrandFooter } from "@/components/brand-footer";
import { HuLaXCredit } from "@/components/hulax-credit";
import { logReturns, type ReturnPoint, type PricePoint } from "@/lib/analysis";
import { completedWeeklyCloses, displayNumber } from "@/lib/observatory-view";
import { ASSETS, type Asset } from "@/lib/universe";
import {
  projectWeeklyPrices, backtestWeeklyForecast,
  type ForecastMethod, type ForecastResult, type ForecastBacktest, type BacktestAggregate,
} from "@/lib/forecasting";

type Horizon=1|4|12|26;
type Loaded={assetId:string;returns?:ReturnPoint[];source?:string;accessedAt?:string;error?:string};
const HORIZONS:readonly Horizon[]=[1,4,12,26];
type Computation={
  forecast:ForecastResult;
  test:ForecastBacktest;
  selected?:BacktestAggregate;
  benchmark?:BacktestAggregate;
};
function svgPath(ps:readonly [number,number][]):string{
  return ps.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+","+p[1].toFixed(2)).join(" ");
}
function ForecastChart({rows,result}:{rows:ReturnPoint[];result:ForecastResult}){
  const observed=rows.slice(-53),future=result.future;
  const W=860,H=270,originIndex=observed.length-1,total=originIndex+future.length;
  const px=(i:number)=>i/total*W;
  const priceValues=observed.map(r=>r.close).concat(future.flatMap(p=>[p.p95.lower,p.p95.upper]));
  const minLog=Math.log(Math.min(...priceValues)),maxLog=Math.log(Math.max(...priceValues));
  const pad=Math.max(.04,(maxLog-minLog)*.11),min=minLog-pad,max=maxLog+pad;
  const py=(v:number)=>H-(Math.log(v)-min)/(max-min)*H;
  const projections=[{
    median:result.observedClose,
    p50:{lower:result.observedClose,upper:result.observedClose},
    p80:{lower:result.observedClose,upper:result.observedClose},
    p95:{lower:result.observedClose,upper:result.observedClose},
  },...future];
  const pathBand=(key:"p50"|"p80"|"p95")=>{
    const upper=projections.map((p,i)=>[px(originIndex+i),py(p[key].upper)] as [number,number]);
    const lower=projections.map((p,i)=>[px(originIndex+i),py(p[key].lower)] as [number,number]).reverse();
    return svgPath(upper)+" "+svgPath(lower).replace(/^M/,"L")+" Z";
  };
  const last=future[future.length-1];
  return <div className="fc-chart">
    <div className="fc-chart-legend">
      <span><i className="fc-legend-observed"/> OBSERVED CLOSE</span>
      <span><i className="fc-legend-median"/> PROJECTED MEDIAN</span>
      <span><i className="fc-legend-band"/> 50/80/95% MODEL RANGES</span>
    </div>
    <div className="fc-viz">
      <div className="fc-axis" aria-hidden="true"><span>{displayNumber(Math.exp(max),0)}</span><span>{displayNumber(Math.exp((min+max)/2),0)}</span><span>{displayNumber(Math.exp(min),0)}</span></div>
      <svg viewBox="0 0 860 270" preserveAspectRatio="none" role="img"
        aria-label={"Observed closes ending "+result.originWeek+" and "+result.horizonWeeks+" projected future weekly points. Final model median "+displayNumber(last.median)+". This model is uncalibrated."}>
        {[0,67.5,135,202.5,270].map(y=><line key={y} x1="0" x2="860" y1={y} y2={y} stroke="#32463E" strokeDasharray="3 7"/>)}
        <rect x={px(originIndex)} width={860-px(originIndex)} height="270" fill="#F2BE96" fillOpacity=".04"/>
        <path d={pathBand("p95")} fill="#F2BE96" fillOpacity=".10"/>
        <path d={pathBand("p80")} fill="#F2BE96" fillOpacity=".16"/>
        <path d={pathBand("p50")} fill="#F2BE96" fillOpacity=".25"/>
        <path d={svgPath(observed.map((r,i)=>[px(i),py(r.close)]))} stroke="#D7F29C" strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d={svgPath(projections.map((p,i)=>[px(originIndex+i),py(p.median)]))} stroke="#F2BE96" strokeWidth="2.7" strokeDasharray="8 7" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <line x1={px(originIndex)} x2={px(originIndex)} y1="0" y2="270" stroke="#F2BE96" strokeDasharray="3 5"/>
        <circle cx={px(originIndex)} cy={py(result.observedClose)} r="5" fill="#F2BE96" stroke="#14201F" strokeWidth="2"/>
      </svg>
    </div>
    <div className="fc-dates"><span>{observed[0]?.date}</span><span>ORIGIN {result.originWeek}</span><span>{last.weekEnd}</span></div>
    <p className="fc-chart-note"><Info size={15}/> Future points are model-based projections, not observed prices. Nominal interval ranges are not calibrated coverage guarantees.</p>
  </div>;
}
function ValidationCard({label,data,target}:{label:string;data?:BacktestAggregate;target?:"80"|"95"}){
  const number=!data?"NOT MEASURED":target==="80"?Math.round(100*data.empiricalCoverage80)+"%":
    target==="95"?Math.round(100*data.empiricalCoverage95)+"%":
    displayNumber(data.meanAbsoluteLogErrorPct)+"%";
  return <div className="fc-validation-card"><span className="fc-micro">{label}</span><strong>{number}</strong><small>{data?data.testOrigins+" historical rolling origins": "No valid historical folds"}</small></div>;
}
export function ForecastLab(){
  const [assetId,setAssetId]=useState("us");
  const [horizon,setHorizon]=useState<Horizon>(12);
  const [model,setModel]=useState<ForecastMethod>("shrunken-gaussian");
  const [retry,setRetry]=useState(0);
  const [state,setState]=useState<Loaded|null>(null);
  const asset=ASSETS.find(x=>x.id===assetId)??ASSETS[0];
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try{
        const response=await fetch("/api/markets?asset="+encodeURIComponent(assetId)+"&range=2y",{signal:controller.signal,cache:"no-store"});
        const payload:{asset?:Asset;points?:PricePoint[];source?:string;accessedAt?:string;error?:string}=await response.json();
        if(!response.ok)throw Error(payload.error??"Market data unavailable");
        if(payload.asset?.id!==assetId||!Array.isArray(payload.points)||!payload.source||!payload.accessedAt)
          throw Error("Missing price history or provider provenance");
        const returns=logReturns(completedWeeklyCloses(payload.points,payload.accessedAt));
        if(returns.length<78)throw Error("Need at least 78 completed weekly observations for forecast evaluation");
        if(!controller.signal.aborted)setState({assetId,returns,source:payload.source,accessedAt:payload.accessedAt});
      }catch(error){
        if(!controller.signal.aborted)setState({assetId,error:error instanceof Error?error.message:"Historical source failure"});
      }
    }
    void load();return ()=>controller.abort();
  },[assetId,retry]);
  const current=state?.assetId===assetId?state:null;
  const outcome=useMemo<Computation | {error:string} | null>(()=>{
    if(!current?.returns)return null;
    try{
      const forecast=projectWeeklyPrices(current.returns,horizon,model);
      const test=backtestWeeklyForecast(current.returns,[horizon]);
      const selected=test.summaries.find(x=>x.model===model&&x.horizon===horizon);
      const benchmark=test.summaries.find(x=>x.model==="random-walk"&&x.horizon===horizon);
      return {forecast,test,selected,benchmark};
    }catch(error){return {error:error instanceof Error?error.message:"Forecast computation failed"};}
  },[current,horizon,model]);
  const computed=outcome&&"forecast" in outcome?outcome:null;
  const error=current?.error??(outcome&&"error" in outcome?outcome.error:undefined);
  const pending=!current;
  const last=computed?.forecast.future.at(-1);
  const reload=()=>{setState(null);setRetry(x=>x+1);};
  function exportForecast(){
    if(!computed||!current)return;
    const researchReport={
      schema:"bcpd-one.forecast-report.v1",generatedAt:new Date().toISOString(),
      provenance:{assetId,source:current.source,accessedAt:current.accessedAt},
      model:computed.forecast,backtest:computed.test,
      limitations:"Exploratory forward prices. Not independently validated, calibrated, investment advice or a prediction of regime-change date.",
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(researchReport,null,2)],{type:"application/json"}));
    const a=document.createElement("a");
    a.href=url;a.download="bcpd-"+assetId+"-forecast-research.json";a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="ob-page fc-page">
    <a className="ob-skip" href="#fc-main">Skip to forecast workspace</a>
    <aside className="ob-rail" aria-label="Forecast research navigation">
      <Link href="/" className="ob-rail-brand" aria-label="BCPD One home"><span className="fc-icon-brand">◉</span></Link>
      <div className="ob-rail-divider"/>
      <nav className="ob-rail-links">
        <Link href="/" className="ob-rail-link" title="Observatory"><Crosshair size={20}/><span>Observatory</span></Link>
        <Link href="/forecast" aria-current="page" className="ob-rail-link selected" title="Forecast Lab"><FlaskConical size={20}/><span>Forecast Lab</span></Link>
        <Link href="/research" className="ob-rail-link" title="Research Studio"><SlidersHorizontal size={20}/><span>Research Studio</span></Link>
        <Link href="/methodology" className="ob-rail-link" title="Methodology"><ShieldCheck size={20}/><span>Methodology</span></Link>
      </nav>
      <div className="ob-rail-bottom">V0.1<br/>EXPERIMENTAL</div>
    </aside>
    <div className="ob-shell" id="fc-main">
      <header className="ob-topbar" id="top">
        <div className="ob-topbar-identity">
          <Link href="/" className="ob-topbar-brand"><span className="fc-icon-brand">◉</span><strong>BCPD<span> ONE</span></strong><i/><span>THE FORECAST LAB</span></Link>
          <span className="ob-topbar-credit-divider"/><HuLaXCredit/>
        </div>
        <div className="fc-header-tray"><Link href="/"><ArrowLeft size={14}/> OBSERVATORY</Link><span>EXPERIMENTAL / NOT CERTIFIED</span></div>
      </header>
      <main>
        <section className="fc-hero">
          <div><span className="fc-micro fc-kicker">02 / HORIZON RESEARCH · EXPERIMENTAL FORECASTING</span>
            <h1>The future is<br/><em>a distribution.</em></h1>
            <p>Explore possible future weekly prices and their uncertainty. Compare honest statistical baselines and see how historical predictions would have performed.</p></div>
          <div className="fc-scientific-contract"><span className="fc-micro">THE SCIENTIFIC CONTRACT</span>
            <h2>Estimate.<br/>Test.<br/>Disclose.</h2>
            <p>A model forecast is not a guaranteed price target, a predicted change-point date, or investment advice.</p></div>
        </section>
        <section className="fc-experiment">
          <div className="fc-section-title"><div><span className="fc-micro">HORIZON EXPERIMENT 001</span><h2>Forecast workspace.</h2></div>
            <span className="fc-market-status">{error?"SOURCE UNAVAILABLE":pending?"FETCHING HISTORY":"HISTORICAL INPUT READY"}</span></div>
          <div className="fc-workspace">
            <aside className="fc-settings">
              <span className="fc-micro">01 / MODEL CONFIGURATION</span><h3>Choose a baseline.</h3>
              <label htmlFor="fc-asset" className="fc-field-label">MARKET / INSTRUMENT</label>
              <select id="fc-asset" value={assetId} onChange={event=>setAssetId(event.target.value)}>
                {ASSETS.map(a=><option value={a.id} key={a.id}>{a.label} · {a.symbol}</option>)}
              </select>
              <label htmlFor="fc-method" className="fc-field-label">FORECASTING MODEL</label>
              <select id="fc-method" value={model} onChange={event=>setModel(event.target.value as ForecastMethod)}>
                <option value="shrunken-gaussian">Gaussian log-return baseline</option>
                <option value="random-walk">Random-walk benchmark</option>
              </select>
              <span className="fc-field-label">FORECAST HORIZON</span>
              <div role="group" aria-label="Forecast horizon" className="fc-horizons">
                {HORIZONS.map(h=><button type="button" key={h} onClick={()=>setHorizon(h)} aria-pressed={horizon===h} className={h===horizon?"selected":""}>{h}W</button>)}
              </div>
              <div className="fc-assumptions"><strong>What this model assumes</strong><p>Weekly log returns follow an independent Gaussian distribution with stable volatility. The drift estimate is shrunk toward zero.</p><p>Neither baseline forecasts when the next market regime begins.</p></div>
            </aside>
            <div className="fc-main-panel">
              <div className="fc-panel-title"><div><span className="fc-micro">02 / OBSERVED HISTORY + POSSIBLE FUTURE</span><h3>Price distribution / forecast fan</h3></div>
                <button type="button" className="fc-refresh" onClick={reload} aria-label="Reload historical data"><RotateCw size={17}/></button></div>
              {computed&&current?.returns?<ForecastChart rows={current.returns} result={computed.forecast}/>:
                <div role={error?"alert":"status"} className="fc-empty"><FlaskConical size={29}/><h3>{error?"Forecast unavailable":"Preparing forward model"}</h3>
                  <p>{error??"Reading completed weekly history and fitting the exploratory model."}</p>
                  {error&&<button type="button" onClick={reload}>RETRY SOURCE</button>}</div>}
              <div className="fc-source-row"><div><ShieldCheck size={16}/><span>{computed?
                asset.label+" · "+computed.forecast.fitWeeks+" fitted weeks · "+current?.source+" · accessed "+current?.accessedAt?.slice(0,10)+" UTC":
                "Source and model provenance will appear with a completed forecast."}</span></div>
                <button type="button" onClick={exportForecast} disabled={!computed}><ArrowDownToLine size={14}/> EXPORT RESEARCH</button></div>
            </div>
          </div>
          {computed&&last&&<div className="fc-projections">
            <div><span className="fc-micro">PROJECTED WEEK END</span><strong>{last.weekEnd}</strong><small>{horizon} future weeks</small></div>
            <div><span className="fc-micro">MODEL MEDIAN</span><strong>{displayNumber(last.median)}</strong><small>Not a guaranteed price</small></div>
            <div><span className="fc-micro">NOMINAL 80% RANGE</span><strong>{displayNumber(last.p80.lower)} — {displayNumber(last.p80.upper)}</strong><small>Uncalibrated</small></div>
            <div><span className="fc-micro">NOMINAL 95% RANGE</span><strong>{displayNumber(last.p95.lower)} — {displayNumber(last.p95.upper)}</strong><small>Uncalibrated</small></div>
          </div>}
        </section>
        <section className="fc-validation">
          <div className="fc-section-title"><div><span className="fc-micro">03 / VALIDATION BEFORE TRUST</span><h2>Show your working.</h2></div>
            <Link href="/methodology" className="fc-method-link">RESEARCH METHODS <ArrowUpRight size={15}/></Link></div>
          <div className="fc-validation-grid">
            <ValidationCard label="MEAN ABSOLUTE LOG ERROR" data={computed?.selected}/>
            <ValidationCard label="EMPIRICAL 80% COVERAGE" data={computed?.selected} target="80"/>
            <ValidationCard label="EMPIRICAL 95% COVERAGE" data={computed?.selected} target="95"/>
            <div className="fc-validation-card"><span className="fc-micro">RANDOM-WALK ERROR</span>
              <strong>{computed?.benchmark?displayNumber(computed.benchmark.meanAbsoluteLogErrorPct)+"%":"NOT MEASURED"}</strong>
              <small>Same historical origins</small></div>
          </div>
          <div className="fc-validation-warning"><CircleAlert size={19}/><div><strong>Diagnostics are not certification.</strong><p>Test windows overlap at horizons above one week. Commercial data rights, uncertainty calibration, independent historical samples and real-world predictive usefulness remain unverified.</p></div></div>
        </section>
        <section className="fc-bottom"><div><span className="fc-micro">OUR NEXT SCIENTIFIC GATE</span><h2>Proof before confidence.</h2>
          <p>We will need immutable lawful datasets, multiple regimes, benchmark comparisons, and properly calibrated uncertainty before describing these forecasts as reliable.</p></div>
          <Link href="/research" className="fc-next-link">OPEN RESEARCH STUDIO <ArrowRight size={16}/></Link></section>
      </main>
      <BrandFooter/>
    </div>
  </div>;
}
