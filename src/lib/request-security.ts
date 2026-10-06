/** Cookie-authenticated API writes must originate from this deployment.
 * Bearer credentials are explicit, not ambient cookies; native clients need no Origin.
 */
export function allowedCookieMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.has("authorization")) return true;
  const cookie = request.headers.get("cookie") ?? "";
  if (!/(?:^|;\s*)(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/.test(cookie)) return true;
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
