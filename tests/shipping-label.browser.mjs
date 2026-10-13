import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { createShippingLabelPdf } from '../src/lib/shipping-label-pdf.ts';

test('Arabic label fills its own PDF page and long orders fit without clipping', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<html dir="rtl"><body style="font-family:Arial,Helvetica,sans-serif"></body></html>');
    const source = await readFile(new URL('../src/lib/shipping-label-canvas.ts', import.meta.url), 'utf8');
    const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText.replace('export function', 'function');
    await page.addScriptTag({ content: script });
    const base = {
      number: '#AU-1234', customer: 'إبراهيم محمد', phone: '01012345678',
      address: 'القاهرة، مدينة نصر، شارع عباس العقاد، عمارة ١٢، الدور الثالث',
      currency: 'EGP', total: 510, shipping: 60, deposit: 100,
      manualStatus: 'SHIPPING', financialStatus: 'PARTIAL',
      items: [{ title: 'عطر أورايك ٥٠ مل', quantity: 2 }],
    };
    await mkdir('artifacts', { recursive: true });
    for (const [name, order] of [
      ['normal', base],
      ['long', { ...base, address: base.address.repeat(4), items: Array.from({ length: 12 }, (_, i) => ({ title: `منتج ${i + 1} باسم طويل للاختبار`, quantity: 2 })) }],
    ]) {
      const rendered = await page.evaluate(order => {
        const draws = [];
        const original = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
          const fontSize = this.font.split(' ').find(part => part.endsWith('px'));
          draws.push({ text, x, y, width: this.measureText(text).width, height: Number.parseFloat(fontSize ?? '0') * 1.3 });
          return original.call(this, text, x, y);
        };
        try {
          const canvas = renderShippingLabel(order, '410 EGP', 'Arial, Helvetica, sans-serif');
          document.body.replaceChildren(canvas);
          return { width: canvas.width, height: canvas.height, png: canvas.toDataURL('image/png').split(',')[1], draws };
        } finally {
          CanvasRenderingContext2D.prototype.fillText = original;
        }
      }, order);
      assert.equal(rendered.width, 591);
      assert.equal(rendered.height, 827);
      const margin = 2.5 * 300 / 25.4;
      for (const draw of rendered.draws) {
        assert.ok(draw.height > 0, `${name}: font size was measured`);
        assert.ok(draw.y + draw.height <= rendered.height - margin + 0.01, `${name}: bottom clipping`);
        assert.ok(draw.width <= rendered.width - 2 * margin + 0.01, `${name}: horizontal clipping`);
      }
      const text = rendered.draws.map(draw => draw.text).join(' ');
      assert.ok(text.includes(order.phone));
      assert.ok(text.includes('410 EGP'));
      assert.ok(text.includes('إبراهيم'));
      const png = Buffer.from(rendered.png, 'base64');
      const bytes = await createShippingLabelPdf(png);
      const pdf = await PDFDocument.load(bytes);
      assert.equal(pdf.getPageCount(), 1);
      assert.ok(Math.abs(pdf.getPage(0).getWidth() * 25.4 / 72 - 50) < 0.001);
      assert.ok(Math.abs(pdf.getPage(0).getHeight() * 25.4 / 72 - 70) < 0.001);
      await writeFile(`artifacts/shipping-label-${name}.png`, png);
      await writeFile(`artifacts/shipping-label-${name}.pdf`, bytes);
    }
  } finally {
    await browser.close();
  }
});
