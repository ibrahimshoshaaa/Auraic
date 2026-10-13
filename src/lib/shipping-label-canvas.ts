import type { ShippingLabelOrder } from './shipping-label';

type Row = { text?: string; size?: number; bold?: boolean; center?: boolean; divider?: boolean };

export function renderShippingLabel(order: ShippingLabelOrder, collection: string, fontFamily: string): HTMLCanvasElement {
  const pixelsPerMm = 300 / 25.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(50 * pixelsPerMm);
  canvas.height = Math.round(70 * pixelsPerMm);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  const margin = 2.5 * pixelsPerMm;
  const contentWidth = canvas.width - 2 * margin;
  const rows: Row[] = [
    { text: 'Auraic', size: 5, bold: true, center: true },
    { divider: true },
    { text: `رقم الطلب: ${order.number.replace(/^#+/, '')}`, size: 3.1 },
    { text: `العميل: ${order.customer}`, size: 4.2, bold: true },
    { text: `الهاتف: ${order.phone}`, size: 4.2, bold: true },
    { text: `العنوان: ${order.address}`, size: 4, bold: true },
    { divider: true },
    { text: 'المنتجات', size: 3.1, bold: true },
    ...order.items.map(item => ({ text: `${item.title} × ${item.quantity}`, size: 3.1 })),
    { divider: true },
    { text: `المطلوب تحصيله: ${collection}`, size: 4.2, bold: true },
  ];
  context.direction = 'rtl';
  context.textBaseline = 'top';

  function wrap(text: string): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context!.measureText(candidate).width <= contentWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        if (line && context!.measureText(line + character).width > contentWidth) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function layout(scale: number, paint: boolean): number {
    let y = margin;
    for (const row of rows) {
      if (row.divider) {
        y += pixelsPerMm * scale;
        if (paint) {
          context!.beginPath();
          context!.moveTo(margin, y);
          context!.lineTo(canvas.width - margin, y);
          context!.stroke();
        }
        y += 1.5 * pixelsPerMm * scale;
        continue;
      }
      const size = (row.size ?? 3.1) * pixelsPerMm * scale;
      context!.font = `${row.bold ? 800 : 400} ${size}px ${fontFamily}`;
      context!.textAlign = row.center ? 'center' : 'right';
      for (const line of wrap(row.text ?? '')) {
        if (paint) context!.fillText(line, row.center ? canvas.width / 2 : canvas.width - margin, y);
        y += size * 1.3;
      }
      y += 0.55 * pixelsPerMm * scale;
    }
    return y;
  }

  let scale = 1;
  if (layout(scale, false) > canvas.height - margin) {
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 18; iteration++) {
      const middle = (low + high) / 2;
      if (layout(middle, false) <= canvas.height - margin) low = middle;
      else high = middle;
    }
    scale = low;
  }
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black';
  context.strokeStyle = 'black';
  context.lineWidth = Math.max(1, 0.15 * pixelsPerMm * scale);
  layout(scale, true);
  return canvas;
}
