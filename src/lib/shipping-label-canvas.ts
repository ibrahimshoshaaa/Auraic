import type { ShippingLabelOrder } from './shipping-label';

type Row = { text?: string; size?: number; bold?: boolean; divider?: boolean; ltr?: boolean };

export function renderShippingLabel(order: ShippingLabelOrder, collection: string, fontFamily: string): HTMLCanvasElement {
  const pixelsPerMm = 300 / 25.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(50 * pixelsPerMm);
  canvas.height = Math.round(70 * pixelsPerMm);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  const contentWidth = canvas.width;
  const rows: Row[] = [
    { text: `رقم الطلب: ${order.number.replace(/^#+/, '')}`, size: 3.1 },
    { text: `العميل: ${order.customer}`, size: 4.8, bold: true },
    { text: order.phone, size: 5.2, bold: true, ltr: true },
    { text: `العنوان: ${order.address}`, size: 4.8, bold: true },
    { divider: true },
    { text: 'المطلوب تحصيله', size: 3.1, bold: true },
    { text: collection, size: 6, bold: true, ltr: true },
  ];
  context.direction = 'rtl';
  context.textBaseline = 'alphabetic';

  function textWidth(text: string): number {
    const metrics = context!.measureText(text);
    return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
  }

  function wrap(text: string): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate) <= contentWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        if (line && textWidth(line + character) > contentWidth) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function layout(scale: number, paint: boolean, extraGap = 0): number {
    let y = 0;
    for (const [index, row] of rows.entries()) {
      if (index > 0) y += extraGap;
      if (row.divider) {
        y += pixelsPerMm * scale;
        if (paint) {
          context!.beginPath();
          context!.moveTo(0, y);
          context!.lineTo(canvas.width, y);
          context!.stroke();
        }
        y += 1.5 * pixelsPerMm * scale;
        continue;
      }
      const size = (row.size ?? 3.1) * pixelsPerMm * scale;
      context!.direction = row.ltr ? 'ltr' : 'rtl';
      context!.font = `${row.bold ? 800 : 400} ${size}px ${fontFamily}`;
      context!.textAlign = 'right';
      for (const line of wrap(row.text ?? '')) {
        const metrics = context!.measureText(line);
        if (paint) context!.fillText(line, canvas.width - Math.max(0, metrics.actualBoundingBoxRight), y + metrics.actualBoundingBoxAscent);
        y += metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        y += 0.65 * pixelsPerMm * scale;
      }
    }
    return y - 0.65 * pixelsPerMm * scale;
  }

  let scale = 1.25;
  if (layout(scale, false) > canvas.height) {
    let low = 0;
    let high = scale;
    for (let iteration = 0; iteration < 18; iteration++) {
      const middle = (low + high) / 2;
      if (layout(middle, false) <= canvas.height) low = middle;
      else high = middle;
    }
    scale = low;
  }
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black';
  context.strokeStyle = 'black';
  context.lineWidth = Math.max(1, 0.15 * pixelsPerMm * scale);
  const extraGap = Math.max(0, canvas.height - layout(scale, false)) / (rows.length - 1);
  layout(scale, true, extraGap);
  return canvas;
}
