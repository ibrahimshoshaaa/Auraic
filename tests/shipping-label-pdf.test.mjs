import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createShippingLabelPdf } from '../src/lib/shipping-label-pdf.ts';

test('downloaded shipping label is one 50 by 70 mm page with no surrounding A4 sheet', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const pdf = await PDFDocument.load(await createShippingLabelPdf(png));
  assert.equal(pdf.getPageCount(), 1);
  const { width, height } = pdf.getPage(0).getSize();
  assert.ok(Math.abs(width * 25.4 / 72 - 50) < 0.001);
  assert.ok(Math.abs(height * 25.4 / 72 - 70) < 0.001);
  assert.equal(pdf.getPage(0).getMediaBox().x, 0);
  assert.equal(pdf.getPage(0).getMediaBox().y, 0);
});
