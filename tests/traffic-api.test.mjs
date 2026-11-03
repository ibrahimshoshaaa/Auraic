import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as next from 'next/server.js';
import * as crypto from 'node:crypto';
import * as traffic from '../src/lib/storefront/traffic.ts';
function route({limit=1,broken=false}={}) {
 const records=[];
 const db={storefrontRateLimit:{upsert:async()=>({count:limit}),deleteMany:async()=>({count:0})},storeVisit:{createMany:async({data})=>{if(broken)throw Error('offline');records.push(...data);},deleteMany:async()=>({count:0})}};
 const context=vm.createContext({exports:{},process:{env:{AUTH_SECRET:'test'}},console:{error(){}},URL,TextDecoder,Date,require: name=>name==='next/server'?next:name==='node:crypto'?crypto:name==='@/lib/db'?{db}:name==='@/services/storefront/catalog'?{getPublicShop:async()=>({id:'server-store'})}:name==='@/lib/storefront/traffic'?traffic:undefined});
 vm.runInContext(ts.transpileModule(readFileSync('src/app/api/storefront/traffic/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
 return {post:context.exports.POST,records};
}
function request(body,headers={}) {return new next.NextRequest('https://shop.example/api/storefront/traffic',{method:'POST',headers:{host:'shop.example',origin:'https://shop.example','user-agent':'test browser',...headers},body:typeof body==='string'?body:JSON.stringify(body)});}
const valid=()=>({id:crypto.randomUUID(),session:crypto.randomUUID(),path:'/products'});
test('traffic endpoint binds records to server store and rejects origin, private paths, malformed and oversized inputs',async()=>{
 const {post,records}=route();
 assert.equal((await post(request({...valid(),storeId:'attacker-store'}))).status,204);assert.equal(records[0].storeId,'server-store');assert.equal(Object.keys(records[0]).length,4);
 assert.equal((await post(request(valid(),{origin:'https://evil.example'}))).status,403);
 assert.equal((await post(request({...valid(),path:'/dashboard'}))).status,422);
 assert.equal((await post(request({...valid(),path:'/products?email=secret'}))).status,422);
 assert.equal((await post(request('{broken'))).status,422);
 assert.equal((await post(request('x'.repeat(1025)))).status,413);
 assert.equal((await post(request(valid(),{'user-agent':'ExampleBot'}))).status,204);assert.equal(records.length,1);
});
test('rate limits and database failures return controlled responses',async()=>{
 assert.equal((await route({limit:61}).post(request(valid()))).status,429);
 assert.equal((await route({broken:true}).post(request(valid()))).status,503);
});
