import { z } from "zod";
export const trafficSchema = z.object({
  id: z.uuid(), session: z.uuid(),
  path: z.string().max(180).regex(/^\/(?:products(?:\/[A-Za-z0-9_-]+)?|cart|checkout|samples|contact|shipping|returns|policies|wishlist|favorites)?$/),
});
export async function boundedTrafficBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length") || 0) > 1024) return null;
  const reader = request.body?.getReader(); if (!reader) return "";
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 1024) { await reader.cancel(); return null; } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
  return new TextDecoder().decode(bytes);
}
