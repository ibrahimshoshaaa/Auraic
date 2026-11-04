import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const compile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const c={exports:{}};vm.runInNewContext(compile('src/lib/customers.ts'),c);const h={exports:{},require:()=>c.exports};vm.runInNewContext(compile('src/lib/return-history.ts'),h);const {matchReturnedOrders}=h.exports;
const row=(id,phone,date)=>({id,customerPhone:phone,occurredAt:new Date(date),orderNumber:id,currency:'EGP',total:100});
test('warning matches local, international and Arabic phones, excludes current and newer orders',()=>{
 const current=row('current','٠١٠١٢٣٤٥٦٧٨','2026-11-03');const history=[row('old','+20 1012345678','2026-10-03'),row('current','01012345678','2026-10-01'),row('future','01012345678','2026-11-04'),row('other','01112345678','2026-10-01')];
 assert.equal(matchReturnedOrders(current,history).length,1);assert.equal(matchReturnedOrders(current,history)[0].id,'old');assert.equal(matchReturnedOrders({...current,customerPhone:null},history).length,0);
});
test('service binds returned lookup and target existence to signed-in store',async()=>{
 const calls=[];const target=row('new','01012345678','2026-11-03');const ctx={exports:{},Date,Map,require:n=>n==='@/lib/db'?{db:{order:{findFirst:async args=>{calls.push(args);return target;},findMany:async args=>{calls.push(args);return [row('old','201012345678','2026-10-03')];}}}}:n==='@/lib/customers'?c.exports:h.exports};
 vm.runInNewContext(compile('src/services/return-history.service.ts'),ctx);const results=await ctx.exports.getReturnWarnings('own',[target]);assert.equal(results.get('new').count,1);assert.equal(calls[0].where.storeId,'own');assert.equal(calls[0].where.manualStatus,'RETURNED');
 calls.length=0;assert.equal((await ctx.exports.getOrderReturnHistory('own','new')).length,1);assert.equal(calls[0].where.storeId,'own');assert.equal(calls[0].where.id,'new');assert.equal(calls[1].where.storeId,'own');
});
