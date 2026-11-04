import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

// Real authenticated HTTP tests against a disposable local PostgreSQL database only.
const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(database.hostname));
assert.match(database.pathname,/test/i);
const db = new PrismaClient();
test('selected account permissions protect web, mobile, exports, tenant boundaries and existing sessions', {timeout:180_000}, async () => {
  const socket = createServer(); await new Promise(resolve => socket.listen(0,'127.0.0.1',resolve));
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const store = await db.store.create({data:{name:'Permission integration'}});
  const foreign = await db.store.create({data:{name:'Other tenant'}});
  const password = 'temporary-permission-test-password';
  const email = `owner-${store.id}@example.com`;
  const userEmail = `viewer-${store.id}@example.com`;
  const owner = await db.user.create({data:{storeId:store.id,name:'Owner',email,passwordHash:await hash(password,10),role:'OWNER',status:'ACTIVE'}});
  const other = await db.user.create({data:{storeId:foreign.id,email:`foreign-${foreign.id}@example.com`,role:'EMPLOYEE',status:'ACTIVE'}});
  const product = await db.product.create({data:{storeId:store.id,title:'Permission-safe product',status:'ACTIVE',variants:{create:{storeId:store.id,title:'50 ml',price:300}}},include:{variants:true}});
  const type = await db.materialType.create({data:{storeId:store.id,name:'Oil',code:'OIL'}});
  const material = await db.material.create({data:{storeId:store.id,materialTypeId:type.id,name:'Secret formula ingredient',unit:'ml',baseUnit:'ml',defaultCost:37}});
  const recipe = await db.recipe.create({data:{storeId:store.id,variantId:product.variants[0].id,name:'Secret formula',versions:{create:{storeId:store.id,version:1,isCurrent:true,items:{create:{materialId:material.id,quantity:5,unit:'ml'}}}}}});
  let output = '';
  const child = spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,AUTH_TRUST_HOST:'true',VERCEL:''},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>output+=data); child.stderr.on('data',data=>output+=data);
  const jsonHeaders = {'content-type':'application/json'};
  const login = async who => {
    const response = await fetch(`${base}/api/mobile/auth/login`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({email:who,password})});
    assert.equal(response.status,200); return (await response.json()).data.token;
  };
  const webLogin = async who => {
    const csrf = await fetch(`${base}/api/auth/csrf`); const token = (await csrf.json()).csrfToken;
    const cookie = csrf.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    const response = await fetch(`${base}/api/auth/callback/credentials`,{method:'POST',redirect:'manual',headers:{cookie,origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:who,password,csrfToken:token,callbackUrl:`${base}/dashboard`})});
    const session = response.headers.getSetCookie().map(c=>c.split(';')[0]).filter(c=>c.startsWith('authjs.session-token')).join('; ');
    assert.ok(session,`Web session missing: ${response.status}`); return session;
  };
  try {
    for(let i=0;i<70;i++){ if(child.exitCode!==null)throw Error(output);try{if((await fetch(`${base}/login`)).ok)break;}catch{}await delay(300); }
    const ownerToken = await login(email); const ownerHeaders = {...jsonHeaders,authorization:`Bearer ${ownerToken}`};
    const permissions = ['dashboard.read','products.read','reports.read','reports.export','traffic.read'];
    const created = await fetch(`${base}/api/mobile/account/users`,{method:'POST',headers:ownerHeaders,body:JSON.stringify({name:'Viewer',email:userEmail,password,currentPassword:password,permissions})});
    assert.equal(created.status,201); const user = (await created.json()).data;
    assert.equal(user.role,'EMPLOYEE'); assert.deepEqual(user.permissions,permissions);
    assert.ok(!('passwordHash' in user));
    const token = await login(userEmail); const headers = {...jsonHeaders,authorization:`Bearer ${token}`};
    const cookie = await webLogin(userEmail);
    assert.deepEqual((await (await fetch(`${base}/api/mobile/me`,{headers})).json()).data.permissions,permissions);
    for(const route of ['/api/products',`/api/products/${product.id}`,`/api/products/${product.id}/variants`]){
      const response = await fetch(base+route,{headers}); assert.equal(response.status,200,route);
      const text = await response.text(); for(const secret of ['Secret formula','defaultCost','currentRecipe','estimatedCost','estimatedMargin','"recipes"']) assert.ok(!text.includes(secret),`${route}: ${secret}`);
      assert.ok(text.includes('300'));
    }
    for(const route of ['/api/reports','/api/mobile/home']){
      const response = await fetch(base+route,{headers}); assert.equal(response.status,200); const data = (await response.json()).data;
      for(const key of ['profit','profitability','expenses','consumption','inventory','roas']) assert.ok(!(key in data),`${route}: ${key}`);
      assert.ok(!('costs' in data.returns));
    }
    for(const route of ['/api/recipes',`/api/recipes/${recipe.id}`,'/api/materials','/api/returns','/api/mobile/orders','/api/customers','/api/expenses','/api/admin/storefront','/api/admin/coupons','/api/mobile/settings','/api/payments/review','/api/mobile/notifications']) assert.equal((await fetch(base+route,{headers})).status,403,route);
    assert.equal((await fetch(`${base}/api/mobile/me`,{headers})).status,200,'Forbidden notification access must not invalidate login');
    for(const [route,method] of [['/api/orders/manual','POST'],['/api/mobile/products','POST'],[`/api/products/${product.id}`,'DELETE'],['/api/admin/storefront','PUT'],['/api/mobile/account/users','POST']]) assert.equal((await fetch(base+route,{method,headers,body:JSON.stringify({fullAccess:true,permissions:['*']})})).status,403,route);
    for(const format of ['pdf','xlsx']){
      const response = await fetch(`${base}/api/reports/export?format=${format}`,{headers}); assert.equal(response.status,200); const bytes = Buffer.from(await response.arrayBuffer());
      if(format==='pdf') assert.equal(bytes.subarray(0,4).toString(),'%PDF'); else {
        const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
        assert.ok(!workbook.worksheets.some(sheet=>['استهلاك المواد','حركة المخزون','المخزون الحالي','تفاصيل المصروفات'].includes(sheet.name)));
        assert.ok(!JSON.stringify(workbook.model).includes('هامش الربح'));
      }
    }
    for(const route of [`/dashboard/products/${product.id}`,'/dashboard/reports']){
      const response = await fetch(base+route,{headers:{cookie}}); assert.equal(response.status,200); const html = await response.text();
      for(const secret of ['Secret formula ingredient','تكلفة الوصفة:','الربح المتوقع قبل التشغيل:','ربحية تقديرية']) assert.ok(!html.includes(secret),`${route}: ${secret}`);
    }
    if (process.env.PERMISSIONS_BROWSER_TESTS === '1') {
      const { mkdir } = await import('node:fs/promises');
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({headless:true});
      try {
        const context = await browser.newContext({viewport:{width:390,height:844}});
        const ownerCookie = await webLogin(email);
        await context.addCookies(ownerCookie.split('; ').map(item=>{const index=item.indexOf('=');return {name:item.slice(0,index),value:item.slice(index+1),url:base,httpOnly:true};}));
        const page = await context.newPage(); await page.goto(`${base}/dashboard/account`);
        await page.getByRole('heading',{name:'إضافة مستخدم',exact:true}).waitFor();
        await page.getByRole('button',{name:'تعديل الصلاحيات',exact:true}).waitFor();
        const read = page.getByRole('checkbox',{name:'عرض المنتجات والأسعار',exact:true});
        const write = page.getByRole('checkbox',{name:'إضافة وتعديل المنتجات ووصفاتها',exact:true});
        const formulas = page.getByRole('checkbox',{name:'عرض الوصفات ومقادير الخامات',exact:true});
        assert.equal(await read.isChecked(),false); assert.equal(await formulas.isChecked(),false);
        await write.check(); assert.equal(await read.isChecked(),true); assert.equal(await formulas.isChecked(),true);
        await formulas.uncheck(); assert.equal(await write.isChecked(),false); assert.equal(await read.isChecked(),true);
        await mkdir('artifacts',{recursive:true});
        await page.screenshot({path:'artifacts/permissions-mobile.png',fullPage:true});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
        await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:'artifacts/permissions-desktop.png',fullPage:true});
        await context.close();
      } finally { await browser.close(); }
    }
    const update = (userId,selected) => fetch(`${base}/api/mobile/account/users`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify({userId,permissions:selected,currentPassword:password})});
    assert.equal((await update(user.id,['*'])).status,422);
    assert.equal((await update(other.id,[])).status,404);
    assert.equal((await update(owner.id,[])).status,409,'Owner self-lockout prevented');
    assert.equal((await update(user.id,[])).status,200);
    assert.equal((await fetch(`${base}/api/mobile/me`,{headers})).status,401,'Existing mobile sessions revoked');
    assert.equal((await fetch(`${base}/api/products`,{headers:{cookie}})).status,403,'Existing web session rechecks the new policy');
    const newToken = await login(userEmail);
    assert.deepEqual((await (await fetch(`${base}/api/mobile/me`,{headers:{authorization:`Bearer ${newToken}`}})).json()).data.permissions,[]);
    assert.ok(await db.user.findUnique({where:{id:other.id}}));
  } finally {
    child.kill('SIGTERM');
    await db.store.deleteMany({where:{id:{in:[store.id,foreign.id]}}}); await db.$disconnect();
  }
});
