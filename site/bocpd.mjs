// Bayesian online change-point detection for a Gaussian with known variance.
// Uses a conjugate Normal prior on segment means and log-domain normalization.
const logpdf=(x,m,v)=>-.5*(Math.log(2*Math.PI*v)+(x-m)**2/v);
export function detect(series,{hazard=55,variance=.2,priorVariance=12,limit=140}={}){
 if(!Array.isArray(series)||series.length<5||series.length>1200||series.some(x=>!Number.isFinite(x)))throw Error("Use 5–1200 numeric observations.");
 if(hazard<3||hazard>500||variance<=0||priorVariance<=0||limit<5)throw Error("Invalid model settings.");
 const prior=series.slice(0,Math.min(series.length,12)).reduce((a,b)=>a+b,0)/Math.min(series.length,12);
 const h=1/hazard, prec=1/priorVariance, step=1/variance;
 let states=[{r:0,log:0,mean:prior,precision:prec}],probabilities=[],posterior=[],runLengths=[];
 for(const value of series){
  const p0=prec+step;
  const next=[{r:0,log:Math.log(h)+logpdf(value,prior,variance+priorVariance),mean:(prior*prec+value*step)/p0,precision:p0}];
  for(const state of states){
    if(state.r+1>=limit)continue;
    const p=state.precision+step;
    next.push({r:state.r+1,log:state.log+Math.log(1-h)+logpdf(value,state.mean,variance+1/state.precision),mean:(state.mean*state.precision+value*step)/p,precision:p});
  }
  const max=Math.max(...next.map(x=>x.log)),sum=next.reduce((s,x)=>s+Math.exp(x.log-max),0);
  for(const state of next)state.log-=max+Math.log(sum);
  states=next;
  const row=states.map(x=>({r:x.r,p:Math.exp(x.log)}));
  posterior.push(row);
  probabilities.push(posterior.length===1?0:row[0].p);
  runLengths.push(row.reduce((s,x)=>s+x.r*x.p,0));
 }
 return {probabilities,posterior,runLengths};
}
export function parseSeries(source){
 const lines=String(source).trim().split(/\r?\n/).filter(Boolean),values=[];
 for(let i=0;i<lines.length;i++){
   const cells=lines[i].split(/[,;\t]/).map(x=>x.trim());
   if(i===0&&cells.some(x=>/^(value|date|time|timestamp|observation)$/i.test(x)))continue;
   const last=cells.at(-1);if(last===""||!Number.isFinite(Number(last)))throw Error("Invalid number on line "+(i+1));
   values.push(Number(last));
 }
 if(values.length<5||values.length>1200)throw Error("Please enter between 5 and 1,200 values.");
 return values;
}
export function sample(){
 let seed=121;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296-.5};
 return Array.from({length:230},(_,i)=>(i<58?0:i<118?2.7:i<177?-1.4:1.15)+.12*Math.sin(i*.3)+rand()*.75);
}
export function peaks(prob,threshold=.25){
 let out=[];
 for(let i=2;i<prob.length-2;i++)if(prob[i]>=threshold&&prob[i]>prob[i-1]&&prob[i]>=prob[i+1]&&!out.some(j=>i-j<8))out.push(i);
 return out;
}
