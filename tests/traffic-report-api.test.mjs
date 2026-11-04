import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as next from 'next/server.js';
function route({role='OWNER',unauthorized=false,offline=false}={}) {
 const calls=[];const context={exports:{},Date,Intl,Error,console:{error(){}},require:name=>name==='next/server'?next:name==='@/lib/auth-helpers'?{requireAuth:async()=>{if(unauthorized)throw Error('UNAUTHORIZED');return {storeId:'own-store',role};}}:name==='@/lib/rbac'?{can:actor=>['OWNER','MANAGER'].includes(actor.role)}:{getTrafficReport:async(...args)=>{calls.push(args);if(offline)throw Error('offline');return {range:{from:new Date('2026-11-01'),to:new Date('2026-11-03')},collectionStarted:null,lastVisit:null,pages:[{path:'/',lastSeen:new Date('2026-11-02')}],visits:3,views:4};}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/reports/traffic/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {get:context.exports.GET,calls};
}
const request=query=>new next.NextRequest('https://shop.example/api/reports/traffic'+query,{headers:{authorization:'Bearer fake-test-token'}});
test('traffic report API protects mobile access and binds reports to the authenticated store',async()=>{
 for(const role of ['OWNER','MANAGER']){const r=route({role});const response=await r.get(request('?days=30&storeId=foreign'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(JSON.parse(JSON.stringify(r.calls)),[['own-store','30']]);const body=await response.json();assert.equal(body.data.timeZone,'Africa/Cairo');assert.equal(body.data.display.lastVisit,null);assert.ok(body.data.pages[0].lastSeenLabel);}
 const employee=route({role:'EMPLOYEE'});assert.equal((await employee.get(request(''))).status,403);assert.equal(employee.calls.length,0);
 const signedOut=route({unauthorized:true});assert.equal((await signedOut.get(request(''))).status,401);assert.equal(signedOut.calls.length,0);
});
test('invalid periods and unavailable report return errors rather than fake analytics',async()=>{
 const r=route();for(const value of ['-1','2','abc','1%20OR%201=1'])assert.equal((await r.get(request('?days='+value))).status,422);assert.equal(r.calls.length,0);
 assert.equal((await route({offline:true}).get(request(''))).status,503);
});
