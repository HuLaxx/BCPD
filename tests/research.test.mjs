import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyCloses,logReturns,variance,matchPeaks,parseMarketCSV} from '../site/research.mjs';
import {normalizeYahoo,normalizeCoinGecko} from '../api/markets.js';
test('stocks and crypto use the same week ends without filling missing days',()=>{
 const rows=[{date:'2026-09-10',close:100},{date:'2026-09-11',close:110},{date:'2026-09-12',close:120},{date:'2026-09-14',close:130}];
 const x=weeklyCloses(rows);assert.equal(x.length,2);assert.equal(x[0].close,120);assert.equal(x[0].weekEnd,'2026-09-12');
 assert.equal(logReturns(x).length,1);
});
test('Yahoo chart supports adjusted close and rejects bad inputs',()=>{
 const times=Array.from({length:12},(_,i)=>1700000000+i*86400);
 const r={chart:{result:[{timestamp:times,indicators:{quote:[{close:times.map((_,i)=>i+2)}],adjclose:[{adjclose:times.map((_,i)=>i+1)}]}}]}};
 assert.equal(normalizeYahoo(r).length,12);
 assert.equal(normalizeYahoo(r)[0].close,1);
 assert.throws(()=>normalizeYahoo({chart:{result:[]}}),/no price/);
});
test('CoinGecko values normalize into calendar days',()=>{
 const data={prices:Array.from({length:11},(_,i)=>[Date.UTC(2026,0,1+i),100+i])};
 assert.equal(normalizeCoinGecko(data).length,11);
});
test('variance finite and consensus requires model agreement',()=>{
 assert.ok(variance([0,1,2])>0);
 const grouped=matchPeaks([[{index:20}],[{index:21}],[{index:40}]]);
 assert.equal(grouped[0].support,2);assert.equal(grouped[0].share,2/3);
});

test('CSV market import validates headers, prices and dates',()=>{
 const input='date,close\n'+Array.from({length:24},(_,i)=>'2026-01-'+String(i+1).padStart(2,'0')+','+(100+i)).join('\n');
 assert.equal(parseMarketCSV(input).length,24);
 assert.throws(()=>parseMarketCSV(input.replace('2026-01-09','2026-02-31')),/calendar date/);
 assert.throws(()=>parseMarketCSV(input.replace('close','volume')),/headers/);
});
