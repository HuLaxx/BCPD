import test from "node:test";
import assert from "node:assert/strict";
import {detect,parseSeries,sample,peaks} from "../site/bocpd.mjs";
test("posterior rows are normalized",()=>{const x=detect(sample());assert.equal(x.posterior.length,230);for(const r of x.posterior)assert.ok(Math.abs(1-r.reduce((s,v)=>s+v.p,0))<1e-9)});
test("clear shift raises reset probability",()=>{const s=[...Array(40)].fill(0).concat([...Array(40)].fill(5));const p=detect(s,{variance:.15}).probabilities;assert.ok(p[40]>p[35]);assert.ok(p[40]>.5)});
test("parsing and finite input validation",()=>{assert.deepEqual(parseSeries("date,value\n1,2\n2,3\n3,4\n4,5\n5,6"),[2,3,4,5,6]);assert.throws(()=>detect([2]),/5/);assert.throws(()=>parseSeries("abc"),/Invalid/)});
test("peak extraction",()=>assert.deepEqual(peaks([0,.2,.8,.1,0,0,0,0,0,.9,0],.5),[2,9]));
