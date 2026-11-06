import {detect,peaks} from './bocpd.mjs';
import {weeklyCloses,logReturns,variance,matchPeaks,parseMarketCSV} from './research.mjs';
const $=id=>document.getElementById(id);
const assets=[
{id:'us',label:'S&P 500',country:'United States',kind:'index'},
{id:'uk',label:'FTSE 100',country:'United Kingdom',kind:'index'},
{id:'de',label:'DAX',country:'Germany',kind:'index'},
{id:'fr',label:'CAC 40',country:'France',kind:'index'},
{id:'jp',label:'Nikkei 225',country:'Japan',kind:'index'},
{id:'hk',label:'Hang Seng',country:'Hong Kong',kind:'index'},
{id:'in',label:'Nifty 50',country:'India',kind:'index'},
{id:'au',label:'ASX 200',country:'Australia',kind:'index'},
{id:'ca',label:'TSX Composite',country:'Canada',kind:'index'},
{id:'btc',label:'Bitcoin',country:'Crypto',kind:'crypto'},
{id:'eth',label:'Ethereum',country:'Crypto',kind:'crypto'},
{id:'xrp',label:'XRP',country:'Crypto',kind:'crypto'},
{id:'bnb',label:'BNB',country:'Crypto',kind:'crypto'},
{id:'sol',label:'Solana',country:'Crypto',kind:'crypto'}];
const COLORS=['#c1ead0','#f2bc95','#a7c7ee','#dbb8ef','#ebd68c'];
let study=[];const localOverrides=new Map();let selected=new Set(['us','uk','jp','btc','eth']);
for(const kind of ['index','crypto']){
 const box=$(kind==='index'?'indexList':'cryptoList');
 for(const a of assets.filter(x=>x.kind===kind)){
  const label=document.createElement('label');label.className='asset';
  label.innerHTML=`<input type="checkbox" value="${a.id}" ${selected.has(a.id)?'checked':''}><span>${a.label}</span><small>${a.country}</small>`;
  label.querySelector('input').addEventListener('change',e=>{
   if(e.target.checked&&selected.size>=14){e.target.checked=false;$('error').textContent='Choose up to 14 markets per comparison.';return}
   if(e.target.checked)selected.add(a.id);else selected.delete(a.id);$('error').textContent='';
  });box.append(label);
 }
}
function refreshSelection(){document.querySelectorAll('.asset input').forEach(x=>{x.checked=selected.has(x.value)})}
$('allIndices').addEventListener('click',()=>{for(const a of assets.filter(a=>a.kind==='index'))selected.add(a.id);refreshSelection()});
$('allCrypto').addEventListener('click',()=>{for(const a of assets.filter(a=>a.kind==='crypto'))selected.add(a.id);refreshSelection()});
$('clearSelection').addEventListener('click',()=>{selected.clear();refreshSelection()});
for(const [input,label,formatter] of [['hazard','hazardLabel',v=>v],['threshold','thresholdLabel',v=>v+'%']])$(input).addEventListener('input',e=>$(label).textContent=formatter(e.target.value));
const fmt=x=>Number(x).toFixed(2);
function spark(rows,peaks,accent){
 const W=840,H=150,pad=25,vals=rows.map(x=>x.return),mn=Math.min(...vals),mx=Math.max(...vals),d=(mx-mn)||1;
 const X=i=>pad+(i/Math.max(1,rows.length-1))*(W-2*pad),Y=v=>14+((mx-v)/d)*(H-30);
 let markup='';
 for(const p of peaks){const i=p.index;if(i<0||i>=rows.length)continue;markup+=`<line x1="${X(i)}" x2="${X(i)}" y1="10" y2="${H-10}" stroke="#f2b990" stroke-dasharray="4 5" opacity=".8"/>`}
 markup+=`<line x1="${pad}" y1="${Y(0)}" x2="${W-pad}" y2="${Y(0)}" stroke="#708a89" opacity=".5" stroke-dasharray="4 6"/>`;
 markup+=`<polyline fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${rows.map((x,i)=>X(i).toFixed(1)+','+Y(x.return).toFixed(1)).join(' ')}"/>`;
 return markup+`<text x="28" y="143" fill="#92b4ad" font-family="monospace" font-size="11">${rows[0]?.date}</text><text x="811" y="143" text-anchor="end" fill="#92b4ad" font-family="monospace" font-size="11">${rows.at(-1)?.date}</text>`;
}
function modelStudy(rows,hazard,threshold){
 const vals=rows.map(x=>x.return),v=variance(vals),scales=[.65,1,1.5],hazards=[.6,1,1.6];
 const models=[];
 for(const h of hazards)for(const scale of scales){
  const d=detect(vals,{hazard:Math.max(3,Math.round(hazard*h)),variance:Math.max(.001,v*scale),priorVariance:Math.max(.01,v*7),limit:140});
  models.push(peaks(d.probabilities,threshold).map(index=>({index,probability:d.probabilities[index]})));
 }
 const grouped=matchPeaks(models,2).filter(x=>x.share>=4/9).slice(0,10);
 return {grouped,models,v,baseline:detect(vals,{hazard,variance:v,priorVariance:v*7,limit:140})};
}
async function fetchOne(asset,range){
 const local=localOverrides.get(asset.id);
 if(local){const returns=logReturns(weeklyCloses(local));if(returns.length<20)throw Error('The imported CSV must span at least 21 distinct weekly closing prices.');return {asset,returns,source:'User-imported local CSV',accessedAt:new Date().toISOString(),latest:local.at(-1).date,range:'user-upload'};}
 const resp=await fetch(`/api/markets?asset=${encodeURIComponent(asset.id)}&range=${encodeURIComponent(range)}`,{cache:'default'});
 const data=await resp.json();if(!resp.ok)throw Error(data.error||'Historical series unavailable');
 const weekly=weeklyCloses(data.points),returns=logReturns(weekly);
 if(returns.length<20)throw Error('Fewer than 20 weekly returns available');
 return {asset:data.asset,returns,source:data.source,accessedAt:data.accessedAt,latest:data.points.at(-1)?.date,range};
}
async function analyze(){
 const chosen=[...selected],range=$('range').value,hazard=Number($('hazard').value),threshold=Number($('threshold').value)/100;
 if(chosen.length<1){$('error').textContent='Select at least one market.';return}
 $('error').textContent='';$('analyze').disabled=true;$('download').disabled=true;study=[];
 $('status').textContent='Requesting historical series and provenance for '+chosen.length+' selected markets…';
 $('plots').innerHTML='';$('consensus').innerHTML='';$('alignment').innerHTML='';
 const results=await Promise.all(chosen.map(async id=>{
  const a=assets.find(x=>x.id===id);
  try{const payload=await fetchOne(a,range);return {...payload,analysis:modelStudy(payload.returns,hazard,threshold)}}
  catch(e){return {asset:a,error:e.message}}
 }));
 study=results.filter(x=>!x.error);
 const failures=results.filter(x=>x.error);
 $('status').textContent=`Loaded ${study.length}/${chosen.length} historical series.`+(failures.length?' Unavailable: '+failures.map(x=>x.asset.label+' ('+x.error+')').join('; '):' All sources attributed in the results.');
 $('count').textContent=study.length;$('weeks').textContent=study.length?Math.max(...study.map(x=>x.returns.length)):'—';
 for(const [i,r] of study.entries()){
  const card=document.createElement('article');card.className='market-card';
  const annotations=r.analysis.grouped.filter(x=>x.share>=2/3);
  card.innerHTML=`<div class="market-card-header"><h3>${r.asset.label} <span class="tags">${r.asset.country}</span></h3><span class="tags">${r.returns.length} weekly returns · ${annotations.length} robust peak(s)</span></div><svg viewBox="0 0 840 150" role="img" aria-label="Weekly return series for ${r.asset.label}">${spark(r.returns,annotations,COLORS[i%COLORS.length])}</svg><div class="market-card-foot"><span>${r.source}</span><span>Latest observed close: ${r.latest}; retrieved ${r.accessedAt.slice(0,10)}</span></div>`;
  $('plots').append(card);
 }
 if(!study.length){$('plots').innerHTML='<p class="subtle">No historical feeds were available. The single-series CSV lab remains usable even if market APIs are rate-limited.</p>';}
 const table=document.createElement('table');table.innerHTML='<thead><tr><th>MARKET</th><th>STRONGEST PEAK WEEK</th><th>PARAMETER AGREEMENT</th><th>OTHER CONSENSUS WEEKS</th></tr></thead>';
 const tbody=document.createElement('tbody');
 for(const r of study){const peaks=r.analysis.grouped,top=peaks[0];const row=document.createElement('tr');
 const cells=[r.asset.label,top?r.returns[top.index]?.date||'—':'No candidate',top?`${top.support}/${top.total} model settings`:'—',peaks.slice(1,4).map(x=>r.returns[x.index]?.date||'—').join(' · ')||'—'];
 for(const c of cells){const td=document.createElement('td');td.textContent=c;row.append(td)}tbody.append(row);
 }table.append(tbody);$('consensus').append(table);
 const stable=new Map();for(const r of study){for(const p of r.analysis.grouped.filter(x=>x.share>=2/3)){
 const date=r.returns[p.index]?.date;if(!date)continue;
 if(!stable.has(date))stable.set(date,[]);stable.get(date).push(r.asset.label);
 }}
 const cross=[...stable.entries()].filter(x=>x[1].length>1).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).slice(0,12);
 const align=document.createElement('table');align.innerHTML='<thead><tr><th>WEEK ENDING</th><th>ROBUST PEAKS IN MARKET COHORT</th><th>OVERLAP</th></tr></thead>';const ab=document.createElement('tbody');
 for(const [date,names] of cross){const tr=document.createElement('tr');for(const c of [date,names.join(' · '),names.length+'/'+study.length]){const td=document.createElement('td');td.textContent=c;tr.append(td)}ab.append(tr)}align.append(ab);
 $('alignment').append(cross.length?align:document.createTextNode('No same-week robust change-point candidates in the selected series. That is also a valid result.'));
 $('download').disabled=!study.length;$('analyze').disabled=false;
}
$('importAsset').innerHTML=assets.map(a=>'<option value="'+a.id+'">'+a.label+' · '+a.country+'</option>').join('');
$('marketCsv').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 if(f.size>2000000){$('error').textContent='Market CSV must be smaller than 2 MB.';return;}
 try{const asset=$('importAsset').value,rows=parseMarketCSV(await f.text());localOverrides.set(asset,rows);selected.add(asset);
 document.querySelectorAll('.asset input').forEach(x=>{x.checked=selected.has(x.value)});
 $('error').textContent='Imported '+rows.length+' dated prices for '+assets.find(x=>x.id===asset).label+'. This local CSV now takes priority over online data for that asset. Re-run analysis.';
 }catch(err){$('error').textContent=err.message;}finally{e.target.value='';}
});
$('clearCsv').addEventListener('click',()=>{localOverrides.delete($('importAsset').value);$('error').textContent='Cleared imported price data for selected market. Online source will be used on the next run.';});
$('analyze').addEventListener('click',analyze);
$('download').addEventListener('click',()=>{
 if(!study.length)return;const lines=['asset,country,week_end,weekly_log_return_pct,change_probability,source,retrieved_utc'];
 for(const s of study)for(const [i,row] of s.returns.entries()){
  const vals=[s.asset.label,s.asset.country,row.date,row.return.toFixed(6),s.analysis.baseline.probabilities[i].toFixed(7),s.source,s.accessedAt];
  lines.push(vals.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','));
 }
 const blob=new Blob([lines.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bcpd-msc-market-study.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),700);
});
