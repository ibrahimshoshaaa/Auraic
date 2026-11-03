import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function runtime() {
 const scripts = [], saved = new Map();
 const context = vm.createContext({ window: {}, document: { getElementById: id => scripts.find(x => x.id === id), createElement: () => ({}), head: { appendChild: x => scripts.push(x) } }, sessionStorage: { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v) }, exports: {}, console });
 vm.runInContext(ts.transpileModule(readFileSync('src/lib/storefront/tracking.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
 return { context, scripts, api: context.exports };
}
test('consent gates SDKs and events, initialization occurs once, events target configured pixels', () => {
 const { api, context, scripts } = runtime();
 api.trackShopEvent('AddToCart', { items: [{ id:'variant1', quantity:1, price:20 }] }); assert.equal(scripts.length,0);
 api.enableMarketing('1234567890','C1234567890123456789'); api.enableMarketing('1234567890','C1234567890123456789'); assert.equal(scripts.length,2);
 api.trackPageView(); const meta = context.window.fbq.queue; const tt = context.window.ttq._i.C1234567890123456789;
 assert.equal(meta.filter(x => x[0]==='init').length,1); assert.equal(meta.filter(x => x[2]==='PageView').length,1); assert.equal(tt.filter(x => x[0]==='page').length,1);
 const data = { items:[{id:'variant1',quantity:2,price:20}], value:35, orderId:'order1' };
 api.trackShopEvent('Purchase',data); api.trackShopEvent('Purchase',data);
 const purchases = meta.filter(x => x[2]==='Purchase'); assert.equal(purchases.length,1); assert.equal(purchases[0][3].value,35); assert.equal(purchases[0][3].currency,'EGP');
 const ttp = tt.find(x => x[1]==='Purchase'); assert.equal(ttp[2].contents[0].content_id,'variant1'); assert.equal(ttp[2].contents[0].quantity,2);
 api.disableMarketing(); const count = meta.length; api.trackShopEvent('Purchase',{...data,orderId:'order2'}); api.trackPageView(); assert.equal(meta.length,count);
});
test('strict effect replays do not duplicate product and checkout views; blocked providers do not break calls', () => {
 const {api,context} = runtime(); api.enableMarketing('1234567890','');
 const data={items:[{id:'v1',quantity:1,price:10}]};
 api.trackShopEvent('ViewContent',data); api.trackShopEvent('ViewContent',data);
 api.trackShopEvent('InitiateCheckout',data); api.trackShopEvent('InitiateCheckout',data);
 assert.equal(context.window.fbq.queue.filter(x=>x[2]==='ViewContent').length,1);
 assert.equal(context.window.fbq.queue.filter(x=>x[2]==='InitiateCheckout').length,1);
 context.window.fbq = () => { throw new Error('blocked'); };
 assert.doesNotThrow(()=>api.trackShopEvent('Purchase',{orderId:'o2',value:10}));
});
test('payload is an allowlist and excludes checkout contact details', () => {
 const {api}=runtime(); const p=api.pixelPayload({ value:10, email:'private@example.com', phone:'secret', items:[{id:'v1',quantity:1,price:10}] });
 assert.equal(JSON.stringify(p).includes('private'),false); assert.equal(JSON.stringify(p).includes('secret'),false);
});
