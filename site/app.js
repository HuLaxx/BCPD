import {detect,parseSeries,sample,peaks} from "./bocpd.mjs";
const $=s=>document.getElementById(s);
let values=[],result=null;
const plot=(id,values,min,max,points=[],color="#9ee1c8",height=310)=>{
 const W=860,H=height,pad=47,X=i=>pad+i/Math.max(1,values.length-1)*(W-pad-16),Y=v=>12+(max-v)/Math.max(.001,max-min)*(H-48);
 let chunks=[];
 for(let i=0;i<5;i++){const v=min+(max-min)*i/4,y=Y(v);chunks.push('<line x1="48" x2="844" y1="'+y+'" y2="'+y+'" stroke="#4a6970" stroke-opacity=".35"/><text x="43" y="'+(y+4)+'" text-anchor="end" fill="#91afa9" font-size="12" font-family="monospace">'+v.toFixed(1)+'</text>')}
 for(let i of points){const x=X(i);chunks.push('<rect x="'+(x-7)+'" y="12" width="14" height="'+(H-60)+'" fill="#ecc28c" opacity=".14"/><line x1="'+x+'" x2="'+x+'" y1="12" y2="'+(H-36)+'" stroke="#efc48c" stroke-width="2" stroke-dasharray="5 6"/>')}
 chunks.push('<path fill="none" stroke="'+color+'" stroke-width="2.7" stroke-linejoin="round" d="'+values.map((v,i)=>(i?"L":"M")+X(i).toFixed(2)+" "+Y(v).toFixed(2)).join(" ")+'"/>');
 [0,Math.floor(values.length/2),values.length-1].forEach(i=>chunks.push('<text x="'+X(i)+'" y="'+(H-11)+'" text-anchor="middle" fill="#91afa9" font-size="12" font-family="monospace">'+(i+1)+'</text>'));
 $(id).innerHTML=chunks.join("");
};
function renderHeat(posterior){
 const rows=posterior.slice(-45),H=225,W=860,cellW=800/rows.length,cellH=178/65,shapes=[];
 rows.forEach((row,i)=>{const m=new Map(row.map(s=>[s.r,s.p]));for(let run=0;run<65;run++){const p=m.get(run)||0;if(p<.0001)continue;shapes.push('<rect x="'+(39+i*cellW)+'" y="'+(8+(64-run)*cellH)+'" width="'+(cellW+.4)+'" height="'+(cellH+.4)+'" fill="#a1ead1" opacity="'+Math.min(.95,Math.max(.05,Math.sqrt(p))).toFixed(3)+'"/>')}});
 shapes.push('<text x="41" y="209" fill="#9abfba" font-family="monospace" font-size="11">PAST → MOST RECENT</text><text x="826" y="16" fill="#9abfba" text-anchor="end" font-family="monospace" font-size="10">RUN LENGTH ↑</text>');
 $("heat").innerHTML=shapes.join("");
}
function run(){
 try{
 values=parseSeries($("data").value);
 result=detect(values,{hazard:+$("hazard").value,variance:+$("noise").value});
 const selected=peaks(result.probabilities,+$("cutoff").value/100);
 const low=Math.min(...values),high=Math.max(...values),offset=Math.max(.4,(high-low)*.1);
 plot("signal",values,low-offset,high+offset,selected);
 plot("prob",result.probabilities,0,1,[],"#e8b88d",175);
 renderHeat(result.posterior);
 $("n").textContent=values.length;$("p").textContent=selected.length;$("max").textContent=(100*Math.max(...result.probabilities)).toFixed(1)+"%";
 $("note").textContent="Constant hazard / expected length "+$("hazard").value+" · Gaussian noise variance "+$("noise").value+" · peaks above "+$("cutoff").value+"%. Posterior assumptions matter.";
 $("error").textContent="";
 }catch(e){$("error").textContent=e.message;result=null;}
}
function seed(){values=sample();$("data").value="value\n"+values.map(x=>x.toFixed(4)).join("\n");run()}
$("run").onclick=run;$("demo").onclick=seed;
for(const [id,disp,format] of [["hazard","hv",x=>x],["noise","nv",x=>(+x).toFixed(2)],["cutoff","cv",x=>x+"%"]])$(id).addEventListener("input",e=>$(disp).textContent=format(e.target.value));
$("upload").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;if(file.size>300000){$("error").textContent="File must be below 300 KB";return;}try{$("data").value=await file.text();run()}catch(err){$("error").textContent=err.message}e.target.value=""});
$("download").onclick=()=>{if(!result)return;const rows=["observation,value,change_probability,expected_run_length"];values.forEach((v,i)=>rows.push([i+1,v,result.probabilities[i].toFixed(6),result.runLengths[i].toFixed(3)].join(",")));const b=new Blob([rows.join("\n")],{type:"text/csv"}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download="bcpd-analysis.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),800)};
seed();
