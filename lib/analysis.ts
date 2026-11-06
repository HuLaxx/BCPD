import type { Asset } from "./universe";

export type PricePoint = {date: string; close: number};
export type WeeklyPoint = PricePoint & {weekEnd: string};
export type ReturnPoint = {date: string; close: number; returnPct: number};
export type Consensus = {index: number; support: number; total: number; share: number};
export type Analysis = {probabilities: number[]; consensus: Consensus[]; sampleVariance: number};
export type Study = {
  asset: Asset;
  returns: ReturnPoint[];
  analysis: Analysis;
  source: string;
  accessedAt: string;
  latest: string;
};
export type Relationship = {a: string;b: string;r: number|null;overlap: number};
export type Volatility = {id: string; label: string; annualizedPct: number|null; changePp: number|null; observations: number};
export type SharedEvent = {week: string; marketIds: string[]; labels: string[]; eligible: number; share: number};

const MS_DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string): boolean => DATE.test(s) && !Number.isNaN(Date.parse(s+"T00:00:00Z")) &&
  new Date(s+"T00:00:00Z").toISOString().slice(0,10) === s;
const mean = (x: number[]): number => x.reduce((s,n)=>s+n,0)/x.length;
const variance = (x: number[]): number => {
  if(x.length<2) return .0001;
  const m=mean(x);
  return Math.max(.0001,x.reduce((s,n)=>s+(n-m)**2,0)/(x.length-1));
};

export function weeklyCloses(points: PricePoint[]): WeeklyPoint[] {
  const weeks = new Map<string,WeeklyPoint>();
  for(const point of points) {
    if(!validDate(point.date) || !Number.isFinite(point.close) || point.close<=0) continue;
    const date = new Date(point.date+"T00:00:00Z");
    const days = (6-date.getUTCDay()+7)%7;
    date.setUTCDate(date.getUTCDate()+days);
    const weekEnd=date.toISOString().slice(0,10);
    if(!weeks.has(weekEnd) || point.date>weeks.get(weekEnd)!.date)
      weeks.set(weekEnd,{...point,weekEnd});
  }
  return [...weeks.values()].sort((a,b)=>a.weekEnd.localeCompare(b.weekEnd));
}

export function logReturns(points: WeeklyPoint[]): ReturnPoint[] {
  const out:ReturnPoint[]=[];
  for(let i=1;i<points.length;i++) if(points[i-1].close>0 && points[i].close>0)
    out.push({date:points[i].weekEnd,close:points[i].close,
      returnPct:100*Math.log(points[i].close/points[i-1].close)});
  return out;
}

type State = {r:number; log:number; mean:number; precision:number};
const logpdf=(x:number,m:number,v:number)=>-.5*(Math.log(2*Math.PI*v)+(x-m)**2/v);

/** Gaussian mean-shift BOCPD, constant hazard, Normal prior; retrospective parameters. */
export function detect(values:number[],hazard:number,noiseVariance:number,priorVariance:number,limit=140): number[] {
  if(values.length<5||values.length>1200||values.some(v=>!Number.isFinite(v))) throw Error("BOCPD expects 5 to 1,200 valid returns");
  if(hazard<3||hazard>500||noiseVariance<=0||priorVariance<=0||limit<5) throw Error("Invalid BOCPD parameters");
  const prior=mean(values.slice(0,Math.min(12,values.length)));
  const h=1/hazard,prec=1/priorVariance,step=1/noiseVariance;
  let states:State[]=[{r:0,log:0,mean:prior,precision:prec}];
  const probabilities:number[]=[];
  for(const value of values) {
    const resetPrec=prec+step;
    const next:State[]=[{r:0,log:Math.log(h)+logpdf(value,prior,noiseVariance+priorVariance),
      mean:(prior*prec+value*step)/resetPrec,precision:resetPrec}];
    for(const state of states){
      if(state.r+1>=limit)continue;
      const p=state.precision+step;
      next.push({r:state.r+1,log:state.log+Math.log(1-h)+logpdf(value,state.mean,noiseVariance+1/state.precision),
        mean:(state.mean*state.precision+value*step)/p,precision:p});
    }
    const max=Math.max(...next.map(s=>s.log));
    const sum=next.reduce((s,x)=>s+Math.exp(x.log-max),0);
    for(const nextState of next)nextState.log-=max+Math.log(sum);
    states=next;
    probabilities.push(probabilities.length===0?0:Math.exp(states[0].log));
  }
  return probabilities;
}

function peaks(values:number[],threshold:number): number[] {
  const result:number[]=[];
  for(let i=2;i<values.length-1;i++){
    if(values[i]>=threshold&&values[i]>values[i-1]&&values[i]>=values[i+1] &&
      !result.some(j=>i-j<6))result.push(i);
  }
  return result;
}

export function analyzeReturns(rows:ReturnPoint[],hazard=32,threshold=.2):Analysis {
  if(rows.length<20)throw Error("At least 20 observed weekly returns are required");
  const values=rows.map(x=>x.returnPct);
  const v=variance(values),priorV=Math.max(.01,v*7);
  const baseline=detect(values,hazard,v,priorV);
  const groups:{center:number; indices:number[]; models:Set<number>}[]=[];
  let model=0;
  for(const hazardScale of [.6,1,1.6]) for(const noiseScale of [.65,1,1.5]) {
    const settings=detect(values,Math.max(3,Math.round(hazard*hazardScale)),Math.max(.001,v*noiseScale),priorV);
    for(const idx of peaks(settings,threshold)){
      let group=groups.find(g=>Math.abs(g.center-idx)<=2&&!g.models.has(model));
      if(!group){group={center:idx,indices:[],models:new Set()};groups.push(group)}
      group.indices.push(idx);group.models.add(model);group.center=mean(group.indices);
    }
    model++;
  }
  const consensus=groups.map(g=>({index:Math.round(g.center),support:g.models.size,total:9,share:g.models.size/9}))
    .filter(g=>g.share>=4/9).sort((a,b)=>b.share-a.share||a.index-b.index).slice(0,12);
  return {probabilities:baseline,consensus,sampleVariance:v};
}

export function parseCSV(input:string):PricePoint[] {
  const lines=String(input).replace(/^\uFEFF/,"").trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<11||lines.length>15000)throw Error("CSV must contain 10–14,999 price observations");
  const sep=lines[0].includes("\t")?"\t":lines[0].includes(";")?";":",";
  const headers=lines[0].split(sep).map(x=>x.trim().toLowerCase().replace(/^"|"$/g,""));
  const dateCol=headers.findIndex(x=>["date","day","timestamp"].includes(x));
  const closeCol=headers.findIndex(x=>["close","adj close","adj_close","adjusted close","price"].includes(x));
  if(dateCol<0||closeCol<0)throw Error("CSV needs date and close columns");
  const rows=new Map<string,PricePoint>();
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].split(sep).map(x=>x.trim().replace(/^"|"$/g,""));
    const date=cols[dateCol],close=Number(cols[closeCol]);
    if(!validDate(date)||!Number.isFinite(close)||close<=0)
      throw Error("Invalid date or close value at CSV row "+(i+1));
    rows.set(date,{date,close});
  }
  if(rows.size<10)throw Error("At least ten distinct dates required");
  return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function annualizedVolatility(study:Study,window=12):Volatility {
  const rows=study.returns;const recent=rows.slice(-window),prior=rows.slice(-2*window,-window);
  const standard=(x:ReturnPoint[])=>Math.sqrt(variance(x.map(r=>r.returnPct))*52);
  const current=recent.length===window?standard(recent):null;
  const previous=prior.length===window?standard(prior):null;
  return {id:study.asset.id,label:study.asset.label,annualizedPct:current,
    changePp:current===null||previous===null?null:current-previous,observations:recent.length};
}

export function correlations(studies:Study[],minOverlap=12):Relationship[] {
  const out:Relationship[]=[];
  for(let i=0;i<studies.length;i++)for(let j=i+1;j<studies.length;j++){
    const a=studies[i],b=studies[j];
    const index=new Map(b.returns.map(r=>[r.date,r.returnPct]));
    const pairs=a.returns.filter(x=>index.has(x.date)).map(x=>[x.returnPct,index.get(x.date)!] as const);
    let r:number|null=null;
    if(pairs.length>=minOverlap){
      const mx=mean(pairs.map(p=>p[0])),my=mean(pairs.map(p=>p[1]));
      let xy=0,xx=0,yy=0;
      for(const [x,y] of pairs){xy+=(x-mx)*(y-my);xx+=(x-mx)**2;yy+=(y-my)**2}
      if(xx>1e-12&&yy>1e-12)r=Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy)));
    }
    out.push({a:a.asset.label,b:b.asset.label,r,overlap:pairs.length});
  }
  return out.sort((a,b)=>Math.abs(b.r??0)-Math.abs(a.r??0));
}

/** Shared sensitivity-stable peaks within a one-week window. Not causality or significance. */
export function sharedEvents(studies:Study[]):SharedEvent[] {
  const candidates:{date:string;ms:number;asset:Asset}[]=[];
  for(const study of studies)for(const p of study.analysis.consensus.filter(x=>x.share>=2/3)){
    const date=study.returns[p.index]?.date;
    if(date)candidates.push({date,ms:Date.parse(date+"T00:00:00Z"),asset:study.asset});
  }
  candidates.sort((a,b)=>a.ms-b.ms);
  const clusters:{anchor:number;members:typeof candidates}[]=[];
  for(const candidate of candidates){
    let group=clusters.find(x=>candidate.ms>=x.anchor&&candidate.ms-x.anchor<=7*MS_DAY);
    if(!group){group={anchor:candidate.ms,members:[]};clusters.push(group)}
    group.members.push(candidate);
  }
  return clusters.map(cluster=>{
    const unique=[...new Map(cluster.members.map(p=>[p.asset.id,p])).values()];
    const eligible=studies.filter(s=>s.returns.some(r=>{
      const ms=Date.parse(r.date+"T00:00:00Z");
      return ms>=cluster.anchor&&ms<=cluster.anchor+7*MS_DAY;
    })).length;
    return {week:new Date(cluster.anchor).toISOString().slice(0,10),
      marketIds:unique.map(m=>m.asset.id),labels:unique.map(m=>m.asset.label),
      eligible,share:eligible?unique.length/eligible:0};
  }).filter(e=>e.marketIds.length>=2)
    .sort((a,b)=>b.marketIds.length-a.marketIds.length||a.week.localeCompare(b.week));
}
