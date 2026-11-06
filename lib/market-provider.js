// Research-grade provenance wrapper over Yahoo Finance's *unofficial* chart data.
// Whitelist only. This is intentionally not a free-form Yahoo scraping proxy.
export const ASSETS = Object.freeze([
  {id:'us',symbol:'^GSPC',label:'S&P 500',country:'United States',kind:'index'},
  {id:'uk',symbol:'^FTSE',label:'FTSE 100',country:'United Kingdom',kind:'index'},
  {id:'de',symbol:'^GDAXI',label:'DAX',country:'Germany',kind:'index'},
  {id:'fr',symbol:'^FCHI',label:'CAC 40',country:'France',kind:'index'},
  {id:'jp',symbol:'^N225',label:'Nikkei 225',country:'Japan',kind:'index'},
  {id:'hk',symbol:'^HSI',label:'Hang Seng',country:'Hong Kong',kind:'index'},
  {id:'in',symbol:'^NSEI',label:'Nifty 50',country:'India',kind:'index'},
  {id:'au',symbol:'^AXJO',label:'ASX 200',country:'Australia',kind:'index'},
  {id:'ca',symbol:'^GSPTSE',label:'S&P/TSX Composite',country:'Canada',kind:'index'},
  {id:'btc',symbol:'BTC-USD',label:'Bitcoin',country:'Crypto',kind:'crypto',coin:'bitcoin'},
  {id:'eth',symbol:'ETH-USD',label:'Ethereum',country:'Crypto',kind:'crypto',coin:'ethereum'},
  {id:'xrp',symbol:'XRP-USD',label:'XRP',country:'Crypto',kind:'crypto',coin:'ripple'},
  {id:'bnb',symbol:'BNB-USD',label:'BNB',country:'Crypto',kind:'crypto',coin:'binancecoin'},
  {id:'sol',symbol:'SOL-USD',label:'Solana',country:'Crypto',kind:'crypto',coin:'solana'}
]);
export const ALLOWED_RANGES=['1y','2y','5y'];
export function normalizeYahoo(result,symbol){
  const series=result?.chart?.result?.[0];
  if(!series?.timestamp || !series.indicators?.quote?.[0])throw Error('Data provider returned no price history');
  const price=series.indicators.adjclose?.[0]?.adjclose || series.indicators.quote[0].close;
  const out=[];
  for(let i=0;i<series.timestamp.length;i++){
    const close=Number(price?.[i]);
    if(!Number.isFinite(close)||close<=0)continue;
    const date=new Date(series.timestamp[i]*1000).toISOString().slice(0,10);
    if(out.at(-1)?.date===date)out[out.length-1]={date,close};else out.push({date,close});
  }
  if(out.length<10)throw Error('Insufficient positive historical prices');
  return out;
}
export function normalizeCoinGecko(result){
  const out=[];
  for(const [ms,price] of (result?.prices||[])){
    const close=Number(price);if(!Number.isFinite(close)||close<=0)continue;
    const date=new Date(ms).toISOString().slice(0,10);
    if(out.at(-1)?.date===date)out[out.length-1]={date,close};else out.push({date,close});
  }
  if(out.length<10)throw Error('Insufficient crypto price history');
  return out;
}
async function getJSON(url,{headers={},timeout=7000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const r=await fetch(url,{headers:{Accept:'application/json',...headers},signal:controller.signal});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  return await r.json();
 }finally{clearTimeout(timer)}
}
export async function getHistory(asset,range='2y'){
 const interval=range==='5y'?'1wk':'1d';
 const endpoint=`/v8/finance/chart/${encodeURIComponent(asset.symbol)}?interval=${interval}&range=${range}&includeAdjustedClose=true`;
 let reason='unknown';
 for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
   try{
     const data=await getJSON('https://'+host+endpoint,{timeout:6500,headers:{'User-Agent':'BCPD-Research-Portfolio/1.0 (historical analysis)'}});
     return {points:normalizeYahoo(data,asset.symbol),source:'Yahoo Finance (unofficial chart data)',interval,range,accessedAt:new Date().toISOString()};
   }catch(e){reason=e.message}
 }
 // Optional, not universal, fallback for crypto in 1-year window only.
 const key=process.env.COINGECKO_DEMO_API_KEY;
 if(asset.coin&&key&&range==='1y'){
  try{
   const data=await getJSON(`https://api.coingecko.com/api/v3/coins/${asset.coin}/market_chart?vs_currency=usd&days=365`,{headers:{'x-cg-demo-api-key':key},timeout:7000});
   return {points:normalizeCoinGecko(data),source:'CoinGecko Demo API',interval:'1d',range,accessedAt:new Date().toISOString()};
  }catch(e){reason=reason+'; crypto fallback: '+e.message}
 }
 throw Error('Historical data temporarily unavailable: '+reason+'. Try again later or import your own CSV in the lab.');
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const id=String(req.query?.asset||''),range=String(req.query?.range||'2y');
 const asset=ASSETS.find(x=>x.id===id);
 if(!asset||!ALLOWED_RANGES.includes(range))return res.status(400).json({error:'Choose a valid asset and one of 1y / 2y / 5y'});
 try{
  const history=await getHistory(asset,range);
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=43200');
  return res.status(200).json({asset, ...history, notes:[
   'Indicative research data, not a licensed trading feed.',
   'Five cryptocurrencies are a fixed study cohort, not a live market-cap ranking.',
   'Stock indices trade on exchange calendars; cryptocurrencies trade every day.'
  ]});
 }catch(e){res.setHeader('Cache-Control','no-store');return res.status(503).json({error:e.message,asset:id});}
}
