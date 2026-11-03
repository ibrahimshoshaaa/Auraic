import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as helpers from '../src/lib/storefront/traffic-report.ts';
function load(db) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/services/storefront/traffic-report.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,require:name=>name==='@/lib/db'?{db}:helpers});
 return exports;
}
test('report scopes every query and product lookup, preserves session semantics and resolves product names', async () => {
 const queries=[];const now=new Date('2026-11-03T13:15:00Z');let productWhere;
 const responses=[
 [{views:9n,visits:4n,previousViews:2n,previousVisits:1n,active:2n,singlePage:2n,products:3n,cart:1n,checkout:1n,lastVisit:now,collectionStarted:now}],
 [{bucket:'2026-11-03',visits:4n,views:9n}],
 [{path:'/products/p1',views:6n,visits:3n,lastSeen:now},{path:'/checkout',views:3n,visits:1n,lastSeen:now}],
 ];
 const db={$queryRaw:(parts,...values)=>{queries.push({sql:parts.join('?'),values});return Promise.resolve(responses[queries.length-1]);},product:{findMany:async args=>{productWhere=args.where;return [{id:'p1',title:'No.4'}]}}};
 const result=await load(db).getTrafficReport('store-A',7,now);
 assert.equal(queries.length,3);
 for(const query of queries){assert.ok(query.values.includes('store-A'));assert.match(query.sql,/"storeId" = \?/);assert.match(query.sql,/"createdAt" >= \?/);assert.match(query.sql,/"createdAt" < \?/);}
 assert.deepEqual(JSON.parse(JSON.stringify(productWhere)),{storeId:'store-A',id:{in:['p1']}});
 assert.equal(result.views,9);assert.equal(result.visits,4);assert.equal(result.averageDepth,2.25);assert.equal(result.checkoutShare,25);assert.equal(result.singlePage,2);assert.equal(result.active,2);
 assert.equal(result.comparable,false);assert.equal(result.pages[0].label,'No.4');assert.equal(result.pages[1].label,'إتمام الطلب');assert.equal(result.pages[0].share,66.7);
 assert.equal(result.points.reduce((n,p)=>n+p.views,0),9);assert.equal(result.peak.key,'2026-11-03');
});
test('unavailable persistence rejects instead of fabricating zero traffic', async()=>{
 const db={$queryRaw:()=>Promise.reject(new Error('offline'))};
 await assert.rejects(()=>load(db).getTrafficReport('store-A',7),/offline/);
});
