import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function freePort() { const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }

test('public orders validate server prices, tenant, publication and recipe; retries create one unpaid order', { timeout: 180000 }, async () => {
  const shop = await db.store.create({ data: { name: 'Auraic checkout test' } });
  const other = await db.store.create({ data: { name: 'Unrelated shop' } });
  const port = await freePort(); const url = `http://127.0.0.1:${port}`;
  let child; let output = '';
  try {
    await db.setting.create({ data: { storeId: shop.id, key: 'storefront', value: JSON.stringify({ enabled: true, announcement: 'Auraic', heroTitle: 'Test', heroSubtitle: '', heroImages: [], whatsapp: '', contactEmail: 'test@example.com', shippingFee: 45, freeShippingFrom: 1000, shippingPolicy: 'Test shipping', returnPolicy: 'Test returns' }) } });
    const type = await db.materialType.create({ data: { storeId: shop.id, name: 'Oils', code: 'OIL' } });
    const material = await db.material.create({ data: { storeId: shop.id, materialTypeId: type.id, name: 'Oil', unit: 'ml', baseUnit: 'ml' } });
    const product = await db.product.create({ data: { storeId: shop.id, title: 'Public perfume', storefrontPublished: true, status: 'ACTIVE', variants: { create: { storeId: shop.id, title: '30 ml', price: 250 } } }, include: { variants: true } });
    const variant = product.variants[0];
    await db.recipe.create({ data: { storeId: shop.id, variantId: variant.id, name: 'Perfume recipe', versions: { create: { storeId: shop.id, version: 1, isCurrent: true, items: { create: { materialId: material.id, quantity: 30, unit: 'ml' } } } } } });
    const foreign = await db.product.create({ data: { storeId: other.id, title: 'Foreign perfume', storefrontPublished: true, status: 'ACTIVE', variants: { create: { storeId: other.id, title: '50 ml', price: 100 } } }, include: { variants: true } });
    child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { env: { ...process.env, NEXT_PUBLIC_APP_URL: url, STOREFRONT_ORIGIN: url, STOREFRONT_STORE_ID: shop.id }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => output += data.toString()); child.stderr.on('data', data => output += data.toString());
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) { if (child.exitCode !== null) throw new Error(output); try { const r = await fetch(url); if (r.ok) { ready = true; break; } } catch {} await delay(300); }
    assert.ok(ready, output);
    const headers = { 'content-type': 'application/json', origin: url };
    const order = { requestId: randomUUID(), expectedTotalCents: 54500, name: 'Test Customer', phone: '01012345678', governorate: 'المنوفية', address: 'Test Street, building 10', items: [{ variantId: variant.id, quantity: 2 }] };
    const post = data => fetch(`${url}/api/storefront/checkout`, { method: 'POST', headers, body: JSON.stringify(data) });
    assert.equal((await post({ ...order, expectedTotalCents: 1 })).status, 409);
    assert.equal((await post({ ...order, items: [{ variantId: foreign.variants[0].id, quantity: 1 }] })).status, 409);
    assert.equal((await fetch(`${url}/api/storefront/checkout`, { method: 'POST', headers: { ...headers, origin: 'https://foreign.example' }, body: JSON.stringify(order) })).status, 403);
    assert.equal((await fetch(`${url}/api/admin/storefront`, { method: 'PUT', headers, body: JSON.stringify({ kind: 'settings', data: {} }) })).status, 401);
    const first = await post(order); assert.equal(first.status, 201, await first.clone().text());
    const duplicate = await post(order); assert.equal(duplicate.status, 200);
    assert.deepEqual((await first.json()).data, (await duplicate.json()).data);
    const saved = await db.order.findUniqueOrThrow({ where: { id: `web_${order.requestId}` }, include: { items: true } });
    assert.equal(saved.storeId, shop.id); assert.equal(saved.manualStatus, 'NEW'); assert.equal(saved.financialStatus, 'PENDING');
    assert.equal(Number(saved.total), 545); assert.equal(Number(saved.shipping), 45); assert.equal(Number(saved.subtotal), 500); assert.equal(Number(saved.netSales), 500);
    assert.equal(saved.items.length, 1); assert.equal(Number(saved.items[0].originalPrice), 250); assert.equal(await db.order.count({ where: { id: saved.id } }), 1);
    assert.equal(await db.consumption.count({ where: { orderId: saved.id } }), 0);
    await db.product.update({ where: { id: product.id }, data: { storefrontPublished: false } });
    assert.equal((await post({ ...order, requestId: randomUUID() })).status, 409);
    await db.product.update({ where: { id: product.id }, data: { storefrontPublished: true } });
    await db.recipe.updateMany({ where: { variantId: variant.id }, data: { active: false } });
    assert.equal((await post({ ...order, requestId: randomUUID() })).status, 409);
    // The same authenticated management API serves web sessions and mobile tokens.
    const owner = await db.user.create({ data: { storeId: shop.id, email: `owner-${shop.id}@example.com`, role: 'OWNER', status: 'ACTIVE' } });
    const token = `perf_${randomBytes(32).toString('base64url')}`;
    await db.mobileSession.create({ data: { storeId: shop.id, userId: owner.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60000) } });
    const adminHeaders = { ...headers, authorization: `Bearer ${token}` };
    // Customer management must reconcile channels while keeping customer PII tenant-scoped.
    assert.equal((await fetch(`${url}/api/customers`)).status, 401);
    const customerPhone = '01012345678';
    await db.order.create({ data: { storeId: shop.id, id: `customer-delivered-${shop.id}`, orderNumber: 'CRM-1',
      currency: 'EGP', total: 450, refunded: 50, occurredAt: new Date(), manualStatus: 'DELIVERED', financialStatus: 'PARTIALLY_REFUNDED',
      customerRef: 'Returning buyer', customerPhone: '+20 1012345678', customerAddress: 'New address' } });
    await db.order.create({ data: { storeId: other.id, currency: 'EGP', total: 99999, occurredAt: new Date(),
      customerRef: 'SECRET FOREIGN CUSTOMER', customerPhone, customerAddress: 'SECRET ADDRESS' } });
    const customerResponse = await fetch(`${url}/api/customers`, { headers: adminHeaders });
    assert.equal(customerResponse.status, 200);
    const customerList = await customerResponse.json();
    assert.equal(customerList.stats.total, 1); assert.equal(customerList.stats.repeat, 1);
    const customerKey = customerList.data[0].key;
    assert.equal(customerList.data[0].ordersCount, 2);
    assert.equal(customerList.data[0].totals.EGP.deliveredValue, 40000);
    assert.ok(!JSON.stringify(customerList).includes('SECRET'));
    const customerDetail = await (await fetch(`${url}/api/customers?key=${encodeURIComponent(customerKey)}`, { headers: adminHeaders })).json();
    assert.equal(customerDetail.data.orders.length, 2);
    assert.ok(customerDetail.data.orders.every(o => o.id === saved.id || o.id === `customer-delivered-${shop.id}`));
    assert.equal((await fetch(`${url}/api/customers?key=order:not-found`, { headers: adminHeaders })).status, 404);
    const phoneSearch = await (await fetch(`${url}/api/customers?q=${encodeURIComponent('٠١٠١٢٣٤٥٦٧٨')}`, { headers: adminHeaders })).json();
    assert.equal(phoneSearch.count, 1);
    const exactOrder = await (await fetch(`${url}/api/mobile/orders?orderId=${encodeURIComponent(saved.id)}`, { headers: adminHeaders })).json();
    assert.equal(exactOrder.count, 1); assert.equal(exactOrder.data[0].id, saved.id);
    await db.user.update({ where: { id: owner.id }, data: { role: 'EMPLOYEE' } });
    assert.equal((await fetch(`${url}/api/customers`, { headers: adminHeaders })).status, 403);
    await db.user.update({ where: { id: owner.id }, data: { role: 'MANAGER' } });
    assert.equal((await fetch(`${url}/api/customers`, { headers: adminHeaders })).status, 200);
    await db.user.update({ where: { id: owner.id }, data: { role: 'OWNER' } });
    const manage = data => fetch(`${url}/api/products/manage`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(data) });
    const settingsRequest = data => fetch(`${url}/api/admin/storefront`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify(data) });
    assert.equal((await settingsRequest({ kind: 'availability', data: { enabled: false } })).status, 200);
    assert.equal(JSON.parse((await db.setting.findUnique({ where: { storeId_key: { storeId: shop.id, key: 'storefront' } } })).value).enabled, false);
    assert.equal((await settingsRequest({ kind: 'availability', data: { enabled: true } })).status, 200);
    const presentation = { heroMode: 'video', heroVideo: 'https://example.com/auraic.mp4', heroInterval: 9, heroTitle: 'Saved hero headline', menCollectionLabel: 'Explore men', womenCollectionLabel: 'Explore women', featuredTitle: 'Our selected fragrances', storyTitle: 'Our Auraic story', menCollectionCategory: 'رجالي', womenCollectionCategory: 'حريمي', menCollectionImage: 'https://example.com/men.jpg' };
    assert.equal((await settingsRequest({ kind: 'settings', data: presentation })).status, 200);
    assert.equal((await settingsRequest({ kind: 'settings', data: { heroInterval: 0 } })).status, 422);
    assert.equal((await settingsRequest({ kind: 'settings', data: { heroVideo: 'javascript:alert(1)' } })).status, 422);
    // Older mobile clients must preserve the new presentation settings on save.
    assert.equal((await settingsRequest({ kind: 'settings', data: { announcement: 'Auraic offer' } })).status, 200);
    const presentationSaved = JSON.parse((await db.setting.findUnique({ where: { storeId_key: { storeId: shop.id, key: 'storefront' } } })).value);
    assert.equal(presentationSaved.heroMode, 'video'); assert.equal(presentationSaved.heroInterval, 9);
    assert.equal(presentationSaved.menCollectionImage, presentation.menCollectionImage);
    const homepage = await (await fetch(url)).text();
    assert.ok(homepage.includes('auraic.mp4')); assert.ok(homepage.includes('Explore men')); assert.ok(homepage.includes('Explore women')); assert.ok(homepage.includes('Saved hero headline')); assert.ok(homepage.includes('Our selected fragrances')); assert.ok(homepage.includes('Our Auraic story'));

    const initialSettings = (await (await fetch(`${url}/api/admin/storefront`, { headers: adminHeaders })).json()).data.settings;
    assert.equal(initialSettings.heroTitle, 'Saved hero headline'); assert.equal(initialSettings.menCollectionLabel, 'Explore men'); assert.equal(initialSettings.featuredTitle, 'Our selected fragrances');
    assert.equal((await settingsRequest({ kind: 'settings', data: { ...initialSettings, enabled: true, shippingPolicy: '', returnPolicy: '', whatsapp: '+20 1012345678' } })).status, 200);
    assert.equal(JSON.parse((await db.setting.findUnique({ where: { storeId_key: { storeId: shop.id, key: 'storefront' } } })).value).whatsapp, '201012345678');
    const body = { requestId: randomUUID(), title: 'Oud', category: 'Unisex', description: 'Oud description', images: [], published: true, featured: true,
      variants: [{ clientId: randomUUID(), title: '30 ml', price: 450, compareAtPrice: 550, materials: [{ materialId: material.id, quantity: 30 }] },
        { clientId: randomUUID(), title: '100 ml', price: 1200, compareAtPrice: null, materials: [{ materialId: material.id, quantity: 100 }] }] };
    assert.equal((await manage({ ...body, variants: [{ ...body.variants[0], compareAtPrice: 400 }] })).status, 422);
    assert.equal((await manage({ ...body, variants: [{ ...body.variants[0], id: foreign.variants[0].id }] })).status, 422);
    const create = await manage(body); assert.equal(create.status, 200, await create.clone().text());
    const managedId = (await create.json()).data.productId;
    assert.equal((await manage(body)).status, 200);
    assert.equal(await db.product.count({ where: { id: managedId } }), 1);
    const managed = await db.product.findUnique({ where: { id: managedId }, include: { variants: { orderBy: { price: 'asc' }, include: { recipes: { include: { versions: true } } } } } });
    assert.equal(managed.variants.length, 2); assert.equal(Number(managed.variants[0].compareAtPrice), 550);
    for (const filter of ['audience=men', 'audience=women', 'collection=offers', 'collection=bestsellers']) {
      const page = await (await fetch(`${url}/products?${filter}`)).text();
      assert.ok(page.includes('<h3>Oud</h3>'), `${filter} should include the eligible unisex perfume`);
    }
    const changeAudience = category => settingsRequest({ kind: 'product', data: { id: managedId, category, published: true, featured: true, description: 'Oud description', images: [] } });
    assert.equal((await changeAudience('Men')).status, 200);
    assert.ok(!(await (await fetch(`${url}/products?audience=women`)).text()).includes('<h3>Oud</h3>'));
    assert.ok((await (await fetch(`${url}/products?audience=men`)).text()).includes('<h3>Oud</h3>'));
    assert.equal((await changeAudience('Unisex')).status, 200);
    const homeCollections = await (await fetch(url)).text();
    assert.ok(homeCollections.indexOf('id="offers"') < homeCollections.indexOf('id="bestsellers"'));
    assert.ok(homeCollections.indexOf('id="bestsellers"') < homeCollections.indexOf('id="products"'));
    if (process.env.STOREFRONT_BROWSER_TESTS === '1') {
      const { chromium } = await import('playwright');
      const { mkdir } = await import('node:fs/promises');
      await mkdir('artifacts', { recursive: true });
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      let release; const gate = new Promise(resolve => release = resolve);
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.route(`**/products/${managedId}*`, async route => { if (route.request().headers().rsc === '1') await gate; await route.continue(); });
        await page.goto(`${url}/products?audience=men`);
        await page.waitForFunction(() => !document.querySelector('.shop-favorite')?.disabled);
        assert.match(await page.locator('h1').innerText(), /FRAGRANCES\s+FOR MEN/);
        assert.equal(await page.locator('.shop-product-card').count(), 1);
        await page.screenshot({ path: 'artifacts/navigation-men.png', fullPage: true });
        await page.getByRole('combobox', { name: 'Gender', exact: true }).selectOption('women');
        assert.match(await page.locator('h1').innerText(), /FOR WOMEN/);
        assert.equal(await page.locator('.shop-product-card').count(), 1, 'unisex belongs in women too');
        await page.getByRole('switch').click();
        assert.equal(await page.locator('.shop-product-notes').innerText(), 'Oud description');
        await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('100 ml');
        assert.equal(await page.locator('.shop-product-card').count(), 1);
        await page.getByRole('button', { name: 'CLEAR ALL', exact: true }).click();
        assert.match(await page.locator('h1').innerText(), /ALL\s+FRAGRANCES/);
        await page.getByRole('button', { name: /FILTER/ }).click();
        assert.equal(await page.locator('#collection-filters').isVisible(), false);
        await page.locator('.shop-product-card').click({ noWaitAfter: true });
        await page.locator('.shop-route-loading').first().waitFor({ state: 'visible' });
        await page.screenshot({ path: 'artifacts/navigation-loader.png' });
        release();
        await page.waitForURL(`${url}/products/${managedId}`);
        await page.locator('.shop-route-loading').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.shop-detail-copy h1').innerText(), 'Oud');
        assert.deepEqual(errors, []);
      } finally { release(); await browser.close(); }
    }
    const details = await (await fetch(`${url}/products/${managedId}`)).text();
    assert.ok(details.includes('30 ml') && details.includes('100 ml'));
    const checkout = await post({ ...order, requestId: randomUUID(), items: [{ variantId: managed.variants[0].id, quantity: 1 }], expectedTotalCents: 49500 });
    assert.equal(checkout.status, 201, await checkout.clone().text());
    const receipt = (await checkout.json()).data;
    const versionId = managed.variants[0].recipes[0].versions[0].id;
    const edited = await manage({ ...body, productId: managedId, variants: [{ ...body.variants[0], id: managed.variants[0].id, price: 400, materials: [{ materialId: material.id, quantity: 35 }] }] });
    assert.equal(edited.status, 200, await edited.clone().text());
    assert.equal((await db.productVariant.findUnique({ where: { id: managed.variants[1].id } })).active, false);
    assert.equal(Number((await db.recipeItem.findFirst({ where: { recipeVersionId: versionId } })).quantity), 30);
    assert.equal(await db.recipeVersion.count({ where: { recipeId: managed.variants[0].recipes[0].id } }), 2);
    const savedOrder = await db.order.findFirst({ where: { storeId: shop.id, total: 495 }, include: { items: true } });
    assert.ok(receipt); assert.equal(Number(savedOrder.items[0].originalPrice), 450);
    assert.equal((await post({ ...order, requestId: randomUUID(), items: [{ variantId: managed.variants[1].id, quantity: 1 }], expectedTotalCents: 120000 })).status, 409);
    // Admin costing is available even when the legacy costing setting is disabled.
    await db.material.update({ where: { id: material.id }, data: { defaultCost: 10 } });
    const adminProduct = await (await fetch(`${url}/api/products/${managedId}`, { headers: adminHeaders })).json();
    const adminSize = adminProduct.data.variants.find(v => v.id === managed.variants[0].id);
    assert.equal(adminSize.costing.complete, true);
    assert.equal(adminSize.costing.estimatedCost, 350);
    assert.equal(adminSize.costing.estimatedMargin, 50);
    for (const page of ['/favorites', '/cart', '/checkout']) {
      const response = await fetch(`${url}${page}`);
      assert.equal(response.status, 200);
      assert.ok(!(await response.text()).includes('estimatedCost'), 'public pages must not expose recipe costs');
    }
    // Real preparation snapshots recipe costs. Future purchases must not recost old sales.
    await db.inventoryBalance.upsert({ where: { materialId: material.id }, create: { storeId: shop.id, materialId: material.id, quantity: 0 }, update: { quantity: 0 } });
    const purchaseResponse = await fetch(`${url}/api/purchases`, { method: 'POST', headers: adminHeaders,
      body: JSON.stringify({ materialId: material.id, quantity: 100, amount: 1000, date: '2026-08-01T12:00:00Z' }) });
    assert.equal(purchaseResponse.status, 201, await purchaseResponse.clone().text());
    assert.equal(Number((await db.material.findUniqueOrThrow({ where: { id: material.id } })).defaultCost), 10);
    await db.recipe.updateMany({ where: { storeId: shop.id, variantId: variant.id }, data: { active: true } });
    for (const date of ['2026-08-10T12:00:00Z', '2026-09-10T12:00:00Z']) {
      const requestId = randomUUID();
      const manualResponse = await fetch(`${url}/api/orders/manual`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ requestId, customerName: 'Profit example', customerPhone: '01011111111', customerAddress: 'Cairo building 10', hasDeposit: false, depositAmount: 0,
          items: [{ variantId: variant.id, quantity: 1, unitPrice: 450 }] }) });
      assert.equal(manualResponse.status, 200, await manualResponse.clone().text());
      const orderId = `manual_${requestId}`;
      const prepare = await fetch(`${url}/api/orders/${encodeURIComponent(orderId)}/manual-status`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ status: 'PREPARED' }) });
      assert.equal(prepare.status, 200, await prepare.clone().text());
      const consumption = await db.consumption.findUniqueOrThrow({ where: { orderItemId: (await db.orderItem.findFirstOrThrow({ where: { orderId } })).id } });
      const snapshot = await db.auditLog.findFirstOrThrow({ where: { storeId: shop.id, entity: 'Consumption', entityId: consumption.id, action: 'CREATE' } });
      assert.equal(snapshot.after.materials[0].unitCost, 10);
      await db.order.update({ where: { id: orderId }, data: { manualStatus: 'DELIVERED', financialStatus: 'PAID', occurredAt: new Date(date) } });
    }
    await db.material.update({ where: { id: material.id }, data: { defaultCost: 999 } });
    const categories = await (await fetch(`${url}/api/expenses/categories`, { headers: adminHeaders })).json();
    const social = categories.data.find(c => c.name === 'مصاريف سوشيال ميديا'); assert.ok(social);
    for (const date of ['2026-08-01T12:00:00Z', '2026-09-01T12:00:00Z']) {
      const expense = await fetch(`${url}/api/expenses`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ categoryId: social.id, amount: 10000, date }) });
      assert.equal(expense.status, 201, await expense.clone().text());
    }
    await db.expense.create({ data: { storeId: shop.id, categoryId: social.id, currency: 'USD', amount: 10000, date: new Date('2026-09-01T12:00:00Z') } });
    const monthReport = await (await fetch(`${url}/api/mobile/home?period=custom&from=2026-08-01&to=2026-08-31`, { headers: adminHeaders })).json();
    assert.equal(monthReport.data.sales.gross, 450);
    assert.equal(monthReport.data.profit.recipeCost, 300); assert.equal(monthReport.data.profit.profit, 150);
    assert.equal(monthReport.data.profit.margin, 33.33); assert.equal(monthReport.data.profit.estimated, false);
    assert.equal(monthReport.data.roas.spend, 10000);
    const twoMonths = await (await fetch(`${url}/api/mobile/home?period=custom&from=2026-08-01&to=2026-09-30`, { headers: adminHeaders })).json();
    assert.equal(twoMonths.data.sales.gross, 900); assert.equal(twoMonths.data.profit.profit, 300);
    assert.equal(twoMonths.data.roas.spend, 20000); assert.equal(twoMonths.data.roas.ratio, 0.045);
    const emptyReport = await (await fetch(`${url}/api/mobile/home?period=custom&from=2026-07-01&to=2026-07-31`, { headers: adminHeaders })).json();
    assert.equal(emptyReport.data.roas.ratio, null); assert.equal(emptyReport.data.profit.margin, null);
  } finally {
    if (child) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
    await db.order.deleteMany({ where: { storeId: { in: [shop.id, other.id] } } });
    await db.recipeItem.deleteMany({ where: { recipeVersion: { storeId: shop.id } } });
    await db.materialPurchaseItem.deleteMany({ where: { purchase: { storeId: { in: [shop.id, other.id] } } } });
    await db.store.deleteMany({ where: { id: { in: [shop.id, other.id] } } });
  }
});
test.after(async () => db.$disconnect());
