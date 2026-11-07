"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HuLaXCredit } from "@/components/hulax-credit";
import { BrandFooter } from "@/components/brand-footer";
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, BookOpen, Check, CircleAlert,
  Database, FileUp, GitBranch, Globe2, Layers3, RefreshCw, ShieldCheck, SlidersHorizontal, Waves
} from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import { ASSETS, DEFAULT_MARKETS, type Asset } from "@/lib/universe";
import { PresetStudio } from "@/components/preset-studio";
import { regimeEvidence } from "@/lib/insights";
import { createResearchReport } from "@/lib/report";
import type { StudyConfig } from "@/lib/presets";
import {
  analyzeReturns, annualizedVolatility, correlations, logReturns, parseCSV,
  sharedEvents, weeklyCloses, type PricePoint, type Study
} from "@/lib/analysis";

type HistoryResponse = {
  asset: Asset;
  points: PricePoint[];
  source: string;
  accessedAt: string;
  error?: string;
};
type Failed = {label: string; reason: string};
const format = (value: number, digits=2) => Number.isFinite(value) ? value.toFixed(digits) : "—";
const pct = (value: number|null) => value === null ? "N/A" : format(value,1) + "%";

function ResearchTag({children}: {children: React.ReactNode}) {
  return <span className="research-tag">{children}</span>;
}

function EmptyState({title,subtitle}: {title:string;subtitle:string}) {
  return <div className="empty-state"><div className="empty-orbit"><Activity size={26}/></div>
    <h3>{title}</h3><p>{subtitle}</p></div>;
}

function reportDownload(studies: Study[], config: StudyConfig) {
  const report=createResearchReport(studies,config,new Date().toISOString());
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="bcpd-one-research-report.json";link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function csvDownload(studies: Study[]) {
  const quote=(x: string|number)=>'"'+String(x).replaceAll('"','""')+'"';
  const rows=["asset,country,week_end,weekly_log_return_pct,reset_probability,source,retrieved_utc"];
  for(const study of studies) for(const [i,r] of study.returns.entries()){
    rows.push([study.asset.label,study.asset.country,r.date,format(r.returnPct,7),
      format(study.analysis.probabilities[i],8),study.source,study.accessedAt].map(quote).join(","));
  }
  const url=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");
  link.href=url;link.download="bcpd-one-research-export.csv";link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function ResearchWorkbench() {
  const [selected,setSelected]=useState<string[]>(DEFAULT_MARKETS);
  const [range,setRange]=useState("2y");
  const [hazard,setHazard]=useState(32);
  const [threshold,setThreshold]=useState(20);
  const [overrides,setOverrides]=useState<Record<string,PricePoint[]>>({});
  const [importId,setImportId]=useState("us");
  const [studies,setStudies]=useState<Study[]>([]);
  const [failures,setFailures]=useState<Failed[]>([]);
  const [busy,setBusy]=useState(false);
  const [ran,setRan]=useState(false);
  const [lastRunSignature,setLastRunSignature]=useState("");
  const [focusId,setFocusId]=useState("us");
  const [notice,setNotice]=useState("");
  const uploadRef=useRef<HTMLInputElement>(null);

  const focus=studies.find(s=>s.asset.id===focusId)??studies[0];
  const evidence=useMemo(()=>focus?regimeEvidence(focus):[],[focus]);
  const signature=JSON.stringify({selected:[...selected].sort(),range,hazard,threshold,overrides:Object.entries(overrides).map(([id,rows])=>[id,rows.length,rows.at(-1)?.date]).sort()});
  const stale=ran&&lastRunSignature!==signature;
  const relation=useMemo(()=>correlations(studies),[studies]);
  const shifts=useMemo(()=>sharedEvents(studies),[studies]);
  const volatility=useMemo(()=>studies.map(s=>annualizedVolatility(s)),[studies]);
  const chart=useMemo(()=>focus?.returns.map((r,i)=>({
    week:r.date,returns:Number(r.returnPct.toFixed(3)),
    probability:Number((focus.analysis.probabilities[i]*100).toFixed(2))
  }))??[],[focus]);
  const robust=studies.reduce((total,s)=>total+s.analysis.consensus.filter(p=>p.share>=2/3).length,0);
  const latest=studies.map(s=>s.latest).sort().at(-1);
  const toggle=(id:string)=>{
    setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  };

  function applyPreset(config:StudyConfig) {
    setSelected([...config.selected]);setRange(config.range);setHazard(config.hazard);setThreshold(config.threshold);
    setStudies([]);setFailures([]);setRan(false);setLastRunSignature("");
    setNotice("Research preset loaded. Run the study to fetch current observations.");
  }

  async function runResearch() {
    if(busy)return;
    if(!selected.length){setNotice("Select at least one market to run the study.");return}
    setBusy(true);setNotice("Requesting historical observations; no synthetic prices are used.");
    setFailures([]);
    const fetchSelected=async (id:string)=>{
      const asset=ASSETS.find(x=>x.id===id)!;
      try{
        const local=overrides[id];
        let points:PricePoint[],source:string,accessedAt:string;
        if(local){points=local;source="User-imported local CSV";accessedAt=new Date().toISOString()}
        else{
          const response=await fetch("/api/markets?asset="+encodeURIComponent(id)+"&range="+encodeURIComponent(range),{
            cache:"no-store"
          });
          const data=(await response.json()) as HistoryResponse;
          if(!response.ok)throw Error(data.error||"Provider unavailable");
          if(!Array.isArray(data.points))throw Error("Provider returned an invalid dataset");
          points=data.points;source=data.source;accessedAt=data.accessedAt;
        }
        const weekly=weeklyCloses(points);
        const returns=logReturns(weekly);
        if(returns.length<20)throw Error("Fewer than 20 observed weekly returns; use a longer series");
        const analysis=analyzeReturns(returns,hazard,threshold/100);
        return {ok:true,study:{asset,returns,analysis,source,accessedAt,
          latest:points.at(-1)?.date??"Unknown"}} as const;
      }catch(error){
        return {ok:false,failure:{label:asset.label,reason:error instanceof Error?error.message:"Unknown error"}} as const;
      }
    };
    // Limit concurrent upstream requests to reduce provider rate-limits.
    const results: Awaited<ReturnType<typeof fetchSelected>>[] = new Array(selected.length);
    let cursor = 0;
    await Promise.all(Array.from({length:Math.min(3,selected.length)}, async()=>{
      while(cursor<selected.length){
        const i=cursor++;
        results[i]=await fetchSelected(selected[i]);
      }
    }));
    const loaded=results.filter(x=>x.ok).map(x=>x.study);
    const missed=results.filter(x=>!x.ok).map(x=>x.failure);
    setStudies(loaded);setFailures(missed);setRan(true);setLastRunSignature(signature);setBusy(false);
    if(!loaded.some(s=>s.asset.id===focusId))setFocusId(loaded[0]?.asset.id??"");
    setNotice(loaded.length ? loaded.length+" of "+selected.length+" markets loaded with attributed data." :
      "No provider series loaded. Import an archived date,close CSV to run without external feeds.");
  }

  async function onUpload(file:File | undefined) {
    if(!file)return;
    if(file.size>2_000_000){setNotice("Maximum CSV file size is 2 MB.");return}
    try{
      const points=parseCSV(await file.text());
      if(logReturns(weeklyCloses(points)).length<20)
        throw Error("Import needs at least 21 distinct weekly closing prices");
      setOverrides(old=>({...old,[importId]:points}));
      setSelected(old=>old.includes(importId)?old:[...old,importId]);
      const label=ASSETS.find(a=>a.id===importId)?.label??importId;
      setNotice("Loaded "+points.length+" observed closing prices for "+label+". Local data takes precedence on the next run.");
    }catch(error){
      setNotice(error instanceof Error?error.message:"Could not read this CSV");
    }finally{
      if(uploadRef.current)uploadRef.current.value="";
    }
  }

  return <div className="app-frame">
    <aside className="nav-rail">
      <Link href="/" className="logo-lockup" aria-label="BCPD One home">
        <span className="logo-mark"><Waves size={23} strokeWidth={2.4}/></span>
        <span className="logo-wordmark">BCPD <b>ONE</b><small>RESEARCH INTELLIGENCE</small></span>
      </Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        <a className="nav-active" href="#overview"><BarChart3 size={17}/> Research overview</a>
        <a href="#study"><Activity size={17}/> Regime laboratory</a>
        <a href="#relationships"><GitBranch size={17}/> Market relationships</a>
        <a href="#events"><Layers3 size={17}/> Shared events</a>
        <a href="/lab.html"><BookOpen size={17}/> Classic BOCPD lab <ArrowRight className="nav-tail" size={14}/></a>
      </nav>
      <div className="rail-bottom">
        <div className="rail-status"><span className="status-light"/> EVIDENCE-FIRST ANALYTICS</div>
        <p>Retrospective research environment. No trading recommendations or inferred ground truth.</p>
        <a href="https://github.com/HuLaxx/BCPD" target="_blank" rel="noopener noreferrer">VIEW SOURCE CODE <ArrowRight size={14}/></a>
      </div>
    </aside>

    <div className="workspace" id="overview">
      <header className="topbar" id="top">
        <div className="breadcrumbs">WORKSPACE <span>/</span> GLOBAL RESEARCH ATLAS <span>/</span> <strong>OVERVIEW</strong></div>
        <div className="top-actions"><HuLaXCredit/><span className="system-badge"><span className="status-light"/> PROVENANCE ENABLED</span>
          <span className="avatar">BC</span></div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow"><span className="eyebrow-line"/> THE NEXT GENERATION OF MARKET RESEARCH <span className="version-pill">V1.0</span></div>
            <h1>Markets change.<br/><em>Evidence matters.</em></h1>
            <p>Map structural shifts across global equity indices and digital assets with Bayesian change-point inference, synchronized returns and transparent sensitivity analysis.</p>
            <div className="hero-tags"><ResearchTag>14 RESEARCH MARKETS</ResearchTag><ResearchTag>9 MODEL VARIANTS</ResearchTag><ResearchTag>OBSERVED PRICES ONLY</ResearchTag></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="orbit orbit-3"/><div className="orbit-center"><Activity size={42}/></div>
            <span className="art-label art-label-one">P(REGIME SHIFT)</span><span className="art-label art-label-two">BAYESIAN RECURSION</span></div>
        </section>

        <section className="configuration panel" aria-label="Research configuration">
          <div className="panel-heading">
            <div><span className="section-kicker">01 / RESEARCH CONFIGURATION</span><h2>Build your market study</h2><p>Select a research cohort and run the same inference pipeline across observed weekly returns.</p></div>
            <SlidersHorizontal className="heading-icon" size={21}/>
          </div>
          <div className="control-grid">
            <div className="field"><label htmlFor="history-range">HISTORY WINDOW</label><select id="history-range" value={range} onChange={e=>setRange(e.target.value)}>
              <option value="1y">1 year</option><option value="2y">2 years</option><option value="5y">5 years</option></select></div>
            <div className="field"><label htmlFor="hazard">EXPECTED REGIME LENGTH <span>{hazard} weeks</span></label><input id="hazard" type="range" min="12" max="100" step="4" value={hazard} onChange={e=>setHazard(Number(e.target.value))}/></div>
            <div className="field"><label htmlFor="threshold">RESET THRESHOLD <span>{threshold}%</span></label><input id="threshold" type="range" min="5" max="80" step="5" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></div>
          </div>
          <div className="universe-header"><div><h3>Market universe</h3><span>{selected.length} of {ASSETS.length} selected</span></div>
            <div className="shortcut-buttons"><button type="button" onClick={()=>setSelected(ASSETS.filter(a=>a.kind==="Equity index").map(a=>a.id))}>All indices</button>
              <button type="button" onClick={()=>setSelected(ASSETS.filter(a=>a.kind==="Digital asset").map(a=>a.id))}>All crypto</button>
              <button type="button" onClick={()=>setSelected([])}>Clear</button></div></div>
          <div className="asset-grid">{ASSETS.map(asset=><label className={"asset-chip"+(selected.includes(asset.id)?" selected":"")} key={asset.id}>
            <input type="checkbox" checked={selected.includes(asset.id)} onChange={()=>toggle(asset.id)} aria-label={"Analyze "+asset.label}/>
            <span className="asset-check">{selected.includes(asset.id)?<Check size={12}/>:null}</span><span className="asset-name">{asset.label}<small>{asset.country}</small></span>
            <span className="asset-type">{asset.kind==="Digital asset"?"CRYPTO":"INDEX"}</span></label>)}</div>
          <div className="run-row"><button className="run-button" disabled={busy} onClick={()=>void runResearch()}>
            {busy?<RefreshCw className="spin" size={18}/>:<Activity size={18}/>}
            {busy?"ANALYZING OBSERVED DATA":"RUN BAYESIAN RESEARCH"} <ArrowRight size={18}/></button>
            <div className="run-context"><ShieldCheck size={17}/> No synthetic market observations, no investment advice</div></div>
          <div className="csv-tool">
            <div className="csv-description"><Database size={19}/><div><strong>Own the data. Reproduce the result.</strong><span>Import archived date,close CSV observations per market; files remain in your browser.</span></div></div>
            <div className="csv-actions"><select aria-label="Market to import CSV for" value={importId} onChange={e=>setImportId(e.target.value)}>
              {ASSETS.map(a=><option value={a.id} key={a.id}>{a.label}</option>)}</select>
              <input ref={uploadRef} hidden type="file" accept=".csv,text/csv" onChange={e=>void onUpload(e.target.files?.[0])}/>
              <button className="outline-btn" onClick={()=>uploadRef.current?.click()}><FileUp size={16}/> IMPORT CSV</button>
              {overrides[importId]&&<button className="text-btn" onClick={()=>{setOverrides(old=>{const copy={...old};delete copy[importId];return copy});setNotice("Local CSV override cleared. The online feed will be used next time.");}}>Clear override</button>}
            </div>
          </div>
          {notice&&<div role="status" className={"notice"+(failures.length?" notice-warning":"")}><CircleAlert size={16}/>{notice}</div>}
          {failures.length>0&&<div className="failed-list" role="alert">Unavailable sources: {failures.map(f=>f.label+" — "+f.reason).join(" · ")}</div>}
        </section>

        <PresetStudio config={{selected,range:range as StudyConfig["range"],hazard,threshold}} onApply={applyPreset}/>
        {stale&&<div className="stale-warning" role="status"><CircleAlert size={17}/> Model configuration changed after the last run. Charts below show previous settings until you run research again.</div>}

        <section className="summary-row" aria-label="Study metrics">
          <div className="metric-card"><div className="metric-top"><span>MARKETS ANALYZED</span><Globe2 size={19}/></div><strong>{ran?studies.length:"—"}<small>{ran?"/ "+selected.length:""}</small></strong><p>Source-attributed market series</p></div>
          <div className="metric-card"><div className="metric-top"><span>ROBUST CANDIDATES</span><Activity size={19}/></div><strong>{ran?robust:"—"}</strong><p>Agreement in at least 6 of 9 models</p></div>
          <div className="metric-card"><div className="metric-top"><span>SHARED SHIFT WINDOWS</span><GitBranch size={19}/></div><strong>{ran?shifts.length:"—"}</strong><p>Cross-market temporal overlap</p></div>
          <div className="metric-card metric-accent"><div className="metric-top"><span>RESEARCH FRESHNESS</span><Database size={19}/></div><strong className="metric-date">{latest??"—"}</strong><p>Latest observed close date</p></div>
        </section>

        <section className="panel chart-panel" id="study">
          <div className="panel-heading chart-heading"><div><span className="section-kicker">02 / THE REGIME LABORATORY</span><h2>Structural change, in context.</h2>
            <p>Weekly log returns and Bayesian posterior reset probabilities. Both series use separate axes.</p></div>
            <div className="chart-actions">{studies.length>0&&<><select aria-label="Market in chart" value={focus?.asset.id??""} onChange={e=>setFocusId(e.target.value)}>
              {studies.map(s=><option key={s.asset.id} value={s.asset.id}>{s.asset.label}</option>)}</select>
              <button className="outline-btn" onClick={()=>csvDownload(studies)}><ArrowDownToLine size={16}/> EXPORT CSV</button>
              <button className="outline-btn" onClick={()=>reportDownload(studies,{selected,range:range as StudyConfig["range"],hazard,threshold})}><ArrowDownToLine size={16}/> RESEARCH REPORT</button></>}</div></div>
          {focus?<><div className="chart-legend"><span><i className="legend-bars"/> WEEKLY LOG RETURN (%)</span><span><i className="legend-line"/> CHANGE PROBABILITY (%)</span><span className="legend-right">{focus.returns.length} weekly observations</span></div>
            <div className="chart-container"><ResponsiveContainer width="100%" height={315}>
              <ComposedChart data={chart} margin={{top:14,right:12,bottom:2,left:0}}>
                <CartesianGrid stroke="#203448" vertical={false} strokeDasharray="3 7"/>
                <XAxis dataKey="week" stroke="#7992a7" tick={{fill:"#8ca5b8",fontSize:11}} tickLine={false} axisLine={false} minTickGap={38} tickFormatter={(v:string)=>v.slice(5)}/>
                <YAxis yAxisId="returns" stroke="#7992a7" tick={{fill:"#8ca5b8",fontSize:11}} tickLine={false} axisLine={false} width={47}/>
                <YAxis yAxisId="prob" orientation="right" domain={[0,100]} tick={{fill:"#8ca5b8",fontSize:11}} tickLine={false} axisLine={false} width={45}/>
                <Tooltip contentStyle={{backgroundColor:"#102135",border:"1px solid #315066",borderRadius:10,color:"#ebf6ff"}}/>
                <ReferenceLine yAxisId="returns" y={0} stroke="#5b7890" strokeOpacity={.65}/>
                {focus.analysis.consensus.filter(p=>p.share>=2/3).slice(0,6).map(p=><ReferenceLine
                  key={p.index} yAxisId="returns" x={focus.returns[p.index]?.date} stroke="#eba76e" strokeDasharray="4 5" strokeOpacity={.8}/>)}
                <Bar yAxisId="returns" dataKey="returns" name="Log return %" fill="#3d8f9b" radius={[2,2,0,0]} maxBarSize={9}/>
                <Line yAxisId="prob" type="monotone" dataKey="probability" name="Reset probability %" stroke="#f4bd7d" dot={false} strokeWidth={2} activeDot={{r:4}}/>
              </ComposedChart></ResponsiveContainer></div>
            <div className="chart-footer"><span><ShieldCheck size={15}/> {focus.source}</span><span>Last close: {focus.latest} · Retrieved {focus.accessedAt.slice(0,10)}</span></div>
            <div className="evidence-panel"><div className="evidence-heading"><strong>Candidate shift diagnostics</strong><span>8 observed weeks before vs. after · descriptive only</span></div>
              {evidence.length?<div className="evidence-list">{evidence.map(event=><div className="evidence-item" key={event.date}>
                <div className="evidence-date"><b>{event.date}</b><span>{event.support}/{event.total} model settings agree</span></div>
                <div><small>AVG RETURN BEFORE → AFTER</small><strong>{format(event.beforeMeanPct)}% → {format(event.afterMeanPct)}%</strong></div>
                <div><small>MEAN SHIFT</small><strong className={event.meanShiftPp>=0?"risk-down":"risk-up"}>{event.meanShiftPp>0?"+":""}{format(event.meanShiftPp)} pp</strong></div>
                <div><small>ANNUALIZED VOLATILITY</small><strong>{format(event.beforeVolatilityPct,1)}% → {format(event.afterVolatilityPct,1)}%</strong></div>
              </div>)}</div>:<p className="evidence-empty">No candidate met both model agreement and minimum before/after sample requirements. A missing event is not a modeling failure.</p>}
            </div>
          </>:<EmptyState title="Your next insight starts with evidence" subtitle="Choose a market cohort and run the study to plot actual observed returns and model probabilities."/>}
        </section>

        <div className="two-column" id="relationships">
          <section className="panel compact-panel"><div className="panel-heading"><div><span className="section-kicker">03 / MARKET STRUCTURE</span><h2>Cross-market relationships</h2><p>Pairwise Pearson correlations on common observed UTC week ends; minimum 12 overlapping weeks.</p></div><GitBranch className="heading-icon" size={21}/></div>
            {relation.length?<div className="relation-list">{relation.slice(0,10).map((r,i)=><div className="relation-row" key={r.a+r.b}>
              <span className="relation-number">{String(i+1).padStart(2,"0")}</span><div className="relation-meta"><strong>{r.a} <span>×</span> {r.b}</strong><small>{r.overlap} shared weeks</small></div>
              <div className="relation-track"><span style={{width:((Math.abs(r.r??0))*100)+"%",background:r.r!==null&&r.r<0?"#e4a576":"#6ed8c6"}}/></div>
              <b className="relation-value">{r.r===null?"N/A":format(r.r,2)}</b>
            </div>)}</div>:<EmptyState title="Relationships need observations" subtitle="Run two or more markets with overlapping dated returns to calculate their correlations."/>}
            <p className="panel-footnote">Correlation measures co-movement, not causality or calibrated risk.</p>
          </section>
          <section className="panel compact-panel"><div className="panel-heading"><div><span className="section-kicker">04 / VOLATILITY REGIMES</span><h2>Changing risk conditions</h2><p>Annualized sample standard deviation of the latest 12 weekly log returns.</p></div><Activity className="heading-icon" size={21}/></div>
            {volatility.length?<div className="volatility-table"><div className="volatility-head"><span>MARKET</span><span>VOLATILITY</span><span>VS PRIOR 12W</span></div>
              {volatility.map(v=><div className="volatility-row" key={v.id}><strong>{v.label}</strong>
                <b>{pct(v.annualizedPct)}</b><span className={v.changePp===null?"muted":v.changePp>0?"risk-up":"risk-down"}>{v.changePp===null?"Insufficient baseline":(v.changePp>0?"+":"")+format(v.changePp,1)+" pp"}</span></div>)}</div>:
              <EmptyState title="Volatility, without guesswork" subtitle="Analysis calculates rolling descriptive volatility only when enough historical observations exist."/>}
            <p className="panel-footnote">Annualization assumes 52 weekly periods; historical dispersion is not a forecast.</p>
          </section>
        </div>

        <section className="panel event-panel" id="events"><div className="panel-heading"><div><span className="section-kicker">05 / COMPARATIVE EVENT INTELLIGENCE</span><h2>When markets shift together.</h2><p>Clusters of sensitivity-stable peaks within one observed week. These are research candidates, not verified real-world events.</p></div><Layers3 className="heading-icon" size={21}/></div>
          {shifts.length?<div className="event-table"><div className="event-th"><span>WINDOW START (UTC)</span><span>MARKETS WITH ROBUST PEAKS</span><span>OBSERVED COHORT</span></div>
            {shifts.slice(0,12).map(event=><div className="event-tr" key={event.week}><strong>{event.week}</strong><span>{event.labels.join(" · ")}</span><b>{event.marketIds.length} / {event.eligible} <small>markets</small></b></div>)}</div>:
          <EmptyState title="No shared events identified yet" subtitle={ran?"No cross-market peak clusters met the agreement criteria in loaded data. This is a valid research finding.":"Run the study to compare synchronized candidate structural changes across markets."}/>}
        </section>

        <section className="methodology-strip"><div className="method-icon"><ShieldCheck size={22}/></div><div><strong>Scientific clarity is a feature, not a footnote.</strong>
          <p>The Gaussian mean-shift BOCPD model uses whole-sample variance and a first-observation prior. Results are retrospective; nine-setting sensitivity is parameter agreement, not prediction confidence. Yahoo Finance is an unofficial historical source, and free APIs may fail. Imported files are processed client-side. <Link className="inline-link" href="/methodology">Read the full methodology.</Link></p></div>
          <a href="https://github.com/HuLaxx/BCPD" target="_blank" rel="noopener noreferrer">REPRODUCIBLE SOURCE <ArrowRight size={17}/></a></section>
      </main>
      <BrandFooter studio/>
    </div>
  </div>;
}
