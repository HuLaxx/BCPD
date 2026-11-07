import test from "node:test";
import assert from "node:assert/strict";
import {
  isStudyConfig, makePreset, parsePresetLibrary, PRESET_STORAGE_KEY
} from "../lib/presets";
import { regimeEvidence } from "../lib/insights";
import { ASSETS } from "../lib/universe";
import type { Study } from "../lib/analysis";

const config={selected:["us","in","btc"],range:"2y" as const,hazard:32,threshold:20};
test("workspace config validation rejects unknown assets and invalid model settings",()=>{
  assert.ok(isStudyConfig(config));
  assert.equal(isStudyConfig({...config,selected:["unlisted"]}),false);
  assert.equal(isStudyConfig({...config,selected:["us","us"]}),false);
  assert.equal(isStudyConfig({...config,hazard:NaN}),false);
  assert.equal(isStudyConfig({...config,threshold:"20"}),false);
  assert.equal(isStudyConfig({...config,range:"99y"}),false);
});
test("presets are portable, bounded and deduplicated by id",()=>{
  assert.equal(typeof PRESET_STORAGE_KEY,"string");
  const item=makePreset("  Global  regime  ",config,"preset-001","2026-11-06T10:00:00Z");
  assert.equal(item.name,"Global regime");
  assert.deepEqual(parsePresetLibrary(JSON.stringify([item,item])),[item]);
  assert.deepEqual(parsePresetLibrary('{"not":"a library"}'),[]);
  assert.deepEqual(parsePresetLibrary("{bad-json"),[]);
  assert.throws(()=>makePreset("   ",config,"x","2026-11-06T10:00:00Z"),/Enter a name/);
});
test("observed regime evidence uses real before/after windows and refuses edges",()=>{
  const returns=Array.from({length:34},(_,i)=>({
    date:new Date(Date.UTC(2026,0,3+i*7)).toISOString().slice(0,10),
    close:100,
    returnPct:i<16?1:4
  }));
  const s:Study={
    asset:ASSETS[0],returns,latest:returns[33].date,source:"Test fixture",
    accessedAt:"2026-11-06T00:00:00Z",
    analysis:{sampleVariance:1,probabilities:returns.map(()=>0),consensus:[
      {index:16,support:9,total:9,share:1},
      {index:33,support:9,total:9,share:1},
      {index:3,support:9,total:9,share:1},
      {index:19,support:2,total:9,share:2/9}
    ]}
  };
  const events=regimeEvidence(s);
  assert.equal(events.length,1);
  assert.equal(events[0].beforeMeanPct,1);
  assert.equal(events[0].afterMeanPct,4);
  assert.equal(events[0].meanShiftPp,3);
  assert.equal(events[0].beforeWeeks,8);
  assert.throws(()=>regimeEvidence(s,2),/6–52/);
});
