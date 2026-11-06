/** Historical market normalization and cross-market comparison, no fetching. */
export function weeklyCloses(points){
  if(!Array.isArray(points))throw Error('Price series required');
  const groups=new Map();
  for(const p of points){
    if(!/^\d{4}-\d\d-\d\d$/.test(p.date)||!(p.close>0))continue;
    const d=new Date(p.date+'T00:00:00Z');
    // Saturday is the canonical week end. All instruments use the final observed
    // close during that same UTC Sunday–Saturday week; never forward-fill weekends.
    const gap=(6-d.getUTCDay()+7)%7;d.setUTCDate(d.getUTCDate()+gap);
    const key=d.toISOString().slice(0,10);
    if(!groups.has(key)||p.date>groups.get(key).date)groups.set(key,p);
  }
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([weekEnd,p])=>({weekEnd,date:p.date,close:p.close}));
}
export function logReturns(points){
 const out=[];
 for(let i=1;i<points.length;i++){
   if(!(points[i-1].close>0&&points[i].close>0))continue;
   out.push({date:points[i].weekEnd||points[i].date,return:100*Math.log(points[i].close/points[i-1].close),close:points[i].close});
 }
 return out;
}
export function variance(values){
 const mean=values.reduce((s,x)=>s+x,0)/values.length;
 return Math.max(.0001,values.reduce((s,x)=>s+(x-mean)**2,0)/Math.max(1,values.length-1));
}
export function matchPeaks(sets,tolerance=2){
 const all=sets.flatMap((ps,i)=>ps.map(p=>({index:p.index||p,model:i}))).sort((a,b)=>a.index-b.index);
 const groups=[];
 for(const item of all){
   let group=groups.find(g=>Math.abs(g.center-item.index)<=tolerance && !g.models.has(item.model));
   if(!group){group={center:item.index,items:[],models:new Set()};groups.push(group)}
   group.items.push(item);group.models.add(item.model);
   group.center=group.items.reduce((s,p)=>s+p.index,0)/group.items.length;
 }
 return groups.map(g=>({index:Math.round(g.center),support:g.models.size,total:sets.length,share:g.models.size/sets.length}))
   .sort((a,b)=>b.share-a.share||a.index-b.index);
}
export function alignAcrossMarkets(seriesById){
 const dates=[...new Set(Object.values(seriesById).flatMap(rows=>rows.map(x=>x.date)))].sort();
 return dates.map(date=>({date,markets:Object.fromEntries(Object.entries(seriesById).map(([id,rows])=>[id,rows.find(r=>r.date===date)?.return??null]))}));
}

/** A reproducible local fallback for a chosen asset. Never pretends to be live data. */
export function parseMarketCSV(text){
 const lines=String(text).replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
 if(lines.length<11 || lines.length>15000)throw Error('A price CSV needs at least 10 rows (maximum 14,999).');
 const separator=lines[0].includes('\t')?'\t':lines[0].includes(';')?';':',';
 const headers=lines[0].split(separator).map(s=>s.trim().toLowerCase().replace(/^"|"$/g,''));
 const dateIndex=headers.findIndex(h=>['date','timestamp','day'].includes(h));
 const priceIndex=headers.findIndex(h=>['close','adj close','adj_close','adjusted close','price'].includes(h));
 if(dateIndex<0||priceIndex<0)throw Error('CSV headers must include date and close (or adj close).');
 const dates=new Map();
 for(let i=1;i<lines.length;i++){
  const cols=lines[i].split(separator).map(s=>s.trim().replace(/^"|"$/g,''));
  const date=cols[dateIndex], close=Number(cols[priceIndex]);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(close)||close<=0)throw Error('Invalid date/positive closing price at CSV row '+(i+1));
  const dateObject=new Date(date+'T00:00:00Z');
  if(!Number.isFinite(dateObject.getTime())||dateObject.toISOString().slice(0,10)!==date)throw Error('Invalid calendar date at row '+(i+1));
  dates.set(date,{date,close});
 }
 const rows=[...dates.values()].sort((a,b)=>a.date.localeCompare(b.date));
 if(rows.length<10)throw Error('At least 10 distinct dated prices required.');
 return rows;
}
