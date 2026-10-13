import { PDFDocument } from 'pdf-lib';

export async function createShippingLabelPdf(png: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  const width = 50 * 72 / 25.4;
  const height = 70 * 72 / 25.4;
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  pdf.setTitle('Auraic shipping label 50 x 70 mm');
  return pdf.save();
}
