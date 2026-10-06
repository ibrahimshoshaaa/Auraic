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
  try {
    const target = new URL(request.url);
    // Next may use its internal hostname in request.url; Host is the hostname
    // the browser actually addressed (injected by Vercel in production).
    const host = request.headers.get("host");
    if (host) target.host = host;
    return new URL(origin).origin === target.origin;
  }
  catch { return false; }
}
