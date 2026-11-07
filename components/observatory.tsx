"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen,
  Check, ChevronRight, CircleAlert, Crosshair, Database, Fingerprint,
  Globe2, RotateCw, ScanLine, ShieldCheck, SlidersHorizontal,
  Waves, type LucideIcon,
} from "lucide-react";
import {
  analyzeReturns, logReturns, type PricePoint, type Study,
} from "@/lib/analysis";
import { ASSETS, type Asset } from "@/lib/universe";
import { createResearchReport } from "@/lib/report";
import {
  candidateLedger, completedWeeklyCloses, displayNumber, observedTrace,
  traceGeometry, type TraceMode,
} from "@/lib/observatory-view";

type Period = "1y" | "2y";
type Selection = "all" | "Equity index" | "Digital asset";
type Loaded = {
  id: string;
  period: Period;
  study?: Study;
  error?: string;
};

const LABELS: Record<TraceMode, string> = {
  close: "Observed close",
  return: "Weekly log return",
  reset: "BOCPD reset probability",
};

const NOTES: Record<TraceMode, string> = {
  close: "Last observed closing price per completed UTC week. Not a live quote.",
  return: "Weekly percentage logarithmic return derived from observed closing prices.",
  reset: "Model-conditional posterior reset probability. Not a verified real-world event probability.",
};

function Glyph({icon: Icon}: {icon: LucideIcon}) {
  return <Icon size={16} aria-hidden="true" strokeWidth={1.65}/>;
}

function BrandMark({small=false}: {small?: boolean}) {
  return <span className={small ? "ob-brandmark ob-brandmark-small" : "ob-brandmark"} aria-hidden="true">
    <span className="ob-brandmark-core"/>
    <span className="ob-brandmark-orbit ob-brandmark-orbit-one"/>
    <span className="ob-brandmark-orbit ob-brandmark-orbit-two"/>
  </span>;
}

function DownloadStudy({study, period}: {study: Study;period: Period}) {
  function download() {
    const report = createResearchReport([study], {
      selected:[study.asset.id], range:period, hazard:32, threshold:20,
    }, new Date().toISOString());
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`bcpd-${study.asset.id}-historical-evidence.json`;
    a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <button type="button" className="ob-button ob-button-outlined" onClick={download}>
    <ArrowDownToLine size={15} aria-hidden="true"/> EXPORT EVIDENCE
  </button>;
}

function EmptyPanel({loading, error, retry}: {loading:boolean;error?:string;retry:()=>void}) {
  return <div className="ob-chart-empty" role={error?"alert":"status"}>
    <span className={loading?"ob-loader":"ob-empty-icon"}><ScanLine size={27} strokeWidth={1.2}/></span>
    <h3>{loading?"Preparing the observation field":error?"The source could not be read":"No study is loaded"}</h3>
    <p>{loading?"Retrieving source-attributed market history and calculating a retrospective study.":error??"Choose a market from the catalogue to begin historical research."}</p>
    {error&&<button type="button" className="ob-button ob-button-outlined" onClick={retry}><RotateCw size={14}/> RETRY SOURCE</button>}
  </div>;
}

function Plot({study,mode,selectedWeek}: {study:Study;mode:TraceMode;selectedWeek:string|null}) {
  const points=useMemo(()=>observedTrace(study),[study]);
  const {line,area,zero,min,max}=useMemo(()=>traceGeometry(points,mode),[points,mode]);
  const candidates=useMemo(()=>candidateLedger(study),[study]);
  const candidatePositions=new Map(points.map((p,i)=>[p.week,i]));
  const focus=selectedWeek?candidatePositions.get(selectedWeek):undefined;
  const x=(index:number)=>points.length===1?480:index*960/(points.length-1);
  const peak=focus===undefined?undefined:points[focus];
  const formatAxis=(value:number)=>mode==="reset"?`${Math.round(value)}%`:displayNumber(value,mode==="close"?0:2);
  return <div className="ob-plot" data-mode={mode}>
    <div className="ob-plot-main">
      <div className="ob-axis-labels" aria-hidden="true">
        <span>{formatAxis(max)}</span><span>{formatAxis((min+max)/2)}</span><span>{formatAxis(min)}</span>
      </div>
      <svg viewBox="0 0 960 280" preserveAspectRatio="none" role="img"
        aria-label={`${study.asset.label}: ${LABELS[mode]} across ${points.length} observed completed weeks. Full observations are available in the exported evidence report.`}>
        <defs>
          <linearGradient id="ob-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cef08a" stopOpacity=".16"/>
            <stop offset="100%" stopColor="#cef08a" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,70,140,210,280].map(y=><line key={y} x1="0" x2="960" y1={y} y2={y} stroke="#263438" strokeWidth="1" strokeDasharray="3 7"/>)}
        {zero!==null&&mode==="return"&&<line x1="0" x2="960" y1={zero} y2={zero} stroke="#7b8b87" strokeWidth="1" strokeDasharray="6 5"/>}
        <path d={area} fill="url(#ob-chart-fill)"/>
        <path d={line} fill="none" stroke="#d1eda5" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        {candidates.map(c=> {
          const index=candidatePositions.get(c.week);
          if(index===undefined)return null;
          const value=mode==="close"?points[index].close:mode==="return"?points[index].returnPct:points[index].resetProbability*100;
          const yp=280-(value-min)/(max-min)*280;
          return <circle key={c.week} cx={x(index)} cy={yp} r={selectedWeek===c.week?7:4.7} fill="#101b1d" stroke={selectedWeek===c.week?"#f4c389":"#d5e9c3"} strokeWidth="2.5"><title>{c.week}: agreement {c.support}/{c.total} parameter settings</title></circle>;
        })}
        {focus!==undefined&&<line x1={x(focus)} x2={x(focus)} y1="0" y2="280" stroke="#f1bc86" strokeDasharray="5 8" strokeOpacity=".7"/>}
      </svg>
    </div>
    <div className="ob-plot-bottom">
      <span>{points[0]?.week??"—"}</span>
      <span className="ob-plot-legend"><i/> OBSERVED WEEKLY DATA <b/> MODEL CANDIDATE</span>
      <span>{points.at(-1)?.week??"—"}</span>
    </div>
    {peak&&<div className="ob-chart-focus"><Crosshair size={14}/> FOCUSED CANDIDATE <strong>{peak.week}</strong> <span>Return: {displayNumber(peak.returnPct)}%</span></div>}
  </div>;
}

function MarketList({active,filter,onChoose}: {
  active:string;filter:Selection;onChoose:(id:string)=>void
}) {
  const choices=ASSETS.filter(a=>filter==="all"||a.kind===filter);
  return <div className="ob-markets">
    <div className="ob-market-table-heading"><span>INSTRUMENT / REGION</span><span>TYPE</span></div>
    <div className="ob-market-scroll">
      {choices.map(asset=><button type="button" className={`ob-market-row ${asset.id===active?"is-active":""}`}
        onClick={()=>onChoose(asset.id)} key={asset.id} aria-pressed={asset.id===active}>
        <span className="ob-market-identity"><span className="ob-market-code">{asset.id.toUpperCase()}</span><span><strong>{asset.label}</strong><small>{asset.country}</small></span></span>
        <span className="ob-market-kind">{asset.kind==="Digital asset"?"DIGITAL":"INDEX"} <ChevronRight size={13}/></span>
      </button>)}
    </div>
    <div className="ob-market-foot"><Globe2 size={14}/> {choices.length} supported historical instruments</div>
  </div>;
}

export function Observatory() {
  const [activeId,setActiveId]=useState("us");
  const [period,setPeriod]=useState<Period>("2y");
  const [segment,setSegment]=useState<Selection>("all");
  const [mode,setMode]=useState<TraceMode>("close");
  const [response,setResponse]=useState<Loaded|null>(null);
  const [retry,setRetry]=useState(0);
  const [focusedWeek,setFocusedWeek]=useState<string|null>(null);
  const active=ASSETS.find(a=>a.id===activeId)??ASSETS[0];

  useEffect(()=>{
    const controller=new AbortController();
    async function load() {
      try {
        const result=await fetch(`/api/markets?asset=${encodeURIComponent(activeId)}&range=${period}`,{
          signal:controller.signal,cache:"no-store",
        });
        const payload: {
          points?:PricePoint[];
          asset?:Asset;
          source?:string;
          accessedAt?:string;
          error?:string;
        }=await result.json();
        if(!result.ok) throw new Error(payload.error??"Market provider did not respond.");
        if(payload.asset?.id!==activeId||!Array.isArray(payload.points)||!payload.source||!payload.accessedAt)
          throw new Error("Source attribution or market observations are incomplete.");
        const finished=completedWeeklyCloses(payload.points,payload.accessedAt);
        const returns=logReturns(finished);
        if(returns.length<20)throw new Error("Insufficient completed weeks for a reliable historical study.");
        const analysis=analyzeReturns(returns,32,.2);
        const study:Study={
          asset:payload.asset,returns,analysis,
          source:payload.source,accessedAt:payload.accessedAt,
          latest:returns.at(-1)?.date??"—",
        };
        if(!controller.signal.aborted)setResponse({id:activeId,period,study});
      } catch(error) {
        if(!controller.signal.aborted)setResponse({
          id:activeId,period,
          error:error instanceof Error?error.message:"Unable to obtain valid observations.",
        });
      }
    }
    void load();
    return ()=>controller.abort();
  },[activeId,period,retry]);

  const current=response?.id===activeId&&response.period===period?response:null;
  const study=current?.study;
  const busy=!current;
  const summary=useMemo(()=>{
    if(!study)return null;
    const points=observedTrace(study);
    const last=points.at(-1);
    const previous=points.at(-2);
    return {last,previous,count:points.length,ledger:candidateLedger(study)};
  },[study]);
  const selectedCandidate=summary?.ledger.find(x=>x.week===focusedWeek)??summary?.ledger[0]??null;
  const liveLabel=study?"HISTORICAL DATA LOADED":current?.error?"SOURCE ERROR":"RETRIEVING HISTORY";
  const change=(id:string)=>{setActiveId(id);setFocusedWeek(null);};
  const reload=()=>{setResponse(null);setRetry(v=>v+1);};
  const exportReady=!!study;
  return <div className="ob-page">
    <a className="ob-skip" href="#ob-main">Skip to research content</a>
    <aside className="ob-rail" aria-label="Primary navigation">
      <Link href="/" className="ob-rail-brand" aria-label="BCPD One Observatory home"><BrandMark/></Link>
      <div className="ob-rail-divider"/>
      <nav className="ob-rail-links">
        <Link href="/" aria-current="page" className="ob-rail-link selected" title="Observatory"><Glyph icon={Crosshair}/><span>Observatory</span></Link>
        <Link href="/research" className="ob-rail-link" title="Research studio"><Glyph icon={SlidersHorizontal}/><span>Research studio</span></Link>
        <Link href="/methodology" className="ob-rail-link" title="Methodology"><Glyph icon={BookOpen}/><span>Methodology</span></Link>
        <Link href="/privacy" className="ob-rail-link" title="Data practices"><Glyph icon={ShieldCheck}/><span>Data practices</span></Link>
      </nav>
      <div className="ob-rail-bottom"><span className="ob-rail-coordinate">FIELD / 001</span><span>RESEARCH<br/>DESK / 01</span></div>
    </aside>
    <div className="ob-shell" id="ob-main">
      <header className="ob-topbar">
        <Link href="/" className="ob-topbar-brand"><BrandMark small/> <strong>BCPD<span> ONE</span></strong><i/> <span>THE OBSERVATORY</span></Link>
        <div className="ob-topbar-links"><Link href="/research">OPEN FULL STUDIO <ArrowUpRight size={15}/></Link><Link href="/methodology">METHOD</Link></div>
        <div className="ob-topbar-chip"><span/> RESEARCH ENVIRONMENT</div>
      </header>
      <main>
        <section className="ob-intro">
          <div className="ob-intro-copy">
            <div className="ob-eyebrow"><span>RESEARCH NOTE / 001</span><i/> <span>BAYESIAN CHANGE POINT DETECTION</span></div>
            <h1>Find the <em>shift.</em><br/>Question the <em>signal.</em></h1>
            <p>A different way to read market history. Observe regime candidates, inspect the evidence, and carry every assumption into the report.</p>
            <div className="ob-intro-actions">
              <a className="ob-button ob-button-primary" href="#ob-observation"><Crosshair size={16}/> EXPLORE THE DATA <ArrowRight size={16}/></a>
              <Link className="ob-button ob-button-quiet" href="/research">ADVANCED RESEARCH STUDIO <ArrowUpRight size={16}/></Link>
            </div>
          </div>
          <div className="ob-intro-instrument" aria-label="Research instrument illustration, not live measurement">
            <div className="ob-instrument-top"><span>THE REGIME LENS</span><span>FIG. 01 / CONCEPTUAL</span></div>
            <div className="ob-instrument-orbit"><span className="ob-ring-one"/><span className="ob-ring-two"/><span className="ob-ring-three"/><span className="ob-ring-core"><Waves size={35} strokeWidth={1}/></span><span className="ob-ring-cross-a"/><span className="ob-ring-cross-b"/></div>
            <div className="ob-instrument-bottom"><span>DETECT / EXAMINE / VERIFY</span><span>NOT A TRADING SIGNAL</span></div>
          </div>
          <div className="ob-intro-index"><span>01 / 04</span><span>SCROLL TO INVESTIGATE <span aria-hidden="true">↓</span></span></div>
        </section>

        <section className="ob-overview-strip" aria-label="Platform principles">
          <div><span className="ob-strip-number">01</span><strong>OBSERVATIONS FIRST</strong><small>Actual closing prices. Not simulated markets.</small></div>
          <div><span className="ob-strip-number">02</span><strong>PROBABILISTIC RESEARCH</strong><small>Assumptions visible at every step.</small></div>
          <div><span className="ob-strip-number">03</span><strong>REPRODUCIBLE BY DESIGN</strong><small>Source-attributed evidence exports.</small></div>
        </section>

        <section className="ob-observation" id="ob-observation" aria-labelledby="ob-workbench-title">
          <div className="ob-section-head">
            <div><div className="ob-eyebrow ob-eyebrow-small"><span>FIELD STUDY / 001</span><i/><span>HISTORICAL OBSERVATIONS</span></div>
              <h2 id="ob-workbench-title">An instrument for <em>uncertainty.</em></h2></div>
            <div className="ob-current-state" role="status"><span className={busy?"ob-state-light is-loading":current?.error?"ob-state-light is-error":"ob-state-light"}/>{liveLabel}</div>
          </div>
          <div className="ob-workbench">
            <aside className="ob-catalogue" aria-label="Market catalogue">
              <div className="ob-panel-head"><span>01 — MARKET CATALOGUE</span><Globe2 size={17}/></div>
              <div className="ob-catalogue-title"><h3>Choose your lens.</h3><p>Select a market to analyze its observed weekly return history.</p></div>
              <div className="ob-filter-tabs" role="group" aria-label="Market type">
                {([["all","ALL"],["Equity index","INDICES"],["Digital asset","CRYPTO"]] as [Selection,string][]).map(([value,label])=>
                  <button key={value} type="button" aria-pressed={segment===value} className={segment===value?"selected":""} onClick={()=>setSegment(value)}>{label}</button>)}
              </div>
              <MarketList active={activeId} filter={segment} onChoose={change}/>
              <div className="ob-catalogue-note"><Database size={16}/><span>External histories are indicative and unofficial. Use your own licensed data in the advanced studio.</span></div>
            </aside>

            <div className="ob-analysis" aria-label="Current market analysis">
              <div className="ob-analysis-top">
                <div><span className="ob-micro-label">ACTIVE OBSERVATION</span><div className="ob-market-title"><h3>{active.label}</h3><span>{active.symbol}</span></div><p>{active.country} · {active.kind} · Retrospective research</p></div>
                <div className="ob-analysis-actions">
                  <div className="ob-segment" role="group" aria-label="History period">
                    {(["1y","2y"] as Period[]).map(value=><button key={value} type="button" aria-pressed={period===value} className={period===value?"selected":""} onClick={()=>{setPeriod(value);setFocusedWeek(null)}}>{value.toUpperCase()}</button>)}
                  </div>
                  <button type="button" className="ob-reload" aria-label="Reload market observations" title="Reload observed history" onClick={reload}><RotateCw size={17}/></button>
                </div>
              </div>

              <div className="ob-metrics" aria-label="Observation metrics">
                <div className="ob-metric"><span>LAST OBSERVED CLOSE</span><strong>{summary?.last?displayNumber(summary.last.close,active.kind==="Digital asset"?2:2):"—"}</strong><small>{study?.latest??"Source pending"} · Market units</small></div>
                <div className="ob-metric"><span>LATEST WEEKLY RETURN</span><strong className={summary?.last?.returnPct!==undefined&&summary.last.returnPct<0?"ob-negative":""}>{summary?.last?`${summary.last.returnPct>0?"+":""}${displayNumber(summary.last.returnPct)}%`:"—"}</strong><small>Observed percentage log return</small></div>
                <div className="ob-metric"><span>COMPLETE WEEKLY RETURNS</span><strong>{summary?String(summary.count).padStart(3,"0"):"—"}</strong><small>UTC Saturday-ending weeks</small></div>
                <div className="ob-metric"><span>STABLE MODEL CANDIDATES</span><strong>{summary?String(summary.ledger.length).padStart(2,"0"):"—"}</strong><small>≥ 6 of 9 parameter settings</small></div>
              </div>

              <div className="ob-chart-card">
                <div className="ob-chart-heading">
                  <div><span className="ob-micro-label">OBSERVATION FIELD / 01</span><h4>{LABELS[mode]}</h4></div>
                  <div className="ob-mode-tabs" role="group" aria-label="Chart measurement">
                    {([["close","CLOSE"],["return","RETURN"],["reset","MODEL RESET"]] as [TraceMode,string][]).map(([value,label])=>
                      <button key={value} type="button" className={mode===value?"selected":""} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}
                  </div>
                </div>
                {study?<Plot study={study} mode={mode} selectedWeek={selectedCandidate?.week??null}/>:
                  <EmptyPanel loading={busy} error={current?.error} retry={reload}/>}
                <div className="ob-chart-note"><CircleAlert size={15}/><span>{NOTES[mode]}</span></div>
              </div>

              <div className="ob-data-footer">
                <div><span className="ob-data-icon"><Fingerprint size={20}/></span><div><strong>Every point has a source.</strong><small>{study?`${study.source} · Retrieved ${study.accessedAt.slice(0,10)} UTC`:"No observations cached or invented for the current selection."}</small></div></div>
                {exportReady&&study?<DownloadStudy study={study} period={period}/>:<span className="ob-export-note">EXPORT AVAILABLE AFTER LOADING</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="ob-evidence-section" aria-labelledby="ob-evidence-title">
          <div className="ob-section-head ob-section-head-evidence"><div><div className="ob-eyebrow ob-eyebrow-small"><span>FIELD STUDY / 002</span><i/><span>MODEL AGREEMENT</span></div>
            <h2 id="ob-evidence-title">What deserves a <em>second look.</em></h2></div><Link href="/methodology" className="ob-inline-link">READ THE METHODOLOGY <ArrowUpRight size={16}/></Link></div>
          <div className="ob-evidence-layout">
            <div className="ob-evidence-explainer"><span className="ob-micro-label">HOW TO READ THIS</span><p>Candidate weeks are identified by sensitivity agreement across nine retrospective Gaussian model settings.</p>
              <div className="ob-evidence-warning"><ShieldCheck size={18}/><span>Agreement is not accuracy, significance, causation, or a prediction of tomorrow&apos;s market.</span></div>
              <Link href="/research" className="ob-text-link">OPEN DETAILED RESEARCH <ArrowRight size={16}/></Link></div>
            <div className="ob-evidence-ledger">
              <div className="ob-ledger-head"><span>CANDIDATE WEEK</span><span>WEEKLY RETURN</span><span>MODEL AGREEMENT</span><span>REVIEW</span></div>
              {!study?<p className="ob-ledger-empty">Load a source-attributed historical study to inspect its evidence ledger.</p>:
                !summary?.ledger.length?<p className="ob-ledger-empty">No candidate met the minimum six-of-nine agreement in this study. This is a valid result; nothing is inferred or fabricated.</p>:
                  summary.ledger.slice(0,6).map((entry,index)=><button type="button" key={entry.week} className={`ob-ledger-row ${selectedCandidate?.week===entry.week?"selected":""}`} onClick={()=>setFocusedWeek(entry.week)} aria-pressed={selectedCandidate?.week===entry.week}>
                    <span><small>{String(index+1).padStart(2,"0")} / CANDIDATE</small><strong>{entry.week}</strong></span>
                    <span className={entry.returnPct<0?"ob-negative":""}>{entry.returnPct>0?"+":""}{displayNumber(entry.returnPct)}%</span>
                    <span><b>{entry.support}<i> / {entry.total}</i></b><span className="ob-agree-track"><span style={{width:`${entry.share*100}%`}}/></span></span>
                    <span className="ob-ledger-arrow"><ArrowUpRight size={17}/></span>
                  </button>)}
              <div className="ob-ledger-foot"><span>{summary?`${summary.ledger.length} sensitivity-stable candidates in the loaded study`:"NO LOADED STUDY"}</span><span>RESEARCH · NOT INVESTMENT ADVICE</span></div>
            </div>
          </div>
        </section>

        <section className="ob-next" aria-labelledby="ob-next-title">
          <div className="ob-next-left"><div className="ob-eyebrow ob-eyebrow-small"><span>FIELD STUDY / 003</span><i/><span>THE RESEARCH PIPELINE</span></div>
            <h2 id="ob-next-title">Better questions.<br/><em>Better evidence.</em></h2>
            <p>The full studio keeps advanced controls, CSV ingestion, cross-market comparison, sensitivity diagnostics, and reproducible exports in one place.</p>
            <Link href="/research" className="ob-button ob-button-primary">ENTER THE RESEARCH STUDIO <ArrowUpRight size={17}/></Link>
          </div>
          <div className="ob-next-right" aria-label="Research capability status">
            <div className="ob-pipeline-row"><span>01</span><div><strong>Historical market evidence</strong><small>Observed weekly data with source attribution</small></div><span className="ob-pipeline-live"><Check size={14}/> AVAILABLE</span></div>
            <div className="ob-pipeline-row"><span>02</span><div><strong>Retrospective Bayesian analysis</strong><small>Gaussian mean-shift model and parameter sensitivity</small></div><span className="ob-pipeline-live"><Check size={14}/> AVAILABLE</span></div>
            <div className="ob-pipeline-row"><span>03</span><div><strong>Three-detector research validation</strong><small>BOCPD, CUSUM, variance · independent Python pipeline</small></div><span className="ob-pipeline-study">RESEARCH BRANCH</span></div>
            <div className="ob-pipeline-row"><span>04</span><div><strong>Commercial alert certification</strong><small>Ground truth, licensing and independent review required</small></div><span className="ob-pipeline-study">NOT VERIFIED</span></div>
          </div>
        </section>
      </main>
      <footer className="ob-footer">
        <div><BrandMark small/><span>BCPD ONE <b>/ RESEARCH INSTRUMENTS</b></span></div>
        <div><Link href="/methodology">METHODOLOGY</Link><Link href="/privacy">DATA PRACTICES</Link><a href="https://github.com/HuLaxx/BCPD" rel="noreferrer" target="_blank">SOURCE CODE <ArrowUpRight size={12}/></a></div>
        <span>HISTORICAL RESEARCH ONLY · NOT A TRADING SIGNAL</span>
      </footer>
    </div>
  </div>;
}
